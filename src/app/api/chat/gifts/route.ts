// @ts-nocheck
import { z } from "zod";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { generateObjectWithFallback, toAiErrorMessage } from "@/lib/ai-model";
import { rehostImageToUploadthing } from "@/lib/uploadthing-manage";

export async function POST(req: Request) {
  try {
    const { messages, weddingSlug } = await req.json();

    if (!weddingSlug) {
      return new Response("Wedding slug is required", { status: 400 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug },
    });

    if (!wedding) {
      return new Response("Casamento não encontrado", { status: 404 });
    }

    const categories = await prisma.giftCategory.findMany({
      where: { weddingId: wedding.id },
      select: { id: true, name: true }
    });
    const categoriesString = categories.map(c => `'${c.id}' (${c.name})`).join(", ");

    // Texto da última mensagem do usuário (p/ achar link sem IA, se precisar).
    const lastUser = [...(messages || [])].reverse().find((m: any) => m?.role === "user");
    const lastContent = lastUser?.content;
    const userText = typeof lastContent === "string"
      ? lastContent
      : Array.isArray(lastContent)
        ? lastContent.map((p: any) => p?.text || "").join(" ")
        : "";
    const urlInMessage = userText.match(/https?:\/\/[^\s)>\]]+/)?.[0] || null;

    let toolResults: any[] = [];
    let responseText = "Tudo certo por aqui!";

    // Caminho com IA: extrai palpite + URL; caminho sem IA: só a URL do texto.
    try {
      const result = await generateObjectWithFallback({
        system: `Você é um Concierge de Lista de Presentes experiente.
Seu objetivo é ajudar os noivos a cadastrarem presentes na lista deles.
Os noivos vão te mandar links de lojas (Mercado Livre, Amazon, Magalu, etc.).
Se você identificar um link na mensagem do usuário, você DEVE extrair a URL exata e colocá-la em 'extractedUrl'.
Tente também deduzir o título original do produto pelo link (slug) em 'titleGuess' e chute um preço realista em 'priceGuess'.
O MAIS IMPORTANTE: Em 'shortTitle', escreva uma versão extremamente resumida, limpa e elegante do nome do produto (ex: de 'Chopeira Elétrica Kegerator Digital 1 Via' para apenas 'Chopeira Elétrica').
CATEGORIAS DISPONÍVEIS NO BANCO DE DADOS: ${categoriesString || "Nenhuma categoria cadastrada"}.
Selecione o ID da categoria que melhor se encaixa no produto. Se não tiver certeza ou se não houver categorias, deixe null.
Sempre responda ao usuário em 'responseText' sendo extremamente educado, confirmando que você está verificando ou que adicionou o presente.`,
        messages,
        schema: z.object({
          extractedUrl: z.string().nullable().describe("A URL completa do produto, se enviada"),
          titleGuess: z.string().nullable().describe("Título original deduzido pela IA a partir do texto da URL"),
          shortTitle: z.string().nullable().describe("Nome resumido e elegante do produto (ex: 'Geladeira', 'Fritadeira Air Fryer')"),
          englishSearchTerm: z.string().nullable().describe("O shortTitle traduzido para o INGLÊS para busca em banco de imagens (ex: 'Refrigerator', 'Air Fryer')"),
          priceGuess: z.number().nullable().describe("Preço estimado do produto em Reais (BRL)"),
          categoryId: z.string().nullable().describe("O ID da categoria mais adequada da lista fornecida"),
          responseText: z.string().describe("Sua resposta amigável para o usuário"),
        }),
      });
      const g = result.object;
      if (g.extractedUrl) {
        const added = await addGiftFromUrl(wedding.id, g.extractedUrl, {
          titleGuess: g.titleGuess,
          shortTitle: g.shortTitle,
          priceGuess: g.priceGuess,
          englishSearchTerm: g.englishSearchTerm,
          categoryId: g.categoryId,
        });
        toolResults.push(added.toolResult);
      }
      responseText = g.responseText || "Tudo certo por aqui!";
    } catch (aiError) {
      // IA fora: nunca mostra erro — extrai o link na unha ou responde com charme.
      console.error("[gifts AI] usando caminho sem IA:", aiError);
      if (urlInMessage) {
        try {
          const added = await addGiftFromUrl(wedding.id, urlInMessage, null);
          toolResults.push(added.toolResult);
          responseText = added.giftName
            ? `Adicionei "${added.giftName}" à lista! ✨ Estou em modo simplificado, então confira o preço e a categoria depois, tá?`
            : "Não consegui ler esse link agora. Tenta de novo em instantes? ✨";
        } catch {
          responseText = "Não consegui abrir esse link agora. Tenta de novo em instantes? ✨";
        }
      } else {
        responseText = "Hmm, minha conexão oscilou agora — pode mandar de novo? Se for link de produto, manda o link que eu já adiciono! ✨";
      }
    }

    return Response.json({
      text: responseText,
      toolResults: toolResults
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return Response.json({ error: toAiErrorMessage(error) }, { status: 500 });
  }
}

type GiftGuesses = {
  titleGuess: string | null;
  shortTitle: string | null;
  priceGuess: number | null;
  englishSearchTerm: string | null;
  categoryId: string | null;
} | null;

/** Extrai (scrape OG tags) e salva o presente. Sem palpites (null), usa só o
 *  que a página diz + fallbacks honestos. Retorna p/ o toolResults. */
async function addGiftFromUrl(
  weddingId: string,
  url: string,
  guesses: GiftGuesses,
): Promise<{ toolResult: any; giftName: string | null; giftPrice: number | null }> {
  const fail = (message: string) => ({
    toolResult: {
      toolCallId: "manual_call_" + Date.now(),
      toolName: "addGiftFromUrl",
      result: { success: false, message },
    },
    giftName: null as string | null,
    giftPrice: null as number | null,
  });
  try {
    // 1. Scrape the URL
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract OpenGraph tags
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      "Presente Especial";
    const image =
      $('meta[property="og:image"]').attr("content") ||
      "";
    const description =
      $('meta[property="og:description"]').attr("content") ||
      "Presente adicionado via assistente mágico.";

    // Extract Price (Very basic approach for popular stores)
    let priceAmount = 0;
    const priceMeta = $('meta[property="product:price:amount"]').attr("content");
    if (priceMeta) {
      priceAmount = parseFloat(priceMeta);
    } else {
      // Regex fallback for R$
      const match = html.match(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/);
      if (match) {
        priceAmount = parseFloat(match[1].replace(".", "").replace(",", "."));
      } else {
        priceAmount = 150; // Fallback price
      }
    }

    // 2. Clean up title
    let finalTitle = title.split("-")[0].split("|")[0].trim().substring(0, 50);
    let finalPrice = priceAmount;
    const short_title = guesses?.shortTitle;
    const title_guess = guesses?.titleGuess;

    // Anti-bot detection or empty fallback
    if (finalTitle === "Mercado Libre" || finalTitle === "Amazon" || finalTitle === "Presente Especial" || !finalTitle) {
      finalTitle = short_title || title_guess || "Presente Surpresa";
    } else {
      // If we got a real title, we might still want to use the AI's simplified version if available
      if (short_title && short_title.length < finalTitle.length) {
        finalTitle = short_title;
      }
    }

    if (!finalPrice || finalPrice === 150) {
      finalPrice = guesses?.priceGuess || 150;
    }

    const searchBase = guesses?.englishSearchTerm
      || finalTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const safeSearchTerm = searchBase.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "wedding gift";
    const scrapedOrFallback = image || `https://image.pollinations.ai/prompt/professional%20product%20photography%20of%20${encodeURIComponent(safeSearchTerm)}%2C%20white%20background%2C%20high%20quality?width=600&height=600&nologo=true`;

    // Re-hospeda no UploadThing para a imagem não quebrar depois
    // (hotlink de loja e pollinations são instáveis)
    const finalImage = await rehostImageToUploadthing(scrapedOrFallback);

    // 3. Save to database
    const gift = await prisma.gift.create({
      data: {
        name: finalTitle.substring(0, 100),
        description: description.substring(0, 200),
        price: finalPrice,
        imageUrl: finalImage,
        wedding: { connect: { id: weddingId } },
        ...(guesses?.categoryId ? { categories: { connect: { id: guesses.categoryId } } } : {})
      },
    });

    return {
      toolResult: {
        toolCallId: "manual_call_" + Date.now(),
        toolName: "addGiftFromUrl",
        result: {
          success: true,
          message: "Presente extraído e salvo com sucesso no banco de dados!",
          giftName: gift.name,
          giftPrice: gift.price,
        },
      },
      giftName: gift.name,
      giftPrice: gift.price,
    };
  } catch (error: any) {
    return fail("Falha ao extrair dados da loja: " + error.message);
  }
}

// @ts-nocheck
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";

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

    const result = await generateObject({
      model: google("gemini-3.5-flash"),
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

    let toolResults = [];

    if (result.object.extractedUrl) {
      const url = result.object.extractedUrl;
      const title_guess = result.object.titleGuess;
      const short_title = result.object.shortTitle;
      const price_guess = result.object.priceGuess;
      
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
          finalPrice = price_guess || 150;
        }

        const safeSearchTerm = (result.object.englishSearchTerm || "wedding gift").replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const finalImage = image || `https://image.pollinations.ai/prompt/professional%20product%20photography%20of%20${encodeURIComponent(safeSearchTerm)}%2C%20white%20background%2C%20high%20quality?width=600&height=600&nologo=true`;

        // 3. Save to database
        const gift = await prisma.gift.create({
          data: {
            name: finalTitle.substring(0, 100),
            description: description.substring(0, 200),
            price: finalPrice,
            imageUrl: finalImage,
            wedding: { connect: { id: wedding.id } },
            ...(result.object.categoryId ? { categories: { connect: { id: result.object.categoryId } } } : {})
          },
        });

        toolResults.push({
          toolCallId: "manual_call_" + Date.now(),
          toolName: "addGiftFromUrl",
          result: {
            success: true,
            message: "Presente extraído e salvo com sucesso no banco de dados!",
            giftName: gift.name,
            giftPrice: gift.price,
          }
        });
      } catch (error: any) {
        toolResults.push({
          toolCallId: "manual_call_" + Date.now(),
          toolName: "addGiftFromUrl",
          result: {
            success: false,
            message: "Falha ao extrair dados da loja: " + error.message,
          }
        });
      }
    }

    return Response.json({
      text: result.object.responseText || "Tudo certo por aqui!",
      toolResults: toolResults
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return new Response(error.message, { status: 500 });
  }
}

import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import type { z } from "zod";

/**
 * Modelo Gemini padrão do Casarium (primário).
 * O Google aposenta gerações antigas sem aviso (2.5 e 2.0 retornam 404
 * "no longer available") — se a IA cair com model-not-found, é aqui.
 */
export const AI_MODEL_ID = "gemini-3.6-flash";

export function getGoogleModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "IA não configurada: variável GOOGLE_GENERATIVE_AI_API_KEY ausente no ambiente."
    );
  }
  return google(AI_MODEL_ID);
}

type Provider = { name: string; make: () => any };

/** Cadeia de provedores (todos gratuitos): primário + fallbacks automáticos.
 *  Quando o Gemini estoura a cota (429), cai para o próximo sem o usuário
 *  perceber. Provedores sem chave configurada são pulados. */
function buildProviderChain(): Provider[] {
  const chain: Provider[] = [];

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    chain.push({ name: `Google (${AI_MODEL_ID})`, make: () => google(AI_MODEL_ID) });
  }

  if (process.env.GROQ_API_KEY) {
    const groq = createOpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY });
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    chain.push({ name: `Groq (${model})`, make: () => groq(model) });
  }

  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
    chain.push({ name: `OpenRouter (${model})`, make: () => openrouter(model) });
  }

  // Último recurso: sem chave, sem cadastro (limites instáveis — só emergencial).
  chain.push({
    name: "Pollinations (emergencial)",
    make: () => {
      const pollinations = createOpenAI({
        baseURL: "https://text.pollinations.ai/openai",
        apiKey: process.env.POLLINATIONS_API_KEY || "not-needed",
      });
      return pollinations(process.env.POLLINATIONS_MODEL || "openai");
    },
  });

  return chain;
}

/** generateObject com failover: tenta cada provedor em ordem até um responder.
 *  Drop-in para as rotas de chat (mesmos parâmetros que usavam antes).
 *  Corta o histórico nas últimas 12 mensagens e limita a saída — o vai-e-vem
 *  do chat multiplicava o gasto de tokens a cada turno. */
export async function generateObjectWithFallback<T>(opts: {
  system?: string;
  messages: any;
  schema: z.ZodType<T>;
}): Promise<{ object: T }> {
  const chain = buildProviderChain();
  const errors: string[] = [];
  const messages = Array.isArray(opts.messages) ? opts.messages.slice(-12) : opts.messages;

  for (const provider of chain) {
    try {
      const result = await generateObject({
        model: provider.make(),
        system: opts.system,
        messages,
        schema: opts.schema as any,
        maxOutputTokens: 2000,
      });
      if (provider.name !== chain[0]?.name) {
        console.warn(`[AI] Primário indisponível — respondido via ${provider.name}.`);
      }
      return result as { object: T };
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[AI] ${provider.name} falhou (${msg.slice(0, 160)}). Tentando próximo...`);
      errors.push(`${provider.name}: ${msg.slice(0, 200)}`);
    }
  }

  throw new Error(
    `IA indisponível em todos os provedores (${errors.length} tentativas). ` +
      `Cotas gratuitas esgotadas? Configure GROQ_API_KEY (grátis, sem cartão) e/ou OPENROUTER_API_KEY. Detalhes: ${errors.join(" | ").slice(0, 500)}`
  );
}

/** Extrai uma mensagem legível de erros do provider (Google AI SDK). */
export function toAiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/API key not valid|API_KEY_INVALID/i.test(message)) {
    return "Chave da IA inválida ou ausente. Verifique GOOGLE_GENERATIVE_AI_API_KEY no Railway/.env.";
  }
  if (/indisponível em todos os provedores/i.test(message)) {
    return "IA temporariamente indisponível (cotas gratuitas esgotadas em todos os provedores). Tente de novo em alguns minutos — ou configure GROQ_API_KEY para ampliar a cota.";
  }
  if (/model.*not.*found|404/i.test(message)) {
    return `Modelo de IA "${AI_MODEL_ID}" não encontrado na API do Google.`;
  }
  return message;
}

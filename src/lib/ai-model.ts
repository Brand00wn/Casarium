import { google } from "@ai-sdk/google";

/**
 * Modelo Gemini padrão do Casarium.
 * Centralizado aqui porque o nome do modelo já quebrou a IA uma vez
 * ("gemini-3.5-flash" não existe na API do Google).
 * Família válida na versão instalada do SDK: gemini-2.5 / gemini-2.0 / gemini-1.5.
 */
export const AI_MODEL_ID = "gemini-2.5-flash";

export function getGoogleModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "IA não configurada: variável GOOGLE_GENERATIVE_AI_API_KEY ausente no ambiente."
    );
  }
  return google(AI_MODEL_ID);
}

/** Extrai uma mensagem legível de erros do provider (Google AI SDK). */
export function toAiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/API key not valid|API_KEY_INVALID|key/i.test(message)) {
    return "Chave da IA inválida ou ausente. Verifique GOOGLE_GENERATIVE_AI_API_KEY no Railway/.env.";
  }
  if (/model.*not.*found|404/i.test(message)) {
    return `Modelo de IA "${AI_MODEL_ID}" não encontrado na API do Google.`;
  }
  return message;
}

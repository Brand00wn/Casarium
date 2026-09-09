import crypto from "crypto";

/**
 * Código único do convidado (token = QR).
 * Um código por convidado, usado no RSVP (deep-link/validação),
 * no QR Code de entrada e como identidade no site público.
 * Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para digitação e leitura.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateGuestToken(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/** Normaliza código digitado/bipado (caixa alta, sem espaços). */
export function normalizeGuestCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Valores compartilhados dos disparos.
 * Ficam aqui (fora de arquivos "use server") porque o Next.js só permite
 * exportar async functions (Server Actions) de arquivos server.
 */

export const SEND_DELAY_MS = 1500;

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const DEFAULT_MESSAGING = {
  autoInviteEnabled: true,
  inviteDaysBefore: 30,
  reminderEnabled: true,
  reminderDaysBefore: 7,
  reminderIntervalDays: 3,
};

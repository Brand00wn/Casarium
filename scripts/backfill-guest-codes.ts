/**
 * Backfill: unifica token e qrCode de todos os convidados existentes.
 * Novo formato: 8 caracteres maiúsculos sem ambíguos (generateGuestToken),
 * com token === qrCode (o QR carrega o token).
 *
 * Idempotente: pula quem já está no formato novo.
 * Uso local:  pnpm backfill:guest-codes
 * Uso prod:   railway run pnpm backfill:guest-codes  (ou com DATABASE_URL de prod)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateGuestToken } from "../src/lib/guest-code";

const NEW_CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

const prisma = new PrismaClient();

async function main() {
  const guests = await prisma.guest.findMany({
    select: { id: true, name: true, token: true, qrCode: true },
  });

  const used = new Set<string>();
  for (const g of guests) {
    if (g.token) used.add(g.token);
    used.add(g.qrCode);
  }

  let updated = 0;
  let skipped = 0;

  for (const g of guests) {
    if (g.token && NEW_CODE.test(g.token) && g.qrCode === g.token) {
      skipped++;
      continue;
    }
    let code = generateGuestToken();
    while (used.has(code)) code = generateGuestToken();
    used.add(code);

    await prisma.guest.update({
      where: { id: g.id },
      data: { token: code, qrCode: code },
    });
    updated++;
    if (updated % 50 === 0) console.log(`...${updated} atualizados`);
  }

  console.log(`Backfill concluído: ${updated} atualizados, ${skipped} já ok, total ${guests.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const w = await prisma.wedding.findFirst();
  console.log("Color:", w?.primaryColor);
}

main().finally(() => prisma.$disconnect());

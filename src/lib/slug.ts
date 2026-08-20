import { prisma } from "./prisma";

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export function generateWeddingSlug(partner1Name: string, partner2Name: string): string {
  const p1 = partner1Name.split(" ")[0] || "parceiro1";
  const p2 = partner2Name.split(" ")[0] || "parceiro2";
  return slugify(`${p1}-e-${p2}`);
}

export async function findAvailableSlug(baseSlug: string): Promise<string> {
  const existing = await prisma.wedding.findUnique({
    where: { slug: baseSlug }
  });

  if (!existing) return baseSlug;

  let counter = 2;
  let available = false;
  let newSlug = `${baseSlug}-${counter}`;

  while (!available) {
    const check = await prisma.wedding.findUnique({
      where: { slug: newSlug }
    });
    if (!check) {
      available = true;
    } else {
      counter++;
      newSlug = `${baseSlug}-${counter}`;
    }
  }

  return newSlug;
}

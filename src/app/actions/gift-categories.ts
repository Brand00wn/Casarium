"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_CATEGORIES = [
  { name: "Cozinha", color: "#ef4444" },
  { name: "Eletrodomésticos", color: "#f97316" },
  { name: "Cama, Mesa e Banho", color: "#3b82f6" },
  { name: "Decoração", color: "#10b981" },
  { name: "Viagem de Lua de Mel", color: "#8b5cf6" },
  { name: "Geral", color: "#64748b" },
];

export async function ensureDefaultCategories(weddingSlug: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug },
    include: { giftCategories: true },
  });

  if (!wedding) return [];

  if (wedding.giftCategories.length === 0) {
    // Create defaults
    await prisma.giftCategory.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        weddingId: wedding.id,
      })),
    });

    return prisma.giftCategory.findMany({
      where: { weddingId: wedding.id },
      orderBy: { name: "asc" },
    });
  }

  return wedding.giftCategories;
}

export async function getGiftCategories(weddingSlug: string) {
  const categories = await prisma.giftCategory.findMany({
    where: { wedding: { slug: weddingSlug } },
    orderBy: { name: "asc" },
  });

  if (categories.length === 0) {
    return ensureDefaultCategories(weddingSlug);
  }

  return categories;
}

export async function createGiftCategory(weddingSlug: string, data: { name: string; color?: string }) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug },
  });

  if (!wedding) throw new Error("Wedding not found");

  const category = await prisma.giftCategory.create({
    data: {
      name: data.name,
      color: data.color || "#64748b",
      weddingId: wedding.id,
    },
  });

  revalidatePath(`/${weddingSlug}/presentes`);
  revalidatePath(`/${weddingSlug}/presentes/categorias`);
  
  return category;
}

export async function updateGiftCategory(categoryId: string, data: { name: string; color?: string }) {
  const category = await prisma.giftCategory.update({
    where: { id: categoryId },
    data: {
      name: data.name,
      ...(data.color && { color: data.color }),
    },
    include: { wedding: true }
  });

  revalidatePath(`/${category.wedding.slug}/presentes`);
  revalidatePath(`/${category.wedding.slug}/presentes/categorias`);

  return category;
}

export async function deleteGiftCategory(categoryId: string) {
  const category = await prisma.giftCategory.delete({
    where: { id: categoryId },
    include: { wedding: true }
  });

  revalidatePath(`/${category.wedding.slug}/presentes`);
  revalidatePath(`/${category.wedding.slug}/presentes/categorias`);

  return category;
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureDefaultCategories } from "./gift-categories";

export async function createGift(weddingSlug: string, data: { name: string; description?: string; price: number; imageUrl?: string; quotaCount?: number; categoryIds?: string[] }) {
  const gift = await prisma.gift.create({
    data: {
      wedding: { connect: { slug: weddingSlug } },
      name: data.name,
      description: data.description,
      price: data.price,
      imageUrl: data.imageUrl,
      quotaCount: data.quotaCount || 1,
      categories: data.categoryIds && data.categoryIds.length > 0
        ? { connect: data.categoryIds.map(id => ({ id })) }
        : undefined,
    },
    include: { categories: true }
  });
  revalidatePath(`/${weddingSlug}/presentes`);
  return gift;
}

export async function updateGift(giftId: string, data: { name?: string; description?: string; price?: number; imageUrl?: string; quotaCount?: number; categoryIds?: string[] }) {
  const updateData: any = {
    name: data.name,
    description: data.description,
    price: data.price,
    imageUrl: data.imageUrl,
    quotaCount: data.quotaCount,
  };

  if (data.categoryIds !== undefined) {
    updateData.categories = {
      set: data.categoryIds.map(id => ({ id }))
    };
  }

  const gift = await prisma.gift.update({
    where: { id: giftId },
    data: updateData,
    include: { categories: true }
  });
  revalidatePath(`/${gift.weddingId}/presentes`);
  return gift;
}

export async function deleteGift(giftId: string) {
  const gift = await prisma.gift.delete({
    where: { id: giftId },
  });
  revalidatePath(`/${gift.weddingId}/presentes`);
  return gift;
}

export async function deleteMultipleGifts(giftIds: string[], weddingSlug: string) {
  const result = await prisma.gift.deleteMany({
    where: { id: { in: giftIds } }
  });
  revalidatePath(`/${weddingSlug}/presentes`);
  return result;
}

export async function getGifts(weddingSlug: string) {
  return prisma.gift.findMany({
    where: { wedding: { slug: weddingSlug } },
    include: { categories: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function seedDefaultGifts(weddingSlug: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug },
  });
  if (!wedding) throw new Error("Wedding not found");

  const categories = await ensureDefaultCategories(weddingSlug);
  const getCat = (name: string) => categories.find(c => c.name === name)?.id;

  const giftsToSeed = [
    { name: "Liquidificador", price: 150, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Batedeira", price: 200, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Micro-ondas", price: 600, quotaCount: 2, cat: getCat("Eletrodomésticos") },
    { name: "Geladeira", price: 3500, quotaCount: 10, cat: getCat("Eletrodomésticos") },
    { name: "Fogão 4 bocas", price: 900, quotaCount: 3, cat: getCat("Eletrodomésticos") },
    { name: "Jogo de Panelas", price: 350, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Faqueiro 130 peças", price: 250, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Aparelho de Jantar", price: 400, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Jogo de Taças", price: 180, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Máquina de Lavar Roupas", price: 2200, quotaCount: 5, cat: getCat("Eletrodomésticos") },
    { name: "Ferro de Passar", price: 120, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Aspirador de Pó", price: 280, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Cafeteira Elétrica", price: 150, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Sanduicheira", price: 90, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Air Fryer", price: 450, quotaCount: 2, cat: getCat("Eletrodomésticos") },
    { name: "Jogo de Cama Casal", price: 200, quotaCount: 1, cat: getCat("Cama, Mesa e Banho") },
    { name: "Jogo de Banho", price: 150, quotaCount: 1, cat: getCat("Cama, Mesa e Banho") },
    { name: "Edredom", price: 250, quotaCount: 1, cat: getCat("Cama, Mesa e Banho") },
    { name: "Travesseiros (Par)", price: 80, quotaCount: 1, cat: getCat("Cama, Mesa e Banho") },
    { name: "Tapete para Sala", price: 300, quotaCount: 1, cat: getCat("Decoração") },
    { name: "Smart TV 50\"", price: 2500, quotaCount: 5, cat: getCat("Eletrodomésticos") },
    { name: "Rack para TV", price: 600, quotaCount: 2, cat: getCat("Decoração") },
    { name: "Sofá 3 lugares", price: 1800, quotaCount: 4, cat: getCat("Decoração") },
    { name: "Mesa de Jantar com 4 Cadeiras", price: 1200, quotaCount: 3, cat: getCat("Decoração") },
    { name: "Cama Box Casal", price: 1500, quotaCount: 4, cat: getCat("Cama, Mesa e Banho") },
    { name: "Guarda-roupas", price: 1600, quotaCount: 4, cat: getCat("Decoração") },
    { name: "Panela de Pressão Elétrica", price: 300, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Processador de Alimentos", price: 220, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Espremedor de Frutas", price: 100, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Torradeira", price: 110, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Mixer", price: 130, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Grill", price: 180, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Chaleira Elétrica", price: 120, quotaCount: 1, cat: getCat("Eletrodomésticos") },
    { name: "Balança de Cozinha", price: 50, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Conjunto de Potes", price: 80, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Fruteira", price: 90, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Lixeira Inox", price: 150, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Tábua de Passar Roupas", price: 100, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Varal de Chão", price: 80, quotaCount: 1, cat: getCat("Geral") },
    { name: "Conjunto de Assadeiras", price: 120, quotaCount: 1, cat: getCat("Cozinha") },
    { name: "Cota de Viagem (Cotas de R$100)", price: 100, quotaCount: 50, cat: getCat("Viagem de Lua de Mel") },
    { name: "Cota para Jantar Romântico", price: 300, quotaCount: 1, cat: getCat("Viagem de Lua de Mel") },
    { name: "Cota para Passeio Turístico", price: 200, quotaCount: 2, cat: getCat("Viagem de Lua de Mel") },
    { name: "Cota SPA Relaxante", price: 400, quotaCount: 1, cat: getCat("Geral") },
    { name: "Cota Aluguel de Carro", price: 150, quotaCount: 3, cat: getCat("Viagem de Lua de Mel") },
    { name: "Cota Primeiro Mês de Mercado", price: 500, quotaCount: 2, cat: getCat("Geral") },
    { name: "Cota Primeira Conta de Luz", price: 200, quotaCount: 1, cat: getCat("Geral") },
    { name: "Cota Primeira Conta de Água", price: 100, quotaCount: 1, cat: getCat("Geral") },
    { name: "Cota Netflix 1 Ano", price: 600, quotaCount: 1, cat: getCat("Geral") },
    { name: "Cota Spotify 1 Ano", price: 250, quotaCount: 1, cat: getCat("Geral") },
  ];

  // Prisma createMany does not support nested relations.
  // We insert one by one or in a Promise.all, which is fine for 50 records.
  await Promise.all(
    giftsToSeed.map(async (g) => {
      await prisma.gift.create({
        data: {
          name: g.name,
          price: g.price,
          quotaCount: g.quotaCount,
          weddingId: wedding.id,
          categories: g.cat ? { connect: { id: g.cat } } : undefined,
        },
      });
    })
  );

  revalidatePath(`/${weddingSlug}/presentes`);
}

export async function getTransactions(weddingSlug: string) {
  return prisma.transaction.findMany({
    where: { wedding: { slug: weddingSlug } },
    include: { gift: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function simulateCheckout(weddingSlug: string, giftId: string | null, data: { amount: number; paymentMethod: "PIX" | "CREDIT_CARD"; guestName: string; guestMessage?: string }) {
  const transaction = await prisma.transaction.create({
    data: {
      amount: data.amount,
      status: "PAID",
      paymentMethod: data.paymentMethod,
      guestName: data.guestName,
      guestMessage: data.guestMessage,
      wedding: { connect: { slug: weddingSlug } },
      ...(giftId && { gift: { connect: { id: giftId } } }),
    },
  });
  revalidatePath(`/${weddingSlug}/presentes`);
  revalidatePath(`/site/${weddingSlug}/presentes`);
  return transaction;
}

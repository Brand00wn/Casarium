"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/session";
import { deleteUploadthingUrls } from "@/lib/uploadthing-manage";
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
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) {
    if (Number.isNaN(data.price)) throw new Error("Preço inválido");
    updateData.price = data.price;
  }
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
  if (data.quotaCount !== undefined) updateData.quotaCount = data.quotaCount;

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

/**
 * Remove a imagem de um presente: apaga o arquivo do UploadThing (se for de lá)
 * e limpa o campo. Usado ao excluir/substituir pelo formulário.
 */
export async function removeGiftImage(weddingSlug: string, giftId: string | null, imageUrl: string, options?: { clearField?: boolean }) {
  await requirePermission(weddingSlug, "canManageGuests");
  try {
    await deleteUploadthingUrls([imageUrl]);
  } catch (e: any) {
    // Sem token do UT ou falha de rede: limpa o campo mesmo assim
    console.error("Falha ao apagar imagem do UploadThing:", e.message);
  }
  if (giftId && options?.clearField !== false) {
    await prisma.gift.update({
      where: { id: giftId },
      data: { imageUrl: null },
    });
    revalidatePath(`/${weddingSlug}/presentes`);
  }
  return { success: true };
}

/** Checa quais presentes têm imagem quebrada (HEAD request com timeout). */
export async function auditGiftImages(weddingSlug: string) {
  await requirePermission(weddingSlug, "canManageGuests");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");

  const gifts = await prisma.gift.findMany({
    where: { weddingId: wedding.id, imageUrl: { not: null } },
    select: { id: true, name: true, imageUrl: true },
    orderBy: { name: "asc" },
  });

  const broken: { id: string, name: string, imageUrl: string, status: string }[] = [];

  await Promise.all(gifts.map(async (g) => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(g.imageUrl!, { method: "HEAD", signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) broken.push({ id: g.id, name: g.name, imageUrl: g.imageUrl!, status: `HTTP ${res.status}` });
    } catch (e: any) {
      broken.push({ id: g.id, name: g.name, imageUrl: g.imageUrl!, status: e.name === "AbortError" ? "timeout" : "inacessível" });
    }
  }));

  return { total: gifts.length, broken };
}

export async function deleteGift(giftId: string) {
  const gift = await prisma.gift.findUnique({ where: { id: giftId } });
  if (!gift) throw new Error("Presente não encontrado");
  try {
    await deleteUploadthingUrls([gift.imageUrl]);
  } catch (e) {
    console.error("Falha ao apagar imagem do UploadThing:", e);
  }
  const deleted = await prisma.gift.delete({
    where: { id: giftId },
  });
  revalidatePath(`/${deleted.weddingId}/presentes`);
  return deleted;
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

  const U = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=600&auto=format&fit=crop`;
  const giftsToSeed = [
    { name: "Liquidificador", price: 150, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1570222094114-d054a817e56b") },
    { name: "Batedeira", price: 200, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1578643463396-0997cb5328c1") },
    { name: "Micro-ondas", price: 600, quotaCount: 2, cat: getCat("Eletrodomésticos"), img: U("1595246140625-573b715d11dc") },
    { name: "Geladeira", price: 3500, quotaCount: 10, cat: getCat("Eletrodomésticos"), img: U("1584269600464-37b1b58a9fe7") },
    { name: "Fogão 4 bocas", price: 900, quotaCount: 3, cat: getCat("Eletrodomésticos"), img: U("1574269909862-7e1d70bb8078") },
    { name: "Jogo de Panelas", price: 350, quotaCount: 1, cat: getCat("Cozinha"), img: U("1556911220-bff31c812dba") },
    { name: "Faqueiro 130 peças", price: 250, quotaCount: 1, cat: getCat("Cozinha"), img: U("1584346133934-a3afd2a33c4c") },
    { name: "Aparelho de Jantar", price: 400, quotaCount: 1, cat: getCat("Cozinha"), img: U("1615873968403-89e068629265") },
    { name: "Jogo de Taças", price: 180, quotaCount: 1, cat: getCat("Cozinha"), img: U("1510812431401-41d2bd2722f3") },
    { name: "Máquina de Lavar Roupas", price: 2200, quotaCount: 5, cat: getCat("Eletrodomésticos"), img: U("1626806787461-102c1bfaaea1") },
    { name: "Ferro de Passar", price: 120, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1517677208171-0bc6725a3e60") },
    { name: "Aspirador de Pó", price: 280, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1558317374-067fb5f30001") },
    { name: "Cafeteira Elétrica", price: 150, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1497935586351-b67a49e012bf") },
    { name: "Sanduicheira", price: 90, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1525351484163-7529414344d8") },
    { name: "Air Fryer", price: 450, quotaCount: 2, cat: getCat("Eletrodomésticos"), img: U("1628840042765-356cda07504e") },
    { name: "Jogo de Cama Casal", price: 200, quotaCount: 1, cat: getCat("Cama, Mesa e Banho"), img: U("1522771739844-6a9f6d5f14af") },
    { name: "Jogo de Banho", price: 150, quotaCount: 1, cat: getCat("Cama, Mesa e Banho"), img: U("1522771739844-6a9f6d5f14af") },
    { name: "Edredom", price: 250, quotaCount: 1, cat: getCat("Cama, Mesa e Banho"), img: U("1584100936595-c0654b55a2e2") },
    { name: "Travesseiros (Par)", price: 80, quotaCount: 1, cat: getCat("Cama, Mesa e Banho"), img: U("1631049307264-da0ec9d70304") },
    { name: "Tapete para Sala", price: 300, quotaCount: 1, cat: getCat("Decoração"), img: U("1600166898405-da9535204843") },
    { name: "Smart TV 50\"", price: 2500, quotaCount: 5, cat: getCat("Eletrodomésticos"), img: U("1593359677879-a4bb92f829d1") },
    { name: "Rack para TV", price: 600, quotaCount: 2, cat: getCat("Decoração"), img: U("1595428774223-ef52624120d2") },
    { name: "Sofá 3 lugares", price: 1800, quotaCount: 4, cat: getCat("Decoração"), img: U("1555041469-a586c61ea9bc") },
    { name: "Mesa de Jantar com 4 Cadeiras", price: 1200, quotaCount: 3, cat: getCat("Decoração"), img: U("1577140917170-285929fb55b7") },
    { name: "Cama Box Casal", price: 1500, quotaCount: 4, cat: getCat("Cama, Mesa e Banho"), img: U("1505693314120-0d443867891c") },
    { name: "Guarda-roupas", price: 1600, quotaCount: 4, cat: getCat("Decoração"), img: U("1595428774223-ef52624120d2") },
    { name: "Panela de Pressão Elétrica", price: 300, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1585515320310-259814833e62") },
    { name: "Processador de Alimentos", price: 220, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1585515320310-259814833e62") },
    { name: "Espremedor de Frutas", price: 100, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1600271886742-f049cd451bba") },
    { name: "Torradeira", price: 110, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1533089860892-a7c6f0a88666") },
    { name: "Mixer", price: 130, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1578643463396-0997cb5328c1") },
    { name: "Grill", price: 180, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1555939594-58d7cb561ad1") },
    { name: "Chaleira Elétrica", price: 120, quotaCount: 1, cat: getCat("Eletrodomésticos"), img: U("1594213114663-d94db9b17125") },
    { name: "Balança de Cozinha", price: 50, quotaCount: 1, cat: getCat("Cozinha"), img: U("1584589167171-541ce45f1eea") },
    { name: "Conjunto de Potes", price: 80, quotaCount: 1, cat: getCat("Cozinha"), img: U("1584589167171-541ce45f1eea") },
    { name: "Fruteira", price: 90, quotaCount: 1, cat: getCat("Cozinha"), img: U("1610832958506-aa56368176cf") },
    { name: "Lixeira Inox", price: 150, quotaCount: 1, cat: getCat("Cozinha"), img: U("1532996122724-e3c354a0b15b") },
    { name: "Tábua de Passar Roupas", price: 100, quotaCount: 1, cat: getCat("Cozinha"), img: U("1521656693074-0ef32e80a5d5") },
    { name: "Varal de Chão", price: 80, quotaCount: 1, cat: getCat("Geral"), img: U("1521656693074-0ef32e80a5d5") },
    { name: "Conjunto de Assadeiras", price: 120, quotaCount: 1, cat: getCat("Cozinha"), img: U("1555939594-58d7cb561ad1") },
    { name: "Cota de Viagem (Cotas de R$100)", price: 100, quotaCount: 50, cat: getCat("Viagem de Lua de Mel"), img: U("1436491865332-7a61a109cc05") },
    { name: "Cota para Jantar Romântico", price: 300, quotaCount: 1, cat: getCat("Viagem de Lua de Mel"), img: U("1517248135467-4c7edcad34c4") },
    { name: "Cota para Passeio Turístico", price: 200, quotaCount: 2, cat: getCat("Viagem de Lua de Mel"), img: U("1544551763-46a013bb70d5") },
    { name: "Cota SPA Relaxante", price: 400, quotaCount: 1, cat: getCat("Geral"), img: U("1544161515-4ab6ce6db874") },
    { name: "Cota Aluguel de Carro", price: 150, quotaCount: 3, cat: getCat("Viagem de Lua de Mel"), img: U("1449965408869-eaa3f722e40d") },
    { name: "Cota Primeiro Mês de Mercado", price: 500, quotaCount: 2, cat: getCat("Geral"), img: U("1542838132-92c53300491e") },
    { name: "Cota Primeira Conta de Luz", price: 200, quotaCount: 1, cat: getCat("Geral"), img: U("1554224155-6726b3ff858f") },
    { name: "Cota Primeira Conta de Água", price: 100, quotaCount: 1, cat: getCat("Geral"), img: U("1554224155-6726b3ff858f") },
    { name: "Cota Netflix 1 Ano", price: 600, quotaCount: 1, cat: getCat("Geral"), img: U("1522869635100-9f4c5e86aa37") },
    { name: "Cota Spotify 1 Ano", price: 250, quotaCount: 1, cat: getCat("Geral"), img: U("1614680376593-902f74cf0d41") },
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
          imageUrl: (g as any).img || null,
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

export async function simulateCheckout(weddingSlug: string, giftId: string | null,
data: { amount: number; paymentMethod: "PIX" | "CREDIT_CARD"; guestName: string; guestMessage?: string; guestId?: string }) {
  const transaction = await prisma.transaction.create({
    data: {
      amount: data.amount,
      status: "PAID",
      paymentMethod: data.paymentMethod,
      guestName: data.guestName,
      guestMessage: data.guestMessage,
      wedding: { connect: { slug: weddingSlug } },
      ...(giftId && { gift: { connect: { id: giftId } } }),
      ...(data.guestId && { guest: { connect: { id: data.guestId } } }),
    },
  });
  revalidatePath(`/${weddingSlug}/presentes`);
  revalidatePath(`/site/${weddingSlug}/presentes`);
  return transaction;
}

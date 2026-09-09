"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requirePermission } from "@/lib/session";
import { normalizeGuestCode } from "@/lib/guest-code";

/** A rota recebe o slug, mas várias queries esperam o id — resolve os dois. */
async function resolveWedding(slugOrId: string) {
  const wedding = await prisma.wedding.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    select: { id: true, slug: true },
  });
  return wedding;
}

export async function validateQrCode(weddingId: string, code: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Acesso negado." };

    const wedding = await resolveWedding(weddingId);
    if (!wedding) {
      return { success: false, error: "Casamento não encontrado." };
    }

    const normalized = normalizeGuestCode(code);
    // QR carrega o token; aceita token ou qrCode legado
    const guest = await prisma.guest.findFirst({
      where: {
        weddingId: wedding.id,
        OR: [{ token: normalized }, { qrCode: code.trim() }, { qrCode: normalized }],
      },
      include: {
        family: {
          include: {
            guests: {
              orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
              select: { id: true, name: true, isPrimary: true, checkedIn: true, rsvpStatus: true },
            },
          },
        },
      },
    });

    if (!guest) {
      return { success: false, error: "Convidado não encontrado neste casamento." };
    }

    if (guest.checkedIn) {
      return { success: false, error: `${guest.name} já fez check-in.` };
    }

    const family = guest.family?.guests ?? [
      { id: guest.id, name: guest.name, isPrimary: guest.isPrimary, checkedIn: guest.checkedIn, rsvpStatus: guest.rsvpStatus },
    ];

    return {
      success: true,
      guest: {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        familyCount: family.length,
        family: family.map((m) => ({
          id: m.id,
          name: m.name,
          isPrimary: m.isPrimary,
          checkedIn: m.checkedIn,
          rsvpStatus: m.rsvpStatus,
        })),
      },
    };
  } catch (error) {
    console.error("Error validating QR Code:", error);
    return { success: false, error: "Erro interno ao validar QR Code." };
  }
}

/** Marca entrada de um grupo (família) de uma vez. */
export async function checkinGroup(weddingSlug: string, guestIds: string[]) {
  try {
    await requirePermission(weddingSlug, "canManageGuests");
    const wedding = await resolveWedding(weddingSlug);
    if (!wedding) throw new Error("Casamento não encontrado");
    if (!guestIds.length) throw new Error("Nenhum convidado selecionado");

    // Garante que todos os IDs pertencem a este casamento
    const count = await prisma.guest.count({
      where: { id: { in: guestIds }, weddingId: wedding.id },
    });
    if (count !== guestIds.length) {
      throw new Error("Alguns convidados não pertencem a este casamento.");
    }

    const now = new Date();
    await prisma.guest.updateMany({
      where: { id: { in: guestIds } },
      data: { checkedIn: true, checkedInAt: now },
    });

    return { success: true, count: guestIds.length };
  } catch (error: any) {
    console.error("Error in group check-in:", error);
    return { success: false, error: error.message || "Erro ao fazer check-in." };
  }
}

export async function toggleCheckin(weddingSlug: string, guestId: string, status: boolean) {
  await requirePermission(weddingSlug, "canManageGuests");
  const wedding = await resolveWedding(weddingSlug);
  if (!wedding) throw new Error("Casamento não encontrado");

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, weddingId: wedding.id },
    select: { id: true },
  });
  if (!guest) throw new Error("Convidado não pertence a este casamento");

  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      checkedIn: status,
      checkedInAt: status ? new Date() : null
    }
  });

  return updated;
}

export async function getCheckinStats(weddingSlug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Acesso negado");

  const wedding = await resolveWedding(weddingSlug);
  if (!wedding) throw new Error("Casamento não encontrado");

  // Apenas quem confirmou presença ou tem checkin
  const guests = await prisma.guest.findMany({
    where: {
      weddingId: wedding.id,
      OR: [
        { rsvpStatus: 'CONFIRMED' },
        { checkedIn: true }
      ]
    },
    select: {
      id: true,
      name: true,
      checkedIn: true,
      checkedInAt: true,
      rsvpStatus: true,
      qrCode: true
    },
    orderBy: { name: 'asc' }
  });

  const totalConfirmed = guests.length;
  const totalCheckedIn = guests.filter(g => g.checkedIn).length;

  return {
    totalConfirmed,
    totalCheckedIn,
    guests
  };
}

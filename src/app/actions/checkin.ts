"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function validateQrCode(weddingId: string, qrCode: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { qrCode },
      include: {
        family: {
          include: { guests: true }
        },
        wedding: true
      }
    });

    if (!guest) {
      return { success: false, error: "Convidado não encontrado." };
    }

    if (guest.wedding.slug !== weddingId && guest.wedding.id !== weddingId) {
       return { success: false, error: "Convidado pertence a outro casamento." };
    }

    if (guest.checkedIn) {
      return { success: false, error: "Check-in já realizado anteriormente." };
    }

    const now = new Date();

    // Update guest
    await prisma.guest.update({
      where: { id: guest.id },
      data: { checkedIn: true, checkedInAt: now }
    });

    return { 
      success: true, 
      guest: {
        name: guest.name,
        email: guest.email,
        checkedInAt: now,
      }
    };
  } catch (error) {
    console.error("Error validating QR Code:", error);
    return { success: false, error: "Erro interno ao validar QR Code." };
  }
}

export async function toggleCheckin(guestId: string, status: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Acesso negado");

  const guest = await prisma.guest.update({
    where: { id: guestId },
    data: {
      checkedIn: status,
      checkedInAt: status ? new Date() : null
    }
  });

  return guest;
}

export async function getCheckinStats(weddingId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Acesso negado");

  // Apenas quem confirmou presença ou tem checkin
  const guests = await prisma.guest.findMany({
    where: {
      weddingId,
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

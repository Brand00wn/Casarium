"use server";

import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { WhatsAppStatus } from "@prisma/client";

export async function sendInvite(weddingId: string, guestId: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: guestId, weddingId },
      include: { wedding: true }
    });

    if (!guest) {
      return { success: false, error: "Guest not found" };
    }

    if (!guest.phone) {
      return { success: false, error: "Guest has no phone number" };
    }

    const rsvpLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/site/${guest.wedding.slug}/rsvp`;
    
    const message = `Olá ${guest.name}! Você foi convidado para o casamento de ${guest.wedding.partner1Name} e ${guest.wedding.partner2Name}.
    
Confirme sua presença no link: ${rsvpLink}
Seu token de acesso é: ${guest.token || "não gerado"}
Seu QR Code para o Check-in é: ${guest.qrCode}`;

    await sendWhatsAppMessage(guest.phone, message);

    await prisma.guest.update({
      where: { id: guestId },
      data: { whatsappStatus: WhatsAppStatus.SENT }
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp invite:", error);
    return { success: false, error: "Failed to send WhatsApp invite" };
  }
}

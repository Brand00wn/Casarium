"use server";

import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { sendWhatsAppMessage, sendWhatsAppImage } from "@/lib/whatsapp";
import { guestCodeQrDataUrl } from "@/lib/guest-qr";
import { WhatsAppStatus } from "@prisma/client";

export async function sendInvite(weddingSlugOrId: string, guestId: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        wedding: true,
        family: { include: { guests: { select: { id: true } } } },
      }
    });

    if (!guest) {
      return { success: false, error: "Guest not found" };
    }

    // A tela passa o slug da rota — valida que o convidado é deste casamento
    if (guest.weddingId !== weddingSlugOrId && guest.wedding.slug !== weddingSlugOrId) {
      return { success: false, error: "Guest not found" };
    }

    if (!guest.phone) {
      return { success: false, error: "Guest has no phone number" };
    }

    if (!guest.token) {
      return { success: false, error: "Guest has no invite code" };
    }

    const siteUrl = await getSiteUrl();
    // Deep-link com o token: abre o convite direto, sem busca
    const rsvpLink = `${siteUrl}/site/${guest.wedding.slug}/rsvp?token=${guest.token}`;
    const familySize = guest.family ? guest.family.guests.length : 1;

    const message = `Olá ${guest.name}! Você foi convidado para o casamento de ${guest.wedding.partner1Name} e ${guest.wedding.partner2Name}.

Confirme sua presença no link: ${rsvpLink}
${familySize > 1 ? `Este convite vale para ${familySize} pessoas. ` : ""}Seu código é: ${guest.token}`;

    const textRes = await sendWhatsAppMessage(guest.phone, message);
    if (!textRes.ok) {
      return { success: false, error: textRes.error };
    }

    // QR de entrada: um por representante (titular). O QR carrega o token.
    if (guest.isPrimary) {
      const qrImage = await guestCodeQrDataUrl(guest.token);
      const mediaRes = await sendWhatsAppImage(
        guest.phone,
        qrImage,
        `🎟️ Este é seu QR Code de entrada${familySize > 1 ? ` (vale para ${familySize} pessoas)` : ""}. Apresente na portaria do evento.`
      );
      if (!mediaRes.ok) {
        return { success: false, error: `Texto enviado, mas o QR falhou: ${mediaRes.error}` };
      }
    }

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

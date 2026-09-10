"use server";

import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { sendWhatsAppMessage, sendWhatsAppImage } from "@/lib/whatsapp";
import { guestCodeQrDataUrl } from "@/lib/guest-qr";
import { MessageStatus, MessageType, WhatsAppStatus } from "@prisma/client";

export type DeliveryResult = { ok: true } | { ok: false, error: string };

async function logDelivery(guestId: string, weddingId: string, type: MessageType, ok: boolean) {
  try {
    await prisma.whatsAppMessage.create({
      data: {
        guestId,
        weddingId,
        type,
        status: ok ? MessageStatus.SENT : MessageStatus.FAILED,
        sentAt: ok ? new Date() : null,
      },
    });
  } catch (e) {
    console.error("Error logging WhatsApp delivery:", e);
  }
}

async function loadGuest(guestId: string) {
  return prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      wedding: true,
      family: { include: { guests: { select: { id: true, rsvpStatus: true } } } },
    },
  });
}

type LoadedGuest = NonNullable<Awaited<ReturnType<typeof loadGuest>>>;

function inviteText(guest: LoadedGuest, rsvpLink: string, familySize: number) {
  return `Olá ${guest.name}! Você foi convidado para o casamento de ${guest.wedding.partner1Name} e ${guest.wedding.partner2Name}.

Confirme sua presença no link: ${rsvpLink}
${familySize > 1 ? `Este convite vale para ${familySize} pessoas. ` : ""}Seu código é: ${guest.token}`;
}

function reminderText(guest: LoadedGuest, rsvpLink: string, daysLeft: number) {
  const when = daysLeft > 1 ? `Faltam ${daysLeft} dias` : daysLeft === 1 ? "É amanhã" : "É hoje";
  return `Olá ${guest.name}! ${when} para o casamento de ${guest.wedding.partner1Name} e ${guest.wedding.partner2Name} e ainda não registramos sua confirmação. 💍

Confirme aqui: ${rsvpLink}
Seu código é: ${guest.token}`;
}

async function sendTextAndQr(guest: LoadedGuest, text: string, qrCaption: string): Promise<DeliveryResult> {
  if (!guest.phone || !guest.token) {
    return { ok: false, error: !guest.phone ? "Guest has no phone number" : "Guest has no invite code" };
  }

  const textRes = await sendWhatsAppMessage(guest.phone, text);
  if (!textRes.ok) return { ok: false, error: textRes.error };

  // QR de entrada: um por representante (titular). O QR carrega o token.
  if (guest.isPrimary) {
    const qrImage = await guestCodeQrDataUrl(guest.token);
    const mediaRes = await sendWhatsAppImage(guest.phone, qrImage, qrCaption);
    if (!mediaRes.ok) {
      return { ok: false, error: `Texto enviado, mas o QR falhou: ${mediaRes.error}` };
    }
  }

  return { ok: true };
}

/** Dispara o convite (texto + QR) para um convidado já carregado. */
export async function deliverInvite(guestId: string): Promise<DeliveryResult & { guestName?: string }> {
  const guest = await loadGuest(guestId);
  if (!guest) return { ok: false, error: "Guest not found" };

  const siteUrl = await getSiteUrl();
  const rsvpLink = `${siteUrl}/site/${guest.wedding.slug}/rsvp?token=${guest.token}`;
  const familySize = guest.family ? guest.family.guests.length : 1;

  const result = await sendTextAndQr(
    guest,
    inviteText(guest, rsvpLink, familySize),
    `🎟️ Este é seu QR Code de entrada${familySize > 1 ? ` (vale para ${familySize} pessoas)` : ""}. Apresente na portaria do evento.`
  );

  await logDelivery(guest.id, guest.weddingId, MessageType.INVITE, result.ok);
  if (result.ok) {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { whatsappStatus: WhatsAppStatus.SENT },
    });
  }
  return { ...result, guestName: guest.name };
}

/** Dispara o lembrete de RSVP para um convidado já carregado. */
export async function deliverReminder(guestId: string, daysLeft: number): Promise<DeliveryResult & { guestName?: string }> {
  const guest = await loadGuest(guestId);
  if (!guest) return { ok: false, error: "Guest not found" };

  const siteUrl = await getSiteUrl();
  const rsvpLink = `${siteUrl}/site/${guest.wedding.slug}/rsvp?token=${guest.token}`;
  const familySize = guest.family ? guest.family.guests.length : 1;

  const result = await sendTextAndQr(
    guest,
    reminderText(guest, rsvpLink, daysLeft),
    `🎟️ Seu QR Code de entrada${familySize > 1 ? ` (vale para ${familySize} pessoas)` : ""}. Apresente na portaria.`
  );

  await logDelivery(guest.id, guest.weddingId, MessageType.REMINDER, result.ok);
  return { ...result, guestName: guest.name };
}

export async function sendInvite(weddingSlugOrId: string, guestId: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { wedding: true },
    });

    if (!guest) {
      return { success: false, error: "Guest not found" };
    }

    // A tela passa o slug da rota — valida que o convidado é deste casamento
    if (guest.weddingId !== weddingSlugOrId && guest.wedding.slug !== weddingSlugOrId) {
      return { success: false, error: "Guest not found" };
    }

    const result = await deliverInvite(guestId);
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp invite:", error);
    return { success: false, error: "Failed to send WhatsApp invite" };
  }
}

"use server"

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserMemberRole } from "@/lib/session";
import { isCeremonyStaff } from "@/lib/messaging-gate";
import { DEFAULT_MESSAGING, SEND_DELAY_MS, sleep } from "@/lib/whatsapp-helpers";
import { deliverInvite, deliverReminder } from "@/app/actions/whatsapp";

/** Só a equipe do cerimonial opera disparos (nunca os noivos). */
async function requireStaff(weddingSlug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado");
  const memberRole = await getUserMemberRole(user.id, weddingSlug);
  if (!isCeremonyStaff(user.role, memberRole)) {
    throw new Error("Acesso restrito à equipe do cerimonial");
  }
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  return wedding;
}

export async function getMessagingConfig(weddingSlug: string) {
  const wedding = await requireStaff(weddingSlug);
  const existing = await prisma.weddingMessagingConfig.findUnique({
    where: { weddingId: wedding.id },
  });
  if (existing) return existing;
  return prisma.weddingMessagingConfig.create({
    data: { weddingId: wedding.id, ...DEFAULT_MESSAGING },
  });
}

export async function updateMessagingConfig(weddingSlug: string, data: {
  autoInviteEnabled?: boolean;
  inviteDaysBefore?: number;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderIntervalDays?: number;
}) {
  const wedding = await requireStaff(weddingSlug);

  const clamp = (v: number | undefined, min: number, max: number, fallback: number) =>
    v === undefined || Number.isNaN(v) ? fallback : Math.min(max, Math.max(min, Math.round(v)));

  return prisma.weddingMessagingConfig.upsert({
    where: { weddingId: wedding.id },
    create: {
      weddingId: wedding.id,
      ...DEFAULT_MESSAGING,
      autoInviteEnabled: data.autoInviteEnabled ?? DEFAULT_MESSAGING.autoInviteEnabled,
      inviteDaysBefore: clamp(data.inviteDaysBefore, 1, 365, DEFAULT_MESSAGING.inviteDaysBefore),
      reminderEnabled: data.reminderEnabled ?? DEFAULT_MESSAGING.reminderEnabled,
      reminderDaysBefore: clamp(data.reminderDaysBefore, 1, 365, DEFAULT_MESSAGING.reminderDaysBefore),
      reminderIntervalDays: clamp(data.reminderIntervalDays, 1, 60, DEFAULT_MESSAGING.reminderIntervalDays),
    },
    update: {
      ...(data.autoInviteEnabled !== undefined && { autoInviteEnabled: data.autoInviteEnabled }),
      ...(data.inviteDaysBefore !== undefined && { inviteDaysBefore: clamp(data.inviteDaysBefore, 1, 365, DEFAULT_MESSAGING.inviteDaysBefore) }),
      ...(data.reminderEnabled !== undefined && { reminderEnabled: data.reminderEnabled }),
      ...(data.reminderDaysBefore !== undefined && { reminderDaysBefore: clamp(data.reminderDaysBefore, 1, 365, DEFAULT_MESSAGING.reminderDaysBefore) }),
      ...(data.reminderIntervalDays !== undefined && { reminderIntervalDays: clamp(data.reminderIntervalDays, 1, 60, DEFAULT_MESSAGING.reminderIntervalDays) }),
    },
  });
}

type BulkSummary = {
  sent: number;
  failed: { name: string, error: string }[];
  skippedNoPhone: number;
};

/** Envia o convite agora para todos os titulares com telefone. */
export async function sendAllInvitesNow(weddingSlug: string) {
  const wedding = await requireStaff(weddingSlug);

  const primaries = await prisma.guest.findMany({
    where: { weddingId: wedding.id, isPrimary: true },
    select: { id: true, phone: true, token: true, name: true },
    orderBy: { name: "asc" },
  });

  const summary: BulkSummary = { sent: 0, failed: [], skippedNoPhone: 0 };

  for (const g of primaries) {
    if (!g.phone || !g.token) {
      summary.skippedNoPhone++;
      continue;
    }
    try {
      const res = await deliverInvite(g.id);
      if (res.ok) summary.sent++;
      else summary.failed.push({ name: g.name, error: res.error });
    } catch (e: any) {
      summary.failed.push({ name: g.name, error: e.message || "Erro desconhecido" });
    }
    await sleep(SEND_DELAY_MS);
  }

  await prisma.weddingMessagingConfig.upsert({
    where: { weddingId: wedding.id },
    create: { weddingId: wedding.id, ...DEFAULT_MESSAGING, inviteSentAt: new Date() },
    update: { inviteSentAt: new Date() },
  });

  return summary;
}

/** Lembra agora os titulares com telefone que têm pendentes na família. */
export async function sendPendingRemindersNow(weddingSlug: string) {
  const wedding = await requireStaff(weddingSlug);
  return sendPendingReminders(wedding.id, true);
}

export async function sendPendingReminders(weddingId: string, touchLastRun = true) {
  const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
  if (!wedding) throw new Error("Casamento não encontrado");

  const eventDate = wedding.ceremonyDate ?? wedding.date;
  const daysLeft = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const primaries = await prisma.guest.findMany({
    where: {
      weddingId,
      isPrimary: true,
      phone: { not: null },
      token: { not: null },
      family: { guests: { some: { rsvpStatus: "PENDING" } } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const summary: BulkSummary = { sent: 0, failed: [], skippedNoPhone: 0 };

  for (const g of primaries) {
    try {
      const res = await deliverReminder(g.id, Math.max(daysLeft, 0));
      if (res.ok) summary.sent++;
      else summary.failed.push({ name: g.name, error: res.error });
    } catch (e: any) {
      summary.failed.push({ name: g.name, error: e.message || "Erro desconhecido" });
    }
    await sleep(SEND_DELAY_MS);
  }

  if (touchLastRun) {
    await prisma.weddingMessagingConfig.upsert({
      where: { weddingId },
      create: { weddingId, ...DEFAULT_MESSAGING, lastReminderAt: new Date() },
      update: { lastReminderAt: new Date() },
    });
  }

  return { ...summary, daysLeft: Math.max(daysLeft, 0) };
}

/** Dispara convites em massa (usado pelo cron e pelo botão). Retorna resumo. */
export async function sendBulkInvites(weddingId: string) {
  const primaries = await prisma.guest.findMany({
    where: { weddingId, isPrimary: true, phone: { not: null }, token: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const summary: BulkSummary = { sent: 0, failed: [], skippedNoPhone: 0 };

  for (const g of primaries) {
    try {
      const res = await deliverInvite(g.id);
      if (res.ok) summary.sent++;
      else summary.failed.push({ name: g.name, error: res.error });
    } catch (e: any) {
      summary.failed.push({ name: g.name, error: e.message || "Erro desconhecido" });
    }
    await sleep(SEND_DELAY_MS);
  }

  await prisma.weddingMessagingConfig.upsert({
    where: { weddingId },
    create: { weddingId, ...DEFAULT_MESSAGING, inviteSentAt: new Date() },
    update: { inviteSentAt: new Date() },
  });

  return summary;
}

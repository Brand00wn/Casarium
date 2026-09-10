import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBulkInvites, sendPendingReminders } from "@/app/actions/messaging";
import { DEFAULT_MESSAGING } from "@/lib/whatsapp-helpers";

const DAY_MS = 1000 * 60 * 60 * 24;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * Disparos automáticos (convites + lembretes).
 * Agende 1x ao dia via cron externo:
 *   GET https://<app>/api/cron/dispatch  (header Authorization: Bearer <CRON_SECRET>)
 * No Railway: crie um Cron Job com:
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/dispatch
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const weddings = await prisma.wedding.findMany({
    select: {
      id: true,
      slug: true,
      date: true,
      ceremonyDate: true,
      messagingConfig: true,
    },
  });

  const report: any[] = [];

  for (const w of weddings) {
    const cfg = w.messagingConfig ?? { ...DEFAULT_MESSAGING, inviteSentAt: null, lastReminderAt: null };
    const eventDate = w.ceremonyDate ?? w.date;
    const daysLeft = Math.ceil((eventDate.getTime() - Date.now()) / DAY_MS);
    const entry: any = { slug: w.slug, daysLeft };

    try {
      // Convite automático: uma vez, quando faltar inviteDaysBefore dias
      if (cfg.autoInviteEnabled && !cfg.inviteSentAt && daysLeft <= cfg.inviteDaysBefore && daysLeft >= 0) {
        entry.invites = await sendBulkInvites(w.id);
      }

      // Lembretes: dentro da janela, respeitando o intervalo
      if (cfg.reminderEnabled && daysLeft <= cfg.reminderDaysBefore && daysLeft >= 0) {
        const last = cfg.lastReminderAt ? cfg.lastReminderAt.getTime() : 0;
        const daysSince = (Date.now() - last) / DAY_MS;
        if (!cfg.lastReminderAt || daysSince >= cfg.reminderIntervalDays) {
          entry.reminders = await sendPendingReminders(w.id, true);
        } else {
          entry.reminders = { skipped: `último há ${daysSince.toFixed(1)} dias` };
        }
      }
    } catch (e: any) {
      entry.error = e.message || "Erro desconhecido";
    }

    report.push(entry);
  }

  return NextResponse.json({ ok: true, weddings: report.length, report });
}

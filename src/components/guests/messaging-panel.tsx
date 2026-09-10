"use client";

import { useEffect, useState } from "react";
import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Send, BellRing, Loader2, RotateCcw, Eye } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_INVITE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  PREVIEW_VARS,
  TEMPLATE_VARS,
  renderMessageTemplate,
} from "@/lib/message-templates";
import {
  getMessagingConfig,
  updateMessagingConfig,
  sendAllInvitesNow,
  sendPendingRemindersNow,
} from "@/app/actions/messaging";
import { DEFAULT_MESSAGING } from "@/lib/whatsapp-helpers";

type Summary = { sent: number; failed: { name: string, error: string }[]; skippedNoPhone: number };

export function MessagingPanel({ weddingSlug }: { weddingSlug: string }) {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<"invites" | "reminders" | null>(null);
  const [result, setResult] = useState<{ kind: string, summary: Summary } | null>(null);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    getMessagingConfig(weddingSlug)
      .then(setCfg)
      .catch((e: any) => setError(e.message || "Erro ao carregar configuração."))
      .finally(() => setLoading(false));
  }, [weddingSlug]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateMessagingConfig(weddingSlug, {
        autoInviteEnabled: cfg.autoInviteEnabled,
        inviteDaysBefore: Number(cfg.inviteDaysBefore),
        reminderEnabled: cfg.reminderEnabled,
        reminderDaysBefore: Number(cfg.reminderDaysBefore),
        reminderIntervalDays: Number(cfg.reminderIntervalDays),
        inviteTemplate: cfg.inviteTemplate ?? null,
        reminderTemplate: cfg.reminderTemplate ?? null,
      });
      setCfg(updated);
    } catch (e: any) {
      setError(e.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (kind: "invites" | "reminders") => {
    const label = kind === "invites" ? "convites" : "lembretes";
    if (!confirm(`Enviar ${label} agora para todos os convidados com telefone?`)) return;
    setSending(kind);
    setResult(null);
    setError("");
    try {
      const summary = kind === "invites"
        ? await sendAllInvitesNow(weddingSlug)
        : await sendPendingRemindersNow(weddingSlug);
      setResult({ kind: label, summary });
    } catch (e: any) {
      setError(e.message || "Erro ao enviar.");
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Carregando disparos...</p>;
  }

  if (!cfg) {
    return <p className="p-6 text-sm text-red-500">{error || "Erro ao carregar."}</p>;
  }

  return (
    <div className="space-y-6">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Convites automáticos</Label>
              <Switch checked={!!cfg.autoInviteEnabled} onCheckedChange={(v) => setCfg({ ...cfg, autoInviteEnabled: v })} />
            </div>
            <div className="space-y-2">
              <Label>Enviar quantos dias antes?</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={1} max={365}
                  value={cfg.inviteDaysBefore ?? DEFAULT_MESSAGING.inviteDaysBefore}
                  onChange={(e) => setCfg({ ...cfg, inviteDaysBefore: e.target.value })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">dias antes do casamento</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {cfg.inviteSentAt
                ? `Último envio em massa: ${new Date(cfg.inviteSentAt).toLocaleString("pt-BR")}`
                : "Ainda não houve envio em massa."}
            </p>
            <Button
              onClick={() => handleSend("invites")}
              disabled={sending !== null}
              className="w-full"
            >
              {sending === "invites" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {sending === "invites" ? "Enviando..." : "Enviar convites agora"}
            </Button>
          </div>

          <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Lembretes de RSVP</Label>
              <Switch checked={!!cfg.reminderEnabled} onCheckedChange={(v) => setCfg({ ...cfg, reminderEnabled: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Começar (dias antes)</Label>
                <Input
                  type="number" min={1} max={365}
                  value={cfg.reminderDaysBefore ?? DEFAULT_MESSAGING.reminderDaysBefore}
                  onChange={(e) => setCfg({ ...cfg, reminderDaysBefore: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Repetir a cada (dias)</Label>
                <Input
                  type="number" min={1} max={60}
                  value={cfg.reminderIntervalDays ?? DEFAULT_MESSAGING.reminderIntervalDays}
                  onChange={(e) => setCfg({ ...cfg, reminderIntervalDays: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {cfg.lastReminderAt
                ? `Último lembrete: ${new Date(cfg.lastReminderAt).toLocaleString("pt-BR")}`
                : "Nenhum lembrete enviado ainda."}
            </p>
            <Button
              onClick={() => handleSend("reminders")}
              disabled={sending !== null}
              variant="secondary"
              className="w-full"
            >
              {sending === "reminders" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
              {sending === "reminders" ? "Enviando..." : "Lembrar pendentes agora"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Textos das mensagens</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(v => !v)}
              className="gap-1.5 text-xs"
            >
              <Eye className="w-3.5 h-3.5" /> {showPreview ? "Ocultar prévia" : "Ver prévia"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Variáveis: {TEMPLATE_VARS.map(v => `${v.key} (${v.label})`).join(" · ")}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Convite</Label>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => setCfg({ ...cfg, inviteTemplate: DEFAULT_INVITE_TEMPLATE })}
                className="gap-1 text-xs h-7"
              >
                <RotateCcw className="w-3 h-3" /> Padrão
              </Button>
            </div>
            <Textarea
              rows={5}
              value={cfg.inviteTemplate ?? DEFAULT_INVITE_TEMPLATE}
              onChange={(e) => setCfg({ ...cfg, inviteTemplate: e.target.value })}
              className="font-mono text-sm"
            />
            {showPreview && (
              <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm whitespace-pre-wrap">
                {renderMessageTemplate(cfg.inviteTemplate ?? DEFAULT_INVITE_TEMPLATE, PREVIEW_VARS)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lembrete de confirmação</Label>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => setCfg({ ...cfg, reminderTemplate: DEFAULT_REMINDER_TEMPLATE })}
                className="gap-1 text-xs h-7"
              >
                <RotateCcw className="w-3 h-3" /> Padrão
              </Button>
            </div>
            <Textarea
              rows={5}
              value={cfg.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE}
              onChange={(e) => setCfg({ ...cfg, reminderTemplate: e.target.value })}
              className="font-mono text-sm"
            />
            {showPreview && (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-sm whitespace-pre-wrap">
                {renderMessageTemplate(cfg.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE, PREVIEW_VARS)}
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} variant="outline" className="w-full md:w-auto">
          {saving ? "Salvando..." : "Salvar configuração"}
        </Button>

        {result && (
          <div className="p-4 rounded-md border bg-green-50/50 text-sm space-y-1">
            <p className="font-semibold text-green-700">
              {result.kind === "convites" ? "Convites enviados" : "Lembretes enviados"}: {result.summary.sent}
              {result.summary.skippedNoPhone > 0 && ` (${result.summary.skippedNoPhone} sem telefone/código)`}
            </p>
            {result.summary.failed.length > 0 && (
              <div className="text-red-600">
                <p className="font-semibold">Falhas ({result.summary.failed.length}):</p>
                <ul className="list-disc pl-5 max-h-32 overflow-y-auto">
                  {result.summary.failed.map((f, i) => (
                    <li key={i}>{f.name}: {f.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

/** Botão que abre as configurações de disparo em modal. */
export function MessagingModalButton({ weddingSlug }: { weddingSlug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2">
          <Send className="w-4 h-4" />
          Disparos WhatsApp
        </Button>
      } />
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Disparos de WhatsApp
          </DialogTitle>
          <CardDescription>
            Convites automáticos antes da festa + lembretes para quem não confirmou. Visível só para a equipe do cerimonial.
          </CardDescription>
        </DialogHeader>
        <MessagingPanel weddingSlug={weddingSlug} />
      </DialogContent>
    </Dialog>
  );
}

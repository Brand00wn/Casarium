"use client";

import { useEffect, useState } from "react";
import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, BellRing, Loader2, RotateCcw, MailPlus, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  getMessagingConfig,
  updateMessagingConfig,
  sendAllInvitesNow,
  sendPendingRemindersNow,
} from "@/app/actions/messaging";
import { DEFAULT_MESSAGING as DEFAULTS } from "@/lib/whatsapp-helpers";
import {
  DEFAULT_INVITE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  PREVIEW_VARS,
  TEMPLATE_VARS,
  renderMessageTemplate,
} from "@/lib/message-templates";
import { cn } from "@/lib/utils";

type Summary = { sent: number; failed: { name: string, error: string }[]; skippedNoPhone: number };
type Tab = "invites" | "reminders";

function VariablesLegend() {
  return (
    <details className="rounded-md bg-muted/40 border text-xs">
      <summary className="cursor-pointer p-2.5 font-semibold text-muted-foreground flex items-center gap-1.5 list-none">
        <ChevronDown className="w-3.5 h-3.5" />
        Variáveis disponíveis — clique para ver o que cada uma vira
      </summary>
      <ul className="px-3 pb-3 pt-1 grid gap-1.5 sm:grid-cols-2">
        {TEMPLATE_VARS.map(v => {
          const field = v.key.replace("{", "").replace("}", "") as keyof typeof PREVIEW_VARS;
          const example = String(PREVIEW_VARS[field]);
          return (
            <li key={v.key} className="flex flex-col rounded bg-background border px-2 py-1.5">
              <code className="font-mono font-semibold text-primary text-xs">{v.key}</code>
              <span className="text-muted-foreground">{v.label}</span>
              <span className="text-foreground/80 truncate" title={example}>ex.: “{example}”</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function ResultBox({ kind, summary }: { kind: string, summary: Summary }) {
  return (
    <div className="p-4 rounded-md border bg-green-50/50 text-sm space-y-1">
      <p className="font-semibold text-green-700">
        {kind === "convites" ? "Convites enviados" : "Lembretes enviados"}: {summary.sent}
        {summary.skippedNoPhone > 0 && ` (${summary.skippedNoPhone} sem telefone/código)`}
      </p>
      {summary.failed.length > 0 && (
        <div className="text-red-600">
          <p className="font-semibold">Falhas ({summary.failed.length}):</p>
          <ul className="list-disc pl-5 max-h-32 overflow-y-auto">
            {summary.failed.map((f, i) => (
              <li key={i}>{f.name}: {f.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MessagingPanel({ weddingSlug }: { weddingSlug: string }) {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<Tab | null>(null);
  const [result, setResult] = useState<{ kind: string, summary: Summary } | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("invites");

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

  const handleSend = async (kind: Tab) => {
    const label = kind === "invites" ? "convites" : "lembretes";
    if (!confirm(`Enviar ${label} agora para todos os convidados com telefone?`)) return;
    setSending(kind);
    setResult(null);
    setError("");
    try {
      const summary = kind === "invites"
        ? await sendAllInvitesNow(weddingSlug)
        : await sendPendingRemindersNow(weddingSlug);
      const refreshed = await getMessagingConfig(weddingSlug);
      setCfg(refreshed);
      setResult({ kind: label, summary });
    } catch (e: any) {
      setError(e.message || "Erro ao enviar.");
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!cfg) {
    return <p className="p-6 text-sm text-red-500">{error || "Erro ao carregar."}</p>;
  }

  const isInvites = tab === "invites";

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Abas */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted/60">
        <button
          type="button"
          onClick={() => { setTab("invites"); setResult(null); }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-all",
            isInvites ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MailPlus className="w-4 h-4" /> Convites
        </button>
        <button
          type="button"
          onClick={() => { setTab("reminders"); setResult(null); }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-all",
            !isInvites ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BellRing className="w-4 h-4" /> Lembretes
        </button>
      </div>

      {/* 1. Automação */}
      <section className="space-y-3">
        <h4 className="text-sm font-bold">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs mr-1.5">1</span>
          Quando enviar
        </h4>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="font-semibold">{isInvites ? "Envio automático" : "Lembrete automático"}</Label>
            <p className="text-xs text-muted-foreground">
              {isInvites
                ? "Dispara sozinho na data configurada (precisa do agendamento diário ativo)"
                : "Cobra sozinho quem ainda não confirmou (precisa do agendamento diário ativo)"}
            </p>
          </div>
          <Switch
            checked={isInvites ? !!cfg.autoInviteEnabled : !!cfg.reminderEnabled}
            onCheckedChange={(v) => setCfg(isInvites ? { ...cfg, autoInviteEnabled: v } : { ...cfg, reminderEnabled: v })}
          />
        </div>
        {isInvites ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Enviar</span>
            <Input
              type="number" min={1} max={365}
              value={cfg.inviteDaysBefore ?? DEFAULTS.inviteDaysBefore}
              onChange={(e) => setCfg({ ...cfg, inviteDaysBefore: e.target.value })}
              className="w-20 text-center"
            />
            <span className="text-muted-foreground">dias antes do casamento</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Começar</span>
              <Input
                type="number" min={1} max={365}
                value={cfg.reminderDaysBefore ?? DEFAULTS.reminderDaysBefore}
                onChange={(e) => setCfg({ ...cfg, reminderDaysBefore: e.target.value })}
                className="w-20 text-center"
              />
              <span className="text-muted-foreground">dias antes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">repetir a cada</span>
              <Input
                type="number" min={1} max={60}
                value={cfg.reminderIntervalDays ?? DEFAULTS.reminderIntervalDays}
                onChange={(e) => setCfg({ ...cfg, reminderIntervalDays: e.target.value })}
                className="w-20 text-center"
              />
              <span className="text-muted-foreground">dias</span>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {isInvites
            ? (cfg.inviteSentAt
              ? `Último envio em massa: ${new Date(cfg.inviteSentAt).toLocaleString("pt-BR")}`
              : "Ainda não houve envio em massa.")
            : (cfg.lastReminderAt
              ? `Último lembrete: ${new Date(cfg.lastReminderAt).toLocaleString("pt-BR")}`
              : "Nenhum lembrete enviado ainda.")}
        </p>
      </section>

      {/* 2. Mensagem */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs mr-1.5">2</span>
            O que enviar
          </h4>
          <Button
            type="button" variant="ghost" size="sm"
            onClick={() => setCfg(isInvites
              ? { ...cfg, inviteTemplate: DEFAULT_INVITE_TEMPLATE }
              : { ...cfg, reminderTemplate: DEFAULT_REMINDER_TEMPLATE })}
            className="gap-1 text-xs h-7"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar padrão
          </Button>
        </div>
        <VariablesLegend />
        <Textarea
          rows={5}
          value={isInvites
            ? (cfg.inviteTemplate ?? DEFAULT_INVITE_TEMPLATE)
            : (cfg.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE)}
          onChange={(e) => setCfg(isInvites
            ? { ...cfg, inviteTemplate: e.target.value }
            : { ...cfg, reminderTemplate: e.target.value })}
          className="font-mono text-sm"
        />
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            Prévia — como chega no WhatsApp:
          </p>
          <div className={cn(
            "p-3 rounded-md border text-sm whitespace-pre-wrap",
            isInvites ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
          )}>
            {renderMessageTemplate(
              isInvites
                ? (cfg.inviteTemplate ?? DEFAULT_INVITE_TEMPLATE)
                : (cfg.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE),
              PREVIEW_VARS
            )}
          </div>
        </div>
      </section>

      {/* 3. Ação */}
      <section className="space-y-3">
        <h4 className="text-sm font-bold">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs mr-1.5">3</span>
          Enviar
        </h4>
        {result && <ResultBox kind={result.kind} summary={result.summary} />}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleSave} disabled={saving || sending !== null} variant="outline" className="flex-1">
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button
            onClick={() => handleSend(tab)}
            disabled={sending !== null || saving}
            className="flex-1"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isInvites ? (
              <Send className="w-4 h-4 mr-2" />
            ) : (
              <BellRing className="w-4 h-4 mr-2" />
            )}
            {sending ? "Enviando..." : isInvites ? "Enviar convites agora" : "Lembrar pendentes agora"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O envio imediato usa o texto acima. Salve antes se você editou a mensagem.
        </p>
      </section>
    </div>
  );
}

/** Botão que abre as configurações de envio em modal. */
export function MessagingModalButton({ weddingSlug }: { weddingSlug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2">
          <Send className="w-4 h-4" />
          Envios de Convites e Lembretes
        </Button>
      } />
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Envios de Convites e Lembretes
          </DialogTitle>
          <CardDescription>
            Configure o envio automático, ajuste os textos e dispare quando quiser. Visível só para a equipe do cerimonial.
          </CardDescription>
        </DialogHeader>
        <MessagingPanel weddingSlug={weddingSlug} />
      </DialogContent>
    </Dialog>
  );
}

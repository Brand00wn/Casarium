"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hourglass, Loader2, RefreshCw, Check, X, History } from "lucide-react";
import { toast } from "sonner";
import {
  getDirectPixPending,
  getDirectPixFailed,
  confirmDirectPixPayment,
  rejectDirectPixPayment,
  reopenDirectPixPayment,
} from "@/app/actions/payments";

type PendingTx = {
  id: string;
  amount: number;
  quantity: number;
  guestName: string;
  guestMessage: string | null;
  claimedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
  gift: { name: string } | null;
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** PIX direto aguardando confirmação dos noivos + expirados restauráveis. */
export function DirectPixPendingCard({ weddingSlug }: { weddingSlug: string }) {
  const [items, setItems] = useState<PendingTx[] | null>(null);
  const [failed, setFailed] = useState<PendingTx[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const [list, failedList] = await Promise.all([
        getDirectPixPending(weddingSlug),
        getDirectPixFailed(weddingSlug),
      ]);
      setItems(list as PendingTx[]);
      setFailed(failedList as PendingTx[]);
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Erro ao buscar pendências.");
    }
  }, [weddingSlug]);

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(true), 20000);
    return () => clearInterval(t);
  }, [load]);

  if ((!items || items.length === 0) && (!failed || failed.length === 0)) return null;

  const act = async (id: string, fn: (s: string, t: string) => Promise<unknown>, okMsg: string) => {
    setBusyId(id);
    try {
      await fn(weddingSlug, id);
      toast.success(okMsg);
      await load(true);
    } catch (e: any) {
      toast.error(e.message || "Erro.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="border-amber-300/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hourglass className="w-5 h-5 text-amber-600" />
            PIX Direto a Confirmar ({items?.length || 0})
          </CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => load()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
        </div>
        <CardDescription>
          Confira no extrato do banco e confirme — o presente entra na lista na hora.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(items || []).map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 bg-background p-3.5 rounded-xl border border-border/70">
            <div className="text-xs space-y-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {t.guestName} · {brl(t.amount)}
                {t.quantity > 1 ? <span className="text-muted-foreground"> ({t.quantity} cotas)</span> : null}
              </p>
              <p className="text-muted-foreground truncate">
                {t.gift?.name || "Presente"} · {new Date(t.createdAt).toLocaleString("pt-BR")}
              </p>
              {t.guestMessage ? (
                <p className="text-muted-foreground italic truncate">“{t.guestMessage}”</p>
              ) : null}
              {t.claimedAt ? (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  Convidado disse que pagou ✓
                </Badge>
              ) : (
                <Badge variant="secondary">Aguardando pagamento</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => act(t.id, confirmDirectPixPayment, "Presente confirmado! 🎉")}
                disabled={busyId === t.id}
                className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                {busyId === t.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Confirmar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Rejeitar este pagamento? A cota volta a ficar disponível.")) {
                    act(t.id, rejectDirectPixPayment, "Pagamento rejeitado.");
                  }
                }}
                disabled={busyId === t.id}
                className="rounded-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Rejeitar
              </Button>
            </div>
          </div>
        ))}
        {(failed?.length || 0) > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Expirados/rejeitados (7 dias) — restaure se o convidado pagou
            </p>
            {(failed || []).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 bg-muted/50 p-3 rounded-xl border border-border/60">
                <div className="text-xs space-y-0.5 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {t.guestName} · {brl(t.amount)}
                    {t.quantity > 1 ? <span className="text-muted-foreground"> ({t.quantity} cotas)</span> : null}
                  </p>
                  <p className="text-muted-foreground truncate">
                    {t.gift?.name || "Presente"} · {new Date(t.createdAt).toLocaleString("pt-BR")}
                    {t.claimedAt ? " · disse que pagou ✓" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => act(t.id, reopenDirectPixPayment, "Reserva restaurada por 24h.")}
                  disabled={busyId === t.id}
                  className="rounded-full text-xs"
                >
                  {busyId === t.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <History className="w-3.5 h-3.5 mr-1" />}
                  Restaurar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

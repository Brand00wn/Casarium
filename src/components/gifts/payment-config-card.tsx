"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  getPaymentConfigStatus,
  savePaymentConfig,
  diagnosePaymentConfig,
  getRecentMpErrors,
  getMpConnectUrl,
} from "@/app/actions/payments";

/** Configuração do Mercado Pago do casamento (noivos/cerimonialista com permissão). */
export function PaymentConfigCard({ weddingSlug }: { weddingSlug: string }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [token, setToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [passFee, setPassFee] = useState(false);
  const [feePercent, setFeePercent] = useState("4.98");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingMp, setConnectingMp] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [mpErrors, setMpErrors] = useState<any[] | null>(null);
  const [loadingErrors, setLoadingErrors] = useState(false);

  const typedKeyEnv = publicKey.trim().startsWith("TEST-")
    ? "test"
    : publicKey.trim().startsWith("APP_USR-")
      ? "production"
      : null;
  const envMismatch = !!typedKeyEnv && !!status?.env && typedKeyEnv !== status.env;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("mp_connected") === "true") {
        toast.success("Conta do Mercado Pago conectada com sucesso! 🎉");
        url.searchParams.delete("mp_connected");
        window.history.replaceState({}, "", url.toString());
      } else if (url.searchParams.get("mp_error")) {
        toast.error(`Falha ao conectar Mercado Pago: ${url.searchParams.get("mp_error")}`);
        url.searchParams.delete("mp_error");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  useEffect(() => {
    getPaymentConfigStatus(weddingSlug)
      .then((s) => {
        setAllowed(true);
        setStatus(s);
        if (s.configured) {
          setPassFee(s.passCardFeeToGuest);
          setFeePercent(String(s.cardFeePercent));
          setEnabled(s.enabled);
        }
      })
      .catch(() => setAllowed(false));
  }, [weddingSlug]);

  if (allowed === null) return null;
  if (allowed === false) return null;

  const handleConnectMp = async () => {
    setConnectingMp(true);
    try {
      const res = await getMpConnectUrl(weddingSlug);
      if (res.ok) {
        window.location.href = res.url;
      } else {
        toast.error(res.error || "Não foi possível iniciar a conexão.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao conectar com o Mercado Pago.");
    } finally {
      setConnectingMp(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePaymentConfig(weddingSlug, {
        ...(token.trim() ? { accessToken: token.trim() } : {}),
        ...(publicKey.trim() ? { publicKey: publicKey.trim() } : {}),
        passCardFeeToGuest: passFee,
        cardFeePercent: Number(feePercent) || 0,
        enabled,
      });
      setToken("");
      setPublicKey("");
      const s = await getPaymentConfigStatus(weddingSlug);
      setStatus(s);
      toast.success("Pagamento configurado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-4 h-4 text-primary" /> Receber presentes online (Mercado Pago)
        </CardTitle>
        <CardDescription>
          {status?.configured ? (
            <span className="inline-flex items-center gap-2 flex-wrap">
              Conectado ({status.masked}) — o dinheiro cai direto na conta dos noivos.
              {status.env && status.env !== "unknown" && (
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.env === "test" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                  Ambiente: {status.env === "test" ? "teste" : "produção"}
                </span>
              )}
            </span>
          ) : (
            "Conecte a conta do Mercado Pago dos noivos em 1-clique para receber PIX e Cartão diretamente."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Conexão Rápida OAuth2 em 1 Clique */}
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                Conectar Conta dos Noivos (Recomendado)
              </h4>
              <p className="text-xs text-muted-foreground">
                Sem copiar ou colar chaves! Autorize com 1-clique diretamente no Mercado Pago.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleConnectMp}
              disabled={connectingMp}
              className="bg-[#009EE3] hover:bg-[#0081B9] text-white font-semibold rounded-full px-5 py-2.5 text-xs flex items-center gap-2 shadow-sm whitespace-nowrap transition-all hover:scale-[1.02]"
            >
              {connectingMp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {status?.configured ? "Reconectar Mercado Pago" : "Conectar com Mercado Pago"}
            </Button>
          </div>
        </div>

        {/* Configurações de Taxa e Status */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <Label>Pagamento online ativo</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label>Repassar taxa do cartão ao convidado</Label>
            <Switch checked={passFee} onCheckedChange={setPassFee} />
          </div>
          {passFee && (
            <div className="flex items-center gap-2">
              <Label>% da taxa</Label>
              <Input
                type="number" min={0} max={30} step={0.01}
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="w-24"
              />
            </div>
          )}
        </div>

        {/* Botão de abrir campos manuais */}
        <div className="pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
          >
            {showManual ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showManual ? "Ocultar chaves manuais (avançado)" : "Configuração manual de chaves (avançado / chaves de teste)"}
          </button>
        </div>

        {showManual && (
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border/60">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Access Token (Mercado Pago)</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={status?.configured ? `Salvo: ${status.masked} (só digite para trocar)` : "TEST-... ou APP_USR-..."}
                />
                {status?.configured && (
                  <p className="text-xs text-muted-foreground">
                    Token ativo: <code className="font-mono font-bold text-foreground">{status.masked}</code>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Public Key (para cartão)</Label>
                  {status?.publicKeySet && (
                    <button
                      type="button"
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await savePaymentConfig(weddingSlug, { clearPublicKey: true });
                          setPublicKey("");
                          const s = await getPaymentConfigStatus(weddingSlug);
                          setStatus(s);
                          toast.success("Public Key removida.");
                        } catch (e: any) {
                          toast.error(e.message || "Erro ao remover.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Limpar chave
                    </button>
                  )}
                </div>
                <Input
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder={status?.publicKeySet ? `Salva: ${status.publicKeyHint} (só digite para trocar)` : "TEST-... ou APP_USR-..."}
                />
                {status?.publicKeyHint && (
                  <p className="text-xs text-muted-foreground">
                    Public Key ativa: <code className="font-mono font-bold text-foreground">{status.publicKeyHint}</code>
                  </p>
                )}
                {(status?.isEnvMismatch || envMismatch) && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    🚨 ATENÇÃO: Ambiente de Token ({status?.env === "test" ? "TESTE TEST-" : "PRODUÇÃO APP_USR-"}) divergente da Public Key ({status?.pkEnv === "test" ? "TESTE TEST-" : "PRODUÇÃO APP_USR-"}). Ambos precisam ser do MESMO ambiente!
                  </p>
                )}
                {!publicKey && !status?.publicKeySet && (
                  <p className="text-xs text-muted-foreground">Sem Public Key, o sistema aceitará apenas PIX. Cadastre a Public Key do mesmo ambiente do token para ativar cartão.</p>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} variant="secondary">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar chaves manuais
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {status?.configured && (
            <Button
              variant="outline"
              size="sm"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                try {
                  const d = await diagnosePaymentConfig(weddingSlug);
                  toast.success(`Token OK (${d.env}) — conta ${(d as any).email || d.nickname || d.userId} • país ${(d as any).site || "?"} • métodos: ${(d.methods || []).join(", ") || "?"}`);
                } catch (e: any) {
                  toast.error(e.message || "Token inválido.");
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Testar conexão
            </Button>
          )}
          {status?.configured && (
            <Button
              variant="ghost"
              size="sm"
              disabled={loadingErrors}
              onClick={async () => {
                setLoadingErrors(true);
                try {
                  setMpErrors(await getRecentMpErrors(weddingSlug));
                } catch (e: any) {
                  toast.error(e.message || "Erro ao buscar.");
                } finally {
                  setLoadingErrors(false);
                }
              }}
            >
              {loadingErrors ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Ver erros recentes do MP
            </Button>
          )}
        </div>

        {mpErrors && (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2 max-h-64 overflow-y-auto">
            {mpErrors.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum erro da API MP registrado desde o último deploy. Reproduza o pagamento e clique de novo.</p>
            ) : (
              mpErrors.map((e, i) => (
                <div key={i} className="text-xs space-y-1 border-b pb-2 last:border-0">
                  <p className="font-mono font-bold">{e.at} — HTTP {e.httpStatus} {e.path}</p>
                  {e.context && (
                    <p className="font-mono break-all text-muted-foreground">ctx: {JSON.stringify(e.context)}</p>
                  )}
                  <p className="font-mono break-all">{e.snippet}</p>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

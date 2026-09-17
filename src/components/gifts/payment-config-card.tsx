"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPaymentConfigStatus, savePaymentConfig, diagnosePaymentConfig, getRecentMpErrors } from "@/app/actions/payments";

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
  const [testing, setTesting] = useState(false);
  const [mpErrors, setMpErrors] = useState<any[] | null>(null);
  const [loadingErrors, setLoadingErrors] = useState(false);

  const typedKeyEnv = publicKey.trim().startsWith("TEST-")
    ? "test"
    : publicKey.trim().startsWith("APP_USR-")
      ? "production"
      : null;
  const envMismatch = !!typedKeyEnv && !!status?.env && typedKeyEnv !== status.env;

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
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-4 h-4 text-primary" /> Receber presentes (Mercado Pago)
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
            "Cole o Access Token da conta Mercado Pago dos noivos para ativar o pagamento online."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Access Token (produção)</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={status?.configured ? "•••• (preenchido — só troque se precisar)" : "APP_USR-..."}
            />
          </div>
          <div className="space-y-2">
            <Label>Public Key (para cartão)</Label>
            <Input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder={status?.publicKeySet ? "•••• preenchida ✓ (só digite para trocar)" : "APP_USR-... ou TEST-..."}
            />
            {envMismatch && (
              <p className="text-xs font-medium text-red-600">
                ⚠️ Chave de {typedKeyEnv === "test" ? "teste" : "produção"} com token de {status.env === "test" ? "teste" : "produção"} — precisam ser do MESMO ambiente.
              </p>
            )}
            {!publicKey && !status?.publicKeySet && (
              <p className="text-xs text-muted-foreground">Sem ela, só PIX. Use a Public Key do mesmo ambiente do token.</p>
            )}
            {status?.publicKeyHint && (
              <p className="text-xs text-muted-foreground">Chave salva: <code className="font-mono">{status.publicKeyHint}</code> + token {status.masked} — precisam ser da MESMA aplicação (Suas integrações → sua app → Testes → Credenciais de teste).</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
        <p className="text-xs text-muted-foreground">
          PIX: taxa ~0,99% absorvida. Cartão: {passFee ? `${feePercent}% somados no checkout` : "absorvido pelos noivos"}. Credencial criptografada no banco.
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Salvar configuração
        </Button>
        {status?.configured && (
          <Button
            variant="outline"
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

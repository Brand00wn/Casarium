"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPaymentConfigStatus, savePaymentConfig } from "@/app/actions/payments";

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
        publicKey: publicKey.trim(),
        passCardFeeToGuest: passFee,
        cardFeePercent: Number(feePercent) || 0,
        enabled,
      });
      setToken("");
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
          {status?.configured
            ? `Conectado (${status.masked}) — o dinheiro cai direto na conta dos noivos.`
            : "Cole o Access Token da conta Mercado Pago dos noivos para ativar o pagamento online."}
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
              placeholder="APP_USR-... (opcional; sem ela, só PIX)"
            />
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
      </CardContent>
    </Card>
  );
}

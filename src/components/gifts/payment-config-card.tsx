"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2, Sparkles, ChevronDown, ChevronUp, CheckCircle2, QrCode, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  getPaymentConfigStatus,
  savePaymentConfig,
  diagnosePaymentConfig,
  getRecentMpErrors,
  getMpConnectUrl,
  disconnectMp,
  saveDirectPixConfig,
} from "@/app/actions/payments";

export function PaymentConfigCard({ weddingSlug }: { weddingSlug: string }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<any>(null);

  // Mercado Pago 1-Click
  const [connectingMp, setConnectingMp] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [passFee, setPassFee] = useState(false);
  const [feePercent, setFeePercent] = useState("4.98");
  const [enabled, setEnabled] = useState(true);

  // Chave PIX Direta (0% taxa)
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("CPF");
  const [pixHolder, setPixHolder] = useState("");
  const [savingPix, setSavingPix] = useState(false);

  // Chaves Manuais / Desenvolvedor
  const [showDeveloper, setShowDeveloper] = useState(false);
  const [token, setToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [testing, setTesting] = useState(false);
  const [mpErrors, setMpErrors] = useState<any[] | null>(null);
  const [loadingErrors, setLoadingErrors] = useState(false);

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

  const loadStatus = () => {
    getPaymentConfigStatus(weddingSlug)
      .then((s) => {
        setAllowed(true);
        setStatus(s);
        if (s.configured) {
          setPassFee(s.passCardFeeToGuest);
          setFeePercent(String(s.cardFeePercent));
          setEnabled(s.enabled);
          if (s.directPixKey) {
            setPixKey(s.directPixKey);
            setPixType(s.directPixKeyType || "CPF");
            setPixHolder(s.directPixHolderName || "");
          }
        }
      })
      .catch(() => setAllowed(false));
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDisconnectMp = async () => {
    if (!confirm("Deseja realmente desconectar a conta do Mercado Pago?")) return;
    setDisconnecting(true);
    try {
      await disconnectMp(weddingSlug);
      toast.success("Conta desconectada.");
      loadStatus();
    } catch (e: any) {
      toast.error(e.message || "Erro ao desconectar.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveDirectPix = async () => {
    if (!pixKey.trim()) {
      toast.error("Informe a Chave PIX.");
      return;
    }
    setSavingPix(true);
    try {
      await saveDirectPixConfig(weddingSlug, {
        key: pixKey,
        type: pixType,
        holderName: pixHolder,
      });
      toast.success("Chave PIX Direta salva!");
      loadStatus();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar PIX.");
    } finally {
      setSavingPix(false);
    }
  };

  const handleSaveManual = async () => {
    setSavingManual(true);
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
      toast.success("Configuração manual salva!");
      loadStatus();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-5 h-5 text-primary" /> Recebimento de Presentes em Dinheiro
        </CardTitle>
        <CardDescription>
          Configure como os noivos desejam receber os valores dos presentes dos convidados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* 1. Integração Mercado Pago (Cartão + PIX Automático) */}
        <div className="bg-gradient-to-br from-primary/5 via-background to-muted/40 p-5 rounded-2xl border border-primary/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h3 className="font-semibold text-sm">Mercado Pago (Cartão de Crédito + PIX Automático)</h3>
            </div>
            {status?.mpConnected && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Permite que os convidados presenteiem usando **Cartão de Crédito em até 12x** ou **PIX automático com confirmação na hora**. O dinheiro cai direto na conta dos noivos.
          </p>

          {status?.mpConnected ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-background/80 p-3.5 rounded-xl border border-border/70">
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Conta Mercado Pago vinculada com sucesso!
                </p>
                <p className="text-muted-foreground">O dinheiro dos presentes cai direto na conta dos noivos.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleConnectMp}
                  disabled={connectingMp}
                  className="text-xs rounded-full"
                >
                  {connectingMp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Reconectar Conta
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectMp}
                  disabled={disconnecting}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5 mr-1" />}
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-1">
              <Button
                type="button"
                onClick={handleConnectMp}
                disabled={connectingMp}
                className="bg-[#009EE3] hover:bg-[#0081B9] text-white font-semibold rounded-full px-6 py-2.5 text-xs flex items-center gap-2 shadow-md transition-all hover:scale-[1.02]"
              >
                {connectingMp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Conectar Conta dos Noivos no Mercado Pago (1-Clique)
              </Button>
            </div>
          )}

          {status?.mpConnected && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="pass-fee" className="text-xs cursor-pointer">Repassar taxa do cartão ({feePercent}%) ao convidado</Label>
                <Switch id="pass-fee" checked={passFee} onCheckedChange={(v) => { setPassFee(v); handleSaveManual(); }} />
              </div>
            </div>
          )}
        </div>

        {/* 2. Chave PIX Direta dos Noivos (0% de taxa) */}
        <div className="bg-muted/30 p-5 rounded-2xl border border-border/70 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Chave PIX Direta dos Noivos (0% de taxa - Sem intermediários)</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cadastre a chave PIX dos noivos. No checkout, o convidado verá a chave para copiar e colar no app do banco. O dinheiro vai 100% limpo sem nenhuma taxa intermediária.
          </p>

          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Chave</Label>
              <select
                value={pixType}
                onChange={(e) => setPixType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="CPF">CPF / CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Chave Aleatória</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Chave PIX</Label>
              <Input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="ex: noivos@email.com ou 123.456.789-00"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Titular da Conta (como aparece no banco)</Label>
            <Input
              value={pixHolder}
              onChange={(e) => setPixHolder(e.target.value)}
              placeholder="ex: Maria da Silva & João Souza"
              className="h-9 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDirectPix}
            disabled={savingPix}
            className="rounded-full text-xs"
          >
            {savingPix ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
            Salvar Chave PIX Direta
          </Button>
        </div>

        {/* 3. Ferramentas do Desenvolvedor / Diagnóstico Avançado (Exclusivo Admin Supremo) */}
        {status?.isAdmin && (
          <>
            <div className="pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowDeveloper(!showDeveloper)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
              >
                {showDeveloper ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDeveloper ? "Ocultar ferramentas avançadas do desenvolvedor" : "Ferramentas do Desenvolvedor (Diagnóstico / Chaves Manuais - Admin Supremo)"}
              </button>
            </div>

            {showDeveloper && (
              <div className="space-y-4 bg-muted/50 p-4 rounded-xl border border-border/80">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Access Token Manual</Label>
                    <Input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={status?.mpConnected ? `Token ativo: ${status.masked}` : "TEST-... ou APP_USR-..."}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Public Key Manual</Label>
                    <Input
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      placeholder={status?.publicKeySet ? `Chave ativa: ${status.publicKeyHint}` : "TEST-... ou APP_USR-..."}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleSaveManual} disabled={savingManual} variant="outline" size="sm" className="text-xs">
                    {savingManual ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                    Salvar chaves manuais
                  </Button>
                  {status?.mpConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testing}
                      className="text-xs"
                      onClick={async () => {
                        setTesting(true);
                        try {
                          const d = await diagnosePaymentConfig(weddingSlug);
                          toast.success(`Token OK (${d.env}) — conta ${(d as any).email || d.nickname || d.userId} • país ${(d as any).site || "?"}`);
                        } catch (e: any) {
                          toast.error(e.message || "Token inválido.");
                        } finally {
                          setTesting(false);
                        }
                      }}
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                      Testar API MP
                    </Button>
                  )}
                  {status?.mpConnected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingErrors}
                      className="text-xs"
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
                      {loadingErrors ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                      Erros recentes MP
                    </Button>
                  )}
                </div>

                {mpErrors && (
                  <div className="rounded-lg border bg-background p-3 space-y-2 max-h-64 overflow-y-auto">
                    {mpErrors.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum erro de API registrado.</p>
                    ) : (
                      mpErrors.map((e, i) => (
                        <div key={i} className="text-xs space-y-1 border-b pb-2 last:border-0 font-mono">
                          <p className="font-bold">{e.at} — HTTP {e.httpStatus} {e.path}</p>
                          <p className="text-muted-foreground">{e.snippet}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

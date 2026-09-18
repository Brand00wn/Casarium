"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, RefreshCw, LogOut, Send, QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  getMyWhatsApp,
  saveMyInstance,
  getMyWhatsAppQr,
  refreshMyStatus,
  disconnectMyWhatsApp,
  sendMyWhatsAppTest,
} from "@/app/actions/whatsapp-connection";

type Status = { instance: string | null; phone: string | null; status: string | null; serverConfigured: boolean };

/** Conexão WhatsApp própria do cerimonial: 1 número p/ todos os casamentos dele. */
export function WhatsAppConnectionCard() {
  const [info, setInfo] = useState<Status | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState<{ base64: string | null; code: string | null } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await getMyWhatsApp();
      setInfo(s);
      if (s.instance) setName((prev) => prev || s.instance!);
      return s;
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar conexão.");
      return null;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Enquanto pareando, atualiza o status sozinho até conectar.
  useEffect(() => {
    if (!info?.instance || info.status === "open") return;
    const t = setInterval(async () => {
      try {
        const s = await refreshMyStatus();
        setInfo((prev) => (prev ? { ...prev, status: s.status, phone: s.phone } : prev));
        if (s.status === "open") {
          setQr(null);
          toast.success("WhatsApp conectado! 🎉");
        }
      } catch { /* tenta de novo */ }
    }, 8000);
    return () => clearInterval(t);
  }, [info?.instance, info?.status]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome para a instância (ex: minha-agencia).");
      return;
    }
    setSaving(true);
    try {
      await saveMyInstance(name.trim());
      toast.success("Instância salva! Gere o QR abaixo para parear. 📱");
      await load();
      await handleQr();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleQr = async () => {
    setQrLoading(true);
    try {
      const r = await getMyWhatsAppQr();
      if (r.status === "open") {
        toast.success("Já está conectado! 🎉");
        setQr(null);
        await load();
      } else {
        setQr({ base64: r.base64, code: r.code });
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar QR.");
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar seu número do Casarium? Os disparos voltam para a instância global.")) return;
    try {
      await disconnectMyWhatsApp();
      toast.success("Número desconectado.");
      setQr(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao desconectar.");
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) {
      toast.error("Informe um telefone com DDD para o teste.");
      return;
    }
    setTesting(true);
    try {
      await sendMyWhatsAppTest(testPhone.trim());
      toast.success("Mensagem de teste enviada! ✅");
    } catch (e: any) {
      toast.error(e.message || "Erro no teste.");
    } finally {
      setTesting(false);
    }
  };

  const connected = info?.status === "open";

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-5 h-5 text-primary" /> Meu WhatsApp de Disparo
          </CardTitle>
          {info && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${connected ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"}`}>
              {connected ? "Conectado" : info.instance ? "Desconectado" : "Não configurado"}
            </span>
          )}
        </div>
        <CardDescription>
          Um número para todos os seus casamentos — os convites saem dele em vez da linha global.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {info && !info.serverConfigured && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            Servidor Evolution não configurado (EVOLUTION_API_URL/KEY). Fale com o suporte.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da instância</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: minha-agencia"
              className="h-9 text-xs"
              disabled={connected}
            />
          </div>
          <Button type="button" onClick={handleSave} disabled={saving || connected} size="sm" className="rounded-full text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
            Salvar e parear
          </Button>
        </div>

        {info?.instance && !connected && (
          <div className="flex flex-col items-center gap-3 bg-muted/50 p-5 rounded-xl border">
            <p className="text-xs text-muted-foreground text-center">
              Escaneie com o WhatsApp do número <strong>{info.phone || "que vai disparar"}</strong>:
              WhatsApp → Aparelhos conectados → Conectar aparelho.
            </p>
            {qr?.base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${qr.base64}`} alt="QR Code WhatsApp" className="w-52 h-52 rounded-lg bg-white p-2" />
            ) : (
              <QrCode className="w-24 h-24 text-primary" />
            )}
            {qr?.code && (
              <p className="text-xs font-mono bg-background border rounded px-2 py-1">{qr.code}</p>
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleQr} disabled={qrLoading} className="rounded-full text-xs">
                {qrLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                {qr?.base64 ? "Atualizar QR" : "Gerar QR"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={load} className="rounded-full text-xs">
                Já pareei, verificar
              </Button>
            </div>
          </div>
        )}

        {connected && (
          <div className="space-y-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/70">
            <p className="text-xs text-emerald-800">
              Conectado{info.phone ? <> como <strong>{info.phone}</strong></> : null} — convites e lembretes dos seus casamentos saem deste número. 💛
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Seu telefone com DDD p/ teste"
                className="h-9 text-xs bg-background"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing} className="rounded-full text-xs">
                {testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Enviar teste
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => load()} className="rounded-full text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar status
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleDisconnect} className="rounded-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="w-3.5 h-3.5 mr-1" /> Desconectar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

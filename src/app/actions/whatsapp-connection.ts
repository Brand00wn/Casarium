"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendWhatsAppViaInstance } from "@/lib/whatsapp";

/** Conexão WhatsApp própria do cerimonial (Evolution).
 *  Servidor/chave seguem globais; por cerimonial vai só a instância.
 *  Chamadas à Evolution nunca lançam: devolvem { ok:false, error }.
 */

function evoBase() {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

async function evoFetch(method: string, path: string, body?: unknown) {
  const base = evoBase();
  if (!base) return { ok: false as const, error: "Evolution não configurada no servidor (EVOLUTION_API_URL/KEY)." };
  try {
    const res = await fetch(`${base.url}${path}`, {
      method,
      headers: { "Content-Type": "application/json", apikey: base.key },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as any)?.message || (data as any)?.error;
      const text = Array.isArray(msg) ? msg.join(" ") : String(msg || `HTTP ${res.status}`);
      return { ok: false as const, error: text.slice(0, 220) };
    }
    return { ok: true as const, data };
  } catch (e: any) {
    return { ok: false as const, error: "Sem resposta da Evolution API (rede/URL)." };
  }
}

function pickState(data: any): string {
  const raw = String(data?.instance?.state ?? data?.state ?? data?.connectionStatus ?? "").toLowerCase();
  if (["open", "connected"].includes(raw)) return "open";
  if (["connecting", "qrcode", "qr", "starting"].includes(raw)) return "connecting";
  return raw || "close";
}

function pickQr(data: any): { base64: string | null; code: string | null } {
  const b64 = data?.qrcode?.base64 || data?.base64 || data?.qr?.base64 || null;
  const code = data?.qrcode?.code || data?.code || data?.pairingCode || null;
  return {
    base64: typeof b64 === "string" && b64.length > 100 ? b64 : null,
    code: typeof code === "string" ? code : null,
  };
}

function pickPhone(instances: any, instanceName: string): string | null {
  const list: any[] = Array.isArray(instances) ? instances : instances?.instances || [];
  const found = list.find((i: any) =>
    [i?.instanceName, i?.instance?.instanceName, i?.name].includes(instanceName),
  );
  const raw = found?.owner || found?.number || found?.ownerJid || found?.instance?.owner || null;
  if (typeof raw !== "string" || !raw) return found?.profileName ? String(found.profileName) : null;
  return raw.replace(/\D/g, "").replace(/^55(?=\d)/, "").slice(-11) || raw;
}

async function requirePlanner() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado.");
  if (user.role !== "PLANNER" && user.role !== "ADMIN") {
    throw new Error("Conexão WhatsApp disponível para cerimoniais.");
  }
  return user;
}

export async function getMyWhatsApp() {
  const user = await requirePlanner();
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { waInstanceName: true, waPhone: true, waStatus: true, waStatusUpdatedAt: true },
  });
  return {
    instance: me?.waInstanceName || null,
    phone: me?.waPhone || null,
    status: me?.waStatus || null,
    updatedAt: me?.waStatusUpdatedAt || null,
    serverConfigured: !!evoBase(),
  };
}

/** Salva a instância e garante que ela exista no servidor. */
export async function saveMyInstance(instanceName: string) {
  const user = await requirePlanner();
  const name = instanceName.trim();
  if (!/^[a-zA-Z0-9_-]{3,40}$/.test(name)) {
    throw new Error("Nome da instância inválido: 3–40 letras, números, - ou _.");
  }
  await prisma.user.update({ where: { id: user.id }, data: { waInstanceName: name } });

  // Garante a instância no servidor (se já existir, a API avisa — segue o fluxo).
  const created = await evoFetch("POST", "/instance/create", {
    instanceName: name,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  });
  if (!created.ok && !/exist|duplicate|already|409/i.test(created.error)) {
    throw new Error(`Não foi possível criar a instância: ${created.error}`);
  }
  return refreshMyStatus();
}

/** QR Code para parear o número (ou status atual, se já conectado). */
export async function getMyWhatsAppQr() {
  const user = await requirePlanner();
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { waInstanceName: true } });
  if (!me?.waInstanceName) throw new Error("Defina o nome da instância primeiro.");

  const state = await evoFetch("GET", `/instance/connectionState/${me.waInstanceName}`);
  if (state.ok && pickState(state.data) === "open") {
    await refreshMyStatus();
    return { status: "open" as const, base64: null as string | null, code: null as string | null };
  }
  const qr = await evoFetch("GET", `/instance/connect/${me.waInstanceName}`);
  if (!qr.ok) throw new Error(`Falha ao gerar QR: ${qr.error}`);
  const { base64, code } = pickQr(qr.data);
  await prisma.user.update({
    where: { id: user.id },
    data: { waStatus: "connecting", waStatusUpdatedAt: new Date() },
  });
  return { status: "connecting" as const, base64, code };
}

/** Consulta o estado real e persiste (p/ exibir no perfil). */
export async function refreshMyStatus() {
  const user = await requirePlanner();
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { waInstanceName: true } });
  if (!me?.waInstanceName) {
    return { status: null as string | null, phone: null as string | null };
  }
  const state = await evoFetch("GET", `/instance/connectionState/${me.waInstanceName}`);
  const status = state.ok ? pickState(state.data) : "close";

  let phone: string | null = null;
  if (status === "open") {
    const list = await evoFetch("GET", "/instance/fetchInstances");
    if (list.ok) phone = pickPhone(list.data, me.waInstanceName);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      waStatus: status,
      waStatusUpdatedAt: new Date(),
      ...(phone ? { waPhone: phone } : {}),
    },
  });
  return { status, phone };
}

/** Desconecta o número (mantém o nome da instância p/ reconectar em 1 clique). */
export async function disconnectMyWhatsApp() {
  const user = await requirePlanner();
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { waInstanceName: true } });
  if (!me?.waInstanceName) throw new Error("Nenhuma instância configurada.");
  const out = await evoFetch("DELETE", `/instance/logout/${me.waInstanceName}`);
  if (!out.ok) throw new Error(`Falha ao desconectar: ${out.error}`);
  await prisma.user.update({
    where: { id: user.id },
    data: { waStatus: "close", waStatusUpdatedAt: new Date() },
  });
  return { ok: true as const };
}

/** Envia mensagem de teste pelo número do cerimonial. */
export async function sendMyWhatsAppTest(phone: string) {
  const user = await requirePlanner();
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { waInstanceName: true } });
  if (!me?.waInstanceName) throw new Error("Configure e conecte sua instância primeiro.");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) throw new Error("Informe um telefone válido com DDD.");
  const res = await sendWhatsAppViaInstance(me.waInstanceName, digits, "✅ Casarium: seu WhatsApp está conectado e enviando! 💛");
  if (!res.ok) throw new Error(res.error);
  return { ok: true as const };
}

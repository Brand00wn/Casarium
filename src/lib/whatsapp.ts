import { prisma } from "@/lib/prisma";

export type WhatsAppResult = { ok: true } | { ok: false, error: string };

type EvolutionTarget = {
  evolutionUrl: string;
  evolutionKey: string;
  evolutionInstance: string;
  /** Nome de quem é o número (p/ diagnóstico). Null = instância global. */
  ownerName: string | null;
};

function getGlobalConfig(): Omit<EvolutionTarget, "evolutionInstance" | "ownerName"> | null {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!evolutionUrl || !evolutionKey) return null;
  return { evolutionUrl, evolutionKey };
}

/** Cerimonial dono do casamento (1º membro PLANNER; senão null → global). */
async function findPlannerForWedding(weddingId: string): Promise<{
  id: string;
  name: string | null;
  waInstanceName: string | null;
} | null> {
  try {
    const members = await prisma.weddingMember.findMany({
      where: { weddingId },
      include: { user: { select: { id: true, name: true, role: true, waInstanceName: true } } },
    });
    const byUserRole = members.find((m) => m.user.role === "PLANNER")?.user;
    if (byUserRole) return byUserRole;
    const byMemberRole = members.find((m) => m.role === "PLANNER")?.user;
    return byMemberRole || null;
  } catch {
    return null;
  }
}

/** Resolve para qual instância enviar: a do cerimonial (se houver) ou a global. */
async function resolveTarget(weddingId?: string): Promise<EvolutionTarget | null> {
  const global = getGlobalConfig();
  if (!global) return null;

  if (weddingId) {
    const planner = await findPlannerForWedding(weddingId);
    const instance = planner?.waInstanceName?.trim();
    if (planner && instance) {
      return { ...global, evolutionInstance: instance, ownerName: planner.name };
    }
  }

  const fallback = process.env.EVOLUTION_INSTANCE_NAME;
  if (!fallback) return null;
  return { ...global, evolutionInstance: fallback, ownerName: null };
}

function formatPhone(phone: string) {
  // Só dígitos
  let digits = phone.replace(/\D/g, "");
  // Brasil sem DDI (10 dígitos fixo ou 11 com o 9) → adiciona 55
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }
  return digits;
}

async function postEvolution(
  target: EvolutionTarget,
  path: string,
  body: Record<string, unknown>,
): Promise<WhatsAppResult> {
  try {
    const { evolutionUrl, evolutionKey, evolutionInstance } = target;
    const response = await fetch(`${evolutionUrl}/message/${path}/${evolutionInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[Evolution API] Falha no envio (${path}):`, response.status, errorData);
      return { ok: false, error: `Evolution retornou ${response.status}: ${errorData.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (error) {
    console.error("[Evolution API] Erro de rede ou indisponibilidade:", error);
    return { ok: false, error: "Sem resposta da Evolution API (rede/URL)." };
  }
}

export type SendOpts = { weddingId?: string };

/** Envio direto por instância (teste de conexão, sem casamento). */
export async function sendWhatsAppViaInstance(
  instanceName: string,
  phone: string,
  message: string,
): Promise<WhatsAppResult> {
  const global = getGlobalConfig();
  if (!global) {
    return { ok: false, error: "Evolution não configurada no servidor (EVOLUTION_API_URL/KEY)." };
  }
  return postEvolution({ ...global, evolutionInstance: instanceName, ownerName: null }, "sendText", {
    number: formatPhone(phone),
    text: message,
  });
}

export const sendWhatsAppMessage = async (
  phone: string,
  message: string,
  opts?: SendOpts,
): Promise<WhatsAppResult> => {
  const target = await resolveTarget(opts?.weddingId);

  // Se não houver as chaves de API, usamos o Mock
  if (!target) {
    console.log(`[WhatsApp Mock] Simulando envio para ${phone}...`);
    console.log(`[WhatsApp Mock] Mensagem:\n${message}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`[WhatsApp Mock] Mensagem enviada com sucesso para ${phone}!`);
    return { ok: true };
  }

  return postEvolution(target, "sendText", {
    number: formatPhone(phone),
    text: message,
  });
};

/**
 * Envia imagem (ex: QR Code do convite) via Evolution API.
 * @param imageBase64 PNG em base64 (com ou sem prefixo data:image/png;base64,)
 */
export const sendWhatsAppImage = async (
  phone: string,
  imageBase64: string,
  caption?: string,
  opts?: SendOpts,
): Promise<WhatsAppResult> => {
  const target = await resolveTarget(opts?.weddingId);

  const media = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Se não houver as chaves de API, usamos o Mock
  if (!target) {
    console.log(`[WhatsApp Mock] Simulando envio de IMAGEM para ${phone}...`);
    if (caption) console.log(`[WhatsApp Mock] Legenda:\n${caption}`);
    console.log(`[WhatsApp Mock] Imagem (${media.length} chars base64) enviada com sucesso para ${phone}!`);
    return { ok: true };
  }

  return postEvolution(target, "sendMedia", {
    number: formatPhone(phone),
    mediatype: "image",
    mimetype: "image/png",
    caption: caption || "",
    media,
  });
};

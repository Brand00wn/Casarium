export type WhatsAppResult = { ok: true } | { ok: false, error: string };

function getEvolutionConfig() {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME;
  if (!evolutionUrl || !evolutionKey || !evolutionInstance) return null;
  return { evolutionUrl, evolutionKey, evolutionInstance };
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

async function postEvolution(path: string, body: Record<string, unknown>): Promise<WhatsAppResult> {
  const config = getEvolutionConfig();
  if (!config) {
    return { ok: false, error: "Evolution API não configurada (EVOLUTION_API_URL/KEY/INSTANCE)." };
  }

  try {
    const { evolutionUrl, evolutionKey, evolutionInstance } = config;
    const response = await fetch(`${evolutionUrl}/message/${path}/${evolutionInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionKey
      },
      body: JSON.stringify(body)
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

export const sendWhatsAppMessage = async (phone: string, message: string): Promise<WhatsAppResult> => {
  const config = getEvolutionConfig();

  // Se não houver as chaves de API, usamos o Mock
  if (!config) {
    console.log(`[WhatsApp Mock] Simulando envio para ${phone}...`);
    console.log(`[WhatsApp Mock] Mensagem:\n${message}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`[WhatsApp Mock] Mensagem enviada com sucesso para ${phone}!`);
    return { ok: true };
  }

  return postEvolution("sendText", {
    number: formatPhone(phone),
    text: message,
  });
};

/**
 * Envia imagem (ex: QR Code do convite) via Evolution API.
 * @param imageBase64 PNG em base64 (com ou sem prefixo data:image/png;base64,)
 */
export const sendWhatsAppImage = async (phone: string, imageBase64: string, caption?: string): Promise<WhatsAppResult> => {
  const config = getEvolutionConfig();

  const media = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Se não houver as chaves de API, usamos o Mock
  if (!config) {
    console.log(`[WhatsApp Mock] Simulando envio de IMAGEM para ${phone}...`);
    if (caption) console.log(`[WhatsApp Mock] Legenda:\n${caption}`);
    console.log(`[WhatsApp Mock] Imagem (${media.length} chars base64) enviada com sucesso para ${phone}!`);
    return { ok: true };
  }

  return postEvolution("sendMedia", {
    number: formatPhone(phone),
    mediatype: "image",
    mimetype: "image/png",
    caption: caption || "",
    media,
  });
};

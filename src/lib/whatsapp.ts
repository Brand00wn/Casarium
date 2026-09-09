function getEvolutionConfig() {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME;
  if (!evolutionUrl || !evolutionKey || !evolutionInstance) return null;
  return { evolutionUrl, evolutionKey, evolutionInstance };
}

function formatPhone(phone: string) {
  // Formata o número (remover + e espaços se houver, garantindo formato Evolution)
  return phone.replace(/\D/g, "");
}

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  const config = getEvolutionConfig();

  // Se não houver as chaves de API, usamos o Mock
  if (!config) {
    console.log(`[WhatsApp Mock] Simulando envio para ${phone}...`);
    console.log(`[WhatsApp Mock] Mensagem:\n${message}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`[WhatsApp Mock] Mensagem enviada com sucesso para ${phone}!`);
    return true;
  }

  // Integração Real com Evolution API
  try {
    const { evolutionUrl, evolutionKey, evolutionInstance } = config;
    const response = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionKey
      },
      body: JSON.stringify({
        number: formatPhone(phone),
        text: message
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Evolution API] Falha no envio:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Evolution API] Erro de rede ou indisponibilidade:", error);
    return false;
  }
};

/**
 * Envia imagem (ex: QR Code do convite) via Evolution API.
 * @param imageBase64 PNG em base64 (com ou sem prefixo data:image/png;base64,)
 */
export const sendWhatsAppImage = async (phone: string, imageBase64: string, caption?: string) => {
  const config = getEvolutionConfig();

  const media = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Se não houver as chaves de API, usamos o Mock
  if (!config) {
    console.log(`[WhatsApp Mock] Simulando envio de IMAGEM para ${phone}...`);
    if (caption) console.log(`[WhatsApp Mock] Legenda:\n${caption}`);
    console.log(`[WhatsApp Mock] Imagem (${media.length} chars base64) enviada com sucesso para ${phone}!`);
    return true;
  }

  try {
    const { evolutionUrl, evolutionKey, evolutionInstance } = config;
    const response = await fetch(`${evolutionUrl}/message/sendMedia/${evolutionInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionKey
      },
      body: JSON.stringify({
        number: formatPhone(phone),
        mediatype: "image",
        mimetype: "image/png",
        caption: caption || "",
        media,
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Evolution API] Falha no envio de imagem:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Evolution API] Erro de rede ou indisponibilidade:", error);
    return false;
  }
};

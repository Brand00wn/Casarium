export const sendWhatsAppMessage = async (phone: string, message: string) => {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME;

  // Se não houver as chaves de API, usamos o Mock
  if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
    console.log(`[WhatsApp Mock] Simulando envio para ${phone}...`);
    console.log(`[WhatsApp Mock] Mensagem:\n${message}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`[WhatsApp Mock] Mensagem enviada com sucesso para ${phone}!`);
    return true;
  }

  // Integração Real com Evolution API
  try {
    // Formata o número (remover + e espaços se houver, garantindo formato Evolution)
    const formattedPhone = phone.replace(/\D/g, "");
    
    const response = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionKey
      },
      body: JSON.stringify({
        number: formattedPhone,
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

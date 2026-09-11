/** Cliente mínimo do Mercado Pago via REST (sem SDK — controle total + zero dep). */

const MP_API = "https://api.mercadopago.com";

export type MpPaymentInput = {
  transactionAmount: number;
  description: string;
  paymentMethodId: string; // "pix" | "master" | "visa" | ...
  payer: { email: string; firstName?: string; lastName?: string };
  token?: string; // card_token do Brick (cartão)
  installments?: number;
  externalReference: string; // nosso transactionId
  notificationUrl?: string;
};

export type MpPayment = {
  id: number;
  status: string; // pending | approved | rejected | cancelled | in_process ...
  statusDetail?: string;
  external_reference?: string;
  transaction_amount?: number;
  pointOfInteraction?: {
    transactionData?: { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string };
  };
};

async function mpFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": crypto.randomUUID(),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[MP API] Erro", res.status, path, JSON.stringify(data).slice(0, 1000));
    const causes = Array.isArray(data?.cause)
      ? data.cause.map((c: any) => c?.description || c?.code).filter(Boolean).join(" | ")
      : "";
    const raw = causes || data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Mercado Pago: ${translateMpError(raw)}`);
  }
  return data;
}

/** Traduz erros crípticos do MP para algo acionável em PT-BR. */
function translateMpError(raw: string): string {
  const low = raw.toLowerCase();
  if (low.includes("excluded by a rule") || low.includes("excludes_by_rule")) {
    return "Parcelamento não permitido para este cartão/conta. Tente em menos parcelas (ex: 10x ou 12x) ou outro cartão.";
  }
  if (low.includes("invalid_installments") || low.includes("invalid number of shares")) {
    return "Número de parcelas inválido para este cartão. Tente em menos vezes.";
  }
  if (low.includes("invalid_users_involved") || low.includes("payer") && low.includes("collector")) {
    return "Não é possível pagar para a própria conta. Use outro e-mail no checkout.";
  }
  if (low.includes("inactive user") || low.includes("unauthorized")) {
    return "Conta de recebimento ainda não habilitada. Complete o cadastro no Mercado Pago.";
  }
  return raw;
}
}

export async function createMpPayment(accessToken: string, input: MpPaymentInput): Promise<MpPayment> {
  return mpFetch(accessToken, "/v1/payments", {
    method: "POST",
    body: JSON.stringify({
      transaction_amount: Math.round(input.transactionAmount * 100) / 100,
      description: input.description.slice(0, 120),
      payment_method_id: input.paymentMethodId,
      token: input.token,
      installments: input.installments ?? 1,
      payer: {
        email: input.payer.email,
        first_name: input.payer.firstName,
        last_name: input.payer.lastName,
      },
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
    }),
  });
}

export async function getMpPayment(accessToken: string, paymentId: string | number): Promise<MpPayment> {
  return mpFetch(accessToken, `/v1/payments/${paymentId}`);
}

/** Taxa do cartão repassada? amount = base * (1 + fee%). */
export function applyCardFee(base: number, feePercent: number, passToGuest: boolean): { total: number, fee: number } {
  if (!passToGuest || !feePercent) return { total: base, fee: 0 };
  const fee = Math.round(base * (feePercent / 100) * 100) / 100;
  return { total: Math.round((base + fee) * 100) / 100, fee };
}

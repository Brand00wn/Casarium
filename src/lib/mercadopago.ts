/** Cliente mínimo do Mercado Pago via REST (sem SDK — controle total + zero dep). */

const MP_API = "https://api.mercadopago.com";

export type MpPaymentInput = {
  transactionAmount: number;
  description: string;
  paymentMethodId: string; // "pix" | "master" | "visa" | ...
  payer: { email: string; firstName?: string; lastName?: string; identification?: { type: string, number: string } };
  token?: string; // card_token do Brick (cartão)
  installments?: number;
  externalReference: string; // nosso transactionId
  notificationUrl?: string;
  /** Só p/ diagnóstico — nunca é enviado ao MP. */
  debugContext?: Record<string, unknown>;
};

export function isTestToken(accessToken: string): boolean {
  return accessToken.trim().startsWith("TEST-");
}

function isLocalUrl(url?: string): boolean {
  if (!url) return true;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url);
}

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

export type MpErrorEntry = {
  at: string;
  path: string;
  httpStatus: number;
  /** JSON cru do MP (sem token) p/ diagnóstico no painel. */
  snippet: string;
  /** Contexto do nosso lado (valor, bandeira, parcelas, pagador...). */
  context?: Record<string, unknown>;
};

/** Ring buffer em memória dos últimos erros da API MP (cap 30). */
const recentMpErrors: MpErrorEntry[] = [];

export function readRecentMpErrors(): MpErrorEntry[] {
  return [...recentMpErrors].reverse();
}

async function mpFetch(accessToken: string, path: string, init?: RequestInit, opts?: { idempotent?: boolean; context?: Record<string, unknown> }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...((init?.headers as Record<string, string>) || {}),
  };
  // GETs não precisam de idempotency; POSTs sim.
  if (opts?.idempotent !== false && (!init?.method || init.method === "POST")) {
    headers["X-Idempotency-Key"] = crypto.randomUUID();
  }
  const res = await fetch(`${MP_API}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Log completo no servidor (aparece no Railway/Vercel) — essencial p/ diagnóstico.
    console.error("[MP API] Erro", res.status, path, JSON.stringify(data).slice(0, 2000));
    try {
      recentMpErrors.push({
        at: new Date().toISOString(),
        path,
        httpStatus: res.status,
        snippet: JSON.stringify(data).slice(0, 2000),
        ...(opts?.context ? { context: opts.context } : {}),
      });
      if (recentMpErrors.length > 30) recentMpErrors.splice(0, recentMpErrors.length - 30);
    } catch { /* diagnóstico nunca pode quebrar o pagamento */ }
    const causes = Array.isArray(data?.cause)
      ? data.cause.map((c: any) => [c?.code, c?.description].filter(Boolean).join(": ")).filter(Boolean).join(" | ")
      : "";
    const raw = `HTTP ${res.status} — ${causes || data?.message || data?.error || "erro desconhecido"}`;
    const friendly = translateMpError(raw);
    // Mostra o motivo amigável + detalhe técnico curto (não vaza o token).
    throw new Error(raw === friendly ? `Mercado Pago: ${raw}` : `Mercado Pago: ${friendly} (detalhe: ${raw.slice(0, 220)})`);
  }
  return data;
}

/** Traduz erros crípticos do MP para algo acionável em PT-BR. */
function translateMpError(raw: string): string {
  const low = raw.toLowerCase();
  // "payment_method ... is excluded by a rule" acontece TAMBÉM à vista (1x):
  // cartão/bandeira não habilitada p/ a conta, BIN de teste errado, valor fora
  // da regra, ou credencial de teste usada com dados reais (e vice-versa).
  if (low.includes("excluded by a rule") || low.includes("excludes_by_rule") || low.includes("not_supported")) {
    return "Pagamento recusado pela regra da conta/cartão (vale p/ 1x também). Em TESTE: e-mail test@testuser.com + nome APRO + CPF 12345678909 + cartão 4235 6477 2802 5682 ou 5480 8328 0103 3311, valor de R$ 10+ (valor muito baixo cai na regra) e Access Token de TESTE da MESMA app (o atual começa com APP_USR-; se o seu é TEST- antigo, recopile em Suas integrações → app → Testes → Credenciais de teste); em PRODUÇÃO use cartão real, à vista (1x), Public Key e Token do MESMO app.";
  }
  if (low.includes("invalid_installments") || low.includes("invalid number of shares")) {
    return "Número de parcelas inválido para este cartão. Tente em menos vezes.";
  }
  if (low.includes("invalid_users_involved") || low.includes("2034") || (low.includes("payer") && low.includes("collector"))) {
    return "O e-mail do comprador é o mesmo da conta que recebe (erro 2034). O Mercado Pago bloqueia pagar para si mesmo: teste com um e-mail DIFERENTE do e-mail da conta dos noivos. Em produção, nunca use o e-mail do vendedor no checkout.";
  }
  if (low.includes("inactive user") || low.includes("unauthorized")) {
    return "Conta de recebimento ainda não habilitada. Complete o cadastro no Mercado Pago.";
  }
  return raw;
}

export async function createMpPayment(accessToken: string, input: MpPaymentInput): Promise<MpPayment> {
  const installments = Math.max(1, Math.floor(input.installments ?? 1));
  // notification_url localhost é rejeitada/ignorada pelo MP — omita em dev.
  const notificationUrl = input.notificationUrl && !isLocalUrl(input.notificationUrl)
    ? input.notificationUrl
    : undefined;
  return mpFetch(accessToken, "/v1/payments", {
    method: "POST",
    body: JSON.stringify({
      transaction_amount: Math.round(input.transactionAmount * 100) / 100,
      description: input.description.slice(0, 120),
      payment_method_id: input.paymentMethodId,
      token: input.token,
      installments,
      payer: {
        email: input.payer.email,
        first_name: input.payer.firstName,
        last_name: input.payer.lastName,
        ...(input.payer.identification?.number
          ? { identification: { type: input.payer.identification.type || "CPF", number: input.payer.identification.number.replace(/\D/g, "") } }
          : {}),
      },
      external_reference: input.externalReference,
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    }),
  }, { context: input.debugContext });
}

export async function getMpPayment(accessToken: string, paymentId: string | number): Promise<MpPayment> {
  return mpFetch(accessToken, `/v1/payments/${paymentId}`, undefined, { idempotent: false });
}

/** Valida o token sem cobrar nada: quem é o dono + métodos ativos. */
export async function diagnoseMpToken(accessToken: string): Promise<{
  env: "test" | "production";
  userId?: number | string;
  nickname?: string;
  email?: string;
  site?: string;
  methods?: string[];
  rawError?: string;
}> {
  const env = isTestToken(accessToken) ? "test" as const : "production" as const;
  try {
    const me = await mpFetch(accessToken, "/users/me", undefined, { idempotent: false });
    const methods = await mpFetch(accessToken, "/v1/payment_methods", undefined, { idempotent: false })
      .then((list: any[]) => (Array.isArray(list) ? list.map((m) => m?.id).filter(Boolean).slice(0, 30) : []))
      .catch(() => undefined);
    return { env, userId: me?.id, nickname: me?.nickname, email: me?.email, site: me?.site_id, methods };
  } catch (e: any) {
    return { env, rawError: e?.message || "Token inválido ou sem permissão." };
  }
}

/** Parcela mínima ~R$5: evita oferecer 12x num valor que o MP recusa por regra. */
export function maxInstallmentsForAmount(total: number): number {
  if (!total || total <= 0) return 1;
  return Math.min(12, Math.max(1, Math.floor(total / 5)));
}

/** Taxa do cartão repassada? amount = base * (1 + fee%). */
export function applyCardFee(base: number, feePercent: number, passToGuest: boolean): { total: number, fee: number } {
  if (!passToGuest || !feePercent) return { total: base, fee: 0 };
  const fee = Math.round(base * (feePercent / 100) * 100) / 100;
  return { total: Math.round((base + fee) * 100) / 100, fee };
}

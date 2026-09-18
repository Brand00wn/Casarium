"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission, getCurrentUser } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/payment-crypto";
import { createMpPayment, getMpPayment, applyCardFee, diagnoseMpToken, isTestToken, readRecentMpErrors } from "@/lib/mercadopago";
import type { MpPayment } from "@/lib/mercadopago";
import { buildPixPayload } from "@/lib/pix-brcode";
import QRCode from "qrcode";
import { resend } from "@/lib/resend";
import { getSiteUrl } from "@/lib/site-url";

const QUOTA_HOLD_MINUTES = 40;

/** Cotas ocupadas = PAID + PENDING válido (reserva não expirada ou já
 *  reivindicada via "já paguei"). É o "hold" que impede dois convidados
 *  pagarem a mesma cota enquanto a confirmação não sai. */
async function occupiedQuota(giftId: string): Promise<number> {
  const now = new Date();
  const agg = await prisma.transaction.aggregate({
    where: {
      giftId,
      status: { in: ["PAID", "PENDING"] },
      OR: [{ status: "PAID" }, { expiresAt: { gt: now } }, { claimedAt: { not: null } }],
    },
    _sum: { quantity: true },
  });
  return agg._sum.quantity || 0;
}

/** Taxa padrão (crédito à vista D0) até a primeira venda calibrar de verdade. */
const DEFAULT_CARD_FEE = 4.98;

/** Taxa efetiva do cartão: aprendida das vendas reais > override manual/admin > padrão. */
function effectiveCardFee(cfg: { cardFeePercent: number; learnedCardFeePercent: number | null }): {
  percent: number; source: "learned" | "manual";
} {
  if (cfg.learnedCardFeePercent != null && cfg.learnedCardFeePercent > 0) {
    return { percent: Math.round(cfg.learnedCardFeePercent * 100) / 100, source: "learned" };
  }
  return { percent: cfg.cardFeePercent || DEFAULT_CARD_FEE, source: "manual" };
}

/** Aprende a taxa real cobrada pelo MP a partir de um pagamento aprovado
 *  (campo fee_details da API — dado direto da conta, sem chute).
 *  Só cartão de crédito à vista (1x) em produção: parcelado tem custo extra
 *  por parcela e pagamento de teste não reflete a conta real.
 *  Nunca quebra o fluxo de pagamento (try/catch total). */
async function learnCardFeeFromMp(weddingId: string, mp: MpPayment, opts: { isTest: boolean }) {
  try {
    if (opts.isTest || mp.status !== "approved") return;
    if (mp.payment_type_id !== "credit_card" || (mp.installments ?? 1) !== 1) return;
    const total = Number(mp.transaction_amount);
    const fees = Array.isArray(mp.fee_details) ? mp.fee_details : [];
    const collectorFees = fees.filter((f) => (f?.fee_payer || "collector") === "collector");
    const mpFees = collectorFees.filter((f) => (f?.type || "").toLowerCase().includes("mercadopago"));
    const pool = mpFees.length > 0 ? mpFees : collectorFees;
    const fee = pool.reduce((s, f) => s + (Number(f?.amount) || 0), 0);
    if (!total || !(fee > 0)) return;
    const sample = (fee / total) * 100;
    if (!(sample > 0 && sample < 30)) return; // sanidade
    const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId } });
    if (!cfg || cfg.lastLearnedMpPaymentId === String(mp.id)) return; // já aprendido
    // Média móvel das últimas ~20 vendas: calibra rápido e acompanha mudanças.
    const n = Math.min(cfg.learnedCardFeeSamples || 0, 19);
    const avg = cfg.learnedCardFeePercent == null
      ? sample
      : cfg.learnedCardFeePercent + (sample - cfg.learnedCardFeePercent) / (n + 1);
    await prisma.weddingPaymentConfig.update({
      where: { weddingId },
      data: {
        learnedCardFeePercent: Math.round(avg * 1000) / 1000,
        learnedCardFeeSamples: (cfg.learnedCardFeeSamples || 0) + 1,
        learnedCardFeeUpdatedAt: new Date(),
        lastLearnedMpPaymentId: String(mp.id),
      },
    });
  } catch { /* aprendizado nunca pode quebrar o pagamento */ }
}

async function getConfigOrThrow(weddingId: string) {
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId } });
  if (!cfg || !cfg.enabled || !cfg.accessTokenEncrypted) throw new Error("Pagamentos online ainda não foram configurados para este casamento.");
  let accessToken: string;
  try {
    accessToken = decryptSecret(cfg.accessTokenEncrypted);
  } catch {
    throw new Error("Credencial de pagamento inválida — peça aos noivos para reconectar.");
  }
  return { cfg, accessToken };
}

export async function getPaymentConfigStatus(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  if (!cfg) return { configured: false as const, isAdmin };
  let env: "test" | "production" | "unknown" = "unknown";
  let masked = "••••••••";
  let isEnvMismatch = false;
  let pkEnv: "test" | "production" | null = null;
  let mpConnected = false;

  if (cfg.accessTokenEncrypted) {
    try {
      const raw = decryptSecret(cfg.accessTokenEncrypted);
      const tokenPrefix = raw.startsWith("TEST-") ? "TEST-" : raw.startsWith("APP_USR-") ? "APP_USR-" : "";
      masked = `${tokenPrefix}••••${raw.slice(-4)}`;
      env = raw.startsWith("TEST-") ? "test" : "production";
      mpConnected = true;

      if (cfg.publicKey) {
        pkEnv = (cfg.publicKey.startsWith("TEST-") || cfg.publicKey.startsWith("PK_TEST-"))
          ? "test"
          : (cfg.publicKey.startsWith("APP_USR-") || cfg.publicKey.startsWith("PK_PROD-"))
            ? "production"
            : null;
        if (pkEnv && pkEnv !== env) {
          isEnvMismatch = true;
        }
      }
    } catch {
      mpConnected = false;
    }
  }

  return {
    configured: true as const,
    isAdmin,
    mpConnected,
    masked,
    env,
    pkEnv,
    isEnvMismatch,
    publicKeySet: !!cfg.publicKey,
    publicKeyHint: cfg.publicKey
      ? `${cfg.publicKey.slice(0, cfg.publicKey.startsWith("TEST-") ? 5 : 8)}••••${cfg.publicKey.slice(-4)}`
      : null,
    passCardFeeToGuest: cfg.passCardFeeToGuest,
    cardFeePercent: cfg.cardFeePercent,
    // Taxa efetiva (aprendida > manual) — é o que o checkout realmente usa.
    effectiveCardFeePercent: effectiveCardFee(cfg).percent,
    cardFeeSource: effectiveCardFee(cfg).source,
    learnedCardFeePercent: cfg.learnedCardFeePercent,
    learnedCardFeeSamples: cfg.learnedCardFeeSamples || 0,
    learnedCardFeeUpdatedAt: cfg.learnedCardFeeUpdatedAt,
    directPixKey: cfg.directPixKey || null,
    directPixKeyType: cfg.directPixKeyType || "EMAIL",
    directPixHolderName: cfg.directPixHolderName || null,
    directPixCity: cfg.directPixCity || null,
    enabled: cfg.enabled,
    updatedAt: cfg.updatedAt,
  };
}

/** Desconecta a conta Mercado Pago do casamento. */
export async function disconnectMp(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  await prisma.weddingPaymentConfig.update({
    where: { weddingId: wedding.id },
    data: {
      accessTokenEncrypted: null,
      publicKey: null,
    },
  });
  revalidatePath(`/${weddingSlug}/presentes`);
  return { ok: true };
}

/** Salva a Chave PIX Direta dos noivos (BR Code próprio, 0% de taxa).
 *  Cidade é exigida pelo padrão do Banco Central. */
export async function saveDirectPixConfig(weddingSlug: string, data: {
  key: string;
  type: string;
  holderName?: string;
  city?: string;
}) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  if (!data.key.trim()) throw new Error("Informe a Chave PIX.");
  if (!data.holderName?.trim()) throw new Error("Informe o nome do titular.");
  if (!data.city?.trim()) throw new Error("Informe a cidade da conta (exigida pelo PIX).");

  const existing = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  const row = {
    directPixKey: data.key.trim(),
    directPixKeyType: data.type || "EMAIL",
    directPixHolderName: data.holderName.trim(),
    directPixCity: data.city.trim(),
  };
  await prisma.weddingPaymentConfig.upsert({
    where: { weddingId: wedding.id },
    create: { weddingId: wedding.id, enabled: true, ...row },
    update: row,
  });
  revalidatePath(`/${weddingSlug}/presentes`);
  return { ok: true };
}

/** Remove a Chave PIX Direta (volta a oferecer só o PIX do Mercado Pago). */
export async function clearDirectPixConfig(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  await prisma.weddingPaymentConfig.update({
    where: { weddingId: wedding.id },
    data: { directPixKey: null, directPixKeyType: null, directPixHolderName: null, directPixCity: null },
  });
  revalidatePath(`/${weddingSlug}/presentes`);
  return { ok: true };
}

/** Gera a URL oficial do Mercado Pago para autorizar a conta dos noivos em 1-clique via OAuth2. */
export async function getMpConnectUrl(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const clientId = process.env.NEXT_PUBLIC_MP_CLIENT_ID || process.env.MP_CLIENT_ID || process.env.MERCADOPAGO_CLIENT_ID;
  if (!clientId) {
    return { ok: false as const, error: "Integração do Mercado Pago não configurada no servidor (falta NEXT_PUBLIC_MP_CLIENT_ID no .env)." };
  }
  const siteUrl = await getSiteUrl();
  const redirectUri = `${siteUrl}/api/auth/mercadopago/callback`;
  const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${weddingSlug}`;
  return { ok: true as const, url };
}

export async function savePaymentConfig(weddingSlug: string, data: {
  accessToken?: string;
  publicKey?: string;
  clearPublicKey?: boolean;
  passCardFeeToGuest?: boolean;
  cardFeePercent?: number;
  enabled?: boolean;
}) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");

  const existing = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  const tokenTrimmed = data.accessToken?.trim() || "";
  const keyTrimmed = data.publicKey?.trim() || "";
  const encrypted = tokenTrimmed
    ? encryptSecret(tokenTrimmed)
    : existing?.accessTokenEncrypted;

  const fee = data.cardFeePercent === undefined
    ? (existing?.cardFeePercent ?? 4.98)
    : Math.min(30, Math.max(0, Number(data.cardFeePercent) || 0));

  let newPublicKey = existing?.publicKey || null;
  if (data.clearPublicKey) {
    newPublicKey = null;
  } else if (keyTrimmed) {
    newPublicKey = keyTrimmed;
  }

  return prisma.weddingPaymentConfig.upsert({
    where: { weddingId: wedding.id },
    create: {
      weddingId: wedding.id,
      accessTokenEncrypted: encrypted,
      publicKey: newPublicKey,
      passCardFeeToGuest: data.passCardFeeToGuest ?? existing?.passCardFeeToGuest ?? true,
      cardFeePercent: fee,
      enabled: data.enabled ?? existing?.enabled ?? true,
    },
    update: {
      ...(tokenTrimmed ? { accessTokenEncrypted: encrypted } : {}),
      publicKey: newPublicKey,
      ...(data.passCardFeeToGuest !== undefined && { passCardFeeToGuest: data.passCardFeeToGuest }),
      cardFeePercent: fee,
      ...(data.enabled !== undefined && { enabled: data.enabled }),
    },
  });
}

/** Public Key para o Brick de cartão (público por natureza). */
export async function getPaymentPublicKey(weddingSlug: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return { publicKey: null, env: null as "test" | "production" | null };
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  if (!cfg?.enabled || !cfg.publicKey || !cfg.accessTokenEncrypted) return { publicKey: null, env: null as "test" | "production" | null };
  let env: "test" | "production" | null = null;
  try {
    const raw = decryptSecret(cfg.accessTokenEncrypted);
    env = raw.startsWith("TEST-") ? "test" : "production";
  } catch { /* mantém null */ }
  return { publicKey: cfg.publicKey, env };
}

/** Testa o Access Token salvo sem cobrar nada (chama /users/me no MP). */
export async function diagnosePaymentConfig(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  const { accessToken } = await getConfigOrThrow(wedding.id);
  const diag = await diagnoseMpToken(accessToken);
  if (diag.rawError) throw new Error(diag.rawError);
  return diag;
}

/** Trava do "passo 1": sem recebimento configurado (MP ou PIX direto),
 *  não cadastra nem edita presentes/categorias. Vale p/ UI e p/ actions. */
export async function requireGiftsUnlocked(weddingSlug: string) {
  const cfg = await isPaymentConfigured(weddingSlug);
  if (!cfg.configured) {
    throw new Error("Passo 1: configure o recebimento (Mercado Pago ou chave PIX) antes de cadastrar presentes.");
  }
  return cfg;
}

/** O site exibe a seção de presentes? Só com recebimento OK + ≥1 presente. */
export async function isGiftListVisible(weddingSlug: string): Promise<boolean> {
  try {
    const cfg = await isPaymentConfigured(weddingSlug);
    if (!cfg.configured) return false;
    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug },
      select: { id: true },
    });
    if (!wedding) return false;
    return (await prisma.gift.count({ where: { weddingId: wedding.id } })) > 0;
  } catch {
    return false;
  }
}

/** O casamento aceita pagamento online? (para o site decidir entre MP, PIX direto e simulação) */
export async function isPaymentConfigured(weddingSlug: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return { configured: false as const };
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  if (!cfg?.enabled) return { configured: false as const };

  let mpOk = false;
  let env: "test" | "production" = "production";
  if (cfg.accessTokenEncrypted) {
    try {
      const raw = decryptSecret(cfg.accessTokenEncrypted);
      env = isTestToken(raw) ? "test" : "production";
      mpOk = true;
    } catch {
      mpOk = false;
    }
  }

  const directPixOk = cfg ? directPixCfgValid(cfg) : false;
  if (!mpOk && !directPixOk) return { configured: false as const };

  const eff = effectiveCardFee(cfg);
  return {
    configured: true as const,
    hasMp: mpOk,
    hasCard: mpOk && !!cfg.publicKey,
    // PIX direto (BR Code próprio, sem taxa): chave+cidade configuradas.
    // A chave em si nunca vai ao cliente — só o QR/copia-e-cola gerado.
    hasDirectPix: directPixOk,
    directPixHolderName: directPixOk ? cfg.directPixHolderName : null,
    passCardFeeToGuest: cfg.passCardFeeToGuest,
    // % efetivo (aprendido das vendas > manual) — checkout usa este.
    cardFeePercent: eff.percent,
    cardFeeSource: eff.source,
    cardFeeSamples: cfg.learnedCardFeeSamples || 0,
    env,
  };
}

function directPixCfgValid(cfg: { directPixKey: string | null; directPixHolderName: string | null; directPixCity: string | null }) {
  return !!(cfg.directPixKey?.trim() && cfg.directPixHolderName?.trim() && cfg.directPixCity?.trim());
}

type CheckoutInput = {
  giftId: string;
  quantity: number;
  guestName: string;
  guestEmail: string;
  guestMessage?: string;
  guestId?: string;
  paymentMethod: "PIX" | "CREDIT_CARD";
  cardToken?: string;
  cardPaymentMethodId?: string;
  cardIdentification?: { type: string, number: string };
  /** CPF do comprador — obrigatório no PIX (o MP devolve 13253 sem ele). */
  pixIdentification?: { type: string, number: string };
  installments?: number;
};

/** Valida CPF (11 dígitos + dígitos verificadores). CNPJ não é aceito no PIX via MP aqui. */
function isValidCpf(raw: string): boolean {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== Number(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === Number(d[10]);
}

/** "Maria da Silva" → { firstName: "Maria", lastName: "da Silva" } (MP exige os dois no PIX). */
function splitName(full: string): { firstName: string, lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || full.trim(), lastName: parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || full.trim() };
}

/** Cria o pagamento real (PIX gera QR; cartão cobra na hora). Rota pública do site.
 *  Nunca lança: devolve { ok:false, error } para toast/Brick tratar em vez de
 *  estourar como erro de render. */
export async function createQuotaPayment(weddingSlug: string, input: CheckoutInput) {
  try {
    return await createQuotaPaymentInner(weddingSlug, input);
  } catch (e: any) {
    console.error("[createQuotaPayment]", e?.message || e);
    return { ok: false as const, error: e?.message || "Erro no pagamento." };
  }
}

async function createQuotaPaymentInner(weddingSlug: string, input: CheckoutInput) {
  const fail = (error: string) => ({ ok: false as const, error });
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return fail("Casamento não encontrado.");
  let cfg;
  let accessToken: string;
  try {
    ({ cfg, accessToken } = await getConfigOrThrow(wedding.id));
  } catch (e: any) {
    return fail(e?.message || "Pagamento indisponível.");
  }

  if (!input.guestName.trim()) return fail("Informe seu nome.");
  if (!input.guestEmail.trim() || !/^\S+@\S+\.\S+$/.test(input.guestEmail)) {
    return fail("Informe um e-mail válido para o pagamento.");
  }
  const guestEmailNorm = input.guestEmail.trim().toLowerCase();

  const gift = await prisma.gift.findFirst({ where: { id: input.giftId, weddingId: wedding.id } });
  if (!gift) return fail("Presente não encontrado.");

  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const remaining = gift.quotaCount - (await occupiedQuota(gift.id));
  if (remaining <= 0) return fail("Este presente já foi completamente presenteado! 🎉");
  if (quantity > remaining) return fail(`Restam apenas ${remaining} de ${gift.quotaCount} cotas.`);

  const quotaValue = gift.price / gift.quotaCount;
  const base = Math.round(quantity * quotaValue * 100) / 100;
  const { total, fee } = input.paymentMethod === "CREDIT_CARD"
    ? applyCardFee(base, effectiveCardFee(cfg).percent, cfg.passCardFeeToGuest)
    : { total: base, fee: 0 };

  if (input.paymentMethod === "CREDIT_CARD" && !input.cardToken) {
    return fail("Dados do cartão inválidos — tente novamente.");
  }

  // Repasse ligado = somente à vista: o custo extra do parcelamento ficaria
  // com os noivos e quebraria a garantia do valor cheio. Barreira no
  // servidor (a trava do Brick na tela pode ser burlada via API).
  if (input.paymentMethod === "CREDIT_CARD" && cfg.passCardFeeToGuest && (input.installments || 1) > 1) {
    return fail("Com o repasse da taxa ativado, o cartão é somente à vista (1x).");
  }

  // PIX via MP exige CPF válido + nome/sobrenome — sem isso o MP devolve
  // HTTP 400 13253 "Error in Financial Identity Use Case".
  let pixFirstName: string | undefined;
  let pixLastName: string | undefined;
  let pixCpf: string | undefined;
  if (input.paymentMethod === "PIX") {
    pixCpf = (input.pixIdentification?.number || "").replace(/\D/g, "");
    if (!pixCpf || !isValidCpf(pixCpf)) {
      return fail("Informe um CPF válido para gerar o PIX.");
    }
    if (input.guestName.trim().split(/\s+/).length < 2) {
      return fail("Informe seu nome completo (nome e sobrenome) para gerar o PIX.");
    }
    const split = splitName(input.guestName);
    pixFirstName = split.firstName;
    pixLastName = split.lastName;
  }

  const transaction = await prisma.transaction.create({
    data: {
      amount: total,
      quantity,
      status: "PENDING",
      paymentMethod: input.paymentMethod,
      guestName: input.guestName.trim(),
      guestMessage: input.guestMessage || null,
      expiresAt: new Date(Date.now() + QUOTA_HOLD_MINUTES * 60_000),
      wedding: { connect: { id: wedding.id } },
      gift: { connect: { id: gift.id } },
      ...(input.guestId && { guest: { connect: { id: input.guestId } } }),
    },
  });

  const siteUrl = await getSiteUrl();
  let mp;
  try {
    const isPix = input.paymentMethod === "PIX";
    mp = await createMpPayment(accessToken, {
      transactionAmount: total,
      description: `${quantity}x ${gift.name} — ${wedding.partner1Name} & ${wedding.partner2Name}`,
      paymentMethodId: isPix ? "pix" : (input.cardPaymentMethodId || "master"),
      payer: isPix
        ? { email: input.guestEmail.trim(), firstName: pixFirstName, lastName: pixLastName, identification: { type: "CPF", number: pixCpf! } }
        : { email: input.guestEmail.trim(), identification: input.cardIdentification },
      ...(isPix ? {} : { token: input.cardToken, installments: input.installments || 1 }),
      externalReference: transaction.id,
      // Alinha a expiração do QR com a reserva da cota (mín. MP: 30min).
      ...(isPix ? { dateOfExpiration: (transaction.expiresAt ?? new Date(Date.now() + QUOTA_HOLD_MINUTES * 60_000)).toISOString() } : {}),
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
      debugContext: {
        wedding: weddingSlug,
        amount: total,
        payMethod: input.paymentMethod,
        mpMethodId: isPix ? "pix" : (input.cardPaymentMethodId || "master"),
        installments: input.installments || 1,
        hasCardToken: !!input.cardToken,
        hasIdentification: isPix ? !!pixCpf : !!input.cardIdentification?.number,
        payerEmail: input.guestEmail.trim(),
      },
    });
  } catch (e: any) {
    const rawMsg: string = e?.message || "Operadora recusou o pagamento.";
    // Contexto sem PII p/ correlacionar no log do Railway (valor, bandeira,
    // parcelas). O detalhe cru do MP já é logado em mercadopago.ts.
    console.error("[createQuotaPayment] contexto", JSON.stringify({
      amount: total, method: input.paymentMethod, pmId: input.cardPaymentMethodId || null,
      inst: input.installments || 1, hasToken: !!input.cardToken,
    }));
    // 2034 = pagador e recebedor são o mesmo usuário. Busca o e-mail do
    // dono do token para dar um erro acionável ("você usou X, a conta é Y").
    if (/2034|invalid_users_involved/i.test(rawMsg)) {
      try {
        const diag = await diagnoseMpToken(accessToken);
        const sellerEmail = (diag.email || "").trim().toLowerCase();
        const buyerEmail = input.guestEmail.trim().toLowerCase();
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED" },
        });
        // Só acusa "mesmo e-mail" quando confere de verdade — em TEST o MP
        // dá 2034 mesmo com e-mails diferentes (comprador genérico fora da app).
        if (sellerEmail && sellerEmail === buyerEmail) {
          return fail(
            `O e-mail ${input.guestEmail.trim()} é o mesmo da conta que recebe (${diag.email}). O Mercado Pago bloqueia pagar para si mesmo (erro 2034). Teste com um e-mail DIFERENTE.`
          );
        }
        return fail(
          `Mercado Pago recusou com erro 2034 mesmo com e-mails diferentes (comprador ${input.guestEmail.trim()} × conta ${diag.email || "desconhecida"}). Em TESTE isso indica comprador fora da sua aplicação: crie uma conta de teste do tipo Comprador em Suas integrações → sua app → Contas de teste e use o e-mail dela; confira também se o Access Token é o de TESTE da MESMA app (o atual começa com APP_USR-) e teste com valor de R$ 10+.`
        );
      } catch { /* cai no fail genérico abaixo */ }
    }
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED" },
    });
    return fail(rawMsg);
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { externalId: String(mp.id), status: mp.status === "approved" ? "PAID" : "PENDING" },
  });

  revalidatePath(`/site/${weddingSlug}/presentes`);

  if (input.paymentMethod === "PIX") {
    return {
      ok: true as const,
      status: "pending" as const,
      transactionId: transaction.id,
      amount: total,
      fee,
      qrCodeBase64: mp.pointOfInteraction?.transactionData?.qrCodeBase64 || null,
      copyPaste: mp.pointOfInteraction?.transactionData?.qrCode || null,
      expiresAt: transaction.expiresAt,
    };
  }

  if (mp.status === "approved") {
    // Cartão aprovado na hora: aprende a taxa real desta venda (dedupe
    // garante que o webhook não conte a mesma venda 2x).
    await learnCardFeeFromMp(wedding.id, mp, { isTest: isTestToken(accessToken) });
    return { ok: true as const, status: "approved" as const, transactionId: transaction.id, amount: total, fee };
  }
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: "FAILED" },
  });
  return {
    ok: true as const,
    status: "rejected" as const,
    transactionId: transaction.id,
    amount: total,
    fee,
    detail: mp.statusDetail || mp.status,
  };
}

/* ---------------- PIX direto (BR Code próprio, 0% taxa) ---------------- */

type DirectPixInput = {
  giftId: string;
  quantity: number;
  guestName: string;
  guestMessage?: string;
  guestId?: string;
};

/** Gera o QR + copia e cola do PIX direto. Rota pública do site.
 *  Nunca lança: devolve { ok:false, error }. Sem taxa (valor exato). */
export async function createDirectPixPayment(weddingSlug: string, input: DirectPixInput) {
  try {
    return await createDirectPixPaymentInner(weddingSlug, input);
  } catch (e: any) {
    console.error("[createDirectPixPayment]", e?.message || e);
    return { ok: false as const, error: e?.message || "Erro ao gerar PIX." };
  }
}

async function createDirectPixPaymentInner(weddingSlug: string, input: DirectPixInput) {
  const fail = (error: string) => ({ ok: false as const, error });
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return fail("Casamento não encontrado.");
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  if (!cfg?.enabled || !directPixCfgValid(cfg)) return fail("PIX direto indisponível para este casamento.");

  if (!input.guestName.trim()) return fail("Informe seu nome.");

  const gift = await prisma.gift.findFirst({ where: { id: input.giftId, weddingId: wedding.id } });
  if (!gift) return fail("Presente não encontrado.");

  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const remaining = gift.quotaCount - (await occupiedQuota(gift.id));
  if (remaining <= 0) return fail("Este presente já foi completamente presenteado! 🎉");
  if (quantity > remaining) return fail(`Restam apenas ${remaining} de ${gift.quotaCount} cotas (outras podem estar aguardando confirmação).`);

  const quotaValue = gift.price / gift.quotaCount;
  const total = Math.round(quantity * quotaValue * 100) / 100;

  const transaction = await prisma.transaction.create({
    data: {
      amount: total,
      quantity,
      status: "PENDING",
      paymentMethod: "PIX",
      guestName: input.guestName.trim(),
      guestMessage: input.guestMessage || null,
      expiresAt: new Date(Date.now() + QUOTA_HOLD_MINUTES * 60_000),
      wedding: { connect: { id: wedding.id } },
      gift: { connect: { id: gift.id } },
      ...(input.guestId && { guest: { connect: { id: input.guestId } } }),
    },
  });

  // txid do BR Code: id interno (cuid alfanumérico ≤25 chars — válido p/ o BCB).
  const txid = transaction.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 25) || "CASARIUM";
  await prisma.transaction.update({ where: { id: transaction.id }, data: { pixTxId: txid } });

  let copyPaste: string;
  try {
    copyPaste = buildPixPayload({
      key: cfg.directPixKey!,
      name: cfg.directPixHolderName!,
      city: cfg.directPixCity!,
      amount: total,
      txid,
    });
  } catch (e: any) {
    await prisma.transaction.update({ where: { id: transaction.id }, data: { status: "FAILED" } });
    return fail(e?.message || "Chave PIX dos noivos inválida — avise os noivos.");
  }
  const qrDataUrl = await QRCode.toDataURL(copyPaste, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "M",
  }).catch(() => null);

  revalidatePath(`/site/${weddingSlug}/presentes`);
  return {
    ok: true as const,
    status: "pending" as const,
    transactionId: transaction.id,
    amount: total,
    copyPaste,
    qrDataUrl,
    holderName: cfg.directPixHolderName,
    expiresAt: transaction.expiresAt,
  };
}

/** Reserva do "já paguei": quanto tempo os noivos têm para confirmar
 *  antes da cota voltar a ficar disponível. */
const CLAIM_HOLD_HOURS = 72;

/** Convidado clicou "Já paguei" — carimba o aviso, estende a reserva e
 *  avisa os noivos por e-mail (eles nem sempre estão com o app aberto). */
export async function claimDirectPixPayment(transactionId: string) {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        gift: { select: { name: true } },
        wedding: { select: { id: true, slug: true, partner1Name: true, partner2Name: true } },
      },
    });
    if (!tx || !tx.pixTxId || tx.status !== "PENDING") {
      return { ok: false as const, error: "Pagamento não encontrado." };
    }
    if (!tx.claimedAt) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { claimedAt: new Date(), expiresAt: new Date(Date.now() + CLAIM_HOLD_HOURS * 3600_000) },
      });
      // E-mail nunca pode quebrar o "já paguei" (nem duplicar no duplo-clique).
      notifyCouplePixClaimed({
        weddingId: tx.wedding.id,
        weddingSlug: tx.wedding.slug,
        partner1Name: tx.wedding.partner1Name,
        partner2Name: tx.wedding.partner2Name,
        guestName: tx.guestName,
        giftName: tx.gift?.name || "Presente",
        amount: tx.amount,
        quantity: tx.quantity,
        guestMessage: tx.guestMessage,
      }).catch((e) => console.error("[claimEmail]", e?.message || e));
    }
    return { ok: true as const };
  } catch (e: any) {
    console.error("[claimDirectPixPayment]", e?.message || e);
    return { ok: false as const, error: "Erro ao avisar os noivos." };
  }
}

/** E-mail p/ os noivos (OWNERs) pedindo confirmação do PIX direto. */
async function notifyCouplePixClaimed(data: {
  weddingId: string;
  weddingSlug: string;
  partner1Name: string;
  partner2Name: string;
  guestName: string;
  giftName: string;
  amount: number;
  quantity: number;
  guestMessage: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const owners = await prisma.weddingMember.findMany({
    where: { weddingId: data.weddingId, role: "OWNER" },
    include: { user: { select: { email: true } } },
  });
  const to = [...new Set(owners.map((o) => o.user.email).filter((e): e is string => !!e))];
  if (to.length === 0) return;
  const siteUrl = await getSiteUrl();
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.amount);
  const link = `${siteUrl}/${data.weddingSlug}/presentes`;
  await resend.emails.send({
    from: "Casarium <onboarding@resend.dev>",
    to,
    subject: `🎁 ${data.guestName} pagou ${data.giftName} (${brl}) — confirme o presente`,
    html: [
      `<p>Olá, ${data.partner1Name} & ${data.partner2Name}! 💛</p>`,
      `<p><strong>${data.guestName}</strong> disse que pagou o PIX direto de <strong>${data.giftName}</strong> (${brl}${data.quantity > 1 ? ` · ${data.quantity} cotas` : ""}).</p>`,
      data.guestMessage ? `<p>Mensagem: <em>“${data.guestMessage}”</em></p>` : "",
      `<p>Confira no extrato do banco e <a href="${link}">confirme aqui na Gestão de Presentes</a> — a cota fica reservada por ${CLAIM_HOLD_HOURS}h.</p>`,
      `<p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:999px;text-decoration:none;">Confirmar presente</a></p>`,
    ].join(""),
  });
}

/** PIX direto aguardando confirmação dos noivos (só p/ quem configura). */
export async function getDirectPixPending(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  return prisma.transaction.findMany({
    where: { weddingId: wedding.id, status: "PENDING", pixTxId: { not: null } },
    include: { gift: { select: { name: true } } },
    orderBy: [{ claimedAt: "asc" }, { createdAt: "desc" }],
  });
}

/** Noivos confirmam o recebimento do PIX direto (entra na lista de presentes). */
export async function confirmDirectPixPayment(weddingSlug: string, transactionId: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, weddingId: wedding.id, pixTxId: { not: null } },
  });
  if (!tx) throw new Error("Pagamento não encontrado.");
  if (tx.status !== "PENDING") throw new Error("Pagamento já resolvido.");
  // Sem bloqueio: cotas são simbólicas — se outro convidado já completou,
  // confirma como EXCEDENTE (o valor a mais é bem-vindo) e avisa na volta.
  let overbooked = false;
  if (tx.giftId) {
    const gift = await prisma.gift.findUnique({ where: { id: tx.giftId } });
    if (gift) {
      const paidOthers = await prisma.transaction.aggregate({
        where: { giftId: tx.giftId, id: { not: tx.id }, status: "PAID" },
        _sum: { quantity: true },
      });
      overbooked = (paidOthers._sum.quantity || 0) + tx.quantity > gift.quotaCount;
    }
  }
  await prisma.transaction.update({ where: { id: tx.id }, data: { status: "PAID" } });
  revalidatePath(`/site/${weddingSlug}/presentes`);
  return { ok: true as const, overbooked };
}

/** Noivos rejeitam (não caiu / expirado) — libera a cota. */
export async function rejectDirectPixPayment(weddingSlug: string, transactionId: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, weddingId: wedding.id, pixTxId: { not: null } },
  });
  if (!tx) throw new Error("Pagamento não encontrado.");
  if (tx.status !== "PENDING") throw new Error("Pagamento já resolvido.");
  await prisma.transaction.update({ where: { id: tx.id }, data: { status: "FAILED" } });
  revalidatePath(`/site/${weddingSlug}/presentes`);
  return { ok: true as const };
}

/** PIX direto expirado/rejeitado recentemente (p/ restaurar se perderam o timing). */
export async function getDirectPixFailed(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  return prisma.transaction.findMany({
    where: {
      weddingId: wedding.id,
      status: "FAILED",
      pixTxId: { not: null },
      updatedAt: { gt: new Date(Date.now() - 7 * 24 * 3600_000) },
    },
    include: { gift: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
}

/** Restaura um PIX direto expirado/rejeitado: volta a PENDING com +24h de
 *  reserva (mantém o "já paguei" se havia). Sem trava de cota — se exceder,
 *  a confirmação avisa como excedente. */
export async function reopenDirectPixPayment(weddingSlug: string, transactionId: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, weddingId: wedding.id, pixTxId: { not: null } },
  });
  if (!tx) throw new Error("Pagamento não encontrado.");
  if (tx.status !== "FAILED") throw new Error("Só dá para restaurar pagamento expirado/rejeitado.");
  await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: "PENDING", expiresAt: new Date(Date.now() + 24 * 3600_000) },
  });
  revalidatePath(`/site/${weddingSlug}/presentes`);
  return { ok: true as const };
}

/** Últimos erros crus da API MP deste casamento (só p/ quem configura — diagnóstico). */
export async function getRecentMpErrors(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding");
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  return readRecentMpErrors().filter((e) => (e.context as any)?.wedding === weddingSlug);
}

/** Status público de uma transação (para o polling do PIX). */
export async function getCheckoutStatus(transactionId: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { status: true, amount: true },
  });
  if (!tx) throw new Error("Transação não encontrada.");
  return { status: tx.status, amount: tx.amount };
}

/** Confirma via API do MP (fonte autoritativa) — usado pelo webhook. */
export async function confirmMpPayment(weddingId: string, mpPaymentId: string | number) {
  const { accessToken } = await getConfigOrThrow(weddingId);
  const mp = await getMpPayment(accessToken, mpPaymentId);
  if (!mp.external_reference) return { ok: false as const, reason: "sem referência" };

  const tx = await prisma.transaction.findUnique({ where: { id: mp.external_reference } });
  if (!tx || tx.weddingId !== weddingId) return { ok: false as const, reason: "transação inválida" };
  if (mp.transaction_amount && Math.abs(mp.transaction_amount - tx.amount) > 0.01) {
    return { ok: false as const, reason: "valor divergente" };
  }

  if (mp.status === "approved") {
    if (tx.status !== "PAID") {
      await prisma.transaction.update({ where: { id: tx.id }, data: { status: "PAID" } });
    }
    // Aprende a taxa real desta venda para calibrar os próximos repasses.
    await learnCardFeeFromMp(weddingId, mp, { isTest: isTestToken(accessToken) });
    return { ok: true as const, status: "PAID" as const };
  }
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(mp.status)) {
    if (tx.status === "PENDING") {
      await prisma.transaction.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    }
    return { ok: true as const, status: "FAILED" as const };
  }
  return { ok: true as const, status: tx.status };
}

/** Expira reservas vencidas (cron diário + após cada checkout). Reivindicado
 *  tem prazo próprio (72h a partir do "já paguei") e também expira. */
export async function expireStalePayments() {
  const res = await prisma.transaction.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "FAILED" },
  });
  return { expired: res.count };
}

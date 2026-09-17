"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/payment-crypto";
import { createMpPayment, getMpPayment, applyCardFee, diagnoseMpToken, isTestToken } from "@/lib/mercadopago";
import { getSiteUrl } from "@/lib/site-url";

const QUOTA_HOLD_MINUTES = 40;

async function getConfigOrThrow(weddingId: string) {
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId } });
  if (!cfg || !cfg.enabled) throw new Error("Pagamentos online ainda não foram configurados para este casamento.");
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
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) throw new Error("Casamento não encontrado");
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  if (!cfg) return { configured: false as const };
  let env: "test" | "production" | "unknown" = "unknown";
  let masked = "••••••••";
  try {
    const raw = decryptSecret(cfg.accessTokenEncrypted);
    masked = `••••${raw.slice(-4)}`;
    if (raw.startsWith("TEST-")) env = "test";
    else if (raw.startsWith("APP_USR-")) env = "production";
  } catch {
    return { configured: false as const };
  }
  return {
    configured: true as const,
    masked,
    env,
    publicKeySet: !!cfg.publicKey,
    publicKeyHint: cfg.publicKey ? `${cfg.publicKey.slice(0, 9)}…${cfg.publicKey.slice(-4)}` : null,
    passCardFeeToGuest: cfg.passCardFeeToGuest,
    cardFeePercent: cfg.cardFeePercent,
    enabled: cfg.enabled,
    updatedAt: cfg.updatedAt,
  };
}

export async function savePaymentConfig(weddingSlug: string, data: {
  accessToken?: string;
  publicKey?: string;
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
  if (!encrypted) throw new Error("Informe o Access Token do Mercado Pago.");
  if (tokenTrimmed && !/^(TEST-|APP_USR-)/.test(tokenTrimmed)) {
    throw new Error("Access Token inválido — deve começar com TEST- ou APP_USR-.");
  }

  const fee = data.cardFeePercent === undefined
    ? (existing?.cardFeePercent ?? 4.98)
    : Math.min(30, Math.max(0, Number(data.cardFeePercent) || 0));

  return prisma.weddingPaymentConfig.upsert({
    where: { weddingId: wedding.id },
    create: {
      weddingId: wedding.id,
      accessTokenEncrypted: encrypted,
      publicKey: keyTrimmed || existing?.publicKey || null,
      passCardFeeToGuest: data.passCardFeeToGuest ?? existing?.passCardFeeToGuest ?? false,
      cardFeePercent: fee,
      enabled: data.enabled ?? existing?.enabled ?? true,
    },
    update: {
      ...(tokenTrimmed ? { accessTokenEncrypted: encrypted } : {}),
      // Campo vazio = manter a chave atual (nunca apaga sem querer)
      ...(keyTrimmed ? { publicKey: keyTrimmed } : {}),
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
  if (!cfg?.enabled || !cfg.publicKey) return { publicKey: null, env: null as "test" | "production" | null };
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

/** O casamento aceita pagamento online? (para o site decidir entre MP e simulação) */
export async function isPaymentConfigured(weddingSlug: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
  if (!wedding) return { configured: false as const };
  const cfg = await prisma.weddingPaymentConfig.findUnique({ where: { weddingId: wedding.id } });
  if (!cfg?.enabled) return { configured: false as const };
  try {
    decryptSecret(cfg.accessTokenEncrypted);
  } catch {
    return { configured: false as const };
  }
  const raw = decryptSecret(cfg.accessTokenEncrypted);
  return {
    configured: true as const,
    hasCard: !!cfg.publicKey,
    passCardFeeToGuest: cfg.passCardFeeToGuest,
    cardFeePercent: cfg.cardFeePercent,
    env: (isTestToken(raw) ? "test" : "production") as "test" | "production",
  };
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
  installments?: number;
};

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
  // Modo TEST do MP só aprova com comprador de teste (@testuser.com) — senão
  // devolve "excluded by a rule" ou 2034 (se igual ao vendedor), que
  // confundimos com parcelamento. Aceita qualquer @testuser.com, que é o
  // padrão dos usuários de teste criados no painel Developers.
  const guestEmailNorm = input.guestEmail.trim().toLowerCase();
  if (isTestToken(accessToken) && !guestEmailNorm.endsWith("@testuser.com")) {
    const typoHint = /test[e]?user|test-user/i.test(guestEmailNorm) && !guestEmailNorm.endsWith("@testuser.com")
      ? ` Atenção: você digitou "${input.guestEmail.trim()}" — o domínio certo é @testuser.com (ex: test@testuser.com).`
      : ` E-mail recebido: "${input.guestEmail.trim()}".`;
    return fail(`Em modo TESTE o Mercado Pago só aceita e-mail de comprador de teste (@testuser.com, ex: test@testuser.com) no checkout — nunca use seu e-mail real, dá erro 2034. Use nome APRO, CPF 12345678909, cartão 4235 6477 2802 5682. Ou troque por credencial APP_USR- de produção.${typoHint}`);
  }

  const gift = await prisma.gift.findFirst({ where: { id: input.giftId, weddingId: wedding.id } });
  if (!gift) return fail("Presente não encontrado.");

  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const soldAgg = await prisma.transaction.aggregate({
    where: { giftId: gift.id, status: "PAID" },
    _sum: { quantity: true },
  });
  const remaining = gift.quotaCount - (soldAgg._sum.quantity || 0);
  if (remaining <= 0) return fail("Este presente já foi completamente presenteado! 🎉");
  if (quantity > remaining) return fail(`Restam apenas ${remaining} de ${gift.quotaCount} cotas.`);

  const quotaValue = gift.price / gift.quotaCount;
  const base = Math.round(quantity * quotaValue * 100) / 100;
  const { total, fee } = input.paymentMethod === "CREDIT_CARD"
    ? applyCardFee(base, cfg.cardFeePercent, cfg.passCardFeeToGuest)
    : { total: base, fee: 0 };

  if (input.paymentMethod === "CREDIT_CARD" && !input.cardToken) {
    return fail("Dados do cartão inválidos — tente novamente.");
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
    mp = await createMpPayment(accessToken, {
      transactionAmount: total,
      description: `${quantity}x ${gift.name} — ${wedding.partner1Name} & ${wedding.partner2Name}`,
      paymentMethodId: input.paymentMethod === "PIX" ? "pix" : (input.cardPaymentMethodId || "master"),
      payer: { email: input.guestEmail.trim(), identification: input.cardIdentification },
      token: input.cardToken,
      installments: input.installments || 1,
      externalReference: transaction.id,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
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

/** Expira reservas PIX vencidas (chamado pelo cron diário + após cada checkout). */
export async function expireStalePayments() {
  const res = await prisma.transaction.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "FAILED" },
  });
  return { expired: res.count };
}

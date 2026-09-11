import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmMpPayment } from "@/app/actions/payments";

/**
 * Webhook do Mercado Pago.
 * Cadastre esta URL no painel MP (Sua integração → Webhooks):
 *   https://<app>/api/webhooks/mercadopago  (evento: payment)
 * Segurança: o body só carrega IDs — o status é sempre confirmado
 * buscando o pagamento na API do MP com o token dos noivos.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body?.type || body?.action;
    const paymentId = body?.data?.id;

    if ((type === "payment" || type === "payment.updated") && paymentId) {
      const tx = await prisma.transaction.findFirst({
        where: { externalId: String(paymentId) },
        select: { weddingId: true, status: true },
      });
      if (tx && tx.status === "PENDING") {
        await confirmMpPayment(tx.weddingId, paymentId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook MP error:", e);
    return NextResponse.json({ ok: true });
  }
}

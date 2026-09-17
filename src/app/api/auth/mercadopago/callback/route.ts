import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/payment-crypto";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const weddingSlug = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const siteUrl = await getSiteUrl();

  if (errorParam || !code || !weddingSlug) {
    const errorMsg = errorParam || "Autorização cancelada ou inválida.";
    return NextResponse.redirect(
      `${siteUrl}/${weddingSlug || ""}/presentes?mp_error=${encodeURIComponent(errorMsg)}`
    );
  }

  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug },
  });

  if (!wedding) {
    return NextResponse.redirect(
      `${siteUrl}/?mp_error=${encodeURIComponent("Casamento não encontrado.")}`
    );
  }

  const clientId = process.env.NEXT_PUBLIC_MP_CLIENT_ID || process.env.MP_CLIENT_ID || process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET || process.env.MP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${siteUrl}/${weddingSlug}/presentes?mp_error=${encodeURIComponent("Chaves de integração da aplicação (Client ID / Secret) ausentes no .env do servidor.")}`
    );
  }

  const redirectUri = `${siteUrl}/api/auth/mercadopago/callback`;

  try {
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error("[MP OAuth Callback Error]", data);
      const msg = data.message || data.error || "Falha ao trocar código de autorização pelo token no Mercado Pago.";
      return NextResponse.redirect(
        `${siteUrl}/${weddingSlug}/presentes?mp_error=${encodeURIComponent(msg)}`
      );
    }

    const accessTokenEncrypted = encryptSecret(data.access_token);
    const publicKey = data.public_key || null;

    const existing = await prisma.weddingPaymentConfig.findUnique({
      where: { weddingId: wedding.id },
    });

    await prisma.weddingPaymentConfig.upsert({
      where: { weddingId: wedding.id },
      create: {
        weddingId: wedding.id,
        accessTokenEncrypted,
        publicKey,
        passCardFeeToGuest: true,
        cardFeePercent: 4.98,
        enabled: true,
      },
      update: {
        accessTokenEncrypted,
        publicKey: publicKey || existing?.publicKey || null,
        enabled: true,
      },
    });

    return NextResponse.redirect(
      `${siteUrl}/${weddingSlug}/presentes?mp_connected=true`
    );
  } catch (e: any) {
    console.error("[MP OAuth Error]", e);
    return NextResponse.redirect(
      `${siteUrl}/${weddingSlug}/presentes?mp_error=${encodeURIComponent(e.message || "Erro inesperado ao conectar conta.")}`
    );
  }
}

import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { CoupleInviteEmail } from "@/components/emails/couple-invite-email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Por favor, passe o parâmetro ?email=seuemail@dominio.com" }, { status: 400 });
  }

  try {
    const data = await resend.emails.send({
      from: "Casarium <onboarding@resend.dev>",
      to: email,
      subject: "Testando o Resend no Casarium! 🚀",
      react: CoupleInviteEmail({
        coupleName: "Noivos de Teste",
        plannerName: "Sistema",
        weddingSlug: "teste-123",
        loginEmail: email,
        tempPassword: "senha-de-teste",
        siteUrl: "https://casarium-production.up.railway.app",
      }),
    });

    return NextResponse.json({ success: true, message: "E-mail enviado!", data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

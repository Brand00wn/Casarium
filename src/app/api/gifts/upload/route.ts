import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { getCurrentUser } from "@/lib/session";

const MAX_BYTES = 4 * 1024 * 1024;

/** Upload de imagem de presente via arquivo anexo.
 *  Retorna sempre JSON { url } ou { error } — nunca trava o cliente. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão expirada — entre de novo." }, { status: 401 });
    }
    if (!process.env.UPLOADTHING_TOKEN) {
      console.error("[gifts/upload] UPLOADTHING_TOKEN ausente no servidor.");
      return NextResponse.json(
        { error: "Serviço de imagem não configurado (falta UPLOADTHING_TOKEN no servidor)." },
        { status: 500 },
      );
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Envie uma imagem (JPG, PNG ou WEBP)." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagem maior que 4MB. Comprima e tente de novo." }, { status: 400 });
    }

    const utapi = new UTApi();
    const results = await utapi.uploadFiles([file]);
    const first: any = Array.isArray(results) ? results[0] : results;
    const url = first?.data?.url || first?.url;
    if (first?.error || !url) {
      console.error("[gifts/upload] UT erro:", JSON.stringify(first?.error || first).slice(0, 500));
      const msg =
        typeof first?.error === "string"
          ? first.error
          : first?.error?.message || "Falha ao enviar a imagem. Tente de novo.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("[gifts/upload]", e?.message || e);
    return NextResponse.json({ error: "Falha ao enviar a imagem. Tente de novo." }, { status: 500 });
  }
}

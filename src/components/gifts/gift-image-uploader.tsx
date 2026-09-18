"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, Trash2, TriangleAlert } from "lucide-react";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_DIM = 1600;

/** Normaliza a foto: se já é JPG/PNG/WEBP/GIF pequena, vai como está.
 *  Se é grande ou num formato chato (ex.: HEIC de iPhone), reduz para
 *  JPG 1600px no navegador. Lança Error com mensagem amigável se não der. */
async function normalizeImage(file: File): Promise<File> {
  const passthrough = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (passthrough.includes(file.type) && file.size <= MAX_BYTES) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error("Formato não suportado pelo navegador (ex.: HEIC de iPhone). Converta para JPG e tente de novo.");
  }
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) throw new Error("Não foi possível processar a imagem.");
    if (blob.size > MAX_BYTES) throw new Error("Imagem grande demais mesmo comprimida. Use uma foto menor.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    try { bitmap.close(); } catch { /* noop */ }
  }
}

/** Anexo de imagem do presente: seleciona → envia → devolve a URL.
 *  Erro aparece escrito na tela (nunca spinner infinito). */
export function GiftImageUploader({
  value,
  onUpload,
  onRemove,
}: {
  value: string;
  onUpload: (url: string) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    let payload = file;
    try {
      payload = await normalizeImage(file);
    } catch (e: any) {
      setError(e?.message || "Não foi possível processar a imagem.");
      return;
    }
    setSending(true);
    try {
      const form = new FormData();
      form.append("file", payload);
      const res = await fetch("/api/gifts/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setError(data?.error || "Falha ao enviar a imagem. Tente de novo.");
        return;
      }
      await onUpload(data.url);
    } catch {
      setError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setSending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  };

  if (value) {
    return (
      <div className="relative rounded-md overflow-hidden h-32 w-full border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Preview" className="object-cover w-full h-full" />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 w-8 h-8"
          disabled={removing}
          onClick={remove}
        >
          {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={sending}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) send(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={sending}
        onClick={() => inputRef.current?.click()}
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando imagem...</>
        ) : (
          <><ImagePlus className="w-4 h-4 mr-2" /> Anexar imagem do presente</>
        )}
      </Button>
      {error ? (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2 flex items-start gap-1.5">
          <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">JPG, PNG ou WEBP de até 4MB (foto grande é comprimida sozinha).</p>
      )}
    </div>
  );
}

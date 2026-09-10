import { UTApi } from "uploadthing/server";

/** Extrai a file key de URLs do UploadThing (ufs.sh, utfs.io...). Retorna null se não for UT. */
export function extractUploadthingKey(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/uploadthing|utfs\.io|ufs\.sh/i.test(u.hostname)) return null;
    const m = u.pathname.match(/\/f\/([A-Za-z0-9-_]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function getUtApi() {
  if (!process.env.UPLOADTHING_TOKEN) {
    throw new Error("UPLOADTHING_TOKEN ausente — configure no Railway (dashboard do UploadThing → API Keys).");
  }
  return new UTApi();
}

/** Apaga arquivos do UploadThing a partir das URLs. Silenciosamente ignora URLs externas. */
export async function deleteUploadthingUrls(urls: (string | null | undefined)[]) {
  const keys = urls
    .filter((u): u is string => !!u)
    .map(extractUploadthingKey)
    .filter((k): k is string => !!k);
  if (keys.length === 0) return { deleted: 0 };
  const utapi = getUtApi();
  await utapi.deleteFiles(keys);
  return { deleted: keys.length };
}

/** Baixa uma imagem externa e re-hospeda no UploadThing. Retorna a nova URL ou a original em caso de falha. */
export async function rehostImageToUploadthing(sourceUrl: string): Promise<string> {
  try {
    const utapi = getUtApi();
    const uploaded = await utapi.uploadFilesFromUrl(sourceUrl);
    if (uploaded.data?.url) return uploaded.data.url;
    return sourceUrl;
  } catch (e) {
    console.error("Falha ao re-hospedar imagem no UploadThing:", e);
    return sourceUrl;
  }
}

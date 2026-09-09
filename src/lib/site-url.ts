import { headers } from "next/headers";

function normalize(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function isLocal(url: string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url);
}

/**
 * URL base pública da aplicação (usada em links de e-mail, WhatsApp, ICS).
 *
 * Ordem de resolução:
 * 1. NEXT_PUBLIC_APP_URL (ignora valor localhost em produção — erro comum no Railway)
 * 2. NEXTAUTH_URL (mesma guarda anti-localhost em produção)
 * 3. RAILWAY_PUBLIC_DOMAIN (injetado automaticamente pelo Railway)
 * 4. Host da requisição atual (headers x-forwarded-host — funciona sem nenhuma env)
 * 5. http://localhost:3000 (desenvolvimento)
 */
export async function getSiteUrl(): Promise<string> {
  const isProd = process.env.NODE_ENV === "production";

  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit && !(isProd && isLocal(explicit))) {
    return normalize(explicit);
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl && !(isProd && isLocal(nextAuthUrl))) {
    return normalize(nextAuthUrl);
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain) {
    return `https://${normalize(railwayDomain)}`;
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ?? (isLocal(host) ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // fora do escopo de requisição (ex: scripts) — cai no fallback abaixo
  }

  return "http://localhost:3000";
}

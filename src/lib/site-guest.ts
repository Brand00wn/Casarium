import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizeGuestCode } from "@/lib/guest-code";

export function siteGuestCookieName(weddingId: string) {
  return `cg_${weddingId}`;
}

/** Lê o convidado identificado no site público (cookie com o token do convite). */
export async function getSiteGuestBySlug(slug: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!wedding) return null;

  const store = await cookies();
  const token = store.get(siteGuestCookieName(wedding.id))?.value;
  if (!token) return null;

  const guest = await prisma.guest.findFirst({
    where: { weddingId: wedding.id, token: normalizeGuestCode(token) },
    select: { id: true, name: true, token: true, isPrimary: true },
  });
  if (!guest) return null;

  return { ...guest, weddingId: wedding.id };
}

export async function readSiteGuestCookie(weddingId: string) {
  const store = await cookies();
  return store.get(siteGuestCookieName(weddingId))?.value ?? null;
}

export async function writeSiteGuestCookie(weddingId: string, token: string) {
  const store = await cookies();
  store.set(siteGuestCookieName(weddingId), normalizeGuestCode(token), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    sameSite: "lax",
  });
}

export async function deleteSiteGuestCookie(weddingId: string) {
  const store = await cookies();
  store.delete(siteGuestCookieName(weddingId));
}

"use server"

import { prisma } from "@/lib/prisma"
import { normalizeGuestCode } from "@/lib/guest-code"
import { writeSiteGuestCookie, deleteSiteGuestCookie } from "@/lib/site-guest"

async function getFullInvite(weddingId: string, guestId: string) {
  const guest = await prisma.guest.findFirst({
    where: { id: guestId, weddingId },
    include: {
      family: {
        include: {
          guests: {
            orderBy: { isPrimary: 'desc' },
            include: {
              eventGuests: true // To get their sub-event RSVPs
            }
          }
        }
      }
    }
  })

  if (!guest) return null

  // Fetch events that require RSVP
  // We need public events + private events where any family member is invited
  const familyGuestIds = guest.family ? guest.family.guests.map(g => g.id) : [guest.id]

  const rsvpEvents = await prisma.event.findMany({
    where: {
      weddingId,
      requiresRsvp: true,
      OR: [
        { isPublicRsvp: true },
        { eventGuests: { some: { guestId: { in: familyGuestIds } } } }
      ]
    },
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      location: true,
      isPublicRsvp: true,
      eventGuests: {
        where: { guestId: { in: familyGuestIds } },
        select: { guestId: true, rsvpStatus: true }
      }
    },
    orderBy: { date: 'asc' }
  })

  return { guest, rsvpEvents }
}

export async function searchGuest(slug: string, query: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug }
  })
  if (!wedding) return null

  // Ensure query is cleaned
  const q = query.trim()
  if (!q) return null

  // Código exato (token/QR do convite ou deep-link) → abre o convite direto
  const normalized = normalizeGuestCode(q)
  const exact = await prisma.guest.findFirst({
    where: {
      weddingId: wedding.id,
      OR: [{ token: normalized }, { qrCode: q }, { qrCode: normalized }],
    },
    select: { id: true },
  })
  if (exact) {
    const full = await getFullInvite(wedding.id, exact.id)
    if (full) return { type: "invite" as const, ...full }
  }

  // Busca parcial por nome/e-mail → lista candidatos SEM dados sensíveis.
  // A confirmação só libera com o token do convite (validateInviteToken).
  const candidates = await prisma.guest.findMany({
    where: {
      weddingId: wedding.id,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      family: { select: { guests: { select: { id: true } } } },
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    take: 8,
  })

  return {
    type: "candidates" as const,
    candidates: candidates.map((c) => ({
      id: c.id,
      name: c.name,
      familyCount: c.family ? c.family.guests.length : 1,
    })),
  }
}

/** Valida o token do convite e libera os dados para confirmação. */
export async function validateInviteToken(slug: string, guestId: string, token: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug } })
  if (!wedding) return { success: false as const, error: "Casamento não encontrado." }

  const normalized = normalizeGuestCode(token)
  if (!normalized) return { success: false as const, error: "Informe o código do convite." }

  const guest = await prisma.guest.findFirst({
    where: {
      id: guestId,
      weddingId: wedding.id,
      OR: [{ token: normalized }, { qrCode: normalized }],
    },
    select: { id: true, name: true, token: true },
  })

  if (!guest || !guest.token) {
    return { success: false as const, error: "Código inválido para este convite." }
  }

  const full = await getFullInvite(wedding.id, guest.id)
  if (!full) return { success: false as const, error: "Convite não encontrado." }

  return { success: true as const, token: guest.token, ...full }
}

export async function submitRsvp(slug: string, updates: any[]) {
  // updates is array of { id, rsvpStatus, dietaryRestrictions, notes }
  const wedding = await prisma.wedding.findUnique({ where: { slug } })
  if (!wedding) throw new Error("Casamento não encontrado")

  const ids = updates.map((u) => u.id)
  // Blindagem: todos os convidados precisam pertencer a este casamento
  const owned = await prisma.guest.findMany({
    where: { id: { in: ids }, weddingId: wedding.id },
    select: { id: true },
  })
  if (owned.length !== ids.length) {
    throw new Error("Convite inválido para este casamento.")
  }

  // Blindagem: eventos precisam pertencer a este casamento
  const eventIds = [...new Set(updates.flatMap((u) => (u.eventRsvps || []).map((ev: any) => ev.eventId)))]
  if (eventIds.length > 0) {
    const ownedEvents = await prisma.event.findMany({
      where: { id: { in: eventIds }, weddingId: wedding.id },
      select: { id: true },
    })
    if (ownedEvents.length !== eventIds.length) {
      throw new Error("Evento inválido para este casamento.")
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      await tx.guest.update({
        where: { id: update.id },
        data: {
          rsvpStatus: update.rsvpStatus,
          dietaryRestrictions: update.dietaryRestrictions || [],
          notes: update.notes || ""
        }
      })

      if (update.eventRsvps && Array.isArray(update.eventRsvps)) {
        for (const ev of update.eventRsvps) {
          await tx.eventGuest.upsert({
            where: {
              eventId_guestId: {
                eventId: ev.eventId,
                guestId: update.id
              }
            },
            create: {
              eventId: ev.eventId,
              guestId: update.id,
              rsvpStatus: ev.rsvpStatus
            },
            update: {
              rsvpStatus: ev.rsvpStatus
            }
          })
        }
      }
    }
  })
  return { success: true }
}

/** Identifica o convidado no site (cookie) após validar o token. */
export async function identifySiteGuest(slug: string, token: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug } })
  if (!wedding) return { success: false as const }
  await writeSiteGuestCookie(wedding.id, token)
  return { success: true as const }
}

/** Esquece o convidado identificado ("não sou eu"). */
export async function forgetSiteGuest(slug: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug } })
  if (!wedding) return { success: false as const }
  await deleteSiteGuestCookie(wedding.id)
  return { success: true as const }
}

export async function postMessage(slug: string, authorName: string, content: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug } })
  if (!wedding) throw new Error("Casamento não encontrado")
  
  await prisma.guestMessage.create({
    data: {
      weddingId: wedding.id,
      authorName,
      content,
    }
  })
  return { success: true }
}

export async function getMessages(slug: string) {
  const wedding = await prisma.wedding.findUnique({ where: { slug } })
  if (!wedding) return []

  return await prisma.guestMessage.findMany({
    where: { weddingId: wedding.id, isPublic: true },
    orderBy: { createdAt: "desc" }
  })
}

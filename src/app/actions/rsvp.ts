"use server"

import { prisma } from "@/lib/prisma"

export async function searchGuest(slug: string, query: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug }
  })
  if (!wedding) return null

  // Ensure query is cleaned
  const q = query.trim()
  if (!q) return null

  const guest = await prisma.guest.findFirst({
    where: {
      weddingId: wedding.id,
      OR: [
        { email: { equals: q, mode: "insensitive" } },
        { name: { equals: q, mode: "insensitive" } },
        { token: { equals: q, mode: "insensitive" } }
      ]
    },
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
      weddingId: wedding.id,
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

export async function submitRsvp(slug: string, updates: any[]) {
  // updates is array of { id, rsvpStatus, dietaryRestrictions, notes }
  const wedding = await prisma.wedding.findUnique({ where: { slug } })
  if (!wedding) throw new Error("Casamento não encontrado")

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

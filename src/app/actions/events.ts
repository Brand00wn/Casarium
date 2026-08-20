"use server"
import { prisma } from "@/lib/prisma"

import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { EventType, RsvpStatus } from "@prisma/client"

/**
 * Busca todos os eventos para o Admin (Global)
 */
export async function getAllAdminEvents() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") throw new Error("Acesso negado")

  const events = await prisma.event.findMany({
    orderBy: { date: "asc" },
    include: {
      wedding: {
        select: { 
          id: true, 
          partner1Name: true, 
          partner2Name: true, 
          slug: true,
          members: {
            where: { role: "PLANNER" },
            select: { user: { select: { name: true } } }
          }
        }
      },
      creator: {
        select: { id: true, name: true, email: true, role: true }
      },
      _count: { select: { eventGuests: true } }
    }
  })
  return events
}

/**
 * Busca todos os eventos de todos os casamentos gerenciados pelo Cerimonialista
 */
export async function getPlannerEvents() {
  const user = await getCurrentUser()
  if (!user || user.role !== "PLANNER") throw new Error("Acesso negado. Apenas cerimonialistas.")

  const plannerId = user.id

  const events = await prisma.event.findMany({
    where: {
      wedding: {
        members: {
          some: { userId: plannerId, role: "PLANNER" }
        }
      }
    },
    orderBy: { date: "asc" },
    include: {
      wedding: {
        select: { id: true, partner1Name: true, partner2Name: true, slug: true, primaryColor: true }
      },
      creator: {
        select: { id: true, name: true, role: true }
      },
      _count: { select: { eventGuests: true } }
    }
  })
  return events
}

/**
 * Busca os eventos de um casamento específico (Para os noivos ou cerimonialista visualizando o painel)
 */
export async function getWeddingEvents(weddingId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Acesso negado.")

  // Verifica acesso (simplificado para o MVP - Noivos ou Planner)
  const membership = await prisma.weddingMember.findUnique({
    where: { userId_weddingId: { userId: user.id, weddingId } }
  })
  if (!membership && user.role !== "ADMIN") throw new Error("Acesso negado a este casamento.")

  const events = await prisma.event.findMany({
    where: { weddingId },
    orderBy: { date: "asc" },
    include: {
      creator: { select: { name: true, role: true } },
      eventGuests: {
        include: {
          guest: { select: { id: true, name: true, email: true, phone: true } }
        }
      }
    }
  })
  return events
}

/**
 * Cria um novo evento
 */
export async function createEvent(data: {
  weddingId: string
  title: string
  description?: string
  date: Date
  startTime?: string
  endTime?: string
  location?: string
  type: EventType
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Acesso negado.")

  const membership = await prisma.weddingMember.findUnique({
    where: { userId_weddingId: { userId: user.id, weddingId: data.weddingId } }
  })
  if (!membership && user.role !== "ADMIN") throw new Error("Sem permissão.")

  const event = await prisma.event.create({
    data: {
      ...data,
      createdById: user.id
    }
  })

  revalidatePath(`/${data.weddingId}/cronograma`)
  revalidatePath("/planner/calendar")
  revalidatePath("/admin/calendar")
  
  return event
}

/**
 * Atualiza um evento
 */
export async function updateEvent(eventId: string, data: Partial<{
  title: string
  description: string
  date: Date
  startTime: string
  endTime: string
  location: string
  type: EventType
}>) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Acesso negado.")

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { weddingId: true } })
  if (!event) throw new Error("Evento não encontrado")

  const membership = await prisma.weddingMember.findUnique({
    where: { userId_weddingId: { userId: user.id, weddingId: event.weddingId } }
  })
  if (!membership && user.role !== "ADMIN") throw new Error("Sem permissão.")

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data
  })

  revalidatePath(`/${event.weddingId}/cronograma`)
  revalidatePath("/planner/calendar")
  revalidatePath("/admin/calendar")

  return updatedEvent
}

/**
 * Exclui um evento
 */
export async function deleteEvent(eventId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Acesso negado.")

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { weddingId: true } })
  if (!event) throw new Error("Evento não encontrado")

  const membership = await prisma.weddingMember.findUnique({
    where: { userId_weddingId: { userId: user.id, weddingId: event.weddingId } }
  })
  if (!membership && user.role !== "ADMIN") throw new Error("Sem permissão.")

  await prisma.event.delete({ where: { id: eventId } })

  revalidatePath(`/${event.weddingId}/cronograma`)
  revalidatePath("/planner/calendar")
  revalidatePath("/admin/calendar")

  return { success: true }
}

/**
 * Sincroniza a lista de convidados convidados para um evento
 */
export async function syncEventGuests(eventId: string, guestIds: string[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Acesso negado.")

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { weddingId: true } })
  if (!event) throw new Error("Evento não encontrado")

  const membership = await prisma.weddingMember.findUnique({
    where: { userId_weddingId: { userId: user.id, weddingId: event.weddingId } }
  })
  if (!membership && user.role !== "ADMIN") throw new Error("Sem permissão.")

  // Em uma transação: exclui todos os vínculos atuais deste evento, e cria os novos
  await prisma.$transaction([
    prisma.eventGuest.deleteMany({ where: { eventId } }),
    prisma.eventGuest.createMany({
      data: guestIds.map(guestId => ({
        eventId,
        guestId,
        rsvpStatus: "PENDING"
      }))
    })
  ])

  revalidatePath(`/${event.weddingId}/cronograma`)
  return { success: true }
}

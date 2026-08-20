"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/session"

export async function createTable(weddingSlug: string, name: string, capacity: number, color?: string, x: number = 100, y: number = 100) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } })
    if (!wedding) throw new Error("Casamento não encontrado")

    const table = await prisma.table.create({
      data: {
        name,
        capacity,
        weddingId: wedding.id,
        color,
        x,
        y
      }
    })
    
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true, table }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTablePosition(weddingSlug: string, tableId: string, x: number, y: number) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    await prisma.table.update({
      where: { id: tableId },
      data: { x, y }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteTable(weddingSlug: string, tableId: string) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    await prisma.table.delete({ where: { id: tableId } })
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function unassignGuestFromTable(weddingSlug: string, guestId: string) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { isPrimary: true, familyId: true }
    })
    if (!guest) throw new Error("Convidado não encontrado")

    if (guest.familyId && guest.isPrimary) {
      await prisma.guest.updateMany({
        where: { familyId: guest.familyId },
        data: { tableId: null }
      })
    } else {
      await prisma.guest.update({
        where: { id: guestId },
        data: { tableId: null }
      })
    }
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function clearTableGuests(weddingSlug: string, tableId: string) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    await prisma.guest.updateMany({
      where: { tableId },
      data: { tableId: null }
    })
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTableDetails(weddingSlug: string, tableId: string, name: string, capacity: number, color?: string) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    const table = await prisma.table.update({
      where: { id: tableId },
      data: { name, capacity, color: color || null }
    })
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function assignGuestToTable(weddingSlug: string, guestId: string, tableId: string | null, moveFamily: boolean = false) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { isPrimary: true, familyId: true }
    })

    if (!guest) throw new Error("Convidado não encontrado")

    if (moveFamily && guest.familyId) {
      await prisma.guest.updateMany({
        where: { familyId: guest.familyId },
        data: { tableId }
      })
    } else {
      await prisma.guest.update({
        where: { id: guestId },
        data: { tableId }
      })
    }
    
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}


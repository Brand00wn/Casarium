"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/session"
import { ElementType } from "@prisma/client"

export async function createVenueElement(weddingSlug: string, type: ElementType, name: string, color?: string, icon?: string, x: number = 100, y: number = 100) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } })
    if (!wedding) throw new Error("Casamento não encontrado")

    const element = await prisma.venueElement.create({
      data: {
        weddingId: wedding.id,
        type,
        name,
        color,
        icon,
        x,
        y,
        width: 200,
        height: 200
      }
    })
    
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true, element }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateVenueElementDetails(weddingSlug: string, id: string, name: string, color?: string, icon?: string) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    await prisma.venueElement.update({
      where: { id },
      data: { name, color: color || null, icon: icon || null }
    })
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Atualiza as dimensões do elemento (usado pelo redimensionamento por arrasto no mapa).
export async function updateVenueElementSize(weddingSlug: string, id: string, width: number, height: number) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error("Dimensão inválida")
    await prisma.venueElement.update({
      where: { id },
      data: {
        width: Math.min(1200, Math.max(60, Math.round(width))),
        height: Math.min(1200, Math.max(60, Math.round(height)))
      }
    })
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateVenueElementPosition(weddingSlug: string, id: string, x: number, y: number) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    await prisma.venueElement.update({
      where: { id },
      data: { x, y }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteVenueElement(weddingSlug: string, id: string) {
  try {
    await requirePermission(weddingSlug, "canManageTables")
    await prisma.venueElement.delete({ where: { id } })
    revalidatePath(`/${weddingSlug}/mesas`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

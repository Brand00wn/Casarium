"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/session"
import { type GuestFormValues } from "@/lib/validations/guest"

export async function createGuest(weddingId: string, data: GuestFormValues) {
  try {
    await requirePermission(weddingId, "canManageGuests")
    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingId },
      select: { id: true }
    })

    if (!wedding) throw new Error("Casamento não encontrado")

    const familyName = `Família de ${data.name.split(" ")[0]}`

    const restrictionsArray = data.dietaryRestrictions
      ? data.dietaryRestrictions.split(",").map(s => s.trim()).filter(Boolean)
      : []

    // Transação para garantir que a família e todos os convidados sejam criados juntos
    await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          weddingId: wedding.id,
          name: familyName,
        }
      })

      // 1. Cria o Titular
      const titular = await tx.guest.create({
        data: {
          weddingId: wedding.id,
          familyId: family.id,
          isPrimary: true,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          rsvpStatus: data.rsvpStatus,
          dietaryRestrictions: restrictionsArray,
          notes: data.ageCategory ? `Idade: ${data.ageCategory}` : null,
          token: Math.random().toString(36).substring(2, 8).toUpperCase(),
          qrCode: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }
      })

      // 2. Atualiza a Family com o headOfFamilyId
      await tx.family.update({
        where: { id: family.id },
        data: { headOfFamilyId: titular.id }
      })

      // 3. Cria os Acompanhantes (Dependentes)
      if (data.companions && data.companions.length > 0) {
        await tx.guest.createMany({
          data: data.companions.map(comp => ({
            weddingId: wedding.id,
            familyId: family.id,
            isPrimary: false,
            name: comp.name,
            phone: comp.phone || null,
            dietaryRestrictions: comp.dietaryRestrictions
              ? comp.dietaryRestrictions.split(",").map(s => s.trim()).filter(Boolean)
              : [],
            notes: comp.ageCategory ? `Idade: ${comp.ageCategory}` : null,
            rsvpStatus: data.rsvpStatus, // Herda status inicial do titular
            token: Math.random().toString(36).substring(2, 8).toUpperCase(),
            qrCode: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          }))
        })
      }
    })

    revalidatePath(`/${weddingId}/convidados`)
    return { success: true }
  } catch (error) {
    console.error("Erro ao criar convidado:", error)
    return { success: false, error: "Falha ao criar o convidado." }
  }
}

export async function deleteGuest(weddingId: string, guestId: string) {
  try {
    await requirePermission(weddingId, "canManageGuests")
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { familyId: true, isPrimary: true }
    })

    if (!guest) throw new Error("Convidado não encontrado")

    if (guest.isPrimary && guest.familyId) {
      // Deleta a família inteira (cascade deleta todos os acompanhantes)
      await prisma.family.delete({
        where: { id: guest.familyId }
      })
    } else {
      // Deleta só o acompanhante se não for o titular
      await prisma.guest.delete({
        where: { id: guestId }
      })
    }
    
    revalidatePath(`/${weddingId}/convidados`)
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar convidado:", error)
    return { success: false, error: "Falha ao deletar o convidado." }
  }
}

export type BatchGuestData = {
  name: string
  email?: string
  phone?: string
  dietaryRestrictions?: string
  companions?: string // nomes separados por vírgula para simplificar importação via CSV
}

export async function importGuests(weddingId: string, data: BatchGuestData[]) {
  try {
    await requirePermission(weddingId, "canManageGuests")
    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingId }
    })
    if (!wedding) throw new Error("Casamento não encontrado")

    // Transação para importar todos de uma vez
    await prisma.$transaction(async (tx) => {
      for (const row of data) {
        if (!row.name) continue;

        const familyName = `Família de ${row.name.split(" ")[0]}`
        
        const family = await tx.family.create({
          data: { weddingId: wedding.id, name: familyName }
        })

        const restrictions = row.dietaryRestrictions 
          ? row.dietaryRestrictions.split(",").map(s => s.trim()).filter(Boolean) 
          : []

        const titular = await tx.guest.create({
          data: {
            weddingId: wedding.id,
            familyId: family.id,
            isPrimary: true,
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            dietaryRestrictions: restrictions,
            token: Math.random().toString(36).substring(2, 8).toUpperCase(),
            qrCode: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          }
        })

        await tx.family.update({
          where: { id: family.id },
          data: { headOfFamilyId: titular.id }
        })

        if (row.companions) {
          const comps = row.companions.split(",").map(c => c.trim()).filter(Boolean)
          if (comps.length > 0) {
            await tx.guest.createMany({
              data: comps.map(c => ({
                weddingId: wedding.id,
                familyId: family.id,
                isPrimary: false,
                name: c,
                token: Math.random().toString(36).substring(2, 8).toUpperCase(),
                qrCode: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
              }))
            })
          }
        }
      }
    })

    revalidatePath(`/${weddingId}/convidados`)
    return { success: true }
  } catch (error: any) {
    console.error("Erro na importação:", error)
    return { success: false, error: error.message || "Falha ao importar." }
  }
}

export async function updateGuest(weddingSlug: string, guestId: string, data: any) {
  try {
    await requirePermission(weddingSlug, "canManageGuests")
    const existingGuest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { familyId: true, isPrimary: true, weddingId: true }
    })
    if (!existingGuest) {
      throw new Error("Convidado não encontrado")
    }
    if (!existingGuest.isPrimary) {
      throw new Error("Apenas titulares podem ser editados por aqui.")
    }

    const restrictionsArray = data.dietaryRestrictions ? data.dietaryRestrictions.split(",").map((s: string) => s.trim()).filter(Boolean) : []
    let familyIdToUse = existingGuest.familyId

    await prisma.$transaction(async (tx) => {
      // Se não tiver família, cria uma nova
      if (!familyIdToUse) {
        const familyName = "Família de " + data.name.split(" ")[0]
        const family = await tx.family.create({
          data: { weddingId: existingGuest.weddingId, name: familyName, headOfFamilyId: guestId }
        })
        familyIdToUse = family.id
      }

      await tx.guest.update({
        where: { id: guestId },
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          dietaryRestrictions: restrictionsArray,
          notes: data.ageCategory ? `Idade: ${data.ageCategory}` : null,
          familyId: familyIdToUse // garante que o titular tem familyId
        }
      })
      
      const familyName = "Família de " + data.name.split(" ")[0]
      await tx.family.update({
        where: { id: familyIdToUse },
        data: { name: familyName }
      })

      await tx.guest.deleteMany({
        where: { familyId: familyIdToUse, isPrimary: false }
      })
      
      if (data.companions && data.companions.length > 0) {
        await tx.guest.createMany({
          data: data.companions.map((comp: any) => ({
            weddingId: existingGuest.weddingId,
            familyId: familyIdToUse,
            name: comp.name,
            phone: comp.phone || null,
            dietaryRestrictions: comp.dietaryRestrictions ? comp.dietaryRestrictions.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
            notes: comp.ageCategory ? `Idade: ${comp.ageCategory}` : null,
            isPrimary: false,
            token: Math.random().toString(36).substring(2, 8).toUpperCase(),
            qrCode: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          }))
        })
      }
    })
    revalidatePath(`/${weddingSlug}/convidados`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}



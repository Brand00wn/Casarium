"use server"

import { prisma } from "@/lib/prisma"

export type SyncResult = 
  | { action: "skipped", reason: string }
  | { action: "created", guest: any }
  | { action: "linked", guest: any }
  | { action: "ambiguous", candidates: any[] }

export async function syncPartyMemberToGuest(weddingId: string, memberName: string, memberId: string, isDeceased: boolean): Promise<SyncResult> {
  if (isDeceased) {
    return { action: "skipped", reason: "deceased" }
  }

  const cleanName = memberName.trim()
  if (!cleanName) {
    return { action: "skipped", reason: "empty_name" }
  }

  // Busca todos os convidados com o nome parecido (contém a string, case-insensitive)
  const existingGuests = await prisma.guest.findMany({
    where: {
      weddingId,
      name: {
        contains: cleanName,
        mode: 'insensitive'
      }
    }
  })

  // Se não tem ninguém com nome parecido, criamos um novo convidado
  if (existingGuests.length === 0) {
    const family = await prisma.family.create({
      data: {
        weddingId,
        name: `Família de ${cleanName.split(" ")[0]}`
      }
    })

    const newGuest = await prisma.guest.create({
      data: {
        weddingId,
        name: cleanName,
        familyId: family.id,
        isPrimary: true,
        qrCode: crypto.randomUUID(),
        token: crypto.randomUUID(),
        partyMember: {
          connect: { id: memberId }
        }
      }
    })

    await prisma.family.update({
      where: { id: family.id },
      data: { headOfFamilyId: newGuest.id }
    })

    return { action: "created", guest: newGuest }
  }

  // Se achou exatamente 1 pessoa, e ela não está vinculada a outro padrinho, vincula!
  if (existingGuests.length === 1) {
    const guest = existingGuests[0]
    
    // Verifica se esse guest já não está amarrado em outro membro do cortejo
    const existingLink = await prisma.weddingPartyMember.findUnique({
      where: { guestId: guest.id }
    })

    if (existingLink && existingLink.id !== memberId) {
      return { action: "skipped", reason: "guest_already_linked" }
    }

    await prisma.weddingPartyMember.update({
      where: { id: memberId },
      data: { guestId: guest.id }
    })

    return { action: "linked", guest }
  }

  // Se achou 2 ou mais pessoas com nomes parecidos
  return { action: "ambiguous", candidates: existingGuests }
}

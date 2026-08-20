"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { syncPartyMemberToGuest } from "./party-guest-sync"
import { recalculateRelativeDates } from "./checklist"

export async function getWeddingDetails(weddingId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Não autorizado")

  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingId },
    include: { 
      vendorRecommendations: true, 
      partyMembers: {
        orderBy: { order: 'asc' },
        include: { pairedOf: { select: { id: true } } }
      },
      guests: {
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      } 
    }
  })

  if (!wedding) throw new Error("Casamento não encontrado")

  return wedding
}

export async function updateWeddingDetails(weddingId: string, data: any) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Não autorizado")

  // Validação básica se o usuário tem permissão para editar (idealmente)
  const membership = await prisma.weddingMember.findFirst({
    where: {
      userId: user.id,
      wedding: { slug: weddingId },
      role: { in: ["OWNER", "PLANNER"] }
    }
  })

  if (!membership && user.role !== "ADMIN") {
    throw new Error("Sem permissão para alterar este casamento")
  }

  // Guarda a data antiga para saber se mudou
  const oldWedding = await prisma.wedding.findUnique({ where: { slug: weddingId }, select: { date: true, id: true } })

  // Atualiza
  const updated = await prisma.wedding.update({
    where: { slug: weddingId },
    data: {
      partner1Name: data.partner1Name,
      partner1Role: data.partner1Role,
      partner2Name: data.partner2Name,
      partner2Role: data.partner2Role,
      date: data.date ? new Date(data.date) : undefined,
      ceremonyDate: data.ceremonyDate ? new Date(data.ceremonyDate) : null,
      receptionDate: data.receptionDate ? new Date(data.receptionDate) : null,
      ceremonyLocation: data.ceremonyLocation || null,
      ceremonyPlaceId: data.ceremonyPlaceId || null,
      receptionLocation: data.receptionLocation || null,
      receptionPlaceId: data.receptionPlaceId || null,
      venue: data.venue || null,
      theme: data.theme || null,
      dressCode: data.dressCode || null,
      ourStory: data.ourStory || null,
      coverImageUrl: data.coverImageUrl || null,
      primaryColor: data.primaryColor || null,
      secondaryColor: data.secondaryColor || null,
      isPublicSiteEnabled: data.isPublicSiteEnabled ?? true,
      sitePassword: data.sitePassword || null,
      hasReception: data.hasReception ?? true,
      isSameLocation: data.isSameLocation ?? false,
      rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline) : null,
      rsvpMessage: data.rsvpMessage || null,
      spotifyLink: data.spotifyLink || null,
      hashtag: data.hashtag || null,
      moderateMessages: data.moderateMessages ?? false,
      accommodationTips: data.accommodationTips || null,
      hasAccommodationTips: data.hasAccommodationTips ?? false,
      ceremonyParkingType: data.ceremonyParkingType || null,
      receptionParkingType: data.receptionParkingType || null,
    }
  })

  // Sincronizar Recomendações de Fornecedores
  if (data.vendorRecommendations) {
    await prisma.vendorRecommendation.deleteMany({
      where: { weddingId: updated.id }
    });

    if (data.vendorRecommendations.length > 0) {
      await prisma.vendorRecommendation.createMany({
        data: data.vendorRecommendations.map((v: any) => ({
          weddingId: updated.id,
          type: v.type,
          name: v.name,
          address: v.address || null,
          placeId: v.placeId || null,
          recommendedProfessional: v.recommendedProfessional || null,
          notes: v.notes || null,
        }))
      });
    }
  }

  // Sincronizar Cortejo/Homenageados
  if (data.partyMembers) {
    await prisma.weddingPartyMember.deleteMany({
      where: { weddingId: updated.id }
    });

    if (data.partyMembers.length > 0) {
      // 1. Criar os registros preservando guestId e sincronizando novos
      const createdMembers: { clientId: string, dbId: string }[] = [];
      for (let i = 0; i < data.partyMembers.length; i++) {
        const m = data.partyMembers[i];
        
        let finalGuestId = m.guestId;
        
        const created = await prisma.weddingPartyMember.create({
          data: {
            weddingId: updated.id,
            type: m.type === "PARENT" ? "FATHER" : m.type === "GRANDPARENT" ? "GRANDFATHER" : m.type === "SIBLING" ? "BROTHER" : m.type,
            side: m.side,
            name: m.name,
            attireColor: m.attireColor || null,
            isDeceased: m.isDeceased ?? false,
            isMentioned: m.isMentioned ?? true,
            hasTribute: m.hasTribute ?? false,
            accompanies: (m.pairedWithId === "partner1" || m.pairedWithId === "partner2") ? m.pairedWithId.toUpperCase() : null,
            guestId: finalGuestId,
            order: i
          }
        });
        
        // Se ainda não tinha guestId e não é falecido, tenta sincronizar
        if (!finalGuestId && !created.isDeceased) {
          const syncResult = await syncPartyMemberToGuest(updated.id, created.name, created.id, created.isDeceased);
          if (syncResult.action === "created" || syncResult.action === "linked") {
            finalGuestId = syncResult.guest.id;
          }
        }
        
        createdMembers.push({ clientId: m.clientId, dbId: created.id });
      }

      // 2. Vincular parceiros
      const linkedPairs = new Set<string>();
      for (const m of data.partyMembers) {
        if (m.pairedWithId && m.pairedWithId !== "none" && m.pairedWithId !== "partner1" && m.pairedWithId !== "partner2") {
           const myDbId = createdMembers.find(c => c.clientId === m.clientId)?.dbId;
           const partnerDbId = createdMembers.find(c => c.clientId === m.pairedWithId)?.dbId;
           
           if (myDbId && partnerDbId) {
             const pairKey = [m.clientId, m.pairedWithId].sort().join('-');
             if (!linkedPairs.has(pairKey)) {
               linkedPairs.add(pairKey);
               await prisma.weddingPartyMember.update({
                 where: { id: myDbId },
                 data: { pairedWithId: partnerDbId }
               });
             }
           }
        }
      }
    }
  }

  if (oldWedding?.date && data.date && new Date(oldWedding.date).getTime() !== new Date(data.date).getTime()) {
    await recalculateRelativeDates(oldWedding.id)
  }

  revalidatePath(`/${weddingId}/o-grande-dia`)
  revalidatePath(`/${weddingId}/cronograma`)
  revalidatePath(`/${weddingId}/checklist`)
  
  return { success: true, wedding: updated }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/session"

function normalizeString(str: string): string {
  if (!str) return ""
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export async function importGuests(weddingId: string, guestsData: any[]) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error("Não autorizado")

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingId },
      select: { id: true, partner1Role: true, partner2Role: true }
    })

    if (!wedding) throw new Error("Casamento não encontrado")

    const p1Role = normalizeString(wedding.partner1Role)
    const p2Role = normalizeString(wedding.partner2Role)

    let importedCount = 0
    let familiesCount = 0

    // Agrupar por família baseando-se na coluna "Família / Convite"
    const familiesMap = new Map<string, any[]>()

    for (const row of guestsData) {
      // Assumindo as chaves exatas do XLSX gerado pelo utils.sheet_to_json
      const familyName = row["Família / Convite"] || row["Familia"] || row["Convite"] || "Sem Família"
      if (!familiesMap.has(familyName)) {
        familiesMap.set(familyName, [])
      }
      familiesMap.get(familyName)!.push(row)
    }

    // Processar cada família
    for (const [familyName, members] of familiesMap.entries()) {
      // Tentar descobrir o lado (se a maioria for de um lado)
      let sideGroupStr = "Ambos"
      for (const m of members) {
        const sideInput = normalizeString(m["Lado (Ambos/Noiva/Noivo)"] || m["Lado"] || "")
        if (sideInput) {
          if (sideInput.includes(p1Role) && !sideInput.includes(p2Role)) sideGroupStr = wedding.partner1Role
          else if (sideInput.includes(p2Role) && !sideInput.includes(p1Role)) sideGroupStr = wedding.partner2Role
          else if (sideInput.includes("ambos") || sideInput.includes("casal")) sideGroupStr = "Ambos"
        }
      }

      // Encontrar ou criar o GuestGroup (Lado)
      let groupId = null
      if (sideGroupStr !== "Ambos") {
        const groupName = `Convidados - ${sideGroupStr}`
        let group = await prisma.guestGroup.findFirst({
          where: { weddingId: wedding.id, name: groupName }
        })
        if (!group) {
          group = await prisma.guestGroup.create({
            data: { weddingId: wedding.id, name: groupName, category: "LADO" }
          })
        }
        groupId = group.id
      }

      // Criar a família
      const family = await prisma.family.create({
        data: {
          weddingId: wedding.id,
          name: familyName
        }
      })
      familiesCount++

      let headOfFamilyId = null

      // Adicionar os membros
      for (let i = 0; i < members.length; i++) {
        const row = members[i]
        const rawName = row["Nome do Convidado"] || row["Nome"] || "Convidado Desconhecido"
        const isPrimaryStr = normalizeString(row["É Titular? (S/N)"] || row["Titular"] || "")
        const isPrimary = isPrimaryStr === "s" || isPrimaryStr === "sim" || isPrimaryStr === "true" || isPrimaryStr === "1" || i === 0
        
        let phone = row["WhatsApp (Apenas números)"] || row["WhatsApp"] || row["Telefone"] || ""
        if (typeof phone === 'number') phone = phone.toString()
        phone = phone.replace(/\D/g, "") // Manter só números

        const notes = row["Idade (Adulto/Criança/Bebê)"] ? `Idade: ${row["Idade (Adulto/Criança/Bebê)"]}` : null

        const guest = await prisma.guest.create({
          data: {
            weddingId: wedding.id,
            familyId: family.id,
            groupId,
            name: rawName,
            phone: phone || null,
            isPrimary,
            qrCode: crypto.randomUUID(),
            token: crypto.randomUUID(),
            notes
          }
        })

        if (isPrimary && !headOfFamilyId) {
          headOfFamilyId = guest.id
        }

        importedCount++
      }

      if (headOfFamilyId) {
        await prisma.family.update({
          where: { id: family.id },
          data: { headOfFamilyId }
        })
      }
    }

    revalidatePath(`/${weddingId}/convidados`)
    
    return { success: true, importedCount, familiesCount }
  } catch (error: any) {
    console.error("Erro na importação:", error)
    return { success: false, error: error.message }
  }
}

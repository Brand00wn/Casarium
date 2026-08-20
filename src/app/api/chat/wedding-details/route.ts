import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncPartyMemberToGuest } from "@/app/actions/party-guest-sync";

export async function POST(req: Request) {
  try {
    const { messages, weddingSlug } = await req.json();

    if (!weddingSlug) {
      return new Response("Wedding slug is required", { status: 400 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug },
      include: {
        partyMembers: true,
        vendorRecommendations: true,
      }
    });

    if (!wedding) {
      return new Response("Casamento não encontrado", { status: 404 });
    }

    const systemPrompt = `Você é um Concierge Especialista em Casamentos.
Seu objetivo é ajudar os noivos a organizarem os detalhes do grande dia.

ESTADO ATUAL DO CASAMENTO:
- Nomes: ${wedding.partner1Name} & ${wedding.partner2Name} (${wedding.partner1Role} e ${wedding.partner2Role})
- Data da cerimônia: ${wedding.ceremonyDate?.toISOString() || "Não definida"}
- Local da cerimônia: ${wedding.ceremonyLocation || "Não definido"}
- Recepção: ${wedding.receptionLocation || "Não definida"}
- Dress code: ${wedding.dressCode || "Não definido"}
- Hashtag: ${wedding.hashtag || "Não definida"}

- Membros do Cortejo Atual:
${JSON.stringify(wedding.partyMembers.map(m => ({
  id: m.id,
  name: m.name,
  type: m.type,
  side: m.side,
  isDeceased: m.isDeceased,
  hasTribute: m.hasTribute,
  attireColor: m.attireColor,
  pairedWithId: m.pairedWithId,
  accompanies: m.accompanies
})))}

- Fornecedores Indicados Atual:
${JSON.stringify(wedding.vendorRecommendations.map(v => ({
  id: v.id,
  name: v.name,
  type: v.type,
  address: v.address,
  recommendedProfessional: v.recommendedProfessional,
  notes: v.notes
})))}

REGRAS:
1. Você pode modificar os detalhes do casamento, fornecedores indicados e o cortejo com base no pedido do usuário.
2. Você deve estruturar sua resposta como uma lista de operações atômicas.
3. Tipos válidos: FATHER, MOTHER, GRANDFATHER, GRANDMOTHER, BROTHER, SISTER, SPONSOR, BRIDESMAID (Madrinha), GROOMSMAN (Padrinho), RING_BEARER, PAGE_BOY, FLOWER_GIRL, DEMOISELLE, CELEBRANT, RELATIVE, FRIEND, OTHER. ATENÇÃO: Se for Padrinho (homem) use GROOMSMAN, se for Madrinha (mulher) use BRIDESMAID.
4. Lados válidos: PARTNER_1, PARTNER_2, BOTH.
5. Se alguém entrar com um dos parceiros, use SET_ACCOMPANIES com 'PARTNER_1' ou 'PARTNER_2'.
6. Se alguém faleceu, use isDeceased=true. Se vai haver foto/relicário entrando, use hasTribute=true.
7. Para UPDATE e DELETE de pessoas ou fornecedores, use o nome mais próximo (targetMemberName / targetVendorName). O sistema encontrará o ID exato. ATENÇÃO: Se o usuário pedir para atualizar várias pessoas (ex: "mude a cor dos padrinhos"), você deve gerar MÚLTIPLAS operações de UPDATE_PARTY_MEMBER, uma para cada padrinho/madrinha. Não agrupe nomes.
8. ATENÇÃO: As cores de trajes (attireColor) e as cores do site (primaryColor, secondaryColor) no campo 'updates' ou 'fieldValue' DEVEM OBRIGATORIAMENTE ser em formato HEXADECIMAL (ex: #9bb7d4 para Azul Serenity). Nunca envie texto puro, converta sempre para a cor Hex mais próxima do que o usuário pedir.
9. ATENÇÃO: Se a festa for no MESMO local da cerimônia, APENAS defina 'isSameLocation=true' e 'hasReception=true'. NÃO atualize 'receptionLocation'.
10. Sempre responda de forma amigável e luxuosa em 'responseToUser', resumindo o que você alterou no sistema.`;

    const result = await generateObject({
      model: google("gemini-3.5-flash-lite"),
      system: systemPrompt,
      messages,
      schema: z.object({
        operations: z.array(z.object({
          action: z.enum([
            "ADD_PARTY_MEMBER",
            "UPDATE_PARTY_MEMBER", 
            "DELETE_PARTY_MEMBER",
            "PAIR_MEMBERS",
            "SET_ACCOMPANIES",
            "UPDATE_WEDDING_FIELD",
            "ADD_VENDOR",
            "UPDATE_VENDOR",
            "DELETE_VENDOR",
            "LINK_PARTY_TO_GUEST"
          ]).describe("O tipo de ação a ser executada no banco de dados"),
          
          memberData: z.object({
            name: z.string(),
            type: z.enum(["FATHER", "MOTHER", "GRANDFATHER", "GRANDMOTHER", "BROTHER", "SISTER", "SPONSOR", "BRIDESMAID", "GROOMSMAN", "RING_BEARER", "PAGE_BOY", "FLOWER_GIRL", "DEMOISELLE", "CELEBRANT", "RELATIVE", "FRIEND", "OTHER"]),
            side: z.enum(["PARTNER_1", "PARTNER_2", "BOTH"]),
            isDeceased: z.boolean().optional(),
            isMentioned: z.boolean().optional(),
            hasTribute: z.boolean().optional(),
            attireColor: z.string().nullable().optional().describe("Deve ser OBRIGATORIAMENTE um código HEX válido (ex: #9bb7d4)"),
          }).optional().describe("Dados completos da pessoa para ADD_PARTY_MEMBER"),
          
          targetMemberName: z.string().optional().describe("Nome da pessoa a ser atualizada ou deletada"),
          updates: z.object({
            attireColor: z.string().nullable().optional().describe("Cor OBRIGATORIAMENTE em formato HEX (ex: #9bb7d4)"),
            isDeceased: z.boolean().optional(),
            isMentioned: z.boolean().optional(),
            hasTribute: z.boolean().optional(),
            name: z.string().optional(),
            type: z.enum(["FATHER", "MOTHER", "GRANDFATHER", "GRANDMOTHER", "BROTHER", "SISTER", "SPONSOR", "BRIDESMAID", "GROOMSMAN", "RING_BEARER", "PAGE_BOY", "FLOWER_GIRL", "DEMOISELLE", "CELEBRANT", "RELATIVE", "FRIEND", "OTHER"]).optional(),
            side: z.enum(["PARTNER_1", "PARTNER_2", "BOTH"]).optional(),
          }).optional().describe("Campos a serem atualizados (para UPDATE_PARTY_MEMBER)"),
          
          vendorUpdates: z.object({
            type: z.enum(["SALON", "BARBERSHOP", "SUIT_SHOP", "HOTEL", "BEAUTY_CLINIC", "MAKEUP_ARTIST", "HAIR_STYLIST", "MANICURE", "SPA", "DRESS_SHOP", "JEWELRY"]).optional(),
            name: z.string().optional(),
            address: z.string().nullable().optional(),
            recommendedProfessional: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
            placeId: z.string().optional(),
          }).optional().describe("Campos a serem atualizados (para UPDATE_VENDOR)"),
          
          guestId: z.string().optional().describe("ID do convidado para vincular (usado em LINK_PARTY_TO_GUEST)"),
          
          member1Name: z.string().optional().describe("Nome da primeira pessoa do par (para PAIR_MEMBERS)"),
          member2Name: z.string().optional().describe("Nome da segunda pessoa do par (para PAIR_MEMBERS)"),
          
          accompanies: z.enum(["PARTNER_1", "PARTNER_2"]).optional().describe("Acompanha quem? (para SET_ACCOMPANIES)"),
          
          fieldName: z.string().optional().describe("Nome exato do campo. Permitidos: partner1Name, partner1Role, partner2Name, partner2Role, date, ceremonyDate, receptionDate, ceremonyLocation, receptionLocation, venue, theme, dressCode, ourStory, primaryColor, secondaryColor, isPublicSiteEnabled, sitePassword, hasReception, isSameLocation, rsvpDeadline, rsvpMessage, spotifyLink, hashtag, moderateMessages, hasAccommodationTips, accommodationTips, ceremonyParkingType, receptionParkingType"),
          fieldValue: z.any().optional().describe("Novo valor para o campo. ATENÇÃO: Para parking types use OBRIGATORIAMENTE um destes valores: 'none', 'no_parking', 'free_on_site', 'paid_on_site', 'street', 'valet'"),

          vendorData: z.object({
            type: z.enum(["SALON", "BARBERSHOP", "SUIT_SHOP", "HOTEL", "BEAUTY_CLINIC", "MAKEUP_ARTIST", "HAIR_STYLIST", "MANICURE", "SPA", "DRESS_SHOP", "JEWELRY"]),
            name: z.string().describe("Nome do estabelecimento"),
            address: z.string().nullable().optional().describe("MUITO IMPORTANTE: A interface só tem 1 campo visível. Coloque o Nome + Endereço JUNTOS aqui (ex: 'All Black, Vila Mury, Volta Redonda')"),
            recommendedProfessional: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
          }).optional().describe("Dados do fornecedor para ADD_VENDOR"),
          targetVendorName: z.string().optional().describe("Nome do fornecedor para UPDATE_VENDOR ou DELETE_VENDOR")
        })).describe("Lista de operações a serem realizadas no banco de dados, em ordem."),
        responseToUser: z.string().describe("Mensagem super amigável em português, informando o que foi feito."),
      }),
    });

    console.log(JSON.stringify(result.object, null, 2));

    // REFETCH para pegar os IDs mais recentes (caso o auto-save da UI tenha deletado e recriado os membros enquanto a IA pensava)
    const latestWedding = await prisma.wedding.findUnique({
      where: { id: wedding.id },
      include: {
        partyMembers: true,
        vendorRecommendations: true,
      }
    });

    let toolResults = [];
    const partyMembers = latestWedding?.partyMembers || [];
    const vendors = latestWedding?.vendorRecommendations || [];

    // Helper function for fuzzy matching name
    const findMemberIdByName = (name: string) => {
      if (!name) return null;
      const lowerName = name.toLowerCase().trim();
      
      // Exact match
      let match = partyMembers.find(m => m.name.toLowerCase().trim() === lowerName);
      if (match) return match.id;

      // Partial match
      match = partyMembers.find(m => m.name.toLowerCase().includes(lowerName) || lowerName.includes(m.name.toLowerCase()));
      if (match) return match.id;

      return null;
    };

    const findVendorIdByName = (name: string) => {
      if (!name) return null;
      const lowerName = name.toLowerCase().trim();
      let match = vendors.find(v => v.name.toLowerCase().trim() === lowerName);
      if (match) return match.id;
      match = vendors.find(v => v.name.toLowerCase().includes(lowerName) || lowerName.includes(v.name.toLowerCase()));
      if (match) return match.id;
      return null;
    };

    if (result.object.operations && result.object.operations.length > 0) {
      for (const op of result.object.operations) {
        try {
          switch (op.action) {
            case "ADD_PARTY_MEMBER":
              if (op.memberData) {
                const order = partyMembers.length;
                const newMember = await prisma.weddingPartyMember.create({
                  data: {
                    weddingId: wedding.id,
                    name: op.memberData.name,
                    type: op.memberData.type,
                    side: op.memberData.side,
                    isDeceased: op.memberData.isDeceased ?? false,
                    isMentioned: op.memberData.isMentioned ?? true,
                    hasTribute: op.memberData.hasTribute ?? false,
                    attireColor: op.memberData.attireColor || null,
                    order
                  }
                });
                partyMembers.push(newMember); // Adiciona na lista cacheada para próximos matches
                
                // Realiza a sincronização automática com a lista de convidados
                const syncResult = await syncPartyMemberToGuest(wedding.id, newMember.name, newMember.id, newMember.isDeceased);
                
                let syncMessage = "";
                if (syncResult.action === "created") {
                  syncMessage = "e adicionado à lista de convidados";
                } else if (syncResult.action === "linked") {
                  syncMessage = "e vinculado ao convidado existente";
                } else if (syncResult.action === "ambiguous") {
                  syncMessage = `(Atenção: há ${syncResult.candidates.length} convidados com esse nome. Desambiguação necessária.)`;
                }

                toolResults.push({ success: true, message: `Adicionado: ${newMember.name} ${syncMessage}` });
              }
              break;

            case "UPDATE_PARTY_MEMBER":
              if (op.targetMemberName && op.updates) {
                const id = findMemberIdByName(op.targetMemberName);
                if (id) {
                  await prisma.weddingPartyMember.update({
                    where: { id },
                    data: op.updates
                  });
                  toolResults.push({ success: true, message: `Atualizado: ${op.targetMemberName}` });
                } else {
                  toolResults.push({ success: false, message: `Membro não encontrado: ${op.targetMemberName}` });
                }
              }
              break;

            case "DELETE_PARTY_MEMBER":
              if (op.targetMemberName) {
                const id = findMemberIdByName(op.targetMemberName);
                if (id) {
                  await prisma.weddingPartyMember.delete({ where: { id } });
                  // Remove do cache
                  const index = partyMembers.findIndex(m => m.id === id);
                  if (index > -1) partyMembers.splice(index, 1);
                  toolResults.push({ success: true, message: `Removido: ${op.targetMemberName}` });
                } else {
                  toolResults.push({ success: false, message: `Membro não encontrado: ${op.targetMemberName}` });
                }
              }
              break;

            case "LINK_PARTY_TO_GUEST":
              if (op.targetMemberName && op.guestId) {
                const id = findMemberIdByName(op.targetMemberName);
                if (id) {
                  await prisma.weddingPartyMember.update({
                    where: { id },
                    data: { guestId: op.guestId }
                  });
                  toolResults.push({ success: true, message: `Membro ${op.targetMemberName} vinculado ao convidado` });
                } else {
                  toolResults.push({ success: false, message: `Membro não encontrado para vincular: ${op.targetMemberName}` });
                }
              }
              break;

            case "PAIR_MEMBERS":
              if (op.member1Name && op.member2Name) {
                const id1 = findMemberIdByName(op.member1Name);
                const id2 = findMemberIdByName(op.member2Name);
                if (id1 && id2) {
                  await prisma.weddingPartyMember.update({
                    where: { id: id1 },
                    data: { pairedWithId: id2, accompanies: null }
                  });
                  toolResults.push({ success: true, message: `Vinculados: ${op.member1Name} e ${op.member2Name}` });
                } else {
                  toolResults.push({ success: false, message: `Falha ao encontrar um dos membros para vínculo` });
                }
              }
              break;

            case "SET_ACCOMPANIES":
              if (op.targetMemberName && op.accompanies) {
                const id = findMemberIdByName(op.targetMemberName);
                if (id) {
                  await prisma.weddingPartyMember.update({
                    where: { id },
                    data: { accompanies: op.accompanies, pairedWithId: null }
                  });
                  toolResults.push({ success: true, message: `Vínculo com noivos ajustado para ${op.targetMemberName}` });
                } else {
                  toolResults.push({ success: false, message: `Membro não encontrado: ${op.targetMemberName}` });
                }
              }
              break;

            case "UPDATE_WEDDING_FIELD":
              if (op.fieldName && op.fieldValue !== undefined) {
                // Conversão de data caso seja date/time
                let val = op.fieldValue;
                if (op.fieldName.toLowerCase().includes("date") && typeof val === "string") {
                   val = new Date(val);
                }

                const updates: any = { [op.fieldName]: val };

                // Inteligência: Se a IA preencher algo da festa, ativamos a festa automaticamente
                if (op.fieldName === "receptionLocation" && val) {
                  updates.hasReception = true;
                  const hasSameLocationOp = result.object.operations.find(o => o.action === "UPDATE_WEDDING_FIELD" && o.fieldName === "isSameLocation" && o.fieldValue === true);
                  if (!hasSameLocationOp) {
                    updates.isSameLocation = false;
                  }
                } else if (op.fieldName === "receptionDate" && val) {
                  updates.hasReception = true;
                }

                // Buscar placeId no Google Maps automaticamente se for endereço de local
                if ((op.fieldName === "ceremonyLocation" || op.fieldName === "receptionLocation") && typeof val === "string" && val.trim() !== "") {
                  try {
                    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                    if (apiKey) {
                      const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(val)}&key=${apiKey}`);
                      const data = await res.json();
                      if (data.results && data.results.length > 0) {
                        const placeId = data.results[0].place_id;
                        if (op.fieldName === "ceremonyLocation") updates.ceremonyPlaceId = placeId;
                        if (op.fieldName === "receptionLocation") updates.receptionPlaceId = placeId;
                      }
                    }
                  } catch (e) {
                    console.error("Erro ao buscar placeId para wedding location:", e);
                  }
                }

                await prisma.wedding.update({
                  where: { id: wedding.id },
                  data: updates
                });
                toolResults.push({ success: true, message: `Campo ${op.fieldName} atualizado para ${op.fieldValue}` });
              }
              break;

            case "ADD_VENDOR":
              if (op.vendorData) {
                let placeId = null;
                if (op.vendorData.address) {
                  try {
                    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                    if (apiKey) {
                      const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(op.vendorData.address)}&key=${apiKey}`);
                      const data = await res.json();
                      if (data.results && data.results.length > 0) {
                        placeId = data.results[0].place_id;
                      }
                    }
                  } catch (e) {
                    console.error("Erro ao buscar placeId para vendor:", e);
                  }
                }

                const newVendor = await prisma.vendorRecommendation.create({
                  data: {
                    weddingId: wedding.id,
                    type: op.vendorData.type,
                    name: op.vendorData.name,
                    address: op.vendorData.address,
                    placeId: placeId,
                    recommendedProfessional: op.vendorData.recommendedProfessional,
                    notes: op.vendorData.notes,
                  }
                });
                vendors.push(newVendor);
                toolResults.push({ success: true, message: `Fornecedor adicionado: ${newVendor.name}` });
              }
              break;

            case "UPDATE_VENDOR":
              if (op.targetVendorName && op.vendorUpdates) {
                const id = findVendorIdByName(op.targetVendorName);
                if (id) {
                  // Se a IA atualizou o endereço, busca o novo placeId
                  if (op.vendorUpdates.address && typeof op.vendorUpdates.address === "string" && op.vendorUpdates.address.trim() !== "") {
                    try {
                      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                      if (apiKey) {
                        const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(op.vendorUpdates.address)}&key=${apiKey}`);
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                          op.vendorUpdates.placeId = data.results[0].place_id;
                        }
                      }
                    } catch (e) {
                      console.error("Erro ao buscar placeId para UPDATE_VENDOR:", e);
                    }
                  }

                  await prisma.vendorRecommendation.update({
                    where: { id },
                    data: op.vendorUpdates
                  });
                  toolResults.push({ success: true, message: `Fornecedor atualizado: ${op.targetVendorName}` });
                } else {
                  toolResults.push({ success: false, message: `Fornecedor não encontrado: ${op.targetVendorName}` });
                }
              }
              break;

            case "DELETE_VENDOR":
              if (op.targetVendorName) {
                const id = findVendorIdByName(op.targetVendorName);
                if (id) {
                  await prisma.vendorRecommendation.delete({ where: { id } });
                  const index = vendors.findIndex(v => v.id === id);
                  if (index > -1) vendors.splice(index, 1);
                  toolResults.push({ success: true, message: `Fornecedor removido: ${op.targetVendorName}` });
                } else {
                  toolResults.push({ success: false, message: `Fornecedor não encontrado: ${op.targetVendorName}` });
                }
              }
              break;
          }
        } catch (e: any) {
          toolResults.push({ success: false, message: `Erro na operação ${op.action}: ${e.message}` });
        }
      }
    }

    return Response.json({
      text: result.object.responseToUser,
      toolResults: toolResults
    });
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return new Response(error.message, { status: 500 });
  }
}

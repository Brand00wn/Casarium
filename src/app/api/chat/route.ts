// @ts-nocheck
import { google } from '@ai-sdk/google';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assignGuestToTable, unassignGuestFromTable } from '@/app/actions/tables';

export async function POST(req: Request) {
  try {
    const { messages, weddingId: weddingSlug } = await req.json();

    const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
    if (!wedding) throw new Error('Casamento não encontrado');

    const tables = await prisma.table.findMany({ where: { weddingId: wedding.id } });
    const venueElements = await prisma.venueElement.findMany({ where: { weddingId: wedding.id } });
    const guests = await prisma.guest.findMany({ 
      where: { weddingId: wedding.id },
      include: { family: { include: { guests: true } } }
    });

    const systemPrompt = `Você é um Concierge de Casamento Especialista em Organização de Assentos.
Sempre seja educado, aja como um cerimonialista premium de luxo. 

ESTADO ATUAL DO BANCO DE DADOS:
- Mesas Cadastradas: ${JSON.stringify(tables.map(t => ({ id: t.id, name: t.name, capacity: t.capacity, x: t.x, y: t.y })))}
- Elementos do Salão (Pista, Bar, Saída, etc): ${JSON.stringify(venueElements.map(v => ({ id: v.id, name: v.name, type: v.type, x: v.x, y: v.y })))}
- Convidados: ${JSON.stringify(guests.map(g => ({ id: g.id, name: g.name, tableId: g.tableId, isPrimary: g.isPrimary, familyId: g.familyId })))}

REGRAS:
1. Analise os pedidos do usuário baseando-se no ESTADO ATUAL acima.
2. Use a tool 'reallocateGuest' para executar mudanças REAIS no mapa de mesas. Você pode chamar essa tool múltiplas vezes na mesma resposta para mover vários convidados.
3. Quando mover famílias, lembre-se que se mover o titular, todos os membros da família acompanham (a menos que pedido o contrário).
4. REGRA CRÍTICA DE CAPACIDADE: NUNCA aloque mais pessoas em uma mesa do que a sua 'capacity'. Conte quantas pessoas já estão na mesa e quantas estão sendo movidas (incluindo dependentes). Se a capacidade for excedida, NÃO MOVA as pessoas excedentes e retorne uma mensagem de erro/alerta amigável no 'responseToUser' sugerindo alternativas, ou mova apenas a quantidade que couber.
5. Você possui as coordenadas (x, y) de todas as mesas e dos elementos do salão. Use a matemática da distância euclidiana para deduzir posições de "mais perto", "mais longe" e realizar distribuições espaciais inteligentes quando o usuário solicitar!`;

    const { generateObject } = await import('ai');

    const result = await generateObject({
      model: google('gemini-3.5-flash'),
      system: systemPrompt,
      messages,
      schema: z.object({
        moves: z.array(z.object({
          guestId: z.string().describe('ID do convidado a ser movido'),
          targetTableId: z.string().nullable().describe('ID da mesa destino, ou null para remover da mesa atual'),
          moveEntireFamily: z.boolean().describe('Se true, move toda a família')
        })).describe('Lista de movimentações de convidados para mesas'),
        responseToUser: z.string().describe('Mensagem amigável de resposta ao usuário informando o que foi feito')
      })
    });

    let successCount = 0;
    if (result.object.moves && result.object.moves.length > 0) {
      for (const move of result.object.moves) {
        if (move.targetTableId === null) {
          await unassignGuestFromTable(weddingSlug, move.guestId);
        } else {
          await assignGuestToTable(weddingSlug, move.guestId, move.targetTableId, move.moveEntireFamily);
        }
        successCount++;
      }
    }

    return Response.json({ text: result.object.responseToUser });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

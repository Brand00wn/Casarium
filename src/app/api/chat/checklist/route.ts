// @ts-nocheck
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { messages, weddingSlug } = await req.json();

    const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } });
    if (!wedding) throw new Error('Casamento não encontrado');

    const tasks = await prisma.task.findMany({ 
      where: { weddingId: wedding.id },
      include: { category: true }
    });
    
    const categories = await prisma.taskCategory.findMany({ 
      where: { weddingId: wedding.id } 
    });

    const systemPrompt = `Você é um Assistente de Checklist Inteligente para Casamentos.
Sempre aja como um cerimonialista ágil e prestativo.

ESTADO ATUAL DO CHECKLIST:
- Categorias Disponíveis: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, emoji: c.emoji })))}
- Tarefas Cadastradas: ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate, category: t.category?.name })))}

REGRAS E CAPACIDADES:
1. Analise o pedido do usuário e execute as ações necessárias utilizando as operações permitidas no schema (criar tarefa, atualizar tarefa, deletar tarefa, criar categoria).
2. Você pode executar MÚLTIPLAS operações de uma só vez (ex: se o usuário pedir para criar 3 tarefas, retorne as 3 na lista de 'createTasks').
3. Retorne uma mensagem em 'responseToUser' sempre informando de maneira amigável o que você fez.
4. Para datas, você receberá comandos em texto. Tente aproximar ou use 'null' se o usuário não especificar data. Para criar uma data, envie a string em formato ISO-8601 (ex: '2025-12-10T00:00:00Z').
5. STATUS aceitos: "TODO", "IN_PROGRESS", "DONE".
6. PRIORIDADES aceitas: "LOW", "MEDIUM", "HIGH", "URGENT".`;

    const result = await generateObject({
      model: google('gemini-3.5-flash'),
      system: systemPrompt,
      messages,
      schema: z.object({
        createCategories: z.array(z.object({
          name: z.string().describe('Nome da nova categoria'),
          emoji: z.string().describe('Emoji representativo da categoria'),
          color: z.string().describe('Cor em formato HEX (ex: #FF0000)')
        })).optional().describe('Lista de novas categorias a serem criadas'),
        createTasks: z.array(z.object({
          title: z.string().describe('Título da tarefa'),
          description: z.string().optional().describe('Descrição ou detalhes da tarefa'),
          status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).describe('Status inicial'),
          priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).describe('Prioridade'),
          dueDate: z.string().nullable().describe('Data de vencimento em formato ISO-8601, ou null'),
          categoryId: z.string().nullable().describe('ID da categoria (deve ser um dos IDs passados no estado atual) ou null')
        })).optional().describe('Lista de novas tarefas a serem criadas'),
        updateTasks: z.array(z.object({
          taskId: z.string().describe('ID da tarefa a ser atualizada'),
          status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
          priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
          dueDate: z.string().nullable().optional(),
        })).optional().describe('Atualizações de tarefas existentes'),
        deleteTasks: z.array(z.string()).optional().describe('Lista de IDs de tarefas para deletar'),
        responseToUser: z.string().describe('Mensagem amigável explicando o que foi feito')
      })
    });

    const aiRes = result.object;

    // 1. Create Categories
    if (aiRes.createCategories && aiRes.createCategories.length > 0) {
      for (const cat of aiRes.createCategories) {
        await prisma.taskCategory.create({
          data: {
            weddingId: wedding.id,
            name: cat.name,
            emoji: cat.emoji,
            color: cat.color
          }
        });
      }
    }

    // 2. Delete Tasks
    if (aiRes.deleteTasks && aiRes.deleteTasks.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: aiRes.deleteTasks }, weddingId: wedding.id }
      });
    }

    // 3. Update Tasks
    if (aiRes.updateTasks && aiRes.updateTasks.length > 0) {
      for (const upd of aiRes.updateTasks) {
        const dataToUpdate: any = {};
        if (upd.status) dataToUpdate.status = upd.status;
        if (upd.priority) dataToUpdate.priority = upd.priority;
        if (upd.dueDate !== undefined) dataToUpdate.dueDate = upd.dueDate ? new Date(upd.dueDate) : null;
        
        if (Object.keys(dataToUpdate).length > 0) {
          await prisma.task.update({
            where: { id: upd.taskId },
            data: dataToUpdate
          });
        }
      }
    }

    // 4. Create Tasks
    if (aiRes.createTasks && aiRes.createTasks.length > 0) {
      const allTasks = await prisma.task.findMany({ where: { weddingId: wedding.id } });
      let currentOrder = allTasks.length;
      
      for (const t of aiRes.createTasks) {
        await prisma.task.create({
          data: {
            weddingId: wedding.id,
            title: t.title,
            description: t.description || "",
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate ? new Date(t.dueDate) : null,
            categoryId: t.categoryId,
            order: currentOrder++
          }
        });
      }
    }

    return Response.json({ text: aiRes.responseToUser });

  } catch (error: any) {
    console.error('Checklist AI Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

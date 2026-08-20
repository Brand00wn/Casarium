"use server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { DEFAULT_CATEGORIES, DEFAULT_TASKS } from "@/lib/checklist-templates"
import { DueDateType, TaskPriority, TaskStatus, EventType } from "@prisma/client"
import { addDays, subDays } from "date-fns"

export async function getChecklist(weddingSlug: string) {
  await requirePermission(weddingSlug, "canViewAll")
  
  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug },
    select: { id: true, date: true }
  })
  if (!wedding) throw new Error("Casamento não encontrado")

  const categories = await prisma.taskCategory.findMany({
    where: { weddingId: wedding.id },
    orderBy: { order: "asc" }
  })

  const tasks = await prisma.task.findMany({
    where: { weddingId: wedding.id },
    orderBy: { order: "asc" },
    include: {
      category: true,
      assignees: {
        include: {
          member: {
            include: {
              user: { select: { id: true, name: true, image: true } }
            }
          }
        }
      },
      event: true
    }
  })

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "DONE").length,
    pending: tasks.filter(t => t.status !== "DONE").length,
    overdue: tasks.filter(t => t.status !== "DONE" && t.dueDate && t.dueDate < new Date()).length
  }

  return { categories, tasks, stats, weddingDate: wedding.date }
}

export async function initializeChecklist(weddingSlug: string) {
  await requirePermission(weddingSlug, "canEditWedding")

  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug }
  })
  if (!wedding) throw new Error("Casamento não encontrado")

  const existingCategories = await prisma.taskCategory.count({ where: { weddingId: wedding.id } })
  if (existingCategories > 0) return { success: true, message: "Já inicializado" }

  // 1. Criar Categorias
  const createdCategories = await prisma.$transaction(
    DEFAULT_CATEGORIES.map((cat, i) => 
      prisma.taskCategory.create({
        data: {
          weddingId: wedding.id,
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          order: i
        }
      })
    )
  )

  const categoryMap = new Map(createdCategories.map(c => [c.name, c.id]))

  // 2. Criar Tarefas Iniciais
  await prisma.task.createMany({
    data: DEFAULT_TASKS.map((task, i) => {
      const categoryId = categoryMap.get(task.category)
      const dueDate = task.relativeDays && wedding.date ? subDays(new Date(wedding.date), task.relativeDays) : null
      
      return {
        weddingId: wedding.id,
        categoryId,
        title: task.title,
        status: "TODO" as TaskStatus,
        priority: task.priority as TaskPriority,
        order: i,
        isFromTemplate: true,
        dueDateType: "RELATIVE" as DueDateType,
        relativeDays: task.relativeDays,
        dueDate
      }
    })
  })

  return { success: true }
}

export async function recalculateRelativeDates(weddingId: string) {
  const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } })
  if (!wedding || !wedding.date) return

  const relativeTasks = await prisma.task.findMany({
    where: { weddingId, dueDateType: "RELATIVE", relativeDays: { not: null } },
    include: { event: true }
  })

  for (const task of relativeTasks) {
    if (task.relativeDays === null) continue;
    const newDueDate = subDays(new Date(wedding.date), task.relativeDays)
    
    await prisma.task.update({
      where: { id: task.id },
      data: { dueDate: newDueDate }
    })

    // Se tiver evento associado no calendário, atualiza a data do evento
    if (task.eventId) {
      await prisma.event.update({
        where: { id: task.eventId },
        data: { date: newDueDate }
      })
    }
  }
}

export async function createTask(weddingSlug: string, data: {
  title: string,
  categoryId?: string,
  priority: TaskPriority,
  status: TaskStatus,
  dueDateType: DueDateType,
  dueDate?: Date | null,
  relativeDays?: number | null,
  description?: string,
  assigneeIds?: string[]
}) {
  await requirePermission(weddingSlug, "canEditWedding")
  
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } })
  if (!wedding) throw new Error("Casamento não encontrado")

  const taskCount = await prisma.task.count({ where: { weddingId: wedding.id, status: data.status } })

  const task = await prisma.task.create({
    data: {
      weddingId: wedding.id,
      title: data.title,
      categoryId: data.categoryId,
      priority: data.priority,
      status: data.status,
      dueDateType: data.dueDateType,
      dueDate: data.dueDate,
      relativeDays: data.relativeDays,
      description: data.description,
      order: taskCount,
      assignees: data.assigneeIds?.length ? {
        create: data.assigneeIds.map(memberId => ({ memberId }))
      } : undefined
    }
  })

  revalidatePath(`/${weddingSlug}/checklist`)
  return { success: true, task }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { wedding: true } })
  if (!task) throw new Error("Task não encontrada")
  
  await requirePermission(task.wedding.slug, "canEditWedding")

  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status,
      completedAt: status === "DONE" ? new Date() : null 
    }
  })

  revalidatePath(`/${task.wedding.slug}/checklist`)
  return { success: true }
}

export async function reorderTasks(weddingSlug: string, updates: { id: string, order: number, status: TaskStatus }[]) {
  await requirePermission(weddingSlug, "canEditWedding")

  await prisma.$transaction(
    updates.map(update => 
      prisma.task.update({
        where: { id: update.id },
        data: { order: update.order, status: update.status }
      })
    )
  )

  revalidatePath(`/${weddingSlug}/checklist`)
  return { success: true }
}

export async function updateTask(taskId: string, data: {
  title?: string,
  categoryId?: string | null,
  priority?: TaskPriority,
  status?: TaskStatus,
  dueDateType?: DueDateType,
  dueDate?: Date | null,
  relativeDays?: number | null,
  description?: string | null,
  assigneeIds?: string[]
}) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { wedding: true, event: true } })
  if (!task) throw new Error("Task não encontrada")
  
  await requirePermission(task.wedding.slug, "canEditWedding")

  const updateData: any = { ...data }
  delete updateData.assigneeIds

  if (data.status && data.status !== task.status) {
    updateData.completedAt = data.status === "DONE" ? new Date() : null
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      ...updateData,
      assignees: data.assigneeIds ? {
        deleteMany: {},
        create: data.assigneeIds.map(id => ({ memberId: id }))
      } : undefined
    }
  })

  // Se tem evento vinculado e a data ou titulo mudou, atualizar evento
  if (task.eventId && (data.dueDate !== undefined || data.title !== undefined || data.description !== undefined)) {
    const newDate = data.dueDate !== undefined ? data.dueDate : task.dueDate
    if (newDate) {
      await prisma.event.update({
        where: { id: task.eventId },
        data: {
          date: newDate,
          title: data.title ?? task.title,
          description: data.description ?? task.description
        }
      })
    }
  }

  revalidatePath(`/${task.wedding.slug}/checklist`)
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { wedding: true } })
  if (!task) throw new Error("Task não encontrada")
  
  await requirePermission(task.wedding.slug, "canEditWedding")

  if (task.eventId) {
    await prisma.event.delete({ where: { id: task.eventId } })
  }

  await prisma.task.delete({ where: { id: taskId } })

  revalidatePath(`/${task.wedding.slug}/checklist`)
  return { success: true }
}

export async function createEventFromTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { wedding: true } })
  if (!task) throw new Error("Task não encontrada")
  if (!task.dueDate) throw new Error("Tarefa precisa ter data para ir pro calendário")
  if (task.eventId) return { success: true } // Já tem
  
  await requirePermission(task.wedding.slug, "canEditWedding")

  const event = await prisma.event.create({
    data: {
      weddingId: task.wedding.id,
      title: task.title,
      description: task.description || `Tarefa do Checklist`,
      date: task.dueDate,
      type: "OTHER"
    }
  })

  await prisma.task.update({
    where: { id: taskId },
    data: { eventId: event.id }
  })

  revalidatePath(`/${task.wedding.slug}/checklist`)
  revalidatePath(`/${task.wedding.slug}/cronograma`)
  return { success: true }
}

export async function removeEventFromTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { wedding: true } })
  if (!task || !task.eventId) return { success: true }
  
  await requirePermission(task.wedding.slug, "canEditWedding")

  await prisma.event.delete({ where: { id: task.eventId } })
  
  await prisma.task.update({
    where: { id: taskId },
    data: { eventId: null }
  })

  revalidatePath(`/${task.wedding.slug}/checklist`)
  revalidatePath(`/${task.wedding.slug}/cronograma`)
  return { success: true }
}

// ==== CATEGORY CRUD ====

export async function createCategory(weddingSlug: string, data: { name: string, emoji?: string, color?: string }) {
  await requirePermission(weddingSlug, "canEditWedding")
  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingSlug } })
  if (!wedding) throw new Error("Casamento não encontrado")

  const count = await prisma.taskCategory.count({ where: { weddingId: wedding.id } })

  await prisma.taskCategory.create({
    data: {
      weddingId: wedding.id,
      name: data.name,
      emoji: data.emoji,
      color: data.color,
      order: count
    }
  })

  revalidatePath(`/${weddingSlug}/checklist`)
  return { success: true }
}

export async function updateCategory(categoryId: string, data: { name?: string, emoji?: string, color?: string, order?: number }) {
  const cat = await prisma.taskCategory.findUnique({ where: { id: categoryId }, include: { wedding: true } })
  if (!cat) throw new Error("Categoria não encontrada")
  await requirePermission(cat.wedding.slug, "canEditWedding")

  await prisma.taskCategory.update({
    where: { id: categoryId },
    data
  })

  revalidatePath(`/${cat.wedding.slug}/checklist`)
  return { success: true }
}

export async function deleteCategory(categoryId: string) {
  const cat = await prisma.taskCategory.findUnique({ where: { id: categoryId }, include: { wedding: true } })
  if (!cat) throw new Error("Categoria não encontrada")
  await requirePermission(cat.wedding.slug, "canEditWedding")

  await prisma.taskCategory.delete({ where: { id: categoryId } })

  revalidatePath(`/${cat.wedding.slug}/checklist`)
  return { success: true }
}

export async function reorderCategories(weddingSlug: string, updates: { id: string, order: number }[]) {
  await requirePermission(weddingSlug, "canEditWedding")

  await prisma.$transaction(
    updates.map(u => 
      prisma.taskCategory.update({
        where: { id: u.id },
        data: { order: u.order }
      })
    )
  )

  revalidatePath(`/${weddingSlug}/checklist`)
  return { success: true }
}

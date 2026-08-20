import { PrismaClient, TaskPriority } from "@prisma/client"
import { DEFAULT_TASKS } from "../src/lib/checklist-templates"
import { subDays } from "date-fns"

const prisma = new PrismaClient()

async function main() {
  const weddingSlug = "amanda-e-gustavo"
  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug }
  })

  if (!wedding) {
    console.error("Wedding not found!")
    return
  }

  let categories = await prisma.taskCategory.findMany({
    where: { weddingId: wedding.id }
  })

  const categoryMap = new Map(categories.map(c => [c.name, c.id]))

  await prisma.task.createMany({
    data: DEFAULT_TASKS.map((task, i) => {
      const categoryId = categoryMap.get(task.category) || categories[0]?.id
      const dueDate = task.relativeDays && wedding.date ? subDays(new Date(wedding.date), task.relativeDays) : null
      
      return {
        weddingId: wedding.id,
        categoryId,
        title: task.title,
        status: "TODO",
        priority: task.priority as TaskPriority,
        order: i,
        isFromTemplate: true,
        dueDateType: "RELATIVE",
        relativeDays: task.relativeDays,
        dueDate
      }
    })
  })

  console.log("Tasks recreated successfully!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

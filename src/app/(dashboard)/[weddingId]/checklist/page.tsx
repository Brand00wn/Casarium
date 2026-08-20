import { getChecklist, initializeChecklist } from "@/app/actions/checklist"
import { ChecklistBoard } from "@/components/checklist/checklist-board"
import { ChecklistProgress } from "@/components/checklist/checklist-progress"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function ChecklistPage({
  params
}: {
  params: Promise<{ weddingId: string }>
}) {
  const { weddingId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const wedding = await prisma.wedding.findUnique({ where: { slug: weddingId } })
  if (!wedding) redirect("/")

  // 1. Tenta inicializar se for a primeira vez
  await initializeChecklist(weddingId)

  // 2. Busca dados completos do checklist
  const data = await getChecklist(weddingId)

  // 3. Busca membros do casamento para atribuir tarefas
  const members = await prisma.weddingMember.findMany({
    where: { weddingId: wedding.id },
    include: { user: { select: { id: true, name: true, image: true, email: true } } }
  })

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklist Inteligente</h1>
          <p className="text-muted-foreground">Gerencie todas as tarefas e prazos do casamento.</p>
        </div>
      </div>

      <ChecklistProgress stats={data.stats} />

      <div className="mt-6 flex-1 overflow-hidden min-h-0">
        <ChecklistBoard 
          weddingSlug={weddingId}
          initialCategories={data.categories}
          initialTasks={data.tasks}
          members={members}
          weddingDate={data.weddingDate}
        />
      </div>
    </div>
  )
}

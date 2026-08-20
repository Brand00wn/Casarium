"use client"
import { Task, TaskCategory, TaskAssignee, WeddingMember, User } from "@prisma/client"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar, MoreVertical, Link, AlertCircle, Clock, Trash, Edit2, PlusCircle, CheckCircle2, RotateCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type TaskWithRelations = Task & {
  category: TaskCategory | null
  assignees: (TaskAssignee & { member: WeddingMember & { user: User } })[]
}

interface TaskCardProps {
  task: TaskWithRelations
  onEdit: (task: TaskWithRelations) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onToggleEvent: (taskId: string, hasEvent: boolean) => void
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange, onToggleEvent }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "Task", task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = task.status !== "DONE" && task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate)
  const isDueSoon = task.status !== "DONE" && task.dueDate && !isOverdue && differenceInDays(task.dueDate, new Date()) <= 7
  const daysOverdue = isOverdue && task.dueDate ? Math.abs(differenceInDays(new Date(), task.dueDate)) : 0
  const daysRemaining = !isOverdue && task.status !== "DONE" && task.dueDate ? Math.max(0, differenceInDays(task.dueDate, new Date())) : 0

  const priorityColors = {
    LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    URGENT: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  }

  const priorityLabels = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente" }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md ${isDragging ? 'opacity-50 ring-2 ring-primary ring-offset-2' : ''} ${task.status === 'DONE' ? 'opacity-70' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {task.category && (
            <Badge variant="outline" className="text-xs font-normal" style={{ borderColor: task.category.color || undefined, color: task.category.color || undefined }}>
              {task.category.emoji} {task.category.name}
            </Badge>
          )}
          <Badge variant="secondary" className={`text-[10px] font-semibold ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center border border-transparent bg-transparent shadow-none hover:bg-accent hover:text-accent-foreground text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-md h-6 w-6 -mr-1 -mt-1">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit2 className="mr-2 h-4 w-4" /> Editar Tarefa
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "TODO")}>
              <Clock className="mr-2 h-4 w-4" /> A Fazer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "IN_PROGRESS")}>
              <RotateCw className="mr-2 h-4 w-4" /> Em Andamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "DONE")}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleEvent(task.id, !!task.eventId)}>
              {task.eventId ? (
                <><Trash className="mr-2 h-4 w-4 text-destructive" /> <span className="text-destructive">Remover da Agenda</span></>
              ) : (
                <><Calendar className="mr-2 h-4 w-4" /> Criar na Agenda</>
              )}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Trash className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="font-medium text-sm leading-snug">
        <span className={task.status === "DONE" ? "line-through text-muted-foreground" : ""}>
          {task.title}
        </span>
      </div>

      <div className="flex items-end justify-between mt-auto pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {task.dueDate ? (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : isDueSoon ? 'text-amber-500 font-medium' : ''}`}>
              <Calendar className="w-3.5 h-3.5" />
              <div className="flex items-center">
                <span>{format(task.dueDate, "dd/MM/yyyy")}</span>
                {isOverdue && (
                  <span className="ml-1 text-[10px] font-bold">
                    (atrasado há {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'})
                  </span>
                )}
                {!isOverdue && task.status !== "DONE" && daysRemaining > 0 && (
                  <span className="ml-1 text-[10px] opacity-70 font-medium">
                    (vence {daysRemaining === 1 ? 'amanhã' : `em ${daysRemaining} dias`})
                  </span>
                )}
                {!isOverdue && task.status !== "DONE" && daysRemaining === 0 && task.dueDate && isToday(task.dueDate) && (
                  <span className="ml-1 text-[10px] font-bold text-amber-600 dark:text-amber-500">
                    (vence hoje)
                  </span>
                )}
              </div>
              {task.dueDateType === "RELATIVE" && (
                <span title="Data relativa ao casamento" className="ml-0.5 cursor-help opacity-70">🔗</span>
              )}
            </div>
          ) : (
            <span className="text-[10px] uppercase tracking-wider opacity-60">Sem data</span>
          )}
          
          {task.eventId && (
            <span title="Vinculado à Agenda"><Link className="w-3.5 h-3.5 ml-1 text-primary" /></span>
          )}
        </div>

        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-2 overflow-hidden">
            {task.assignees.map((assignee) => (
              <Avatar key={assignee.id} className="inline-block h-6 w-6 rounded-full border-2 border-background" title={assignee.member.user.name || ""}>
                <AvatarImage src={assignee.member.user.image || ""} />
                <AvatarFallback className="text-[10px]">{assignee.member.user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"
import { useState, useEffect } from "react"
import { TaskCategory, TaskPriority, DueDateType, TaskStatus } from "@prisma/client"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TaskDialogProps {
  isOpen: boolean
  onClose: () => void
  task: any | null // TaskWithRelations or null
  categories: TaskCategory[]
  members: any[]
  onSave: (data: any) => Promise<void>
}

export function TaskDialog({ isOpen, onClose, task, categories, members, onSave }: TaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string>("none")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [status, setStatus] = useState<TaskStatus>("TODO")
  
  const [dueDateType, setDueDateType] = useState<DueDateType>("RELATIVE")
  const [relativeDays, setRelativeDays] = useState<string>("")
  const [dueDate, setDueDate] = useState<string>("")
  
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [createEvent, setCreateEvent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title || "")
        setDescription(task.description || "")
        setCategoryId(task.categoryId || "none")
        setPriority(task.priority || "MEDIUM")
        setStatus(task.status || "TODO")
        setDueDateType(task.dueDateType || "RELATIVE")
        setRelativeDays(task.relativeDays?.toString() || "")
        setDueDate(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "")
        setAssigneeIds(task.assignees?.map((a: any) => a.memberId) || [])
        setCreateEvent(!!task.eventId)
      } else {
        setTitle("")
        setDescription("")
        setCategoryId("none")
        setPriority("MEDIUM")
        setStatus("TODO")
        setDueDateType("RELATIVE")
        setRelativeDays("")
        setDueDate("")
        setAssigneeIds([])
        setCreateEvent(false)
      }
    }
  }, [isOpen, task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        title,
        description: description || null,
        categoryId: categoryId === "none" ? null : categoryId,
        priority,
        status,
        dueDateType,
        relativeDays: dueDateType === "RELATIVE" && relativeDays ? parseInt(relativeDays, 10) : null,
        dueDate: dueDateType === "FIXED" && dueDate ? new Date(dueDate) : null,
        assigneeIds,
        createEvent
      }
      await onSave(data)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const roleMap: Record<string, string> = {
    OWNER: "Noivo(a)",
    PLANNER: "Assessoria",
    CONCIERGE: "Concierge",
    MEMBER: "Membro"
  }

  const priorityMap: Record<string, string> = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    URGENT: "Urgente"
  }

  const statusMap: Record<string, string> = {
    TODO: "A Fazer",
    IN_PROGRESS: "Em Andamento",
    DONE: "Concluída"
  }

  const selectedCategory = categories.find(c => c.id === categoryId)
  const categoryDisplay = categoryId === "none" ? "Sem categoria" : (selectedCategory ? `${selectedCategory.emoji} ${selectedCategory.name}` : "Selecione...")
  const priorityDisplay = priorityMap[priority] || "Média"
  const statusDisplay = statusMap[status] || "A Fazer"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Tarefa</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: Escolher o buffet" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v || "none")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">{categoryDisplay}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">{priorityDisplay}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Tipo de Prazo</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${dueDateType === "FIXED" ? "font-bold" : "text-muted-foreground"}`}>Data Fixa</span>
                <Switch 
                  checked={dueDateType === "RELATIVE"} 
                  onCheckedChange={(checked) => setDueDateType(checked ? "RELATIVE" : "FIXED")}
                />
                <span className={`text-xs ${dueDateType === "RELATIVE" ? "font-bold text-primary" : "text-muted-foreground"}`}>Relativa (Automática)</span>
              </div>
            </div>

            {dueDateType === "RELATIVE" ? (
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  min="0" 
                  className="w-24" 
                  value={relativeDays} 
                  onChange={e => setRelativeDays(e.target.value)} 
                  placeholder="Ex: 30"
                />
                <span className="text-sm text-muted-foreground">dias antes do casamento</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)} 
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Responsáveis</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-2 max-h-32 overflow-y-auto">
              {members.map(m => (
                <div key={m.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`member-${m.id}`} 
                    checked={assigneeIds.includes(m.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setAssigneeIds([...assigneeIds, m.id])
                      else setAssigneeIds(assigneeIds.filter(id => id !== m.id))
                    }}
                  />
                  <Label htmlFor={`member-${m.id}`} className="text-sm font-normal cursor-pointer flex items-center gap-2">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={m.user.image || ""} />
                      <AvatarFallback className="text-[8px]">{m.user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{m.user.name}</span>
                    <span className="text-[10px] text-muted-foreground">({roleMap[m.role] || m.role})</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {!task?.eventId && (
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label className="text-base font-medium text-foreground">Adicionar ao Calendário</Label>
                <p className="text-xs text-muted-foreground">Cria um evento e sincroniza com a sua agenda (Google/Apple).</p>
              </div>
              <Switch checked={createEvent} onCheckedChange={setCreateEvent} />
            </div>
          )}

          {task && (
            <div className="space-y-2">
              <Label>Status Atual</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">{statusDisplay}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">A Fazer</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                  <SelectItem value="DONE">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição / Notas (Opcional)</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

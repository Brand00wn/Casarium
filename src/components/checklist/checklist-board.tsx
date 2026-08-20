"use client"
import { useState, useMemo, useEffect, useRef } from "react"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent, useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { Task, TaskCategory, TaskStatus } from "@prisma/client"
import { isPast, isToday } from "date-fns"
import { Sparkles, Send, X, Bot } from "lucide-react"
import { useRouter } from "next/navigation"
import { TaskCard } from "./task-card"
import { TaskDialog } from "./task-dialog"
import { ChecklistFilters } from "./checklist-filters"
import { CategoryManager } from "./category-manager"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { updateTaskStatus, reorderTasks, createTask, updateTask, deleteTask, createCategory, updateCategory, deleteCategory, createEventFromTask, removeEventFromTask } from "@/app/actions/checklist"
import { toast } from "sonner"

interface ChecklistBoardProps {
  weddingSlug: string
  initialTasks: any[]
  initialCategories: TaskCategory[]
  members: any[]
  weddingDate: Date | null
}

const COLUMNS = [
  { id: "TODO", title: "📋 A Fazer" },
  { id: "IN_PROGRESS", title: "🔄 Em Andamento" },
  { id: "DONE", title: "✅ Concluídas" }
]

function DroppableColumn({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={className || "flex-1 overflow-y-auto overflow-x-hidden space-y-3 p-1 min-h-[150px]"}>
      {children}
    </div>
  )
}

export function ChecklistBoard({ weddingSlug, initialTasks, initialCategories, members, weddingDate }: ChecklistBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<any[]>(initialTasks)
  const [categories, setCategories] = useState<TaskCategory[]>(initialCategories)
  
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [filterOnTime, setFilterOnTime] = useState(false)
  
  const [activeTask, setActiveTask] = useState<any | null>(null)
  
  // Dialogs
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  // Hydration fix for dnd-kit
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => { setTasks(initialTasks) }, [initialTasks])
  useEffect(() => { setCategories(initialCategories) }, [initialCategories])

  const [isAIChatOpen, setIsAIChatOpen] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loadingAI, setLoadingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loadingAI])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input || loadingAI) return
    const newMsgs = [...messages, { role: 'user', content: input }]
    setMessages(newMsgs)
    setInput("")
    setLoadingAI(true)
    setError(null)
    try {
      const res = await fetch('/api/chat/checklist', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ messages: newMsgs, weddingSlug }) 
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao comunicar com IA")
      if (data.error) throw new Error(data.error)
      setMessages([...newMsgs, { role: 'assistant', content: data.text }])
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Ocorreu um erro desconhecido.")
    } finally {
      setLoadingAI(false)
    }
  }

  // Filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchCategory = selectedCategories.length === 0 || (task.categoryId && selectedCategories.includes(task.categoryId))
      const matchPriority = selectedPriorities.length === 0 || selectedPriorities.includes(task.priority)
      
      const isOverdueTask = task.status !== "DONE" && task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
      const matchOverdue = filterOverdue ? isOverdueTask : true
      const matchOnTime = filterOnTime ? !isOverdueTask : true

      return matchSearch && matchCategory && matchPriority && matchOverdue && matchOnTime
    })
  }, [tasks, searchQuery, selectedCategories, selectedPriorities, filterOverdue, filterOnTime])

  const tasksByColumn = useMemo(() => {
    const grouped = { TODO: [] as any[], IN_PROGRESS: [] as any[], DONE: [] as any[] }
    filteredTasks.forEach(task => {
      if (grouped[task.status as keyof typeof grouped]) {
        grouped[task.status as keyof typeof grouped].push(task)
      }
    })
    return grouped
  }, [filteredTasks])

  // DnD Config
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const activeTask = tasks.find(t => t.id === activeId)
    const overTask = tasks.find(t => t.id === overId)
    const overColumnId = COLUMNS.find(c => c.id === overId)?.id

    if (!activeTask) return

    if (activeTask.status !== (overTask ? overTask.status : overColumnId)) {
      setTasks(prev => {
        const activeIndex = prev.findIndex(t => t.id === activeId)
        const newStatus = (overTask ? overTask.status : overColumnId) as TaskStatus
        const updatedTask = { ...prev[activeIndex], status: newStatus }
        const newTasks = [...prev]
        newTasks[activeIndex] = updatedTask
        return newTasks
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const currentTask = tasks.find(t => t.id === activeId)

    if (!currentTask) return

    // Reordering within the same column or across columns handled by DragOver visually
    // Let's persist the final state
    const currentColumnTasks = tasks.filter(t => t.status === currentTask.status)
    const activeIndex = currentColumnTasks.findIndex(t => t.id === activeId)
    const overIndex = currentColumnTasks.findIndex(t => t.id === overId)

    let finalTasks = [...tasks]

    if (activeIndex !== overIndex && overIndex !== -1) {
      // Reorder
      const reorderedColumnTasks = arrayMove(currentColumnTasks, activeIndex, overIndex)
      
      // Update local state
      finalTasks = finalTasks.map(t => {
        if (t.status === currentTask.status) {
          const newOrder = reorderedColumnTasks.findIndex(rt => rt.id === t.id)
          return { ...t, order: newOrder }
        }
        return t
      })
      
      setTasks(finalTasks)

      // Sync backend
      try {
        await reorderTasks(weddingSlug, reorderedColumnTasks.map((t, i) => ({ id: t.id, order: i, status: t.status })))
      } catch (e) {
        toast.error("Erro ao reordenar")
      }
    } else {
      // Just column change
      try {
        await updateTaskStatus(activeId, currentTask.status as TaskStatus)
      } catch (e) {
        toast.error("Erro ao atualizar status")
      }
    }
  }

  // Actions
  const handleSaveTask = async (data: any) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data)
        toast.success("Tarefa atualizada")
      } else {
        await createTask(weddingSlug, data)
        toast.success("Tarefa criada")
      }
      // Force reload via revalidatePath is handled by Server Actions, 
      // but client needs to wait for refresh or just rely on server action redirect
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar tarefa")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Excluir esta tarefa?")) return
    try {
      await deleteTask(taskId)
      toast.success("Tarefa excluída")
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (e: any) {
      toast.error(e.message || "Erro")
    }
  }

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
      await updateTaskStatus(taskId, status as TaskStatus)
    } catch (e) {
      toast.error("Erro ao mudar status")
    }
  }

  const handleToggleEvent = async (taskId: string, hasEvent: boolean) => {
    try {
      if (hasEvent) {
        await removeEventFromTask(taskId)
        toast.success("Removido da agenda")
      } else {
        await createEventFromTask(taskId)
        toast.success("Adicionado à agenda")
      }
      window.location.reload()
    } catch (e) {
      toast.error("Erro ao gerenciar agenda")
    }
  }

  // Category Actions
  const handleCreateCategory = async (data: any) => {
    await createCategory(weddingSlug, data)
    window.location.reload()
  }
  
  const handleUpdateCategory = async (id: string, data: any) => {
    await updateCategory(id, data)
    window.location.reload()
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id)
    window.location.reload()
  }

  if (!isMounted) {
    return (
      <div className="flex flex-col h-full w-full opacity-0">
        <div className="flex items-center justify-between">
          <div className="h-10 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-100px)] lg:h-full relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="flex items-center justify-between">
          <ChecklistFilters 
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          selectedPriorities={selectedPriorities}
          setSelectedPriorities={setSelectedPriorities}
          filterOverdue={filterOverdue}
          setFilterOverdue={(val) => {
            setFilterOverdue(val)
            if (val) setFilterOnTime(false)
          }}
          filterOnTime={filterOnTime}
          setFilterOnTime={(val) => {
            setFilterOnTime(val)
            if (val) setFilterOverdue(false)
          }}
          categories={categories}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        />
        <Button onClick={() => { setEditingTask(null); setIsTaskDialogOpen(true) }} className="shrink-0 ml-4">
          <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 mt-2 h-full">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          {viewMode === "kanban" ? (
            <div className="flex h-full gap-4 min-w-full">
              {COLUMNS.map(column => (
                <div key={column.id} className="flex flex-col flex-1 min-w-[250px] max-w-[500px] bg-muted/40 rounded-xl border p-3 h-full transition-all duration-300">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    <span className="text-xs bg-background border px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                      {tasksByColumn[column.id as keyof typeof tasksByColumn].length}
                    </span>
                  </div>
                  
                  <DroppableColumn id={column.id}>
                    <SortableContext items={tasksByColumn[column.id as keyof typeof tasksByColumn].map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasksByColumn[column.id as keyof typeof tasksByColumn].map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onEdit={(t) => { setEditingTask(t); setIsTaskDialogOpen(true) }}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                          onToggleEvent={handleToggleEvent}
                        />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto h-full overflow-y-auto pr-2 pb-10">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                  Nenhuma tarefa encontrada.
                </div>
              ) : (
                COLUMNS.map(column => {
                  const columnTasks = tasksByColumn[column.id as keyof typeof tasksByColumn]
                  return (
                    <div key={column.id} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <h3 className="font-semibold text-lg">{column.title}</h3>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                          {columnTasks.length}
                        </span>
                      </div>
                      <DroppableColumn id={column.id} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[100px] w-full relative">
                        {columnTasks.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed pointer-events-none">
                            <span className="text-sm text-muted-foreground">Arraste tarefas para cá</span>
                          </div>
                        )}
                        <SortableContext items={columnTasks.map(t => t.id)} strategy={rectSortingStrategy}>
                          {columnTasks.map(task => (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              onEdit={(t) => { setEditingTask(t); setIsTaskDialogOpen(true) }}
                              onDelete={handleDeleteTask}
                              onStatusChange={handleStatusChange}
                              onToggleEvent={handleToggleEvent}
                            />
                          ))}
                        </SortableContext>
                      </DroppableColumn>
                    </div>
                  )
                })
              )}
            </div>
          )}

          <DragOverlay>
            {activeTask ? (
              <div className="opacity-90 scale-105 shadow-xl rotate-2">
                <TaskCard 
                  task={activeTask} 
                  onEdit={() => {}} 
                  onDelete={() => {}} 
                  onStatusChange={() => {}} 
                  onToggleEvent={() => {}} 
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskDialog 
        isOpen={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
        task={editingTask}
        categories={categories}
        members={members}
        onSave={handleSaveTask}
      />
      <CategoryManager 
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        weddingSlug={weddingSlug}
        categories={categories}
        onCreate={handleCreateCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
      />
    </div> {/* Closes flex-1 flex flex-col */}

    {/* AI Chat Side Panel */}
      <div 
        className={`shrink-0 transition-all duration-500 ease-in-out overflow-hidden flex flex-col h-full ${
          isAIChatOpen ? "w-[380px] lg:w-[400px] opacity-100 ml-4" : "w-0 opacity-0 ml-0"
        }`}
      >
        <div className="w-[380px] lg:w-[400px] h-full flex flex-col border rounded-xl bg-card overflow-hidden shadow-xl ring-1 ring-primary/20">
          <div className="p-4 border-b bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg mr-3 shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-md text-foreground leading-none mb-1">IA Concierge</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Gemini 3.6 Flash</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsAIChatOpen(false)} className="text-muted-foreground hover:bg-black/5 hover:text-foreground h-8 w-8 rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-gradient-to-b from-background to-muted/20">
            <div className="flex justify-start">
              <div className="bg-muted/80 p-3.5 rounded-2xl rounded-tl-sm text-sm shadow-sm border border-border/50 max-w-[90%] space-y-2">
                <p>Olá! Aqui é o seu <strong>IA Concierge</strong>. ✨</p>
                <p>Estou pronto para ajudar a gerenciar o seu Checklist! Posso criar tarefas, adicionar novas categorias e alterar prazos de forma inteligente.</p>
              </div>
            </div>
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] p-3.5 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm' : 'bg-card border border-border/50 rounded-tl-sm'}`}>{m.content}</div>
              </div>
            ))}
            {loadingAI && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-muted/50 p-3.5 rounded-2xl rounded-tl-sm text-sm text-muted-foreground flex items-center gap-3 border border-border/50">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span>Processando Checklist...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-2xl rounded-tl-sm text-sm flex flex-col gap-2 border border-destructive/20">
                <p className="font-semibold flex items-center gap-2"><X className="w-4 h-4" /> Erro de Conexão com IA</p>
                <p className="break-words opacity-90">{error}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="p-3 border-t bg-card flex gap-2 items-end shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) } }}
              placeholder="Ex: Crie 3 tarefas urgentes sobre Buffet..." 
              className="flex-1 bg-muted/50 min-h-[44px] max-h-[200px] rounded-xl border-0 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-y transition-colors hover:bg-muted/70" 
              disabled={loadingAI} 
              rows={1}
            />
            <Button type="submit" size="icon" disabled={loadingAI || !input} className="shrink-0 h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-sm"><Send className="w-5 h-5 ml-0.5" /></Button>
          </form>
        </div>
      </div>

      <Button
        onClick={() => setIsAIChatOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 transition-all duration-500 z-50 p-0 ${
          isAIChatOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100 hover:scale-110"
        }`}
      >
        <Sparkles className="w-6 h-6" />
      </Button>

    </div>
  )
}

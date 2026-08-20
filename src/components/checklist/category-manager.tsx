"use client"
import { useState } from "react"
import { TaskCategory } from "@prisma/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Edit2, Check, X, GripVertical } from "lucide-react"

interface CategoryManagerProps {
  isOpen: boolean
  onClose: () => void
  categories: TaskCategory[]
  weddingSlug: string
  onCreate: (data: { name: string, emoji?: string, color?: string }) => Promise<void>
  onUpdate: (id: string, data: { name?: string, emoji?: string, color?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function CategoryManager({ isOpen, onClose, categories, onCreate, onUpdate, onDelete }: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmoji, setEditEmoji] = useState("")
  
  const [newName, setNewName] = useState("")
  const [newEmoji, setNewEmoji] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setLoading(true)
    await onCreate({ name: newName, emoji: newEmoji })
    setNewName("")
    setNewEmoji("")
    setLoading(false)
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return
    setLoading(true)
    await onUpdate(id, { name: editName, emoji: editEmoji })
    setEditingId(null)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? As tarefas associadas ficarão sem categoria.")) return
    setLoading(true)
    await onDelete(id)
    setLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 mb-6">
            <Input 
              placeholder="Emoji (ex: 📍)" 
              value={newEmoji} 
              onChange={e => setNewEmoji(e.target.value)} 
              className="w-20"
              maxLength={2}
            />
            <Input 
              placeholder="Nome da Categoria" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={loading || !newName.trim()}>Add</Button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                {editingId === c.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input 
                      value={editEmoji} 
                      onChange={e => setEditEmoji(e.target.value)} 
                      className="w-16 h-8 text-sm"
                      maxLength={2}
                    />
                    <Input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="flex-1 h-8 text-sm"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(c.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1 cursor-default">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <span className="text-xl leading-none">{c.emoji}</span>
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => {
                        setEditingId(c.id)
                        setEditName(c.name)
                        setEditEmoji(c.emoji || "")
                      }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria encontrada.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

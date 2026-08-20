"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { deleteUser } from "@/app/actions/planner-users"
import { toast } from "sonner"

export function DeleteUserDialog({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteUser(user.id)
      toast.success("Usuário excluído com sucesso!")
      setIsOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8" title="Excluir Usuário">
          <Trash2 className="w-4 h-4" />
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Excluir Usuário
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o usuário <strong>{user.name}</strong>? Esta ação é irreversível e removerá o acesso dele a todos os eventos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Sim, Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

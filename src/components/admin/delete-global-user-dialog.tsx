"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle } from "lucide-react"
import { deleteGlobalUser } from "@/app/actions/admin"
import { useRouter } from "next/navigation"

export function DeleteGlobalUserDialog({
  user,
}: {
  user: { id: string; name: string | null; email: string | null; role: string }
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await deleteGlobalUser(user.id)
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Erro ao excluir usuário")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir Usuário Global
          </DialogTitle>
          <DialogDescription className="pt-2">
            Tem certeza que deseja excluir o usuário <strong>{user.name || user.email}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {user.role === "PLANNER" && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 font-medium">
              Atenção: Este é um perfil de Cerimonialista. Excluí-lo removerá o acesso desta agência a todos os casamentos que ela gerencia.
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Esta ação é irreversível e excluirá o perfil definitivamente da plataforma.
          </p>
          
          {error && (
            <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? "Excluindo..." : "Sim, Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

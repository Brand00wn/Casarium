"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Loader2, Link2, Unlink } from "lucide-react"
import { linkUserToWedding, unlinkUserFromWedding } from "@/app/actions/planner-users"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function LinkWeddingDialog({ 
  user, 
  weddings 
}: { 
  user: { id: string, name: string, weddings: { id: string, name: string, role: string }[] },
  weddings: { id: string, name: string }[] 
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const roleMap: Record<string, string> = {
    OWNER: "Casal",
    PLANNER: "Equipe",
    VIEWER: "Visualizador",
    CONCIERGE: "Concierge"
  }
  
  // Filter out weddings the user is already linked to
  const linkedWeddingIds = user.weddings.map(w => w.id)
  const availableWeddings = weddings.filter(w => !linkedWeddingIds.includes(w.id))

  const { handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      weddingId: "",
      role: "OWNER"
    }
  })

  const selectedWeddingId = watch("weddingId")

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) reset()
  }

  const onSubmit = async (data: any) => {
    if (!data.weddingId) {
      toast.error("Selecione um casamento")
      return
    }
    
    setIsLoading(true)
    try {
      await linkUserToWedding(user.id, data.weddingId, data.role)
      toast.success("Usuário vinculado com sucesso!")
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Erro ao vincular casamento")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlink = async (weddingId: string) => {
    if (!confirm("Tem certeza que deseja desvincular este usuário deste casamento?")) return
    
    setIsLoading(true)
    try {
      await unlinkUserFromWedding(user.id, weddingId)
      toast.success("Usuário desvinculado com sucesso!")
    } catch (error: any) {
      toast.error(error.message || "Erro ao desvincular")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Vincular a Casamento">
          <Link2 className="w-4 h-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Casamentos</DialogTitle>
          <DialogDescription>
            Casamentos vinculados a {user.name || "este usuário"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <Label>Casamentos Vinculados</Label>
            {user.weddings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-md">Nenhum casamento vinculado.</p>
            ) : (
              <ul className="space-y-2 border rounded-md p-2 bg-background">
                {user.weddings.map(w => (
                  <li key={w.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">Papel: {roleMap[w.role] || w.role}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleUnlink(w.id)}
                      disabled={isLoading}
                    >
                      <Unlink className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t pt-4 mt-4">
            <Label className="text-base font-semibold">Vincular a novo casamento</Label>
            
            {availableWeddings.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                Este usuário já está vinculado a todos os seus casamentos.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Selecione o Casamento</Label>
                  <Select value={watch("weddingId")} onValueChange={(val) => setValue("weddingId", val || "")}>
                    <SelectTrigger>
                      {watch("weddingId") ? availableWeddings.find(w => w.id === watch("weddingId"))?.name : <span className="text-muted-foreground">Escolha um casamento...</span>}
                    </SelectTrigger>
                    <SelectContent>
                      {availableWeddings.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Papel no Casamento</Label>
                  <Select value={watch("role")} onValueChange={(val) => setValue("role", val || "")} defaultValue="OWNER">
                    <SelectTrigger>
                      {watch("role") === "OWNER" ? "Dono (Casal)" : watch("role") === "CONCIERGE" ? "Equipe do Cerimonial" : "Selecione o papel"}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Dono (Casal)</SelectItem>
                      <SelectItem value="CONCIERGE">Equipe do Cerimonial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isLoading || !selectedWeddingId}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vincular Usuário
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

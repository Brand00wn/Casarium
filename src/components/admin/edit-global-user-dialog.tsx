"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, UserCog } from "lucide-react"
import { updateGlobalUser } from "@/app/actions/admin"
import { useRouter } from "next/navigation"

export function EditGlobalUserDialog({
  user,
}: {
  user: any
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()

  const [name, setName] = useState(user.name || "")
  const [email, setEmail] = useState(user.email || "")
  
  // Opcionais para PLANNER
  const [companyName, setCompanyName] = useState(user.companyName || "")
  const [cnpj, setCnpj] = useState(user.cnpj || "")
  const [phone, setPhone] = useState(user.phone || "")
  const [instagram, setInstagram] = useState(user.instagram || "")
  const [website, setWebsite] = useState(user.website || "")

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await updateGlobalUser(user.id, { 
        name, 
        email,
        companyName,
        cnpj,
        phone,
        instagram,
        website 
      })
      
      setOpen(false)
      // Força a revalidação da UI no lado do cliente
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Erro ao editar usuário")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Pencil className="w-4 h-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription>
            Atualize as informações de cadastro deste usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleEdit} className="space-y-5 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${user.id}`} className="text-xs font-semibold text-muted-foreground uppercase">Nome</Label>
              <Input
                id={`edit-name-${user.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-email-${user.id}`} className="text-xs font-semibold text-muted-foreground uppercase">E-mail</Label>
              <Input
                id={`edit-email-${user.id}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {user.role === "PLANNER" && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-semibold">Dados da Agência</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-company" className="text-xs font-semibold text-muted-foreground uppercase">Nome da Agência</Label>
                  <Input id="edit-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: João Silva Eventos" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-cnpj" className="text-xs font-semibold text-muted-foreground uppercase">CNPJ</Label>
                    <Input id="edit-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" className="text-xs font-semibold text-muted-foreground uppercase">Telefone</Label>
                    <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-insta" className="text-xs font-semibold text-muted-foreground uppercase">Instagram</Label>
                    <Input id="edit-insta" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-site" className="text-xs font-semibold text-muted-foreground uppercase">Website</Label>
                    <Input id="edit-site" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, KeyRound, Copy } from "lucide-react"
import { resetUserPassword } from "@/app/actions/planner-users"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"

export function ResetPasswordDialog({ user }: { user: { id: string, name: string } }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(() => setTempPassword(null), 300)
    }
  }

  const handleReset = async () => {
    setIsLoading(true)
    try {
      const newPassword = await resetUserPassword(user.id)
      setTempPassword(newPassword)
      toast.success("Senha resetada com sucesso!")
    } catch (error: any) {
      toast.error(error.message || "Erro ao resetar senha")
    } finally {
      setIsLoading(false)
    }
  }

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword)
      toast.success("Senha copiada!")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <KeyRound className="w-4 h-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resetar Senha</DialogTitle>
          <DialogDescription>
            {tempPassword 
              ? "A nova senha foi gerada com sucesso. Envie-a para o usuário."
              : `Tem certeza que deseja resetar a senha de ${user.name || "este usuário"}?`
            }
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg border">
              <code className="flex-1 text-lg font-mono text-center tracking-wider">{tempPassword}</code>
              <Button variant="outline" size="icon" onClick={copyPassword}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button className="w-full mt-4" onClick={() => handleOpenChange(false)}>
              Concluir
            </Button>
          </div>
        ) : (
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReset} disabled={isLoading} variant="destructive">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resetar Senha
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

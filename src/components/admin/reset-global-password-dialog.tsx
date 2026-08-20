"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { KeyRound, CheckCircle2, Copy } from "lucide-react"
import { resetGlobalUserPassword } from "@/app/actions/admin"

export function ResetGlobalPasswordDialog({
  user,
}: {
  user: { id: string; name: string | null; email: string | null }
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleReset = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const pwd = await resetGlobalUserPassword(user.id)
      setNewPassword(pwd)
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // reset state after animation
    setTimeout(() => {
      setNewPassword(null)
      setError(null)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-600/10">
          <KeyRound className="w-4 h-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        {newPassword ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="mb-2">Senha Redefinida!</DialogTitle>
            <DialogDescription className="mb-6">
              A nova senha temporária para <strong>{user.name || user.email}</strong> é:
            </DialogDescription>
            
            <div className="bg-muted p-4 rounded-lg flex items-center justify-between mb-6 border">
              <code className="text-lg font-mono font-bold tracking-wider">{newPassword}</code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            <Button className="w-full" onClick={handleClose}>
              Concluir
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Redefinir Senha Global
              </DialogTitle>
              <DialogDescription className="pt-2">
                Isso irá gerar uma nova senha aleatória para <strong>{user.name || user.email}</strong>. A senha atual deixará de funcionar imediatamente.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="p-3 mt-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleReset} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                {isLoading ? "Gerando..." : "Gerar Nova Senha"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

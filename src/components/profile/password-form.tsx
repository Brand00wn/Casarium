"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updatePassword } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Shield, KeyRound } from "lucide-react"

export function PasswordForm() {
  const [currentPass, setCurrentPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [isPending, setIsPending] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    
    if (newPass !== confirmPass) {
      toast.error("As novas senhas não coincidem")
      return
    }

    setIsPending(true)
    
    try {
      const res = await updatePassword(currentPass, newPass)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Senha atualizada com sucesso!")
        setCurrentPass("")
        setNewPass("")
        setConfirmPass("")
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao atualizar a senha.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-lg mt-8">
      <form onSubmit={handleSave}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Segurança
          </CardTitle>
          <CardDescription>
            Altere sua senha de acesso à plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPass">Senha Atual</Label>
            <Input 
              id="currentPass" 
              type="password" 
              value={currentPass} 
              onChange={(e) => setCurrentPass(e.target.value)} 
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPass">Nova Senha</Label>
            <Input 
              id="newPass" 
              type="password" 
              value={newPass} 
              onChange={(e) => setNewPass(e.target.value)} 
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPass">Confirmar Nova Senha</Label>
            <Input 
              id="confirmPass" 
              type="password" 
              value={confirmPass} 
              onChange={(e) => setConfirmPass(e.target.value)} 
              required
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending || !currentPass || !newPass || !confirmPass} className="w-full sm:w-auto" variant="secondary">
            <KeyRound className="w-4 h-4 mr-2" />
            {isPending ? "Alterando..." : "Alterar Senha"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

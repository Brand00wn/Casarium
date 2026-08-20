"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updateProfileName } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { User, Mail, Save } from "lucide-react"
import { useRouter } from "next/navigation"

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    
    try {
      const res = await updateProfileName(name)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Nome atualizado com sucesso!")
        router.refresh()
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao atualizar.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-lg">
      <form onSubmit={handleSave}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Atualize suas informações básicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" /> E-mail
            </Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              disabled 
              className="bg-muted/50 text-muted-foreground"
            />
            <p className="text-[10px] text-muted-foreground ml-1">
              O e-mail não pode ser alterado no momento.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" /> Nome Completo
            </Label>
            <Input 
              id="name" 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
              placeholder="Seu nome"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending || name === initialName} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

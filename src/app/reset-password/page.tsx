"use client"

import { useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { resetPassword } from "@/app/actions/auth/reset-password"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = use(searchParams)
  const router = useRouter()
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      toast.error("Token de redefinição ausente.")
      return
    }

    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }

    setLoading(true)
    const result = await resetPassword(token, password)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      toast.success("Senha redefinida com sucesso!")
    } else {
      toast.error(result.error)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle className="text-xl text-red-500 mb-2">Link Inválido</CardTitle>
          <div className="flex flex-col items-center py-6">
            <CheckCircle2 className="w-16 h-16 text-red-500 mb-6" />
            <p className="text-muted-foreground mb-4">O link de recuperação está quebrado ou incompleto.</p>
            <Link href="/forgot-password" className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all">
              Solicitar Novo Link
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Casarium</h1>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {success ? "Senha Atualizada!" : "Criar Nova Senha"}
            </CardTitle>
            <CardDescription>
              {success 
                ? "Sua senha foi redefinida com sucesso. Você já pode fazer login."
                : "Digite sua nova senha abaixo. Ela deve ter pelo menos 8 caracteres."}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
                <Link href="/login" className="inline-flex items-center justify-center w-full h-11 px-6 rounded-md bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all">
                  Ir para o Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input 
                    id="confirmPassword" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
                >
                  {loading ? "Salvando..." : "Redefinir Senha"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

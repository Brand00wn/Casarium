"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { requestPasswordReset } from "@/app/actions/auth/reset-password"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    const result = await requestPasswordReset(email)
    setLoading(false)

    if (result.success) {
      setSubmitted(true)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Casarium</h1>
          <p className="text-muted-foreground mt-2">Recuperação de conta</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Esqueceu a senha?</CardTitle>
            <CardDescription>
              {!submitted 
                ? "Digite seu e-mail abaixo e enviaremos um link seguro para você redefinir sua senha."
                : "Se o e-mail existir em nossa base, você receberá um link em breve."}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    E-mail cadastrado
                  </Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="nome@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-background/50 focus-visible:ring-primary transition-all"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-center text-muted-foreground">
                  Verifique sua caixa de entrada e também a pasta de spam. O link expira em 1 hora.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSubmitted(false)}
                  className="mt-4"
                >
                  Tentar outro e-mail
                </Button>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center border-t p-4">
            <Link 
              href="/login" 
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

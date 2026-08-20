"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, CheckCircle2, UserPlus, Copy } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPlannerUser, createStaffUser, createCoupleFromAdmin } from "@/app/actions/admin"
import { useRouter } from "next/navigation"

export function CreateGlobalUserDialog({ planners, weddings }: { planners: any[], weddings: any[] }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()

  const [role, setRole] = useState("PLANNER")
  
  // Dados comuns
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  
  // Dados Agência
  const [companyName, setCompanyName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [phone, setPhone] = useState("")
  const [instagram, setInstagram] = useState("")
  const [website, setWebsite] = useState("")

  // Relacionamentos
  const [plannerId, setPlannerId] = useState("")
  const [weddingId, setWeddingId] = useState("")
  
  const [successData, setSuccessData] = useState<{ password?: string | null; email?: string; name?: string; roleName?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      let tempPassword = ""
      let roleName = ""
      
      if (role === "PLANNER") {
        tempPassword = await createPlannerUser({ 
          name, 
          email, 
          companyName, 
          cnpj, 
          phone, 
          instagram, 
          website 
        })
        roleName = "Agência/Cerimonialista"
      } else if (role === "CONCIERGE") {
        if (!plannerId) throw new Error("Selecione um cerimonialista para vincular a equipe.")
        tempPassword = await createStaffUser({ name, email, plannerId })
        roleName = "Equipe"
      } else if (role === "COUPLE") {
        if (!weddingId) throw new Error("Selecione um casamento para vincular o casal.")
        tempPassword = await createCoupleFromAdmin({ name, email, weddingId })
        roleName = "Casal"
      }
      
      setSuccessData({ password: tempPassword, email, name: role === "PLANNER" ? (companyName || name) : name, roleName })
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Erro ao criar usuário")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (successData?.password) {
      navigator.clipboard.writeText(
        `Olá ${successData.name}!\n\nSua conta de ${successData.roleName} no ConciWedding foi criada.\n\nAcesso: ${successData.email}\nSenha provisória: ${successData.password}\n\nFaça login para começar!`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetForm = () => {
    setName("")
    setEmail("")
    setCompanyName("")
    setCnpj("")
    setPhone("")
    setInstagram("")
    setWebsite("")
    setPlannerId("")
    setWeddingId("")
    setSuccessData(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) resetForm()
    }}>
      <DialogTrigger render={<Button className="gap-2 shadow-sm"><Plus className="w-4 h-4" /> Novo Usuário</Button>} />
      <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/60 to-primary/30" />
        
        {successData ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2 tracking-tight">Usuário Criado!</h3>
              <p className="text-muted-foreground text-sm">
                Conta de {successData.roleName} registrada com sucesso. Compartilhe as credenciais abaixo:
              </p>
            </div>

            <div className="bg-muted/40 p-5 rounded-xl border border-border/60 shadow-sm space-y-4">
              <div className="flex flex-col items-start pb-4 border-b border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Login (E-mail)</span>
                <p className="font-medium text-[15px] text-foreground">{successData.email}</p>
              </div>
              
              {successData.password && (
                <div className="flex flex-col items-start pb-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Senha Provisória</span>
                  <code className="bg-background px-3 py-1.5 rounded-md border text-sm font-bold tracking-widest text-primary shadow-sm select-all">
                    {successData.password}
                  </code>
                </div>
              )}
              
              <Button 
                variant="secondary" 
                className="w-full mt-2 font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-green-700">Credenciais Copiadas!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Acesso
                  </>
                )}
              </Button>
            </div>

            <Button className="w-full" onClick={() => {
              setOpen(false)
              resetForm()
            }}>
              Concluir
            </Button>
          </div>
        ) : (
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-primary" />
                </div>
                Adicionar Novo Usuário
              </DialogTitle>
              <DialogDescription>
                Crie um perfil para Agência, Equipe ou Casal diretamente pelo painel Admin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-4">
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Tipo de Usuário</Label>
                  <Select value={role} onValueChange={(v) => setRole(v || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo...">
                        {role === "PLANNER" && "Agência / Cerimonialista"}
                        {role === "CONCIERGE" && "Membro da Equipe"}
                        {role === "COUPLE" && "Noivos (Casal)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNER">Agência / Cerimonialista</SelectItem>
                      <SelectItem value="CONCIERGE">Membro da Equipe</SelectItem>
                      <SelectItem value="COUPLE">Noivos (Casal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* VINCULOS DE EQUIPE E CASAL */}
                {role === "CONCIERGE" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Vincular a qual Cerimonialista?</Label>
                    <Select value={plannerId} onValueChange={(v) => setPlannerId(v || "")} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a agência...">
                          {plannerId ? planners.find(p => p.id === plannerId)?.companyName || planners.find(p => p.id === plannerId)?.name || planners.find(p => p.id === plannerId)?.email : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {planners.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.companyName || p.name || p.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {role === "COUPLE" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Vincular a qual Casamento?</Label>
                    <Select value={weddingId} onValueChange={(v) => setWeddingId(v || "")} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o casamento...">
                          {weddingId ? (() => {
                            const w = weddings.find(w => w.id === weddingId)
                            return w ? `${w.partner1Name} & ${w.partner2Name}` : undefined
                          })() : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {weddings.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.partner1Name} & {w.partner2Name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* DADOS BÁSICOS */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase">
                    {role === "PLANNER" ? "Nome do Responsável" : "Nome Completo"}
                  </Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                {/* DADOS DA AGÊNCIA */}
                {role === "PLANNER" && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <h4 className="text-sm font-semibold">Dados da Agência (Opcional)</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-xs font-semibold text-muted-foreground uppercase">Nome da Agência</Label>
                      <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: João Silva Eventos" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cnpj" className="text-xs font-semibold text-muted-foreground uppercase">CNPJ</Label>
                        <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase">Telefone</Label>
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="instagram" className="text-xs font-semibold text-muted-foreground uppercase">Instagram</Label>
                        <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seu.perfil" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-xs font-semibold text-muted-foreground uppercase">Website</Label>
                        <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.site.com.br" />
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
                <Button type="submit" disabled={isLoading} className="gap-2 shadow-sm">
                  {isLoading ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

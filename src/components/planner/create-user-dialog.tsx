"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Plus, Loader2, Copy, CheckCircle2 } from "lucide-react"
import { createAndLinkUser } from "@/app/actions/planner-users"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export function CreateUserDialog({ weddings }: { weddings: { id: string, name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ tempPassword?: string | null } | null>(null)
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      email: "",
      weddingId: "",
      role: "OWNER"
    }
  })

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(() => {
        reset()
        setSuccessData(null)
      }, 300)
    }
  }

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      const result = await createAndLinkUser(data)
      if (result.success) {
        setSuccessData({ tempPassword: result.tempPassword })
        toast.success("Usuário criado e vinculado com sucesso!")
      } else {
        toast.error(result.error || "Ocorreu um erro ao criar o usuário")
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  const copyPassword = () => {
    if (successData?.tempPassword) {
      navigator.clipboard.writeText(successData.tempPassword)
      toast.success("Senha copiada para a área de transferência!")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="gap-2"><Plus className="w-4 h-4" /> Novo Usuário</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Conta de Usuário</DialogTitle>
          <DialogDescription>
            Crie uma conta para o casal e vincule a um de seus casamentos.
          </DialogDescription>
        </DialogHeader>

        {successData ? (
          <div className="py-6 space-y-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Conta criada com sucesso!</h3>
              {successData.tempPassword ? (
                <p className="text-sm text-muted-foreground">
                  A senha temporária foi gerada. O usuário deverá alterá-la no primeiro acesso.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este email já possuía uma conta no sistema e foi vinculado com sucesso.
                </p>
              )}
            </div>
            
            {successData.tempPassword && (
              <div className="flex items-center gap-2 mt-4 p-4 bg-muted rounded-lg border">
                <code className="flex-1 text-lg font-mono text-center tracking-wider">{successData.tempPassword}</code>
                <Button variant="outline" size="icon" onClick={copyPassword}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button className="w-full mt-4" onClick={() => handleOpenChange(false)}>
              Concluir
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input {...register("name", { required: true })} placeholder="Ex: João da Silva" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register("email", { required: true })} placeholder="Ex: joao@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Vincular ao Casamento</Label>
              <Select value={watch("weddingId")} onValueChange={(val) => setValue("weddingId", val || "")} required>
                <SelectTrigger>
                  {watch("weddingId") ? weddings.find(w => w.id === watch("weddingId"))?.name : <span className="text-muted-foreground">Selecione um casamento...</span>}
                </SelectTrigger>
                <SelectContent>
                  {weddings.map(w => (
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
            
            <div className="flex justify-end pt-4">
              <Button type="button" variant="ghost" className="mr-2" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

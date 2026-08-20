"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Loader2, Pencil } from "lucide-react"
import { updateUser } from "@/app/actions/planner-users"

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

export function EditUserDialog({ user }: { user: { id: string, name: string, email: string } }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
    }
  })

  useEffect(() => {
    reset({
      name: user.name || "",
      email: user.email || "",
    })
  }, [user, reset])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      reset({
        name: user.name || "",
        email: user.email || "",
      })
    }
  }

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      await updateUser(user.id, data)
      toast.success("Usuário atualizado com sucesso!")
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao atualizar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Pencil className="w-4 h-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações de {user.name || "este usuário"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input {...register("name", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register("email", { required: true })} />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" className="mr-2" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

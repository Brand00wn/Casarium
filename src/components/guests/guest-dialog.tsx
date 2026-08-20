"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Edit } from "lucide-react"
import { createGuest, updateGuest } from "@/app/actions/guests"
import { guestSchema, type GuestFormValues } from "@/lib/validations/guest"
import { Separator } from "@/components/ui/separator"

export function GuestDialog({ 
  weddingId,
  guestId,
  initialData,
  mode = "create"
}: { 
  weddingId: string
  guestId?: string
  initialData?: any
  mode?: "create" | "edit"
}) {
  const [open, setOpen] = useState(false)
  
  const form = useForm({
    resolver: zodResolver(guestSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      rsvpStatus: "PENDING",
      dietaryRestrictions: "",
      ageCategory: "Adulto",
      companions: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "companions",
  })

  async function onSubmit(data: GuestFormValues) {
    const result = guestId 
      ? await updateGuest(weddingId, guestId, data)
      : await createGuest(weddingId, data)
      
    if (result.success) {
      setOpen(false)
      if (!guestId) form.reset()
    } else {
      alert(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        mode === "edit" ? (
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Convidado
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guestId ? "Editar Família" : "Adicionar Família / Convidado"}</DialogTitle>
          <DialogDescription>
            {guestId ? "Edite os dados do titular e gerencie seus acompanhantes." : "Insira os dados do Titular e adicione seus acompanhantes."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* DADOS DO TITULAR */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dados do Titular</h3>
              <FormField
                control={form.control as any}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Roberto Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="roberto@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="11999999999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="dietaryRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restrições Alimentares</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Vegano, Sem Lactose" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="ageCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "Adulto"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a idade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Adulto">Adulto</SelectItem>
                          <SelectItem value="Criança">Criança</SelectItem>
                          <SelectItem value="Bebê">Bebê</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* ACOMPANHANTES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Acompanhantes</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => append({ name: "", phone: "", dietaryRestrictions: "", ageCategory: "Adulto" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-muted/20">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <FormField
                    control={form.control as any}
                    name={`companions.${index}.name` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Acompanhante</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Maria Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name={`companions.${index}.phone` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="11999999999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <FormField
                      control={form.control as any}
                      name={`companions.${index}.dietaryRestrictions` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restrições</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Alergia a nozes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name={`companions.${index}.ageCategory` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Idade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "Adulto"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Adulto">Adulto</SelectItem>
                              <SelectItem value="Criança">Criança</SelectItem>
                              <SelectItem value="Bebê">Bebê</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum acompanhante adicionado.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar Titular e Acompanhantes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

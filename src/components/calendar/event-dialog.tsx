"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/events"
import { EventType } from "@prisma/client"
import { Loader2, Trash2, Users } from "lucide-react"

type WeddingOption = {
  id: string
  partner1Name: string
  partner2Name: string
}

export type EventFormData = {
  id?: string
  weddingId: string
  title: string
  description: string
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  location: string
  type: EventType | "MAIN_WEDDING"
  requiresRsvp?: boolean
  isPublicRsvp?: boolean
  eventGuestsCount?: number // Apenas para exibição
  weddingName?: string
  plannerName?: string
  ceremonyTime?: string
  ceremonyLocation?: string
  hasReception?: boolean
  isSameLocation?: boolean
  receptionTime?: string
  receptionLocation?: string
}

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<EventFormData>
  weddings?: WeddingOption[] // Passado quando o usuário é Planner/Admin e pode escolher o casamento
  fixedWeddingId?: string // Passado quando o usuário está na visão específica de um casamento
  readOnly?: boolean // True para Admins ou Convidados visualizando
  onManageGuests?: (eventId: string) => void // Callback para abrir o modal de convidados
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  MEETING: "Reunião",
  CIVIL_REGISTRY: "Casamento Civil",
  BRIDAL_SHOWER: "Chá de Panela/Lingerie",
  BACHELOR_PARTY: "Despedida de Solteiro(a)",
  REHEARSAL: "Ensaio",
  FITTING: "Prova de Roupa/Cabelo",
  OTHER: "Outro"
}

export function EventDialog({ open, onOpenChange, initialData, weddings, fixedWeddingId, readOnly, onManageGuests }: EventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [formData, setFormData] = useState<Partial<EventFormData>>({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    location: "",
    type: "OTHER",
    weddingId: fixedWeddingId || "",
    ...initialData
  })

  // Sincroniza quando initialData muda
  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        location: "",
        type: "OTHER",
        weddingId: fixedWeddingId || "",
        ...initialData
      })
    }
  }, [open, initialData, fixedWeddingId])

  const handleChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return

    setLoading(true)
    try {
      const dataToSubmit = {
        title: formData.title!,
        description: formData.description,
        date: new Date(formData.date! + "T12:00:00Z"), // Força o fuso horário
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location,
        type: formData.type as EventType,
        requiresRsvp: formData.requiresRsvp,
        isPublicRsvp: formData.isPublicRsvp,
      }

      if (formData.id) {
        await updateEvent(formData.id, dataToSubmit)
      } else {
        if (!formData.weddingId) throw new Error("Selecione um casamento")
        await createEvent({ ...dataToSubmit, weddingId: formData.weddingId })
      }
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar o evento.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!formData.id || !confirm("Tem certeza que deseja excluir este evento?")) return
    setDeleting(true)
    try {
      await deleteEvent(formData.id)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      alert("Erro ao excluir.")
    } finally {
      setDeleting(false)
    }
  }

  const isMainWedding = formData.type === "MAIN_WEDDING"
  const isEffectivelyReadOnly = readOnly || isMainWedding

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isMainWedding ? "O Grande Dia!" : formData.id ? (isEffectivelyReadOnly ? "Detalhes do Evento" : "Editar Evento") : "Novo Evento"}
          </DialogTitle>
          <DialogDescription>
            {isMainWedding 
              ? "Para alterar a data ou cor do casamento principal, acesse as configurações gerais do casamento." 
              : formData.id 
                ? "Visualize ou modifique as informações deste evento." 
                : "Adicione um novo evento ao cronograma."}
          </DialogDescription>
        </DialogHeader>

        {formData.weddingName && (
          <div className="bg-muted/50 p-3 rounded-md border text-sm space-y-1 mb-2">
            <p><span className="font-semibold uppercase text-xs text-muted-foreground mr-2">Casal:</span> {formData.weddingName}</p>
            {formData.plannerName && <p><span className="font-semibold uppercase text-xs text-muted-foreground mr-2">Cerimonial:</span> {formData.plannerName}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          
          {/* SELEÇÃO DO CASAMENTO (Apenas para Planners na visão global) */}
          {!fixedWeddingId && weddings && (
            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold text-muted-foreground">Vincular a qual Casamento?</Label>
              <Select 
                value={formData.weddingId} 
                onValueChange={(v) => handleChange("weddingId", v || "")}
                disabled={!!formData.id || isEffectivelyReadOnly} // Não permite mudar o casamento de um evento existente
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o casamento">
                    {formData.weddingId ? (
                      weddings.find(w => w.id === formData.weddingId)
                        ? `${weddings.find(w => w.id === formData.weddingId)?.partner1Name} & ${weddings.find(w => w.id === formData.weddingId)?.partner2Name}`
                        : "Selecione o casamento"
                    ) : undefined}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label className="text-xs uppercase font-semibold text-muted-foreground">Tipo de Evento</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => handleChange("type", v as any)}
                disabled={isEffectivelyReadOnly}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">
                    {formData.type === "MAIN_WEDDING" 
                      ? "Casamento" 
                      : formData.type 
                        ? EVENT_TYPE_LABELS[formData.type as EventType] 
                        : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {isMainWedding && <SelectItem value="MAIN_WEDDING">Casamento</SelectItem>}
                  {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label className="text-xs uppercase font-semibold text-muted-foreground">Data</Label>
              <Input 
                type="date" 
                value={formData.date} 
                onChange={e => handleChange("date", e.target.value)}
                disabled={isEffectivelyReadOnly}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase font-semibold text-muted-foreground">Título do Evento</Label>
            <Input 
              value={formData.title} 
              onChange={e => handleChange("title", e.target.value)}
              placeholder="Ex: Degustação do Buffet"
              disabled={isEffectivelyReadOnly}
              required
            />
          </div>

          {isMainWedding ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-semibold text-muted-foreground">Horário da Cerimônia</Label>
                  <Input value={formData.ceremonyTime || "--:--"} disabled={true} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-semibold text-muted-foreground">Local da Cerimônia</Label>
                  <Input value={formData.ceremonyLocation || "Não definido"} disabled={true} />
                </div>
              </div>

              {formData.hasReception && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-semibold text-muted-foreground">Horário da Recepção</Label>
                    <Input value={formData.receptionTime || "--:--"} disabled={true} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-semibold text-muted-foreground">Local da Recepção</Label>
                    <Input value={formData.isSameLocation ? (formData.ceremonyLocation || "Mesmo local") : (formData.receptionLocation || "Não definido")} disabled={true} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-semibold text-muted-foreground">Horário de Início (Opcional)</Label>
                  <Input 
                    type="time" 
                    value={formData.startTime || ""} 
                    onChange={e => handleChange("startTime", e.target.value)}
                    disabled={isEffectivelyReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-semibold text-muted-foreground">Horário de Término (Opcional)</Label>
                  <Input 
                    type="time" 
                    value={formData.endTime || ""} 
                    onChange={e => handleChange("endTime", e.target.value)}
                    disabled={isEffectivelyReadOnly}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Exige Confirmação (RSVP)</Label>
                    <p className="text-xs text-muted-foreground">
                      Os convidados poderão confirmar presença neste evento.
                    </p>
                  </div>
                  <Switch
                    checked={formData.requiresRsvp}
                    onCheckedChange={(c) => handleChange("requiresRsvp", c)}
                    disabled={isEffectivelyReadOnly}
                  />
                </div>

                {formData.requiresRsvp && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Público para todos</Label>
                      <p className="text-xs text-muted-foreground">
                        Se desativado, apenas os convidados específicos verão este evento no site.
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPublicRsvp}
                      onCheckedChange={(c) => handleChange("isPublicRsvp", c)}
                      disabled={isEffectivelyReadOnly}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold text-muted-foreground">Local (Opcional)</Label>
                <Input 
                  value={formData.location || ""} 
                  onChange={e => handleChange("location", e.target.value)}
                  placeholder="Ex: Espaço Villa das Flores"
                  disabled={isEffectivelyReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold text-muted-foreground">Descrição (Opcional)</Label>
                <Textarea 
                  value={formData.description || ""} 
                  onChange={e => handleChange("description", e.target.value)}
                  placeholder="Detalhes adicionais sobre o evento..."
                  className="resize-none h-24"
                  disabled={isEffectivelyReadOnly}
                />
              </div>
            </>
          )}

          {/* VISUALIZAÇÃO DE CONVIDADOS */}
          {formData.id && (
            <div className="pt-4 border-t border-border mt-2 flex items-center justify-between">
              <div>
                <Label className="text-xs uppercase font-semibold text-muted-foreground">
                  {isMainWedding ? "Lista do Casamento" : "Convidados do Evento"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formData.eventGuestsCount || 0} {isMainWedding ? "convidado(s) na lista principal" : "convidado(s) vinculado(s)"}
                </p>
              </div>
              {!isMainWedding && onManageGuests && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => onManageGuests(formData.id!)}
                >
                  <Users className="w-4 h-4" />
                  Gerenciar Convidados
                </Button>
              )}
            </div>
          )}

          {!isEffectivelyReadOnly && (
            <DialogFooter className="mt-6 pt-4 border-t border-border">
              {formData.id ? (
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="mr-auto gap-2"
                  onClick={handleDelete}
                  disabled={loading || deleting}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Excluir
                </Button>
              ) : <div />}
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || deleting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || deleting}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {formData.id ? "Salvar" : "Criar Evento"}
                </Button>
              </div>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

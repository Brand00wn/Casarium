"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { syncEventGuests } from "@/app/actions/events"
import { Loader2, Search } from "lucide-react"

interface EventGuestsManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  weddingId: string
  initialSelectedGuestIds: string[]
  // No mundo real, precisaríamos passar a lista completa de convidados do casamento ou buscar via API
  // Para simplificar, assumimos que passamos os convidados aqui.
  weddingGuests: { id: string; name: string; email: string | null; familyId: string | null }[]
}

export function EventGuestsManager({ 
  open, 
  onOpenChange, 
  eventId, 
  initialSelectedGuestIds,
  weddingGuests 
}: EventGuestsManagerProps) {
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedGuestIds))
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (open) setSelectedIds(new Set(initialSelectedGuestIds))
  }, [open, initialSelectedGuestIds])

  const filteredGuests = weddingGuests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleGuest = (guestId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(guestId)) next.delete(guestId)
      else next.add(guestId)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      filteredGuests.forEach(g => next.add(g.id))
      return next
    })
  }

  const clearAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      filteredGuests.forEach(g => next.delete(g.id))
      return next
    })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await syncEventGuests(eventId, Array.from(selectedIds))
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar convidados do evento.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[85vh] max-h-[800px] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle>Gerenciar Convidados do Evento</DialogTitle>
            <DialogDescription>
              Selecione quais convidados do casamento também estão convidados para este sub-evento.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar convidado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selecionado(s) de {weddingGuests.length}
            </span>
            <div className="space-x-2">
              <Button type="button" variant="ghost" size="sm" onClick={selectAllFiltered}>Selecionar Todos</Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAllFiltered}>Limpar</Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-6 border-y">
          <div className="space-y-1 py-4">
            {filteredGuests.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhum convidado encontrado.</p>
            ) : (
              filteredGuests.map(guest => (
                <div 
                  key={guest.id} 
                  className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                  onClick={() => toggleGuest(guest.id)}
                >
                  <Checkbox 
                    id={guest.id} 
                    checked={selectedIds.has(guest.id)} 
                    onCheckedChange={() => toggleGuest(guest.id)} 
                  />
                  <div className="flex flex-col flex-1">
                    <Label htmlFor={guest.id} className="text-sm font-medium cursor-pointer">
                      {guest.name}
                    </Label>
                    {guest.email && <span className="text-xs text-muted-foreground">{guest.email}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { searchGuest, submitRsvp } from "@/app/actions/rsvp"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

export default function RsvpPage() {
  const params = useParams()
  const slug = params.weddingSlug as string
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [guest, setGuest] = useState<any>(null)
  const [rsvpEvents, setRsvpEvents] = useState<any[]>([])
  const [familyUpdates, setFamilyUpdates] = useState<any[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const found = await searchGuest(slug, query)
      if (found && found.guest) {
        setGuest(found.guest)
        setRsvpEvents(found.rsvpEvents || [])
        // Initialize family updates
        const allGuests = found.guest.family?.guests || [found.guest]
        setFamilyUpdates(allGuests.map((g: any) => {
          // Initialize sub-events
          const eventRsvps = (found.rsvpEvents || []).map((ev: any) => {
            const existingRsvp = ev.eventGuests?.find((eg: any) => eg.guestId === g.id)
            return {
              eventId: ev.id,
              title: ev.title,
              rsvpStatus: existingRsvp ? existingRsvp.rsvpStatus : 'CONFIRMED' // default to confirmed
            }
          })

          return {
            id: g.id,
            name: g.name,
            rsvpStatus: g.rsvpStatus === 'PENDING' ? 'CONFIRMED' : g.rsvpStatus, // Default check
            dietaryRestrictions: g.dietaryRestrictions || [],
            notes: g.notes || "",
            eventRsvps
          }
        }))
        setStep(2)
      } else {
        setError("Convite não encontrado. Tente buscar pelo nome exato, email ou código do convite (token).")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao buscar convite.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await submitRsvp(slug, familyUpdates)
      setStep(3)
    } catch (err) {
      alert("Erro ao salvar confirmação. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const updateMember = (id: string, field: string, value: any) => {
    setFamilyUpdates(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const updateEventRsvp = (memberId: string, eventId: string, checked: boolean) => {
    setFamilyUpdates(prev => prev.map(m => {
      if (m.id !== memberId) return m
      const newEventRsvps = m.eventRsvps.map((ev: any) => 
        ev.eventId === eventId ? { ...ev, rsvpStatus: checked ? 'CONFIRMED' : 'DECLINED' } : ev
      )
      return { ...m, eventRsvps: newEventRsvps }
    }))
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-background to-secondary/10 -z-10" />
      
      <div className="w-full max-w-2xl">
        {step === 1 && (
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-4xl font-serif text-primary">Confirme sua Presença</CardTitle>
              <CardDescription className="text-lg">
                Digite seu email, nome completo ou o código do seu convite para acessá-lo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-2">
                  <Input 
                    placeholder="Ex: joao@email.com, João Silva ou ABCD12" 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="h-14 text-lg bg-white/50 border-white/50"
                  />
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 text-lg">
                  {loading ? "Buscando..." : "Procurar Convite"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-serif text-primary">Olá, {guest.name}!</CardTitle>
              <CardDescription>
                Por favor, confirme quem poderá comparecer e informe qualquer restrição alimentar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {familyUpdates.map((member, idx) => (
                <div key={member.id} className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm space-y-6">
                  <div>
                    <Label className="text-xl font-medium block mb-4">{member.name}</Label>
                    
                    <div className="space-y-3 bg-white/30 p-4 rounded-lg">
                      {/* Main Wedding RSVP */}
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Cerimônia Principal</Label>
                        <div className="flex items-center space-x-3">
                          <span className={member.rsvpStatus === 'CONFIRMED' ? "text-primary font-medium text-sm" : "text-muted-foreground text-sm"}>
                            {member.rsvpStatus === 'CONFIRMED' ? "Confirmado" : "Não irá"}
                          </span>
                          <Switch 
                            checked={member.rsvpStatus === 'CONFIRMED'}
                            onCheckedChange={(checked) => updateMember(member.id, 'rsvpStatus', checked ? 'CONFIRMED' : 'DECLINED')}
                          />
                        </div>
                      </div>

                      {/* Sub-events RSVPs */}
                      {member.eventRsvps && member.eventRsvps.map((ev: any) => (
                        <div key={ev.eventId} className="flex items-center justify-between pt-3 border-t border-white/20">
                          <Label className="text-base text-muted-foreground">{ev.title}</Label>
                          <div className="flex items-center space-x-3">
                            <span className={ev.rsvpStatus === 'CONFIRMED' ? "text-primary font-medium text-sm" : "text-muted-foreground text-sm"}>
                              {ev.rsvpStatus === 'CONFIRMED' ? "Confirmado" : "Não irá"}
                            </span>
                            <Switch 
                              checked={ev.rsvpStatus === 'CONFIRMED'}
                              onCheckedChange={(checked) => updateEventRsvp(member.id, ev.eventId, checked)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {(member.rsvpStatus === 'CONFIRMED' || (member.eventRsvps && member.eventRsvps.some((ev:any) => ev.rsvpStatus === 'CONFIRMED'))) && (
                    <div className="space-y-4 pt-4 border-t border-white/30">
                      <div className="space-y-2">
                        <Label>Restrições Alimentares?</Label>
                        <Input 
                          placeholder="Ex: Vegano, Alergia a amendoim (deixe em branco se não houver)" 
                          value={member.dietaryRestrictions.join(', ')}
                          onChange={e => updateMember(member.id, 'dietaryRestrictions', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alguma observação?</Label>
                        <Textarea 
                          placeholder="Cadeira de rodas, bebê de colo, etc." 
                          value={member.notes}
                          onChange={e => updateMember(member.id, 'notes', e.target.value)}
                          className="bg-white/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-14">Voltar</Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-14">
                  {loading ? "Salvando..." : "Confirmar RSVP"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-2xl text-center py-12">
            <CardContent className="space-y-6">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <CardTitle className="text-4xl font-serif text-primary">RSVP Salvo com Sucesso!</CardTitle>
              <CardDescription className="text-lg">
                Obrigado por responder. Suas informações foram registradas.
              </CardDescription>
              <Button onClick={() => router.push(`/site/${slug}`)} className="mt-8 h-12 px-8">
                Voltar para a Página Inicial
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

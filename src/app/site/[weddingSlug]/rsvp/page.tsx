"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { searchGuest, submitRsvp, validateInviteToken, identifySiteGuest } from "@/app/actions/rsvp"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

type Candidate = { id: string, name: string, familyCount: number }

export default function RsvpPage() {
  const params = useParams()
  const slug = params.weddingSlug as string
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [token, setToken] = useState("")

  const [guest, setGuest] = useState<any>(null)
  const [rsvpEvents, setRsvpEvents] = useState<any[]>([])
  const [familyUpdates, setFamilyUpdates] = useState<any[]>([])

  const openInvite = (full: any, inviteToken: string) => {
    setGuest(full.guest)
    setRsvpEvents(full.rsvpEvents || [])
    const allGuests = full.guest.family?.guests || [full.guest]
    setFamilyUpdates(allGuests.map((g: any) => {
      const eventRsvps = (full.rsvpEvents || []).map((ev: any) => {
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
    // Identifica o convidado no site (pré-preenche nome nos presentes, recados, etc.)
    identifySiteGuest(slug, inviteToken).catch(() => {})
    setStep(3)
  }

  // Deep-link do WhatsApp: /rsvp?token=XXXX
  useEffect(() => {
    const t = searchParams.get("token")
    if (!t) return
    setLoading(true)
    // Busca direta pelo código para descobrir o convite e validar
    searchGuest(slug, t).then(async (found: any) => {
      if (found?.type === "invite" && found.guest) {
        const res = await validateInviteToken(slug, found.guest.id, t)
        if (res.success) openInvite(res, res.token)
        else setError(res.error || "Código inválido.")
      } else {
        setError("Código do convite não encontrado neste casamento.")
      }
    }).catch(() => setError("Erro ao abrir convite.")).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const found: any = await searchGuest(slug, query)
      if (found?.type === "invite" && found.guest) {
        // Código exato: pede o token para confirmar que é o dono do convite
        setCandidates([{ id: found.guest.id, name: found.guest.name, familyCount: found.guest.family?.guests?.length || 1 }])
        setSelected({ id: found.guest.id, name: found.guest.name, familyCount: found.guest.family?.guests?.length || 1 })
        setStep(2)
      } else if (found?.type === "candidates" && found.candidates.length > 0) {
        setCandidates(found.candidates)
        setStep(2)
      } else {
        setError("Nenhum convite encontrado. Tente parte do nome ou use o código do convite enviado no WhatsApp.")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao buscar convite.")
    } finally {
      setLoading(false)
    }
  }

  const handleValidateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    setError("")
    try {
      const res = await validateInviteToken(slug, selected.id, token)
      if (res.success) {
        openInvite(res, res.token)
      } else {
        setError(res.error || "Código inválido.")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao validar código.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await submitRsvp(slug, familyUpdates)
      setStep(4)
    } catch (err: any) {
      alert(err.message || "Erro ao salvar confirmação. Tente novamente.")
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
                Digite parte do seu nome ou o código do convite que você recebeu no WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-2">
                  <Input
                    placeholder="Ex: João ou ABCD1234"
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
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-serif text-primary">Encontrou você?</CardTitle>
              <CardDescription>
                Selecione seu convite e digite o código recebido no WhatsApp para confirmar que é você.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {candidates.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelected(c); setError("") }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === c.id ? 'border-primary bg-primary/5 shadow-sm' : 'bg-white/40 hover:border-primary/40'}`}
                  >
                    <p className="font-semibold text-lg">{c.name}</p>
                    <p className="text-sm text-muted-foreground">Convite para {c.familyCount} {c.familyCount === 1 ? 'pessoa' : 'pessoas'}</p>
                  </button>
                ))}
              </div>

              <form onSubmit={handleValidateToken} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="token">Código do convite</Label>
                  <Input
                    id="token"
                    placeholder="Ex: ABCD1234"
                    value={token}
                    onChange={e => setToken(e.target.value.toUpperCase())}
                    className="h-14 text-lg tracking-widest text-center uppercase bg-white/50"
                    maxLength={12}
                  />
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => { setStep(1); setSelected(null); setToken(""); setError("") }} className="flex-1 h-14">Voltar</Button>
                  <Button type="submit" disabled={loading || !selected || !token.trim()} className="flex-1 h-14">
                    {loading ? "Validando..." : "Acessar Convite"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
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

        {step === 4 && (
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

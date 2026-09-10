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
<div className="flex-1 flex flex-col items-center p-4 py-0 pb-16">
      <div className="w-full bg-gradient-to-b from-primary/[0.10] via-primary/[0.04] to-transparent pt-12 pb-10 px-4 -mx-4">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Confirmação de presença</p>
          <p className="font-display text-2xl italic text-muted-foreground font-light">Leva menos de um minuto</p>
        </div>
      </div>
      <div className="w-full max-w-2xl space-y-8 -mt-2">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          {["Buscar", "Código", "Confirmar"].map((label, i) => {
            const n = i + 1
            const active = step === n || (n === 3 && step === 4)
            const done = step > n || step === 4
            return (
              <div key={label} className="flex items-center gap-2">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] ${done ? "bg-primary text-primary-foreground" : active ? "border border-primary text-primary" : "border border-border text-muted-foreground"}`}>
                  {done ? "✓" : n}
                </span>
                <span className={active || done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                {n < 3 && <span className="w-6 h-px bg-border mx-1" />}
              </div>
            )
          })}
        </div>
        {step === 1 && (
          <Card className="bg-card border-border/70 shadow-xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-4xl font-display font-medium text-primary">Confirme sua Presença</CardTitle>
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
                    className="h-14 text-lg bg-muted/40"
                  />
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 text-lg rounded-full">
                  {loading ? "Buscando..." : "Procurar Convite"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-card border-border/70 shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-display font-medium text-primary">Encontrou você?</CardTitle>
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
                    className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === c.id ? 'border-primary bg-primary/5 shadow-sm' : 'bg-muted/30 hover:border-primary/40'}`}
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
                    className="h-14 text-lg tracking-widest text-center uppercase bg-muted/40"
                    maxLength={12}
                  />
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => { setStep(1); setSelected(null); setToken(""); setError("") }} className="flex-1 h-14 rounded-full">Voltar</Button>
                  <Button type="submit" disabled={loading || !selected || !token.trim()} className="flex-1 h-14 rounded-full">
                    {loading ? "Validando..." : "Acessar Convite"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-card border-border/70 shadow-xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-display font-medium text-primary">Olá, {guest.name}!</CardTitle>
              <CardDescription>
                Por favor, confirme quem poderá comparecer e informe qualquer restrição alimentar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {familyUpdates.map((member, idx) => (
                <div key={member.id} className="p-6 bg-muted/30 rounded-2xl border border-border/60 shadow-sm space-y-6">
                  <div>
                    <Label className="text-xl font-medium block mb-4">{member.name}</Label>

                    <div className="space-y-3 bg-muted/40 p-4 rounded-xl">
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
                        <div key={ev.eventId} className="flex items-center justify-between pt-3 border-t border-border/50">
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
                    <div className="space-y-4 pt-4 border-t border-border/60">
                      <div className="space-y-2">
                        <Label>Restrições Alimentares?</Label>
                        <Input
                          placeholder="Ex: Vegano, Alergia a amendoim (deixe em branco se não houver)"
                          value={member.dietaryRestrictions.join(', ')}
                          onChange={e => updateMember(member.id, 'dietaryRestrictions', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                          className="bg-muted/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alguma observação?</Label>
                        <Textarea
                          placeholder="Cadeira de rodas, bebê de colo, etc."
                          value={member.notes}
                          onChange={e => updateMember(member.id, 'notes', e.target.value)}
                          className="bg-muted/40"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-14 rounded-full">Voltar</Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-14 rounded-full">
                  {loading ? "Salvando..." : "Confirmar RSVP"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="bg-card border-border/70 shadow-xl text-center py-12">
            <CardContent className="space-y-6">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <CardTitle className="text-4xl font-display font-medium text-primary">RSVP Salvo com Sucesso!</CardTitle>
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

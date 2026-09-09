"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCheckinStats, toggleCheckin, validateQrCode, checkinGroup } from "@/app/actions/checkin"
import { useWedding } from "@/contexts/wedding-context"
import { Scanner } from "@yudiel/react-qr-scanner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, CheckCircle2, UserCheck, UserX, XCircle, Users, Camera } from "lucide-react"

type GuestCheckin = {
  id: string
  name: string
  checkedIn: boolean
  checkedInAt: Date | null
  rsvpStatus: string
  qrCode: string
}

export default function CheckinPage() {
  const params = useParams()
  const router = useRouter()
  const weddingId = params.weddingId as string
  const { memberRole } = useWedding()
  
  const [guests, setGuests] = useState<GuestCheckin[]>([])
  const [totalConfirmed, setTotalConfirmed] = useState(0)
  const [totalCheckedIn, setTotalCheckedIn] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [scanMessage, setScanMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  // Família escaneada aguardando confirmação de quem entrou
  const [scannedFamily, setScannedFamily] = useState<{ primaryName: string, members: { id: string, name: string, checkedIn: boolean, rsvpStatus: string }[] } | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Proteção de rota
    if (memberRole !== 'PLANNER' && memberRole !== 'CONCIERGE') {
      router.push(`/${weddingId}/dashboard`)
      return
    }

    loadStats()
    // Auto-focus on mount for barcode scanners
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }, [weddingId])

  const loadStats = async () => {
    try {
      const stats = await getCheckinStats(weddingId)
      setGuests(stats.guests)
      setTotalConfirmed(stats.totalConfirmed)
      setTotalCheckedIn(stats.totalCheckedIn)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (guestId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    
    // Optimistic update
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, checkedIn: newStatus } : g))
    setTotalCheckedIn(prev => newStatus ? prev + 1 : prev - 1)
    
    try {
      await toggleCheckin(weddingId, guestId, newStatus)
    } catch (error) {
      // Revert on error
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, checkedIn: currentStatus } : g))
      setTotalCheckedIn(prev => currentStatus ? prev + 1 : prev - 1)
      alert("Erro ao atualizar o check-in.")
    }
  }

  /** Bipa/cola um código: tenta match local, senão valida no servidor e abre o painel da família. */
  const processScannedCode = async (query: string) => {
    // Try to find exact match on QR Code or ID in the local list
    const exactMatch = guests.find(g => g.qrCode === query || g.id === query)

    if (exactMatch) {
      if (!exactMatch.checkedIn) {
        await handleToggle(exactMatch.id, false)
        setScanMessage({ type: 'success', text: `${exactMatch.name} - Check-in realizado!` })
      } else {
        setScanMessage({ type: 'error', text: `${exactMatch.name} já havia feito check-in.` })
      }
    } else {
      // Fallback to server validation if not found in local list (maybe not confirmed but showed up)
      setLoading(true)
      const res = await validateQrCode(weddingId, query)
      setLoading(false)

      if (res.success && res.guest) {
        const pending = res.guest.family.filter((m: any) => !m.checkedIn)
        if (pending.length <= 1 && res.guest.family.length <= 1) {
          // Convite individual: confirma direto
          await checkinGroup(weddingId, [res.guest.id])
          setScanMessage({ type: 'success', text: `${res.guest.name} - Check-in realizado com sucesso!` })
          loadStats()
        } else {
          // Família/grupo: abre painel para marcar quem entrou
          setScannedFamily({ primaryName: res.guest.name, members: res.guest.family })
          setSelectedIds(pending.map((m: any) => m.id))
        }
      } else {
        setScanMessage({ type: 'error', text: res.error || "QR Code inválido ou convidado não encontrado." })
      }
    }

    // Hide message after 3 seconds
    setTimeout(() => setScanMessage(null), 3000)
  }

  const handleConfirmGroup = async () => {
    if (selectedIds.length === 0) return
    const res = await checkinGroup(weddingId, selectedIds)
    if (res.success) {
      setScanMessage({ type: 'success', text: `${selectedIds.length} ${selectedIds.length === 1 ? 'entrada liberada' : 'entradas liberadas'}!` })
      setScannedFamily(null)
      setSelectedIds([])
      loadStats()
      setTimeout(() => setScanMessage(null), 3000)
    } else {
      setScanMessage({ type: 'error', text: res.error || "Erro ao fazer check-in." })
    }
  }

  const handleSearchKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      e.preventDefault()
      const query = search.trim()
      setSearch("") // Clear immediately for next scan
      await processScannedCode(query)
    }
  }

  const handleCameraScan = async (detectedCodes: any[]) => {
    if (detectedCodes.length > 0) {
      const query = detectedCodes[0].rawValue
      setIsScannerOpen(false) // Fecha a câmera
      await processScannedCode(query)
      setTimeout(() => setScanMessage(null), 4000)
    }
  }

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.qrCode.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Check-in de Convidados</h1>
        <p className="text-muted-foreground mt-1">Gerencie a entrada na porta do evento de forma rápida.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Convidados Presentes</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{totalCheckedIn}</div>
            <p className="text-xs text-muted-foreground mt-1">Já fizeram check-in</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Confirmado (RSVP)</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConfirmed}</div>
            <p className="text-xs text-muted-foreground mt-1">Esperados no evento</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controle Rápido</CardTitle>
          <CardDescription>Use um leitor de código de barras ou digite o nome.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                ref={searchInputRef}
                placeholder="Biper QR Code aqui, ou busque por nome..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="pl-10 h-14 text-lg"
                autoFocus
              />
            </div>
            <Button 
              size="icon" 
              className="h-14 w-14 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" 
              onClick={() => setIsScannerOpen(true)}
              title="Ler com Câmera"
            >
              <Camera className="w-6 h-6" />
            </Button>
          </div>

          {scanMessage && (
            <div className={`p-4 rounded-md flex items-center gap-2 ${scanMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
              {scanMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="font-medium">{scanMessage.text}</span>
            </div>
          )}

          {scannedFamily && (
            <div className="p-4 rounded-md border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Users className="h-5 w-5 text-primary" />
                <span>Convite de {scannedFamily.primaryName} — marque quem entrou:</span>
              </div>
              <div className="space-y-2">
                {scannedFamily.members.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-md border bg-background cursor-pointer ${m.checkedIn ? 'opacity-60' : 'hover:border-primary/50'}`}>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-primary"
                      disabled={m.checkedIn}
                      checked={m.checkedIn || selectedIds.includes(m.id)}
                      onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id))}
                    />
                    <span className="flex-1 font-medium">{m.name}</span>
                    {m.checkedIn
                      ? <span className="text-xs text-green-600 font-medium">Já entrou</span>
                      : <Badge variant={m.rsvpStatus === 'CONFIRMED' ? 'default' : 'secondary'}>{m.rsvpStatus === 'CONFIRMED' ? 'Confirmado' : m.rsvpStatus}</Badge>}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setScannedFamily(null); setSelectedIds([]) }}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={selectedIds.length === 0} onClick={handleConfirmGroup}>
                  <UserCheck className="w-4 h-4 mr-2" /> Confirmar entrada ({selectedIds.length})
                </Button>
              </div>
            </div>
          )}

          <div className="border rounded-md mt-4 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando lista...</div>
              ) : filteredGuests.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum convidado encontrado.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted text-muted-foreground sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Status RSVP</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuests.map(guest => (
                      <tr key={guest.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">
                          {guest.name}
                          {guest.checkedIn && (
                            <span className="ml-2 inline-flex items-center text-xs text-green-500 font-normal">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Presente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={guest.rsvpStatus === 'CONFIRMED' ? 'default' : 'secondary'}>
                            {guest.rsvpStatus === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {guest.checkedIn ? (
                            <Button variant="outline" size="sm" onClick={() => handleToggle(guest.id, true)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                              <UserX className="w-4 h-4 mr-2" /> Desfazer
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleToggle(guest.id, false)} className="bg-green-600 hover:bg-green-700 text-white">
                              <UserCheck className="w-4 h-4 mr-2" /> Entrou
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-0 overflow-hidden bg-black/95 border-border/5">
          <DialogHeader className="p-4 bg-background/5 absolute top-0 left-0 right-0 z-10 backdrop-blur-sm">
            <DialogTitle className="text-white">Aponte para o QR Code</DialogTitle>
          </DialogHeader>
          <div className="w-full aspect-square relative flex items-center justify-center min-h-[300px]">
            <Scanner 
              onScan={handleCameraScan} 
              components={{ finder: true }}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragEndEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay
} from "@dnd-kit/core"
import { ReactFlow, Background, applyNodeChanges, NodeChange, NodeTypes, Node, BackgroundVariant, Controls, Panel, ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Button, buttonVariants } from "@/components/ui/button"
import { Plus, Users, Settings2, GripVertical, Trash2, X, Sparkles, Send, Bot, Music, Martini, DoorOpen, Utensils, Box, Bath, User, Palette, Heart, Star, Wine, Camera, Gift, RotateCcw } from "lucide-react"

const VENUE_ICONS: Record<string, any> = {
  Box, Music, Martini, DoorOpen, Utensils, Bath, Heart, Star, Wine, Camera, Gift, Users
};
import { 
  assignGuestToTable, 
  updateTablePosition, 
  createTable, 
  updateTableDetails,
  unassignGuestFromTable,
  clearTableGuests,
  deleteTable
} from "@/app/actions/tables"

import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function GuestItem({ guest, isDependent = false, isOverlay = false }: { guest: any, isDependent?: boolean, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: { type: "GUEST", guest, isDependent },
  })
  const style = transform && !isOverlay ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined
  return (
    <div 
      ref={isOverlay ? undefined : setNodeRef} 
      style={style} 
      {...(!isOverlay ? listeners : {})} 
      {...(!isOverlay ? attributes : {})}
      className={`group relative flex items-center p-2.5 rounded-lg border bg-background shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md ${isDependent ? 'ml-6 text-sm bg-muted/30 border-dashed' : 'font-medium'} ${isOverlay ? 'shadow-2xl cursor-grabbing scale-105 border-primary ring-1 ring-primary/20' : 'cursor-grab active:cursor-grabbing'} ${isDragging && !isOverlay ? 'opacity-0' : ''}`}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground mr-2 opacity-30 group-hover:opacity-70 transition-opacity" />
      <div className="flex-1">
        <p className="flex items-center gap-2">
          {!isDependent ? <Users className="w-3.5 h-3.5 text-primary/70" /> : <User className="w-3.5 h-3.5 text-muted-foreground" />}
          {guest.name}
        </p>
        {!isDependent && guest.family?.guests?.length > 1 && (
          <p className="text-[10px] text-muted-foreground leading-tight tracking-wide mt-1 uppercase opacity-80">Arrastar move toda a família ({guest.family.guests.length} pessoas)</p>
        )}
      </div>
    </div>
  )
}

function TableNode({ data }: { data: any }) {
  const { table, onUpdateDetails, onRemoveGuest, onClearTable, onDeleteTable } = data;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `table-${table.id}`,
    data: { type: "TABLE", table },
  })
  const [editName, setEditName] = useState(table.name)
  const [editCap, setEditCap] = useState(table.capacity.toString())
  const [editColor, setEditColor] = useState(table.color || "")
  const [open, setOpen] = useState(false)

  const isFull = (table.guests?.length || 0) >= table.capacity

  const customColor = table.color;
  const colorStyle = customColor ? { 
    borderColor: customColor, 
    backgroundColor: `${customColor}22`,
    boxShadow: `0 10px 15px -3px ${customColor}33` 
  } : {};

  return (
    <div className="group relative" ref={setDropRef}>
      <div className={`w-32 h-32 rounded-full border-[4px] flex flex-col items-center justify-center shadow-lg transition-all duration-300 ${isOver ? "border-primary bg-primary/10 scale-110 shadow-primary/20" : "hover:scale-105"} ${!customColor ? "bg-gradient-to-br from-background to-muted border-border hover:border-primary/40 hover:shadow-xl" : ""}`} style={isOver ? undefined : colorStyle}>
        <div className="absolute inset-1 rounded-full border border-primary/10 pointer-events-none"></div>
        <span className="font-semibold text-center text-sm px-3 line-clamp-2 leading-tight z-10">{table.name}</span>
        <span className={`text-xs font-medium flex items-center mt-2 px-2.5 py-0.5 rounded-full z-10 shadow-sm border ${isFull ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-background text-muted-foreground border-border'}`}>
          <Users className="w-3 h-3 mr-1.5" />
          {table.guests?.length || 0}/{table.capacity}
        </span>
      </div>
      
      {onUpdateDetails && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants({ variant: "secondary", size: "icon", className: "absolute -top-1 -right-1 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 nodrag hover:scale-110 border bg-background" })}>
            <Settings2 className="h-4 w-4 text-primary" />
          </DialogTrigger>
          <DialogContent className="max-w-md nodrag">
            <DialogHeader>
              <DialogTitle>Gerenciar {table.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Mesa</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Capacidade</Label>
                  <Input type="number" value={editCap} onChange={e => setEditCap(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor da Mesa (HEX)</Label>
                <div className="flex gap-2 items-center">
                  <Input type="color" className="w-12 h-10 p-1" value={editColor || "#f8fafc"} onChange={e => setEditColor(e.target.value)} />
                  <Input placeholder="Deixe vazio para padrão" value={editColor} onChange={e => setEditColor(e.target.value)} className="flex-1" />
                  <Button variant="outline" size="icon" onClick={() => setEditColor("")} title="Restaurar Padrão"><RotateCcw className="w-4 h-4 text-muted-foreground" /></Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Convidados Sentados ({table.guests?.length || 0})</Label>
                  {table.guests?.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onClearTable(table.id)}>Remover Todos</Button>
                  )}
                </div>
                <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto bg-muted/30">
                  {table.guests?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 opacity-20" />
                      Ninguém nesta mesa ainda.
                    </div>
                  ) : (
                    table.guests?.map((g: any) => (
                      <div key={g.id} className="flex items-center justify-between p-2 border-b last:border-0 bg-background hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-medium">{g.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onRemoveGuest(table.id, g.id)}><X className="h-4 w-4" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-end w-full">
              <Button onClick={() => { onUpdateDetails(table.id, editName, parseInt(editCap), editColor || undefined); setOpen(false) }}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {onDeleteTable && (
        <Button 
          variant="destructive" 
          size="icon" 
          className="absolute -top-1 -left-1 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 nodrag hover:scale-110 border bg-background text-destructive" 
          onClick={() => onDeleteTable(table.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

function VenueNode({ data }: { data: any }) {
  const { element, onDeleteVenue, onUpdateVenue } = data;
  const [open, setOpen] = useState(false)
  const [editName, setEditName] = useState(element.name)
  const [editColor, setEditColor] = useState(element.color || "")
  const [editIcon, setEditIcon] = useState(element.icon || "")

  let config = { bg: "bg-primary/5", border: "border-primary/30", text: "text-primary/70", icon: Box, label: element.name, hex: "#94a3b8" }
  
  if (element.type === "DANCE_FLOOR") config = { bg: "bg-purple-500/5", border: "border-purple-500/30", text: "text-purple-600/70", icon: Music, label: element.name, hex: "#a855f7" }
  if (element.type === "BAR") config = { bg: "bg-blue-500/5", border: "border-blue-500/30", text: "text-blue-600/70", icon: Martini, label: element.name, hex: "#3b82f6" }
  if (element.type === "EXIT") config = { bg: "bg-red-500/5", border: "border-red-500/30", text: "text-red-600/70", icon: DoorOpen, label: element.name, hex: "#ef4444" }
  if (element.type === "BUFFET") config = { bg: "bg-orange-500/5", border: "border-orange-500/30", text: "text-orange-600/70", icon: Utensils, label: element.name, hex: "#f97316" }
  if (element.type === "RESTROOM") config = { bg: "bg-cyan-500/5", border: "border-cyan-500/30", text: "text-cyan-600/70", icon: Bath, label: element.name, hex: "#06b6d4" }

  const Icon = element.icon && VENUE_ICONS[element.icon] ? VENUE_ICONS[element.icon] : config.icon
  const customColor = element.color;
  const customStyle = customColor ? { backgroundColor: `${customColor}22`, borderColor: customColor, color: customColor } : {};

  return (
    <div className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl shadow-sm backdrop-blur-md transition-all ${!customColor ? config.bg + ' ' + config.border : ''} hover:shadow-md`} style={{ width: element.width, height: element.height, ...customStyle }}>
      <Icon className={`w-8 h-8 mb-2 opacity-50 ${!customColor ? config.text : ''}`} style={customColor ? { color: customColor } : {}} />
      <span className={`font-semibold text-center text-sm px-2 ${!customColor ? config.text : ''}`} style={customColor ? { color: customColor } : {}}>{config.label}</span>
      
      {onUpdateVenue && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants({ variant: "secondary", size: "icon", className: "absolute -top-1 -left-1 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 nodrag hover:scale-110 border bg-background" })}>
            <Settings2 className="h-4 w-4 text-primary" />
          </DialogTrigger>
          <DialogContent className="max-w-xs nodrag">
            <DialogHeader><DialogTitle>Editar {element.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Elemento</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <select value={editIcon} onChange={e => setEditIcon(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="">(Padrão)</option>
                  <option value="Star">⭐ Estrela</option>
                  <option value="Heart">❤️ Coração</option>
                  <option value="Wine">🍷 Taça de Vinho</option>
                  <option value="Camera">📷 Câmera</option>
                  <option value="Gift">🎁 Presente</option>
                  <option value="Users">👥 Pessoas</option>
                  <option value="Bath">🚻 Banheiro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Cor (HEX)</Label>
                <div className="flex gap-2 items-center">
                  <Input type="color" className="w-12 h-10 p-1" value={editColor || config.hex} onChange={e => setEditColor(e.target.value)} />
                  <Input placeholder="Cor..." value={editColor} onChange={e => setEditColor(e.target.value)} className="flex-1" />
                  <Button variant="outline" size="icon" onClick={() => setEditColor("")} title="Restaurar Padrão"><RotateCcw className="w-4 h-4 text-muted-foreground" /></Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { onUpdateVenue(element.id, editName, editColor || undefined, editIcon || undefined); setOpen(false); }}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {onDeleteVenue && (
        <Button 
          variant="destructive" 
          size="icon" 
          className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 nodrag scale-75 hover:scale-100" 
          onClick={() => onDeleteVenue(element.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
  venueNode: VenueNode
};

export function MesasClient({ weddingId, initialTables, initialGuests, initialVenueElements = [] }: any) {
  const [tables, setTables] = useState<any[]>(initialTables)
  const [guests, setGuests] = useState<any[]>(initialGuests)
  const [venueElements, setVenueElements] = useState<any[]>(initialVenueElements)
  const router = useRouter()

  useEffect(() => { setTables(initialTables) }, [initialTables])
  useEffect(() => { setGuests(initialGuests) }, [initialGuests])
  useEffect(() => { setVenueElements(initialVenueElements) }, [initialVenueElements])

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeData, setActiveData] = useState<any>(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loadingAI, setLoadingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false)
  const [newVenueName, setNewVenueName] = useState("")
  const [newVenueType, setNewVenueType] = useState("DANCE_FLOOR")
  const [newVenueColor, setNewVenueColor] = useState("")
  const [newVenueIcon, setNewVenueIcon] = useState("")
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [placementMode, setPlacementMode] = useState<'TABLE' | 'VENUE' | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) 
  }, [messages, loadingAI])

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor))
  const { setNodeRef: setSidebarDropRef, isOver: isSidebarOver } = useDroppable({ id: 'unassigned-zone', data: { type: 'SIDEBAR' } })

  const handleUpdateDetails = async (id: string, name: string, capacity: number, color?: string) => {
    setTables(tables.map(t => t.id === id ? { ...t, name, capacity, color } : t))
    await updateTableDetails(weddingId, id, name, capacity, color)
  }
  const handleRemoveGuest = async (tableId: string, guestId: string) => {
    setGuests(guests.map(g => g.id === guestId ? { ...g, tableId: null } : g))
    setTables(tables.map(t => t.id === tableId ? { ...t, guests: t.guests?.filter((g: any) => g.id !== guestId) } : t))
    await unassignGuestFromTable(weddingId, guestId)
  }
  const handleClearTable = async (tableId: string) => {
    setGuests(guests.map(g => g.tableId === tableId ? { ...g, tableId: null } : g))
    setTables(tables.map(t => t.id === tableId ? { ...t, guests: [] } : t))
    await clearTableGuests(weddingId, tableId)
  }
  const handleDeleteTable = async (tableId: string) => {
    setGuests(guests.map(g => g.tableId === tableId ? { ...g, tableId: null } : g))
    setTables(tables.filter(t => t.id !== tableId))
    await deleteTable(weddingId, tableId)
  }
  const handleCreateTable = () => {
    setPlacementMode('TABLE')
  }
  const handleCreateVenueSubmit = () => {
    if (!newVenueName) return
    setIsVenueDialogOpen(false)
    setPlacementMode('VENUE')
  }
  
  const handleUpdateVenueDetails = async (id: string, name: string, color?: string, icon?: string) => {
    setVenueElements(venueElements.map(v => v.id === id ? { ...v, name, color, icon } : v))
    import('@/app/actions/venue-elements').then(m => m.updateVenueElementDetails(weddingId, id, name, color, icon))
  }
  
  const handleDeleteVenue = async (id: string) => {
    setVenueElements(venueElements.filter(v => v.id !== id))
    import('@/app/actions/venue-elements').then(m => m.deleteVenueElement(weddingId, id))
  }

  const handlePaneClick = async (event: React.MouseEvent) => {
    if (!placementMode || !rfInstance) return;
    
    // Get exact click coordinates inside the React Flow pane
    const flowPosition = rfInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    if (placementMode === 'TABLE') {
      setPlacementMode(null);
      const x = flowPosition.x - 64; 
      const y = flowPosition.y - 64;
      const res = await createTable(weddingId, `Mesa ${tables.length + 1}`, 10, undefined, x, y)
      if (res.success && res.table) {
        const newTable = { ...res.table, x, y };
        setTables([...tables, newTable]);
      }
    } else if (placementMode === 'VENUE') {
      setPlacementMode(null);
      const x = flowPosition.x - 100;
      const y = flowPosition.y - 100;
      import('@/app/actions/venue-elements').then(async m => {
        const res = await m.createVenueElement(weddingId, newVenueType as any, newVenueName, newVenueColor || undefined, newVenueIcon || undefined, x, y)
        if (res.success && res.element) {
          const newEl = { ...res.element, x, y };
          setVenueElements([...venueElements, newEl])
          setNewVenueName("")
          setNewVenueColor("")
          setNewVenueIcon("")
        }
      })
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input || loadingAI) return
    const newMsgs = [...messages, { role: 'user', content: input }]
    setMessages(newMsgs)
    setInput("")
    setLoadingAI(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMsgs, weddingId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao comunicar com IA")
      if (data.error) throw new Error(data.error)
      setMessages([...newMsgs, { role: 'assistant', content: data.text }])
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Ocorreu um erro desconhecido.")
    } finally {
      setLoadingAI(false)
    }
  }

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id.toString())
    setActiveData(e.active.data.current)
  }
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null)
    setActiveData(null)
    const { active, over } = e
    if (active.data.current?.type === "GUEST") {
      const guest = active.data.current.guest
      const isDependent = active.data.current.isDependent
      if (over?.data.current?.type === 'SIDEBAR') {
        const moveFamily = !isDependent
        let guestsToMove = [guest]
        if (moveFamily && guest.family?.guests) guestsToMove = guest.family.guests
        const guestsIds = guestsToMove.map(g => g.id)
        setGuests(guests.map(g => guestsIds.includes(g.id) ? { ...g, tableId: null } : g))
        setTables(tables.map(t => ({ ...t, guests: t.guests?.filter((g: any) => !guestsIds.includes(g.id)) || [] })))
        await unassignGuestFromTable(weddingId, guest.id)
        return
      }
      if (over?.data.current?.type === "TABLE") {
        const table = over.data.current.table
        const moveFamily = !isDependent
        let guestsToMove = [guest]
        if (moveFamily && guest.family?.guests) guestsToMove = guest.family.guests
        const guestsIds = guestsToMove.map(g => g.id)
        setGuests(guests.map(g => guestsIds.includes(g.id) ? { ...g, tableId: table.id } : g))
        setTables(tables.map(t => {
          if (t.id === table.id) {
            const currentGuests = t.guests || []
            const guestsToAdd = guestsToMove.filter(newG => !currentGuests.some((cg: any) => cg.id === newG.id))
            return { ...t, guests: [...currentGuests, ...guestsToAdd] }
          }
          return { ...t, guests: t.guests?.filter((g: any) => !guestsIds.includes(g.id)) || [] }
        }))
        await assignGuestToTable(weddingId, guest.id, table.id, moveFamily)
      }
    }
  }

  const getGuestTableId = (id: string) => guests.find(g => g.id === id)?.tableId
  const unassignedFamilies = guests.filter(g => (g.isPrimary || !g.familyId) && (!g.tableId || g.family?.guests?.some((dep: any) => !getGuestTableId(dep.id))))

  const nodes: Node[] = useMemo(() => {
    return [
      ...tables.map(t => ({
        id: `table-${t.id}`,
        type: 'tableNode',
        position: { x: t.x, y: t.y },
        data: { table: t, onUpdateDetails: handleUpdateDetails, onRemoveGuest: handleRemoveGuest, onClearTable: handleClearTable, onDeleteTable: handleDeleteTable }
      })),
      ...venueElements.map(v => ({
        id: `venue-${v.id}`,
        type: 'venueNode',
        position: { x: v.x, y: v.y },
        data: { element: v, onDeleteVenue: handleDeleteVenue, onUpdateVenue: handleUpdateVenueDetails }
      }))
    ]
  }, [tables, venueElements, guests])

  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        const id = change.id
        if (id.startsWith('table-')) {
          const dbId = id.replace('table-', '')
          setTables(prev => prev.map(t => t.id === dbId ? { ...t, x: change.position!.x, y: change.position!.y } : t))
          if (change.dragging === false) {
            updateTablePosition(weddingId, dbId, change.position.x, change.position.y)
          }
        } else if (id.startsWith('venue-')) {
          const dbId = id.replace('venue-', '')
          setVenueElements(prev => prev.map(v => v.id === dbId ? { ...v, x: change.position!.x, y: change.position!.y } : v))
          if (change.dragging === false) {
            import('@/app/actions/venue-elements').then(m => m.updateVenueElementPosition(weddingId, dbId, change.position!.x, change.position!.y))
          }
        }
      }
    })
  }, [weddingId])

  if (!isMounted) {
    return <div className="flex items-center justify-center h-[calc(100vh-100px)]"><div className="animate-pulse flex items-center text-muted-foreground"><Settings2 className="w-5 h-5 mr-2 animate-spin" /> Carregando mapa...</div></div>
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 relative overflow-hidden">
        <div ref={setSidebarDropRef} className={`w-80 flex flex-col border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${isSidebarOver ? 'bg-primary/5 border-primary shadow-primary/20 scale-[1.01]' : 'bg-card'}`}>
          <div className="p-4 border-b bg-muted/40 flex justify-between items-center backdrop-blur-sm">
            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Aguardando Mesa
            </h3>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{unassignedFamilies.length} Famílias</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {unassignedFamilies.map(primary => (
              <div key={primary.id} className="flex flex-col gap-1.5 p-3 rounded-xl border bg-muted/10 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/30 rounded-l-xl"></div>
                {!primary.tableId && <GuestItem guest={primary} />}
                {primary.family?.guests?.filter((g: any) => !g.isPrimary && !g.tableId).map((dep: any) => (
                  <GuestItem key={dep.id} guest={dep} isDependent />
                ))}
              </div>
            ))}
            {unassignedFamilies.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60 space-y-3">
                <Sparkles className="w-10 h-10" />
                <p className="text-sm font-medium">Todos convidados alocados!</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 border rounded-xl relative overflow-hidden flex flex-col bg-background shadow-inner ring-1 ring-black/5 dark:ring-white/5">
          <div className="p-4 flex items-center justify-between z-20 bg-background/80 backdrop-blur-md border-b absolute top-0 left-0 right-0 shadow-sm">
            <h3 className="font-semibold text-lg drop-shadow-sm flex items-center gap-2">
              Salão Interativo
            </h3>
            <div className="space-x-3">
              <Dialog open={isVenueDialogOpen} onOpenChange={(open) => { setIsVenueDialogOpen(open); if(!open) setPlacementMode(null); }}>
                <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background h-8 px-3 shadow-sm border-dashed border-2 hover:border-primary/50 hover:bg-primary/5">
                  <Plus className="h-4 w-4 mr-1" /> Local
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Elemento do Salão</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome do Elemento</Label>
                      <Input placeholder="Ex: Pista Principal" value={newVenueName} onChange={e => setNewVenueName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <select value={newVenueType} onChange={e => setNewVenueType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                        <option value="DANCE_FLOOR">Pista de Dança</option>
                        <option value="BAR">Bar</option>
                        <option value="STAGE">Palco</option>
                        <option value="BUFFET">Buffet</option>
                        <option value="EXIT">Saída</option>
                        <option value="RESTROOM">Banheiro</option>
                        <option value="DECORATION">Decoração</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ícone</Label>
                      <select value={newVenueIcon} onChange={e => setNewVenueIcon(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                        <option value="">(Padrão do Tipo)</option>
                        <option value="Star">⭐ Estrela</option>
                        <option value="Heart">❤️ Coração</option>
                        <option value="Wine">🍷 Taça de Vinho</option>
                        <option value="Camera">📷 Câmera</option>
                        <option value="Gift">🎁 Presente</option>
                        <option value="Users">👥 Pessoas</option>
                        <option value="Bath">🚻 Banheiro</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor Personalizada (HEX)</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="color" className="w-12 h-10 p-1" value={newVenueColor || "#94a3b8"} onChange={e => setNewVenueColor(e.target.value)} />
                        <Input placeholder="Deixe vazio para padrão" value={newVenueColor} onChange={e => setNewVenueColor(e.target.value)} className="flex-1" />
                        <Button variant="outline" size="icon" onClick={() => setNewVenueColor("")} title="Restaurar Padrão"><RotateCcw className="w-4 h-4 text-muted-foreground" /></Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleCreateVenueSubmit}>Avançar para Posicionamento</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={() => placementMode === 'TABLE' ? setPlacementMode(null) : handleCreateTable()} variant={placementMode === 'TABLE' ? "destructive" : "default"} className={`shadow-md transition-colors ${placementMode === 'TABLE' ? 'animate-pulse' : 'bg-foreground hover:bg-foreground/90 text-background'}`}>
                {placementMode === 'TABLE' ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />} 
                {placementMode === 'TABLE' ? "Cancelar Posicionamento" : "Nova Mesa"}
              </Button>
            </div>
          </div>
          
          {placementMode && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium shadow-xl shadow-primary/20 animate-bounce">
                Clique no mapa para posicionar {placementMode === 'TABLE' ? 'a mesa' : 'o local'}
              </div>
            </div>
          )}
          
          <div className={`flex-1 w-full h-full pt-16 bg-muted/10 ${placementMode ? 'cursor-crosshair [&_.react-flow__pane]:cursor-crosshair' : ''}`}>
            <ReactFlow 
              onInit={setRfInstance}
              nodes={nodes} 
              onNodesChange={onNodesChange}
              onPaneClick={handlePaneClick}
              nodeTypes={nodeTypes}
              snapToGrid={true}
              snapGrid={[20, 20]}
              fitView
              minZoom={0.2}
              maxZoom={2}
            >
              <Background gap={20} color="#000" variant={BackgroundVariant.Dots} className="opacity-20" />
              <Controls className="bg-background border shadow-md rounded-lg overflow-hidden m-4" showInteractive={false} />
            </ReactFlow>
          </div>
        </div>

        <div 
          className={`shrink-0 transition-all duration-500 ease-in-out overflow-hidden flex flex-col ${
            isAIChatOpen ? "w-[380px] lg:w-[400px] opacity-100 ml-4" : "w-0 opacity-0 ml-0"
          }`}
        >
          <div className="w-[380px] lg:w-[400px] h-full flex flex-col border rounded-xl bg-card overflow-hidden shadow-xl ring-1 ring-primary/20">
            <div className="p-4 border-b bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg mr-3 shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-md text-foreground leading-none mb-1">IA Concierge</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Gemini 3.6 Flash</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAIChatOpen(false)} className="text-muted-foreground hover:bg-black/5 hover:text-foreground h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-gradient-to-b from-background to-muted/20">
              <div className="flex justify-start">
                <div className="bg-muted/80 p-3.5 rounded-2xl rounded-tl-sm text-sm shadow-sm border border-border/50 max-w-[90%] space-y-2">
                  <p>Olá! Aqui é o seu <strong>IA Concierge</strong>. ✨</p>
                  <p>Como estamos na seção de Mesas, estou pronto para te ajudar a organizar o salão! Posso distribuir seus convidados para você ou fazer alocações matemáticas inteligentes baseadas em grupos familiares.</p>
                </div>
              </div>
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[92%] p-3.5 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm' : 'bg-card border border-border/50 rounded-tl-sm'}`}>{m.content}</div>
                </div>
              ))}
              {loadingAI && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-muted/50 p-3.5 rounded-2xl rounded-tl-sm text-sm text-muted-foreground flex items-center gap-3 border border-border/50">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span>Analisando salão...</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-2xl rounded-tl-sm text-sm flex flex-col gap-2 border border-destructive/20">
                  <p className="font-semibold flex items-center gap-2"><X className="w-4 h-4" /> Erro de Conexão com IA</p>
                  <p className="break-words opacity-90">{error}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-3 border-t bg-card flex gap-2 items-end shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
              <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) } }}
                placeholder="Ex: Mova a família do noivo para a mesa 3..." 
                className="flex-1 bg-muted/50 min-h-[44px] max-h-[200px] rounded-xl border-0 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-y transition-colors hover:bg-muted/70" 
                disabled={loadingAI} 
                rows={1}
              />
              <Button type="submit" size="icon" disabled={loadingAI || !input} className="shrink-0 h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-sm"><Send className="w-5 h-5 ml-0.5" /></Button>
            </form>
          </div>
        </div>
        
        {/* Floating Action Button */}
        <Button
          onClick={() => setIsAIChatOpen(true)}
          className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 transition-all duration-500 z-50 p-0 ${
            isAIChatOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100 hover:scale-110"
          }`}
        >
          <Sparkles className="w-6 h-6" />
        </Button>
        <DragOverlay>
          {activeId && activeData?.type === "GUEST" && (
            <GuestItem guest={activeData.guest} isDependent={activeData.isDependent} isOverlay />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

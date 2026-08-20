import { getCurrentUser } from "@/lib/session"
import { getPlannerEvents } from "@/app/actions/events"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CalendarView, CalendarEventItem } from "@/components/calendar/calendar-view"
import { getContrastColor } from "@/lib/utils"

export default async function PlannerCalendarPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "PLANNER") redirect("/login")

  const rawEvents = await getPlannerEvents()
  
  // Buscar os casamentos deste planner para o Select do modal
  const memberships = await prisma.weddingMember.findMany({
    where: { userId: user.id, role: "PLANNER" },
    include: { wedding: { select: { id: true, partner1Name: true, partner2Name: true, date: true, primaryColor: true } } }
  })
  const weddings = memberships.map(m => m.wedding)

  const weddingEvents: CalendarEventItem[] = weddings.filter(w => w.date).map(w => ({
    id: `wedding-${w.id}`,
    title: `Casamento: ${w.partner1Name} & ${w.partner2Name}`,
    start: w.date!.toISOString().split("T")[0],
    backgroundColor: w.primaryColor || undefined,
    borderColor: w.primaryColor || undefined,
    textColor: w.primaryColor ? getContrastColor(w.primaryColor) : undefined,
    className: !w.primaryColor ? "main-wedding-default" : undefined,
    extendedProps: {
      type: "MAIN_WEDDING",
      weddingId: w.id,
      weddingName: `${w.partner1Name} & ${w.partner2Name}`,
      eventGuestsCount: 0,
      eventGuestIds: []
    }
  }))

  const subEvents: CalendarEventItem[] = rawEvents.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime ? `${e.date.toISOString().split("T")[0]}T${e.startTime}:00` : e.date.toISOString().split("T")[0],
    end: e.endTime ? `${e.date.toISOString().split("T")[0]}T${e.endTime}:00` : undefined,
    backgroundColor: e.wedding.primaryColor || undefined,
    borderColor: e.wedding.primaryColor || undefined,
    textColor: e.wedding.primaryColor ? getContrastColor(e.wedding.primaryColor) : undefined,
    className: !e.wedding.primaryColor ? "main-wedding-default" : undefined,
    extendedProps: {
      description: e.description,
      location: e.location,
      type: e.type,
      weddingId: e.weddingId,
      weddingName: `${e.wedding.partner1Name} & ${e.wedding.partner2Name}`,
      eventGuestsCount: e._count.eventGuests,
      eventGuestIds: [] // Planner na visão global não carrega convidados a princípio, teria que entrar no evento. 
      // Opcional: buscar convidados sob demanda ou não permitir gerenciar convidados pela visão global se não tiver os convidados do casamento carregados.
    }
  }))

  const allEvents = [...weddingEvents, ...subEvents]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendário da Agência</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visão unificada de todos os eventos, reuniões e provas de todos os seus casamentos.
          </p>
        </div>
      </div>

      <CalendarView 
        events={allEvents}
        weddings={weddings}
      />
    </div>
  )
}

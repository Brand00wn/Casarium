import { getCurrentUser } from "@/lib/session"
import { getAllAdminEvents } from "@/app/actions/events"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CalendarView, CalendarEventItem } from "@/components/calendar/calendar-view"
import { getContrastColor } from "@/lib/utils"

export default async function AdminCalendarPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") redirect("/login")

  const rawEvents = await getAllAdminEvents()
  
  const weddings = await prisma.wedding.findMany({
    select: { 
      id: true, 
      partner1Name: true, 
      partner2Name: true, 
      date: true, 
      primaryColor: true,
      ceremonyLocation: true,
      receptionDate: true,
      receptionLocation: true,
      hasReception: true,
      isSameLocation: true,
      members: {
        where: { role: "PLANNER" },
        select: { user: { select: { name: true } } }
      },
      _count: {
        select: { guests: true }
      }
    }
  })

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
      plannerName: w.members?.[0]?.user?.name || undefined,
      eventGuestsCount: w._count.guests,
      eventGuestIds: [],
      ceremonyTime: w.date ? w.date.toISOString().split("T")[1]?.substring(0, 5) : undefined,
      ceremonyLocation: w.ceremonyLocation || undefined,
      hasReception: w.hasReception,
      isSameLocation: w.isSameLocation,
      receptionTime: w.receptionDate ? w.receptionDate.toISOString().split("T")[1]?.substring(0, 5) : undefined,
      receptionLocation: w.receptionLocation || undefined
    }
  }))

  const subEvents: CalendarEventItem[] = rawEvents.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime ? `${e.date.toISOString().split("T")[0]}T${e.startTime}:00` : e.date.toISOString().split("T")[0],
    end: e.endTime ? `${e.date.toISOString().split("T")[0]}T${e.endTime}:00` : undefined,
    backgroundColor: undefined,
    borderColor: undefined,
    className: "sub-event-default",
    extendedProps: {
      description: e.description,
      location: e.location,
      type: e.type,
      weddingId: e.weddingId,
      weddingName: `${e.wedding.partner1Name} & ${e.wedding.partner2Name}`,
      plannerName: (e.wedding as any).members?.[0]?.user?.name || undefined,
      eventGuestsCount: e._count.eventGuests,
      eventGuestIds: []
    }
  }))

  const allEvents = [...weddingEvents, ...subEvents]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendário Global (Admin)</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visão de leitura de todos os eventos da plataforma.
          </p>
        </div>
      </div>

      <CalendarView 
        events={allEvents}
        readOnly={true}
      />
    </div>
  )
}

import { getCurrentUser } from "@/lib/session"
import { getWeddingEvents } from "@/app/actions/events"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CalendarView, CalendarEventItem } from "@/components/calendar/calendar-view"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { EVENT_TYPE_LABELS } from "@/components/calendar/event-dialog"
import { getContrastColor } from "@/lib/utils"

export default async function CronogramaPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingId },
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
      _count: { select: { guests: true } }
    }
  })

  if (!wedding) redirect(`/${weddingId}/dashboard`)

  const rawEvents = await getWeddingEvents(wedding.id)
  const guests = await prisma.guest.findMany({
    where: { weddingId: wedding.id },
    select: { id: true, name: true, email: true, familyId: true },
    orderBy: { name: "asc" }
  })

  const weddingEvent: CalendarEventItem[] = wedding.date ? [{
    id: `wedding-${wedding.id}`,
    title: `O Grande Dia!`,
    start: wedding.date.toISOString().split("T")[0],
    backgroundColor: wedding.primaryColor || undefined,
    borderColor: wedding.primaryColor || undefined,
    textColor: wedding.primaryColor ? getContrastColor(wedding.primaryColor) : undefined,
    className: !wedding.primaryColor ? "main-wedding-default" : undefined,
    extendedProps: {
      type: "MAIN_WEDDING",
      weddingId: wedding.id,
      eventGuestsCount: wedding._count.guests,
      eventGuestIds: guests.map(g => g.id),
      ceremonyTime: wedding.date ? wedding.date.toISOString().split("T")[1]?.substring(0, 5) : undefined,
      ceremonyLocation: wedding.ceremonyLocation || undefined,
      hasReception: wedding.hasReception,
      isSameLocation: wedding.isSameLocation,
      receptionTime: wedding.receptionDate ? wedding.receptionDate.toISOString().split("T")[1]?.substring(0, 5) : undefined,
      receptionLocation: wedding.receptionLocation || undefined
    }
  }] : []

  const subEvents: CalendarEventItem[] = rawEvents.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime ? `${e.date.toISOString().split("T")[0]}T${e.startTime}:00` : e.date.toISOString().split("T")[0],
    end: e.endTime ? `${e.date.toISOString().split("T")[0]}T${e.endTime}:00` : undefined,
    backgroundColor: undefined,
    borderColor: undefined,
    className: "main-wedding-default", // Eventos do casamento usam a cor primária por padrão no cronograma do casal
    extendedProps: {
      description: e.description,
      location: e.location,
      type: e.type,
      weddingId: e.weddingId,
      eventGuestsCount: e.eventGuests.length,
      eventGuestIds: e.eventGuests.map(eg => eg.guestId)
    }
  }))

  const allEvents = [...weddingEvent, ...subEvents]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cronograma e Eventos</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Organize chás, ensaios, provas de roupa e reuniões do seu casamento.
          </p>
        </div>
        
        {/* Usamos onClick simulado aqui no server component? Não, o botão dentro do CalendarView já faz o "Novo" se quisermos, 
            ou podemos deixar sem botão aqui e o usuário clica no calendário. Para o botão aqui funcionar, 
            teríamos que extrair o state. Mas o FullCalendar cuida bem do DateClick. 
            Vamos deixar o usuário clicar no calendário para adicionar. */}
      </div>

      <CalendarView 
        events={allEvents}
        fixedWeddingId={wedding.id}
        weddingGuests={guests}
      />
    </div>
  )
}

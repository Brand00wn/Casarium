"use client"

import { useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import ptBrLocale from "@fullcalendar/core/locales/pt-br"

import { EventDialog, EventFormData } from "./event-dialog"
import { EventGuestsManager } from "./event-guests-manager"
import { EventType } from "@prisma/client"
import { Heart, Calendar as CalendarIcon, Smartphone, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button"

export type CalendarEventItem = {
  id: string
  title: string
  start: string // ISO Date or Date object
  end?: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  className?: string
  extendedProps: {
    description?: string | null
    location?: string | null
    type: EventType | "MAIN_WEDDING"
    weddingId: string
    weddingName?: string
    plannerName?: string
    eventGuestsCount: number
    eventGuestIds: string[]
    ceremonyTime?: string
    ceremonyLocation?: string
    hasReception?: boolean
    isSameLocation?: boolean
    receptionTime?: string
    receptionLocation?: string
  }
}

type WeddingOption = {
  id: string
  partner1Name: string
  partner2Name: string
}

type GuestOption = {
  id: string
  name: string
  email: string | null
  familyId: string | null
}

interface CalendarViewProps {
  events: CalendarEventItem[]
  weddings?: WeddingOption[] // Apenas na visão global (Planner/Admin)
  fixedWeddingId?: string // Apenas na visão específica do Casal
  weddingGuests?: GuestOption[] // Lista de convidados para vincular ao evento (apenas no escopo de 1 casamento)
  readOnly?: boolean
}

export function CalendarView({ events, weddings, fixedWeddingId, weddingGuests, readOnly }: CalendarViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [guestsManagerOpen, setGuestsManagerOpen] = useState(false)
  const [selectedEventData, setSelectedEventData] = useState<Partial<EventFormData>>({})
  const [activeEventIdForGuests, setActiveEventIdForGuests] = useState<string | null>(null)
  const [syncModalOpen, setSyncModalOpen] = useState(false)

  const handleDateClick = (arg: { dateStr: string }) => {
    if (readOnly) return
    setSelectedEventData({
      date: arg.dateStr,
      weddingId: fixedWeddingId || ""
    })
    setDialogOpen(true)
  }

  const handleEventClick = (arg: { event: any }) => {
    const e = arg.event

    setSelectedEventData({
      id: e.id,
      title: e.title,
      description: e.extendedProps.description || "",
      date: e.startStr.split("T")[0],
      startTime: e.startStr.split("T")[1]?.substring(0, 5) || "",
      endTime: e.endStr ? e.endStr.split("T")[1]?.substring(0, 5) : "",
      location: e.extendedProps.location || "",
      type: e.extendedProps.type,
      weddingId: e.extendedProps.weddingId,
      weddingName: e.extendedProps.weddingName,
      plannerName: e.extendedProps.plannerName,
      eventGuestsCount: e.extendedProps.eventGuestsCount,
      ceremonyTime: e.extendedProps.ceremonyTime,
      ceremonyLocation: e.extendedProps.ceremonyLocation,
      hasReception: e.extendedProps.hasReception,
      isSameLocation: e.extendedProps.isSameLocation,
      receptionTime: e.extendedProps.receptionTime,
      receptionLocation: e.extendedProps.receptionLocation
    })
    setDialogOpen(true)
  }

  const openGuestsManager = (eventId: string) => {
    setActiveEventIdForGuests(eventId)
    setDialogOpen(false) // Fecha o dialog do evento
    setGuestsManagerOpen(true) // Abre o do convidados
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex-1 overflow-hidden [&_.fc]:h-full [&_.fc-theme-standard_.fc-scrollgrid]:border-border [&_.fc-theme-standard_td]:border-border [&_.fc-theme-standard_th]:border-border">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locales={[ptBrLocale]}
          locale="pt-br"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          displayEventEnd={true}
          customButtons={{
            syncCalendar: {
              text: 'Sincronizar Agenda',
              click: function() {
                setSyncModalOpen(true)
              }
            }
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: `${fixedWeddingId ? 'syncCalendar ' : ''}dayGridMonth,timeGridWeek,timeGridDay`
          }}
          buttonText={{
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia"
          }}
          eventContent={(arg) => {
            const isMain = arg.event.extendedProps.type === "MAIN_WEDDING"
            
            const plannerInfo = arg.event.extendedProps.plannerName ? ` | Cerimonial: ${arg.event.extendedProps.plannerName}` : ''
            const tooltipText = `${arg.timeText ? arg.timeText + ' - ' : ''}${arg.event.extendedProps.weddingName ? '[' + arg.event.extendedProps.weddingName + plannerInfo + '] ' : ''}${arg.event.title}`

            if (isMain) {
              return (
                <div title={tooltipText} className="flex items-center gap-1.5 px-1.5 py-1 w-full overflow-hidden whitespace-nowrap rounded-sm shadow-sm relative group cursor-pointer">
                  <div className="absolute inset-0 bg-black/5 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Heart className="h-3.5 w-3.5 fill-current shrink-0 animate-pulse text-red-500 drop-shadow-sm" />
                  <span className="font-bold text-[11px] uppercase tracking-wider drop-shadow-sm truncate">{arg.event.title}</span>
                </div>
              )
            }

            return (
              <div title={tooltipText} className="px-1.5 py-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium border-l-2 border-white/20 cursor-pointer">
                {arg.event.extendedProps.weddingName ? (
                  <span className="opacity-90 font-bold mr-1">[{arg.event.extendedProps.weddingName}]</span>
                ) : null}
                <span className="opacity-95">{arg.timeText} {arg.event.title}</span>
              </div>
            )
          }}
          dayMaxEvents={true}
          editable={!readOnly}
          selectable={!readOnly}
        />
      </div>

      <EventDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedEventData}
        weddings={weddings}
        fixedWeddingId={fixedWeddingId}
        readOnly={readOnly}
        onManageGuests={!readOnly ? openGuestsManager : undefined}
      />

      {activeEventIdForGuests && (
        <EventGuestsManager 
          open={guestsManagerOpen}
          onOpenChange={setGuestsManagerOpen}
          eventId={activeEventIdForGuests}
          weddingId={fixedWeddingId || ""}
          weddingGuests={weddingGuests || []}
          initialSelectedGuestIds={events.find(e => e.id === activeEventIdForGuests)?.extendedProps.eventGuestIds || []}
        />
      )}

      {/* MODAL DE SINCRONIZAÇÃO */}
      <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sincronizar Calendário</DialogTitle>
            <DialogDescription>
              Adicione a programação do casamento à sua agenda pessoal. Atualizações na plataforma refletirão automaticamente no seu celular.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <a 
              href={`webcal://${typeof window !== 'undefined' ? window.location.host : ''}/api/calendar/${fixedWeddingId}`}
              className={buttonVariants({ variant: "outline", className: "justify-start gap-3 h-auto py-3" })}
            >
              <Smartphone className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="text-left flex flex-col">
                <span className="font-semibold text-foreground">Apple Calendar (iOS / Mac)</span>
                <span className="text-xs text-muted-foreground font-normal">Assinar no iPhone, iPad ou Mac</span>
              </div>
            </a>

            <a 
              href={`https://calendar.google.com/calendar/render?cid=webcal://${typeof window !== 'undefined' ? window.location.host : ''}/api/calendar/${fixedWeddingId}`}
              target="_blank" 
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", className: "justify-start gap-3 h-auto py-3" })}
            >
              <CalendarIcon className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="text-left flex flex-col">
                <span className="font-semibold text-foreground">Google Agenda</span>
                <span className="text-xs text-muted-foreground font-normal">Assinar no Google Calendar</span>
              </div>
            </a>

            <a 
              href={`/api/calendar/${fixedWeddingId}`} 
              download
              className={buttonVariants({ variant: "outline", className: "justify-start gap-3 h-auto py-3" })}
            >
              <Download className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="text-left flex flex-col">
                <span className="font-semibold text-foreground">Baixar Arquivo (.ics)</span>
                <span className="text-xs text-muted-foreground font-normal">Para Outlook ou importação manual</span>
              </div>
            </a>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Estilos customizados para o FullCalendar se adaptar ao Tailwind/Shadcn */}
      <style dangerouslySetInnerHTML={{__html: `
        .fc-button-primary {
          background-color: var(--primary) !important;
          border-color: var(--primary) !important;
        }
        .fc-button-primary:not(:disabled):active, .fc-button-primary:not(:disabled).fc-button-active {
          background-color: color-mix(in oklab, var(--primary) 80%, black) !important;
          border-color: color-mix(in oklab, var(--primary) 80%, black) !important;
        }
        .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
        }
        .fc-col-header-cell-cushion {
          text-transform: capitalize;
          padding: 8px !important;
        }
        /* Eventos Customizados */
        .fc-event {
          border: none !important;
          border-radius: 4px !important;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          z-index: 5 !important;
        }
        .fc-event.main-wedding-default {
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
        }
        .fc-event.sub-event-default {
          background-color: var(--muted-foreground) !important;
          color: var(--background) !important;
        }
        .fc-event-main {
          padding: 0 !important;
        }
      `}} />
    </div>
  )
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import ical from "ical-generator"
import { EVENT_TYPE_LABELS } from "@/components/calendar/event-dialog"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ weddingId: string }> }
) {
  try {
    const { weddingId } = await params
    
    // Buscar casamento por ID ou Slug
    const wedding = await prisma.wedding.findFirst({
      where: {
        OR: [
          { id: weddingId },
          { slug: weddingId }
        ]
      },
      include: {
        events: true
      }
    })

    if (!wedding) {
      return new NextResponse("Casamento não encontrado", { status: 404 })
    }

    const calendar = ical({
      name: `Casamento de ${wedding.partner1Name} e ${wedding.partner2Name}`,
      description: `Agenda oficial do casamento de ${wedding.partner1Name} e ${wedding.partner2Name}. Gerado por ConciWedding.`,
      timezone: 'America/Sao_Paulo', // Defaulting to BRT for now
    })

    // Adiciona o Grande Dia
    if (wedding.date) {
      calendar.createEvent({
        start: wedding.date,
        allDay: true, // Casamento principal colocamos como dia inteiro ou pegamos o horário se houver
        summary: `O Grande Dia: ${wedding.partner1Name} & ${wedding.partner2Name}`,
        description: `O dia tão esperado!\nCerimônia: ${wedding.ceremonyLocation || 'A definir'}\nRecepção: ${wedding.receptionLocation || 'A definir'}`,
        location: wedding.ceremonyLocation || undefined,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/site/${wedding.slug}`,
      })
    }

    // Adiciona os sub-eventos
    for (const event of wedding.events) {
      // O banco salva a data base e o startTime/endTime em strings HH:mm separadas
      let startDate = event.date
      let endDate = event.date
      let allDay = true

      if (event.startTime) {
        allDay = false
        const [hours, minutes] = event.startTime.split(':').map(Number)
        startDate = new Date(event.date)
        startDate.setHours(hours, minutes, 0, 0)

        if (event.endTime) {
          const [endHours, endMinutes] = event.endTime.split(':').map(Number)
          endDate = new Date(event.date)
          endDate.setHours(endHours, endMinutes, 0, 0)
          
          // Se endTime for menor que startTime, assumimos que passa para o dia seguinte
          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1)
          }
        } else {
          // Se não tem endTime, por padrão colocamos 1 hora de duração
          endDate = new Date(startDate)
          endDate.setHours(endDate.getHours() + 1)
        }
      }

      calendar.createEvent({
        start: startDate,
        end: !allDay ? endDate : undefined,
        allDay: allDay,
        summary: event.title || EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] || "Evento do Casamento",
        description: event.description || "",
        location: event.location || undefined,
      })
    }

    return new NextResponse(calendar.toString(), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="casamento-${wedding.slug}.ics"`,
      },
    })
  } catch (error) {
    console.error("Erro ao gerar iCal:", error)
    return new NextResponse("Erro ao gerar calendário", { status: 500 })
  }
}

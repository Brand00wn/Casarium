"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Heart } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface CountdownHeroProps {
  wedding: {
    partner1Name: string;
    partner2Name: string;
    date: Date;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  }
}

export function CountdownHero({ wedding }: CountdownHeroProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const targetDate = new Date(wedding.date).getTime()

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference > 0) {
        setIsPast(false)
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        })
      } else {
        setIsPast(true)
        const pastDiff = Math.abs(difference)
        setTimeLeft({
          days: Math.floor(pastDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((pastDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((pastDiff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((pastDiff % (1000 * 60)) / 1000)
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [wedding.date])

  const primaryColor = wedding.primaryColor || "var(--primary)"
  
  return (
    <Card className="overflow-hidden border-none text-white shadow-md relative" style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a1a1a)` }}>
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Heart className="w-64 h-64" />
      </div>
      <CardContent className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight">
            {wedding.partner1Name} & {wedding.partner2Name}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-white/80">
            <Calendar className="w-5 h-5" />
            <span className="text-lg capitalize">{format(new Date(wedding.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-2">
          <span className="text-sm font-medium text-white/80 uppercase tracking-widest">
            {isPast ? "Casados há" : "Faltam"}
          </span>
          <div className="flex gap-4 text-center">
            {[
              { label: "Dias", value: timeLeft.days },
              { label: "Horas", value: timeLeft.hours },
              { label: "Minutos", value: timeLeft.minutes },
              { label: "Segundos", value: timeLeft.seconds }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[80px]">
                <span className="text-3xl font-bold font-mono">{String(item.value).padStart(2, '0')}</span>
                <span className="text-xs uppercase tracking-wider text-white/70 mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

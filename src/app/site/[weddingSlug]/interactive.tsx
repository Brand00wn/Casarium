"use client"

import { useEffect, useState } from "react"
import { differenceInSeconds } from "date-fns"
import { postMessage } from "@/app/actions/rsvp"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heart } from "lucide-react"

export function Countdown({ weddingDate }: { weddingDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    const targetDate = new Date(weddingDate)

    const tick = () => {
      const diff = differenceInSeconds(targetDate, new Date())
      if (diff <= 0) {
        setIsLive(false)
        return
      }
      setTimeLeft({
        days: Math.floor(diff / (3600 * 24)),
        hours: Math.floor((diff % (3600 * 24)) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [weddingDate])

  if (!isLive) {
    return <p className="font-display text-3xl italic text-primary mt-4">Este dia já chegou — celebremos juntos!</p>
  }

  const units = [
    { label: "Dias", value: timeLeft.days },
    { label: "Horas", value: timeLeft.hours },
    { label: "Minutos", value: timeLeft.minutes },
    { label: "Segundos", value: timeLeft.seconds },
  ]

  return (
    <div className="flex justify-center gap-3 md:gap-6 mt-8">
      {units.map((item) => (
        <div key={item.label} className="flex flex-col items-center min-w-[72px] md:min-w-[104px]">
          <div className="w-full rounded-2xl border border-border/70 bg-background py-4 md:py-6 text-3xl md:text-5xl font-display font-semibold text-foreground tabular-nums shadow-sm">
            {item.value.toString().padStart(2, "0")}
          </div>
          <span className="text-[11px] md:text-xs mt-2 text-muted-foreground uppercase tracking-[0.2em]">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export function Mural({ slug, initialMessages, guestName }: { slug: string, initialMessages: any[], guestName: string }) {
  const [messages, setMessages] = useState(initialMessages)
  const [name, setName] = useState(guestName)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !content.trim()) return

    setSubmitting(true)
    try {
      await postMessage(slug, name, content)
      setMessages([{ authorName: name, content, createdAt: new Date() }, ...messages])
      setContent("")
    } catch (error) {
      console.error(error)
      alert("Erro ao enviar mensagem.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handlePostMessage} className="rounded-2xl border border-border/70 bg-background p-6 space-y-4 shadow-sm">
        <Input
          placeholder="Seu nome"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-12 bg-muted/40"
          required
        />
        <Textarea
          placeholder="Deixe uma mensagem aos noivos..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="bg-muted/40 min-h-[100px]"
          required
        />
        <Button type="submit" disabled={submitting} className="w-full h-12 rounded-full text-sm font-semibold uppercase tracking-[0.12em]">
          {submitting ? "Enviando..." : "Deixar recado"}
        </Button>
      </form>

      <div className="space-y-4">
        {messages.map((msg, i) => (
          <figure key={i} className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
            <blockquote className="font-display text-xl italic leading-relaxed text-foreground/90">
              “{msg.content}”
            </blockquote>
            <figcaption className="mt-3 flex items-center justify-end gap-1.5 text-sm font-medium text-primary">
              <Heart className="w-3.5 h-3.5 fill-current" /> {msg.authorName}
            </figcaption>
          </figure>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground font-light">Seja a primeira pessoa a deixar um recado!</p>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { differenceInSeconds } from "date-fns"
import { postMessage } from "@/app/actions/rsvp"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

export function SiteInteractive({ weddingDate, slug, initialMessages }: { weddingDate: string, slug: string, initialMessages: any[] }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [messages, setMessages] = useState(initialMessages)
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const targetDate = new Date(weddingDate)
    
    const interval = setInterval(() => {
      const now = new Date()
      const diff = differenceInSeconds(targetDate, now)
      
      if (diff <= 0) {
        clearInterval(interval)
        return
      }

      const days = Math.floor(diff / (3600 * 24))
      const hours = Math.floor((diff % (3600 * 24)) / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60

      setTimeLeft({ days, hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(interval)
  }, [weddingDate])

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !content.trim()) return

    setSubmitting(true)
    try {
      await postMessage(slug, name, content)
      setMessages([{ authorName: name, content, createdAt: new Date() }, ...messages])
      setName("")
      setContent("")
    } catch (error) {
      console.error(error)
      alert("Erro ao enviar mensagem.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex justify-center gap-4 md:gap-8 mb-12">
        {[
          { label: "Dias", value: timeLeft.days },
          { label: "Horas", value: timeLeft.hours },
          { label: "Minutos", value: timeLeft.minutes },
          { label: "Segundos", value: timeLeft.seconds }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-background/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-bold text-primary shadow-inner border border-white/30">
              {item.value.toString().padStart(2, '0')}
            </div>
            <span className="text-xs md:text-sm mt-2 text-foreground/80 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>

      <div id="mural" className="mt-32 max-w-2xl mx-auto text-left">
        <h2 className="text-3xl font-serif text-primary mb-8 text-center">Mural de Recados</h2>
        
        <Card className="bg-background/60 backdrop-blur-xl border-white/20 shadow-xl mb-12">
          <CardContent className="p-6">
            <form onSubmit={handlePostMessage} className="space-y-4">
              <div>
                <Input 
                  placeholder="Seu nome" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div>
                <Textarea 
                  placeholder="Deixe uma mensagem aos noivos..." 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  className="bg-background/50 border-white/10 min-h-[100px]"
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {submitting ? "Enviando..." : "Deixar Recado"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className="bg-white/40 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/30">
              <p className="text-foreground/90 text-lg italic mb-4">"{msg.content}"</p>
              <p className="text-right text-sm text-primary font-medium">— {msg.authorName}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground">Seja o primeiro a deixar um recado!</p>
          )}
        </div>
      </div>
    </>
  )
}

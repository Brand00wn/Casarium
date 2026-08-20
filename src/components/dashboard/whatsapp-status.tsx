"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Send, CheckCircle2, MessageSquare, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

interface WhatsappStatusProps {
  whatsapp: {
    unsent: number;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
  };
  totalGuests: number;
  weddingId: string;
}

export function WhatsappStatus({ whatsapp, totalGuests, weddingId }: WhatsappStatusProps) {
  const totalSent = whatsapp.sent + whatsapp.delivered + whatsapp.read + whatsapp.replied;
  const reachPercent = totalGuests > 0 ? Math.round(((whatsapp.read + whatsapp.replied) / totalSent) * 100) : 0;
  
  const statusItems = [
    { label: "Não Enviados", value: whatsapp.unsent, icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" },
    { label: "Enviados", value: whatsapp.sent, icon: Send, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Entregues", value: whatsapp.delivered, icon: CheckCircle2, color: "text-indigo-500", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
    { label: "Lidos", value: whatsapp.read, icon: MessageSquare, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
    { label: "Respondidos", value: whatsapp.replied, icon: MessageSquare, color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-200 dark:bg-emerald-900/50" },
  ]

  return (
    <Card className="border-muted/60 shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Status do WhatsApp</CardTitle>
            <CardDescription>Envio de convites e mensagens</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 flex-1 pt-2">
        <div className="grid grid-cols-5 gap-2">
          {statusItems.map((item, idx) => {
            const percent = totalGuests > 0 ? (item.value / totalGuests) * 100 : 0;
            return (
              <div key={idx} className="flex flex-col gap-2 group relative">
                <div className="h-12 flex flex-col justify-end bg-muted/20 rounded-md overflow-hidden">
                  <div 
                    className={`${item.bgColor} w-full transition-all duration-1000 ease-out rounded-sm`} 
                    style={{ height: `${Math.max(percent, 4)}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight">{item.label}</p>
                  <p className={`font-bold text-sm ${item.color}`}>{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Taxa de Leitura</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500/80">Mensagens lidas do total enviado</p>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{isNaN(reachPercent) ? 0 : reachPercent}%</div>
        </div>

        {whatsapp.unsent > 0 && (
          <Link href={`/${weddingId}/convidados`} className={buttonVariants({ variant: "outline", className: "w-full justify-between mt-auto" })}>
            <span>{whatsapp.unsent} convites pendentes de envio</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

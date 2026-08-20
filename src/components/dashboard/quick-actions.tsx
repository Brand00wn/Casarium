"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Send, Gift, GripHorizontal, Heart } from "lucide-react"
import Link from "next/link"

interface QuickActionsProps {
  weddingId: string;
}

export function QuickActions({ weddingId }: QuickActionsProps) {
  const actions = [
    {
      title: "Convidados",
      icon: Users,
      href: `/${weddingId}/convidados`,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/40"
    },
    {
      title: "Mapa de Mesas",
      icon: GripHorizontal,
      href: `/${weddingId}/mesas`,
      color: "text-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-900/20",
      hoverBg: "hover:bg-rose-100 dark:hover:bg-rose-900/40"
    },
    {
      title: "Gerir Presentes",
      icon: Gift,
      href: `/${weddingId}/presentes`,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/40"
    },
    {
      title: "O Grande Dia",
      icon: Heart,
      href: `/${weddingId}/o-grande-dia`,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
    }
  ]

  return (
    <Card className="border-muted/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, idx) => (
            <Link 
              key={idx} 
              href={action.href}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 group ${action.bgColor} ${action.hoverBg} hover:shadow-sm border-transparent hover:border-border`}
            >
              <action.icon className={`w-6 h-6 mb-2 ${action.color} transition-transform group-hover:scale-110`} />
              <span className="text-xs font-medium text-foreground/80">{action.title}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, CheckCircle, Clock, Gift, DollarSign, GripHorizontal } from "lucide-react"

interface StatsGridProps {
  guests: {
    total: number;
    confirmed: number;
    pending: number;
  };
  gifts: {
    totalGifts: number;
    totalRaised: number;
  };
  seating: {
    occupancyPercent: number;
  };
}

export function StatsGrid({ guests, gifts, seating }: StatsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const items = [
    {
      title: "Convidados",
      value: guests.total,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      description: "Cadastrados na lista"
    },
    {
      title: "Confirmados",
      value: guests.confirmed,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
      description: guests.total > 0 ? `${Math.round((guests.confirmed / guests.total) * 100)}% do total` : "0%"
    },
    {
      title: "Pendentes",
      value: guests.pending,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/20",
      description: "Aguardando resposta"
    },
    {
      title: "Presentes",
      value: gifts.totalGifts,
      icon: Gift,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      description: "Itens na lista"
    },
    {
      title: "Arrecadado",
      value: formatCurrency(gifts.totalRaised),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
      description: "Total recebido"
    },
    {
      title: "Ocupação (Mesas)",
      value: `${seating.occupancyPercent}%`,
      icon: GripHorizontal,
      color: "text-rose-600",
      bgColor: "bg-rose-100 dark:bg-rose-900/20",
      description: "Capacidade utilizada"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <Card key={index} className="border-muted/60 shadow-sm animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-4 rounded-xl ${item.bgColor}`}>
              <item.icon className={`w-8 h-8 ${item.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
              <h3 className="text-2xl font-bold tracking-tight">{item.value}</h3>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface RsvpChartProps {
  guests: {
    confirmed: number;
    pending: number;
    declined: number;
    waitlist: number;
  };
}

export function RsvpChart({ guests }: RsvpChartProps) {
  const data = [
    { name: "Confirmados", value: guests.confirmed, color: "#10b981" },
    { name: "Pendentes", value: guests.pending, color: "#f59e0b" },
    { name: "Recusados", value: guests.declined, color: "#ef4444" },
    { name: "Lista de Espera", value: guests.waitlist, color: "#3b82f6" },
  ].filter(item => item.value > 0)

  // Se não houver convidados, mostra um dado fantasma cinza
  if (data.length === 0) {
    data.push({ name: "Sem dados", value: 1, color: "#e5e7eb" })
  }

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-sm p-3">
          <p className="font-semibold text-sm">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">{payload[0].value} convidados</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="border-muted/60 shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Status de Confirmação (RSVP)</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

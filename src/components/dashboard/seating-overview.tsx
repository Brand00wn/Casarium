"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

interface SeatingOverviewProps {
  seating: {
    totalTables: number;
    totalCapacity: number;
    seatedGuests: number;
    unseatedGuests: number;
    occupancyPercent: number;
  };
  weddingId: string;
}

export function SeatingOverview({ seating, weddingId }: SeatingOverviewProps) {
  const data = [
    { name: "Ocupado", value: seating.seatedGuests, color: "#10b981" },
    { name: "Livre", value: Math.max(0, seating.totalCapacity - seating.seatedGuests), color: "#e5e7eb" },
  ]

  return (
    <Card className="border-muted/60 shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Ocupação das Mesas</CardTitle>
            <CardDescription>{seating.totalTables} mesas configuradas</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 pt-4">
        <div className="flex items-center justify-between">
          <div className="relative w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={seating.totalCapacity === 0 ? [{ name: "Vazio", value: 1, color: "#e5e7eb" }] : data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={55}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {(seating.totalCapacity === 0 ? [{ name: "Vazio", value: 1, color: "#e5e7eb" }] : data).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{seating.occupancyPercent}%</span>
            </div>
          </div>

          <div className="space-y-4 flex-1 pl-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Capacidade Total</p>
              <p className="text-xl font-semibold">{seating.totalCapacity} lugares</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Convidados Sentados</p>
              <p className="text-xl font-semibold">{seating.seatedGuests}</p>
            </div>
          </div>
        </div>

        {seating.unseatedGuests > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 mt-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">{seating.unseatedGuests} confirmados sem mesa</p>
              <p className="text-xs text-destructive/80 mt-1">É recomendado designar assentos para estes convidados.</p>
            </div>
          </div>
        )}

        <Link href={`/${weddingId}/mesas`} className={buttonVariants({ variant: "outline", className: "w-full justify-between mt-auto" })}>
          <span>Abrir Mapa de Mesas</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </CardContent>
    </Card>
  )
}

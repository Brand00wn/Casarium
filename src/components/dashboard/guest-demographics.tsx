"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Baby, Bus, Utensils } from "lucide-react"

interface GuestDemographicsProps {
  guests: {
    total: number;
    adults: number;
    children: number;
    needsTransport: number;
    dietaryRestrictions: { restriction: string; count: number }[];
  }
}

export function GuestDemographics({ guests }: GuestDemographicsProps) {
  const adultsPercent = guests.total > 0 ? Math.round((guests.adults / (guests.adults + guests.children)) * 100) : 0;
  const childrenPercent = guests.total > 0 ? 100 - adultsPercent : 0;

  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Demografia e Necessidades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Adultos vs Crianças */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-medium">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Adultos ({guests.adults})</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Crianças ({guests.children})</span>
              <Baby className="w-4 h-4 text-pink-500" />
            </div>
          </div>
          <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex gap-0.5">
            <div 
              className="h-full bg-blue-500 transition-all duration-500" 
              style={{ width: `${adultsPercent}%` }} 
              title={`${adultsPercent}% Adultos`}
            />
            {childrenPercent > 0 && (
              <div 
                className="h-full bg-pink-500 transition-all duration-500" 
                style={{ width: `${childrenPercent}%` }} 
                title={`${childrenPercent}% Crianças`}
              />
            )}
          </div>
        </div>

        {/* Transporte */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-md">
              <Bus className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Transporte / Van</p>
              <p className="text-xs text-muted-foreground">Convidados que precisam de transporte</p>
            </div>
          </div>
          <div className="text-lg font-bold">{guests.needsTransport}</div>
        </div>

        {/* Restrições Alimentares */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Utensils className="w-4 h-4 text-emerald-500" />
            <span>Restrições Alimentares</span>
          </div>
          {guests.dietaryRestrictions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhuma restrição registrada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {guests.dietaryRestrictions.map((item, idx) => (
                <Badge key={idx} variant="secondary" className="bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-50 hover:bg-emerald-200 border-none font-semibold px-2.5 py-1">
                  {item.restriction} <span className="ml-1.5 opacity-70 font-normal">({item.count})</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

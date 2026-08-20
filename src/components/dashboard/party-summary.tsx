"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Crown, Heart, Sparkles, User, UserPlus, Star, Flower2, Mic, Glasses, BookHeart, UserCircle2 } from "lucide-react"

interface PartySummaryProps {
  party: {
    totalMembers: number;
    byType: { type: string, count: number }[];
  }
}

const PARTY_ROLES_CONFIG: Record<string, { label: string, icon: any, color: string, bg: string }> = {
  FATHER: { label: "Pais", icon: Heart, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  MOTHER: { label: "Mães", icon: Heart, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
  GRANDFATHER: { label: "Avôs", icon: Glasses, color: "text-stone-500", bg: "bg-stone-50 dark:bg-stone-900/20" },
  GRANDMOTHER: { label: "Avós", icon: Glasses, color: "text-stone-500", bg: "bg-stone-50 dark:bg-stone-900/20" },
  BROTHER: { label: "Irmãos", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  SISTER: { label: "Irmãs", icon: Users, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/20" },
  SPONSOR: { label: "Testemunhas", icon: BookHeart, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  BRIDESMAID: { label: "Madrinhas", icon: Crown, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
  GROOMSMAN: { label: "Padrinhos", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  RING_BEARER: { label: "Pajens", icon: Star, color: "text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  PAGE_BOY: { label: "Pajens", icon: Star, color: "text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  FLOWER_GIRL: { label: "Daminhas", icon: Flower2, color: "text-fuchsia-500", bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20" },
  DEMOISELLE: { label: "Demoiselles", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  CELEBRANT: { label: "Celebrantes", icon: Mic, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  RELATIVE: { label: "Familiares", icon: UserPlus, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-900/20" },
  FRIEND: { label: "Amigos", icon: User, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-900/20" },
  OTHER: { label: "Outros", icon: UserCircle2, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/20" },
}

export function PartySummary({ party }: PartySummaryProps) {
  // Agrupar contagens pelo Label (para evitar caixas duplicadas se tiver Pajens de dois tipos no banco)
  const aggregated = new Map<string, { count: number, config: any }>();
  party.byType.forEach(item => {
    const config = PARTY_ROLES_CONFIG[item.type] || PARTY_ROLES_CONFIG.OTHER;
    if (!aggregated.has(config.label)) {
      aggregated.set(config.label, { count: 0, config });
    }
    aggregated.get(config.label)!.count += item.count;
  });
  
  const displayItems = Array.from(aggregated.values()).sort((a, b) => b.count - a.count);

  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Membros do Cortejo</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border mb-4">
          <span className="text-sm font-medium">Total no Cortejo</span>
          <span className="text-lg font-bold">{party.totalMembers}</span>
        </div>

        {displayItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg bg-muted/10">
            Não há ninguém no cortejo ainda
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayItems.map((item, idx) => {
              const { config, count } = item;
              const Icon = config.icon;
              return (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg}`}>
                  <div className={`p-1.5 rounded-md bg-background shadow-sm ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="font-semibold">{count}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

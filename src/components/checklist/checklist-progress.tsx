"use client"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CalendarClock, Link } from "lucide-react"

export function ChecklistProgress({ stats }: { stats: any }) {
  const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="bg-card rounded-xl border p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Progresso Geral</span>
            <span>{percentage}% ({stats.completed}/{stats.total})</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        
        <div className="flex gap-4 text-sm text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertCircle className={`w-4 h-4 ${stats.overdue > 0 ? 'text-destructive' : ''}`} />
            <span className={stats.overdue > 0 ? 'text-destructive font-medium' : ''}>
              {stats.overdue} atrasadas
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-amber-500" />
            <span>{stats.pending} pendentes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

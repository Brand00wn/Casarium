import { getPlannerDashboardStats } from "@/app/actions/planner-dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CalendarHeart, CheckCircle2, Clock, CalendarDays } from "lucide-react"
import Link from "next/link"
import { formatDistanceStrict, isToday, isTomorrow, format } from "date-fns"
import { ptBR } from "date-fns/locale"

function getRelativeDateText(dateStr: string | Date) {
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isToday(date)) return "É hoje!"
  if (isTomorrow(date)) return "Amanhã"

  const distance = formatDistanceStrict(date, today, { locale: ptBR }) 
  if (date < today) return `Há ${distance}`
  return `Faltam ${distance}`
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "URGENT": return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
    case "HIGH": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
    case "MEDIUM": return "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
    default: return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
  }
}

export default async function PlannerDashboardPage() {
  const stats = await getPlannerDashboardStats()

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Acompanhe todos os seus casamentos e pendências em um só lugar.</p>
        </div>

        {/* Top Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Casamentos Ativos</CardTitle>
              <CalendarHeart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActive}</div>
              <p className="text-xs text-muted-foreground mt-1">Eventos futuros em planejamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Tarefas de Atenção</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.urgentTasksCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Atrasadas ou marcadas como urgente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Casamentos Concluídos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompleted}</div>
              <p className="text-xs text-muted-foreground mt-1">Eventos já realizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: Upcoming Weddings and Urgent Tasks */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Upcoming Weddings */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle>Próximos Casamentos</CardTitle>
              </div>
              <CardDescription>Os eventos mais próximos que você está gerenciando.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {stats.upcomingWeddings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <CalendarHeart className="h-10 w-10 mb-2 opacity-20" />
                  <p>Nenhum casamento futuro encontrado.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {stats.upcomingWeddings.map(wedding => (
                    <Link key={wedding.id} href={`/${wedding.slug}/dashboard`} className="block group">
                      <div className="flex flex-col space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {wedding.partner1Name} & {wedding.partner2Name}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {format(new Date(wedding.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {getRelativeDateText(wedding.date)}
                          </Badge>
                        </div>
                        
                        <div className="pt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Checklist ({wedding.progress}%)</span>
                            <span className="text-muted-foreground">{wedding.confirmedGuests} convidados confirmados</span>
                          </div>
                          <Progress value={wedding.progress} className="h-2" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Urgent Tasks */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-destructive" />
                <CardTitle>Tarefas Pendentes de Atenção</CardTitle>
              </div>
              <CardDescription>Itens urgentes ou com prazo próximo em todos os eventos.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {stats.urgentPendingTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mb-2 opacity-20 text-green-500" />
                  <p>Tudo sob controle! Nenhuma tarefa urgente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.urgentPendingTasks.map(task => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
                    
                    return (
                      <Link key={task.id} href={`/${task.wedding.slug}/checklist`} className="block group">
                        <div className="flex items-start justify-between p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-normal uppercase">
                                {task.wedding.partner1Name} & {task.wedding.partner2Name}
                              </Badge>
                              <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                                {task.priority === "URGENT" ? "Urgente" : task.priority === "HIGH" ? "Alta" : "Média"}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{task.title}</h4>
                            
                            {task.dueDate && (
                              <p className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                <Clock className="h-3 w-3" />
                                {isOverdue ? "Atrasada: " : "Prazo: "}
                                {format(new Date(task.dueDate), "dd/MM/yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}

import { getAdminStats } from "@/app/actions/admin"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, HeartHandshake, Ticket } from "lucide-react"

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()

  const formatShortDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground/90">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg font-light">
          Visão geral do sistema ConciWedding.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Casamentos</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <HeartHandshake className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalWeddings}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cerimonialistas (Agências)</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPlanners}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casais Cadastrados</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCouples}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Convidados</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-full">
              <Ticket className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalGuests}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle>Casamentos Recentes</CardTitle>
            <CardDescription>Últimos casamentos adicionados ou com datas próximas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats.recentWeddings.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum casamento encontrado.</p>
              ) : (
                stats.recentWeddings.map((wedding) => (
                  <div key={wedding.id} className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium leading-none">
                        {wedding.partner1Name} & {wedding.partner2Name}
                      </p>
                      <p className="text-xs text-muted-foreground">/{wedding.slug}</p>
                    </div>
                    <div className="text-sm font-medium bg-secondary/50 px-3 py-1 rounded-full">
                      {formatShortDate(wedding.date)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle>Usuários Recentes</CardTitle>
            <CardDescription>Novas contas registradas na plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats.recentUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
              ) : (
                stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium leading-none">{user.name || "Sem Nome"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatShortDate(user.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { getCurrentUser } from "@/lib/session"
import { getPlannerWeddings } from "@/app/actions/weddings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, ExternalLink, Plus, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { CreateWeddingDialog } from "@/components/planner/create-wedding-dialog"
import { EditWeddingDialog } from "@/components/planner/edit-wedding-dialog"
import { DeleteWeddingDialog } from "@/components/planner/delete-wedding-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceStrict, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"

function getTimeRemainingText(dateStr: string | Date) {
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isToday(date)) return "É hoje!"

  const distance = formatDistanceStrict(date, today, { locale: ptBR }) 
  
  if (date < today) {
    return `Há ${distance}`
  }
  return `Faltam ${distance}`
}

// Helper function to render the wedding card
function renderWeddingCard(wedding: any) {
  const confirmedGuests = wedding.guests?.filter((g: any) => g.rsvpStatus === "CONFIRMED").length || 0;
  const totalGuests = wedding.guests?.length || 0;
  
  return (
    <Card key={wedding.id} className="relative overflow-hidden group flex flex-col border-border/40 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/60 to-primary/30" />
      
      <CardHeader className="pb-4 pt-6 flex-none">
        <div className="flex justify-between items-start mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-xl shrink-0">
            {wedding.partner1Name[0]}&{wedding.partner2Name[0]}
          </div>
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <EditWeddingDialog 
              wedding={wedding} 
              trigger={
                <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Pencil className="w-4 h-4" />
                </Button>
              }
            />
            <DeleteWeddingDialog 
              weddingId={wedding.id} 
              expectedText={`${wedding.partner1Name} e ${wedding.partner2Name}`} 
              trigger={
                <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              }
            />
          </div>
        </div>
        <CardTitle 
          className="text-xl font-semibold leading-tight truncate mt-2" 
          title={`${wedding.partner1Name} & ${wedding.partner2Name}`}
        >
          {wedding.partner1Name} <span className="font-normal text-muted-foreground">&</span> {wedding.partner2Name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-start">
        <div className="space-y-4">
          <div className="flex items-center text-sm text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
            <Calendar className="w-4 h-4 mr-2.5 text-primary/70 shrink-0" />
            <span className="truncate">{new Date(wedding.date).toLocaleDateString('pt-BR')}</span>
            <Badge variant="outline" className="ml-auto text-[11px] font-normal bg-background/50 text-muted-foreground border-border/60">
              {getTimeRemainingText(wedding.date)}
            </Badge>
          </div>
          
          <div className="px-1">
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <Users className="w-4 h-4 mr-2.5 text-primary/70 shrink-0" />
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="font-medium text-foreground truncate">{confirmedGuests} confirmados</span>
                <span className="text-xs shrink-0 ml-2">{totalGuests} conv.</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 ml-[26px] max-w-[calc(100%-26px)] overflow-hidden">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-1000" 
                style={{ width: totalGuests > 0 ? `${Math.min(100, Math.round((confirmedGuests / totalGuests) * 100))}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 pb-5 px-6 flex-none border-t border-border/30 bg-muted/10 mt-auto">
        <Link href={`/${wedding.slug}/dashboard`} className="w-full">
          <Button className="w-full shadow-sm gap-2" variant="default">
            Painel do Evento
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default async function PlannerWeddingsPage() {
  const user = await getCurrentUser()
  const weddings = await getPlannerWeddings(user!.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingWeddings = weddings.filter(w => new Date(w.date) >= today)
  const pastWeddings = weddings.filter(w => new Date(w.date) < today)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meus Casamentos</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            Gerencie os casamentos do seu portfólio.
            <Badge variant="secondary" className="font-normal">{weddings.length} {weddings.length === 1 ? 'evento' : 'eventos'}</Badge>
          </p>
        </div>
        
        {user?.role === "PLANNER" && (
          <CreateWeddingDialog />
        )}
      </div>

      {weddings.length === 0 ? (
        <Card className="border-dashed bg-transparent">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Nenhum casamento</h3>
            <p className="text-muted-foreground max-w-sm">
              Você ainda não foi associado a nenhum casamento.{user?.role === "PLANNER" && " Clique em \"Novo Casamento\" para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="upcoming" className="w-full mt-4">
          <TabsList className="mb-6 bg-muted/50">
            <TabsTrigger value="upcoming" className="gap-2">
              Próximos
              <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px] text-xs h-5">
                {upcomingWeddings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              Finalizados
              <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px] text-xs h-5">
                {pastWeddings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              Todos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="focus-visible:outline-none focus-visible:ring-0">
            {upcomingWeddings.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border rounded-xl border-dashed">
                Não há casamentos futuros cadastrados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingWeddings.map(renderWeddingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="focus-visible:outline-none focus-visible:ring-0">
            {pastWeddings.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border rounded-xl border-dashed">
                Não há casamentos finalizados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastWeddings.map(renderWeddingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weddings.map(renderWeddingCard)}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

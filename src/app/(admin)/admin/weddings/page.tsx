import { listAllWeddings } from "@/app/actions/admin"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EditWeddingDialog } from "@/components/planner/edit-wedding-dialog"
import { DeleteWeddingDialog } from "@/components/planner/delete-wedding-dialog"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"

export default async function AdminWeddingsPage() {
  const weddings = await listAllWeddings()

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date)
  }

  const getDaysUntil = (date: Date) => {
    const today = new Date()
    const timeDiff = date.getTime() - today.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
    return daysDiff
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground/90">Casamentos</h1>
        <p className="text-muted-foreground mt-2 text-lg font-light">
          Gerenciamento global de casamentos e eventos.
        </p>
      </div>

      <Card className="bg-card/40 backdrop-blur-md border-border/50">
        <CardHeader>
          <CardTitle>Todos os Casamentos</CardTitle>
          <CardDescription>Lista de eventos cadastrados na plataforma ({weddings.length}).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden bg-background/30">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Casal</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Membros</TableHead>
                  <TableHead className="text-right">Convidados</TableHead>
                  <TableHead className="text-right w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weddings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Nenhum casamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  weddings.map((wedding) => {
                    const daysUntil = getDaysUntil(wedding.date)
                    const isPast = daysUntil < 0
                    
                    return (
                      <TableRow key={wedding.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell className="font-medium">
                          {wedding.partner1Name} & {wedding.partner2Name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">/{wedding.slug}</TableCell>
                        <TableCell>{formatDate(wedding.date)}</TableCell>
                        <TableCell>
                          {isPast ? (
                            <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                              Realizado
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
                              Faltam {daysUntil} dias
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{wedding._count.members}</TableCell>
                        <TableCell className="text-right">{wedding._count.guests}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/${wedding.slug}/dashboard`} title="Acessar Dashboard" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground hover:text-primary">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
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
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

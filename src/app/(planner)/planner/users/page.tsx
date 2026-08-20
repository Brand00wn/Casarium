import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { getPlannerUsers } from "@/app/actions/planner-users"
import { getPlannerWeddings } from "@/app/actions/weddings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Mail, Clock } from "lucide-react"

import { CreateUserDialog } from "@/components/planner/create-user-dialog"
import { EditUserDialog } from "@/components/planner/edit-user-dialog"
import { ResetPasswordDialog } from "@/components/planner/reset-password-dialog"
import { LinkWeddingDialog } from "@/components/planner/link-wedding-dialog"
import { DeleteUserDialog } from "@/components/planner/delete-user-dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const roleMap: Record<string, string> = {
  OWNER: "Casal",
  PLANNER: "Equipe",
  VIEWER: "Visualizador",
  CONCIERGE: "Concierge"
}

export default async function PlannerUsersPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null
  if (currentUser.role !== "PLANNER") {
    redirect("/planner/weddings")
  }

  const users = await getPlannerUsers()
  const weddings = await getPlannerWeddings(currentUser.id)

  const mappedWeddings = weddings.map(w => ({
    id: w.id,
    name: `${w.partner1Name} & ${w.partner2Name}`
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meus Usuários</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            Gerencie os casais e usuários vinculados aos seus casamentos.
            <Badge variant="secondary" className="font-normal">{users.length} {users.length === 1 ? 'usuário' : 'usuários'}</Badge>
          </p>
        </div>
        
        <CreateUserDialog weddings={mappedWeddings} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b border-border/50 text-muted-foreground">
                  <tr>
                    <th className="font-medium p-4 whitespace-nowrap">Nome</th>
                    <th className="font-medium p-4 whitespace-nowrap">Contato</th>
                    <th className="font-medium p-4">Casamentos Vinculados</th>
                    <th className="font-medium p-4 whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-8 h-8 opacity-20" />
                          <p>Nenhum usuário encontrado em seus casamentos.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium">
                          <div className="flex items-center gap-2">
                            {user.name || <span className="text-muted-foreground italic">Sem nome</span>}
                            {user.systemRole === "PLANNER" ? (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Cerimonialista</Badge>
                            ) : user.systemRole === "CONCIERGE" ? (
                              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">Equipe</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">Casal</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" />
                            {user.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {user.weddings.map((w: any) => (
                              <Badge key={w.id} variant="secondary" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10">
                                {w.name} ({roleMap[w.role] || w.role})
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <LinkWeddingDialog user={user} weddings={mappedWeddings} />
                            <EditUserDialog user={user} />
                            <ResetPasswordDialog user={user} />
                            <DeleteUserDialog user={user} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

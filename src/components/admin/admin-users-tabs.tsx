"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Heart, Shield, LayoutDashboard, ChevronDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EditGlobalUserDialog } from "@/components/admin/edit-global-user-dialog"
import { DeleteGlobalUserDialog } from "@/components/admin/delete-global-user-dialog"
import { ResetGlobalPasswordDialog } from "@/components/admin/reset-global-password-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const roleMap: Record<string, string> = {
  ADMIN: "Administrador",
  PLANNER: "Cerimonialista",
  CONCIERGE: "Equipe",
  COUPLE: "Casal"
}

export function AdminUsersTabs({ 
  planners, 
  staff, 
  couples, 
  allUsers 
}: { 
  planners: any[]
  staff: any[]
  couples: any[]
  allUsers: any[]
}) {
  const [openPlanners, setOpenPlanners] = useState<Record<string, boolean>>({})

  const togglePlanner = (id: string) => {
    setOpenPlanners(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(date))
  }

  return (
    <Tabs defaultValue="agencies" className="w-full space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <TabsList className="bg-background/50 backdrop-blur border">
          <TabsTrigger value="agencies" className="gap-2">
            <Building2 className="w-4 h-4" /> Agências ({planners.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="w-4 h-4" /> Equipe ({staff.length})
          </TabsTrigger>
          <TabsTrigger value="couples" className="gap-2">
            <Heart className="w-4 h-4" /> Casais ({couples.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Shield className="w-4 h-4" /> Todos ({allUsers.length})
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="agencies" className="space-y-4">
        {planners.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mb-4 opacity-20" />
              <p>Nenhuma agência/cerimonial cadastrada.</p>
            </CardContent>
          </Card>
        ) : (
          planners.map(planner => {
            const plannerStaff = staff.filter(s => s.memberships.some((sm: any) => planner.memberships.some((pm: any) => pm.weddingId === sm.weddingId)))
            return (
              <Collapsible
                key={planner.id}
                open={!!openPlanners[planner.id]}
                onOpenChange={() => togglePlanner(planner.id)}
                className="bg-card border rounded-lg overflow-hidden"
              >
                <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {planner.logoUrl ? (
                        <img src={planner.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        {planner.companyName || planner.name || "Agência Sem Nome"}
                        <Badge variant="outline" className="bg-primary/5">{planner.memberships.length} Casamentos</Badge>
                      </h3>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>{planner.email}</span>
                        {planner.phone && <span>• {planner.phone}</span>}
                        {planner.cnpj && <span>• CNPJ: {planner.cnpj}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <div className="flex gap-1 mr-4">
                      <ResetGlobalPasswordDialog user={planner} />
                      <EditGlobalUserDialog user={planner} />
                      <DeleteGlobalUserDialog user={{ ...planner, name: planner.companyName || planner.name || null }} />
                    </div>
                    <CollapsibleTrigger 
                      render={
                        <Button variant="ghost" size="sm" className="gap-2" />
                      }
                    >
                      Ver Detalhes
                      <ChevronDown className={`w-4 h-4 transition-transform ${openPlanners[planner.id] ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                  </div>
                </div>
                
                <CollapsibleContent className="border-t bg-muted/20 p-4 space-y-6">
                  {/* Staff da Agência */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" /> Membros da Equipe ({plannerStaff.length})
                    </h4>
                    {plannerStaff.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic pl-6">Nenhum membro cadastrado.</p>
                    ) : (
                      <div className="space-y-2 pl-6 border-l-2 border-border/50 ml-2">
                        {plannerStaff.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between bg-background p-2 rounded-md border text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium">{member.name}</span>
                              <span className="text-muted-foreground text-xs">{member.email}</span>
                            </div>
                            <div className="flex gap-1">
                              <ResetGlobalPasswordDialog user={member} />
                              <EditGlobalUserDialog user={member} />
                              <DeleteGlobalUserDialog user={member} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Casamentos da Agência */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-muted-foreground" /> Casamentos ({planner.memberships.length})
                    </h4>
                    {planner.memberships.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic pl-6">Nenhum casamento gerenciado.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 border-l-2 border-border/50 ml-2">
                        {planner.memberships.map((m: any) => (
                          <div key={m.wedding.id} className="bg-background p-3 rounded-md border text-sm flex flex-col justify-between">
                            <div>
                              <span className="font-medium text-primary">{m.wedding.partner1Name} & {m.wedding.partner2Name}</span>
                              <span className="text-muted-foreground text-xs block mb-2">
                                {m.wedding._count.guests} convidados
                              </span>
                              
                              {m.wedding.members && m.wedding.members.length > 0 ? (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Acesso do Casal
                                  </span>
                                  {m.wedding.members.map((cm: any) => (
                                    <div key={cm.user.id} className="flex flex-col mb-2 last:mb-0">
                                      <span className="text-xs font-medium text-foreground">{cm.user.name || "Sem Nome"}</span>
                                      <span className="text-[10px] text-muted-foreground">{cm.user.email}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <span className="text-[10px] text-muted-foreground italic block">Sem usuário de casal vinculado.</span>
                                </div>
                              )}
                            </div>
                            <a href={`/${m.wedding.slug}/dashboard`} className="text-primary text-xs flex items-center gap-1 mt-2 hover:underline">
                              <LayoutDashboard className="w-3 h-3" /> Acessar Painel
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })
        )}
      </TabsContent>

      <TabsContent value="staff" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agência (Casamentos)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Nenhum membro de equipe.</TableCell></TableRow>
                ) : (
                  staff.map(member => {
                    // Try to guess the agency by looking at planners they share a wedding with
                    const agencyNames = [...new Set(member.memberships.flatMap((m: any) => 
                      m.wedding.members
                        .filter((wm: any) => wm.role === "PLANNER")
                        .map((wm: any) => wm.user.companyName || wm.user.name || "Agência Desconhecida")
                    ))]
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          {agencyNames.length > 0 ? agencyNames.join(", ") : <span className="text-muted-foreground italic">Sem agência</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <ResetGlobalPasswordDialog user={member} />
                            <EditGlobalUserDialog user={member} />
                            <DeleteGlobalUserDialog user={member} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="couples" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Casamentos Vinculados</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couples.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Nenhum casal.</TableCell></TableRow>
                ) : (
                  couples.map(couple => (
                    <TableRow key={couple.id}>
                      <TableCell className="font-medium">{couple.name}</TableCell>
                      <TableCell>{couple.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {couple.memberships.map((m: any) => {
                            const planner = m.wedding.members?.find((mm: any) => mm.role === "PLANNER")?.user
                            return (
                              <div key={m.wedding.id} className="flex flex-col border border-border/50 bg-secondary/10 px-3 py-1.5 rounded-md w-max">
                                <span className="font-medium text-sm text-foreground">{m.wedding.partner1Name} & {m.wedding.partner2Name}</span>
                                {planner ? (
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                    Cerimonial: {planner.companyName || planner.name}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">Sem cerimonial</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ResetGlobalPasswordDialog user={couple} />
                          <EditGlobalUserDialog user={couple} />
                          <DeleteGlobalUserDialog user={couple} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="all" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"}>
                        {roleMap[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ResetGlobalPasswordDialog user={user} />
                        <EditGlobalUserDialog user={user} />
                        <DeleteGlobalUserDialog user={{ ...user, name: user.name || null }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

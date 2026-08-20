import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar"
import { Users, LayoutDashboard, Gift, Image as ImageIcon, Settings, ScanLine, LogOut, User, ArrowLeft, ChevronRight, Heart, Calendar, CheckSquare } from "lucide-react"
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Link from "next/link"
import { getCurrentUser } from "@/lib/session"
import { signOut } from "@/lib/auth"
import { SidebarCollapsibleItem } from "./sidebar-collapsible-item"

export async function AppSidebar({ weddingId, memberRole }: { weddingId: string, memberRole: any }) {
  const user = await getCurrentUser();
  const { prisma } = await import("@/lib/prisma");
  const membershipsCount = user ? await prisma.weddingMember.count({ where: { userId: user.id } }) : 0;
  const items = [
    {
      title: "Dashboard",
      url: `/${weddingId}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Convidados",
      url: `/${weddingId}/convidados`,
      icon: Users,
    },
    {
      title: "Mesas",
      url: `/${weddingId}/mesas`,
      icon: ScanLine,
    },
    {
      title: "Cronograma & Eventos",
      url: `/${weddingId}/cronograma`,
      icon: Calendar,
    },
    {
      title: "Checklist",
      url: `/${weddingId}/checklist`,
      icon: CheckSquare,
    },
    {
      title: "Presentes",
      url: `/${weddingId}/presentes`,
      icon: Gift,
      subItems: [
        {
          title: "Gestão",
          url: `/${weddingId}/presentes`,
        },
        {
          title: "Categorias",
          url: `/${weddingId}/presentes/categorias`,
        }
      ]
    },
    {
      title: "Álbum",
      url: `/${weddingId}/album`,
      icon: ImageIcon,
    },
    {
      title: "O Grande Dia",
      url: `/${weddingId}/o-grande-dia`,
      icon: Heart,
    },
  ]

  if (memberRole === 'PLANNER' || memberRole === 'CONCIERGE' || user?.role === 'ADMIN') {
    items.push({
      title: "Check-in",
      url: `/${weddingId}/checkin`,
      icon: ScanLine,
    })
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        {user?.role === "PLANNER" && (
          <Link href="/planner/weddings" className="text-xs flex w-fit items-center text-muted-foreground hover:text-primary mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3 mr-1" /> Voltar aos Eventos
          </Link>
        )}
        {user?.role === "ADMIN" && (
          <Link href="/admin/weddings" className="text-xs flex w-fit items-center text-muted-foreground hover:text-primary mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3 mr-1" /> Painel Admin
          </Link>
        )}
        {user?.role === "COUPLE" && membershipsCount > 1 && (
          <Link href="/" className="text-xs flex w-fit items-center text-muted-foreground hover:text-primary mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3 mr-1" /> Meus Eventos
          </Link>
        )}
        <h2 className="text-xl font-bold">Casarium</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu do Casamento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                item.subItems ? (
                  <SidebarCollapsibleItem key={item.title} className="group/collapsible" activePathBase={item.url}>
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<CollapsibleTrigger nativeButton={false} render={<Link href={item.subItems[0].url} />} />}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton render={<Link href={subItem.url} />}>
                                <span>{subItem.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </SidebarCollapsibleItem>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton render={<Link href={item.url} />}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold truncate">{user.name || "Usuário"}</span>
              <span className="text-xs font-medium text-muted-foreground truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/perfil" className="p-2 hover:bg-primary/10 hover:text-primary rounded-md transition-colors" title="Meu Perfil">
                <User className="w-4 h-4" />
              </Link>
              <form action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}>
                <button type="submit" className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors" title="Sair">
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}

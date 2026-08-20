import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar"
import { CalendarHeart, LogOut, User } from "lucide-react"
import Link from "next/link"
import { signOut } from "@/lib/auth"

export default async function PlannerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || !["PLANNER", "CONCIERGE"].includes(user.role)) {
    redirect("/")
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <CalendarHeart className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold text-primary">Cerimonial</h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 mt-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/planner" />}>
                <CalendarHeart className="w-4 h-4" />
                <span>Visão Geral</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/planner/weddings" />}>
                <CalendarHeart className="w-4 h-4" />
                <span>Meus Casamentos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/planner/calendar" />}>
                <CalendarHeart className="w-4 h-4" />
                <span>Cronograma & Eventos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {user.role === "PLANNER" && (
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/planner/users" />}>
                  <User className="w-4 h-4" />
                  <span>Usuários</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/perfil" />}>
                <User className="w-4 h-4" />
                <span>Meu Perfil</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
            <form action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}>
              <button type="submit" className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors" title="Sair">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </SidebarFooter>
      </Sidebar>
      
      <main className="flex-1 overflow-auto bg-slate-50/50">
        {children}
      </main>
    </SidebarProvider>
  )
}

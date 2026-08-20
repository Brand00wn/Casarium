"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Users, HeartHandshake, LogOut, User, Shield } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

export function AdminSidebar({ user }: { user?: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Usuários",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Casamentos",
      url: "/admin/weddings",
      icon: HeartHandshake,
    },
    {
      title: "Calendário Global",
      url: "/admin/calendar",
      icon: HeartHandshake, // Pode usar o mesmo ícone ou outro, mas como não importamos Calendar, usaremos esse.
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive-foreground" />
          </div>
          <h2 className="text-lg font-bold text-destructive">Super Admin</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                      className={`transition-all duration-200 ease-in-out hover:bg-primary/10 hover:text-primary ${
                        isActive ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        {user && (
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.name || "Administrador"}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors" 
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/perfil" />}>
              <User className="w-4 h-4" />
              <span>Meu Perfil</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

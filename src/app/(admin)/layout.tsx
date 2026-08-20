import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== "ADMIN") {
    redirect("/")
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 overflow-auto bg-slate-50/50">
        <header className="flex h-16 items-center justify-between border-b px-4 w-full bg-white/50 backdrop-blur-sm">
          <SidebarTrigger />
        </header>
        {children}
      </main>
    </SidebarProvider>
  )
}

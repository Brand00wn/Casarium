import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { getCurrentUser, getUserMemberRole } from "@/lib/session"
import { redirect } from "next/navigation"
import { checkPermission } from "@/lib/permissions"
import { WeddingProvider } from "@/contexts/wedding-context"

export default async function WeddingDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ weddingId: string }>
}) {
  const { weddingId } = await params;
  
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberRole = await getUserMemberRole(user.id, weddingId);
  
  // Se não é admin e não é membro, bloqueia
  if (user.role !== "ADMIN" && !memberRole) {
    redirect("/");
  }

  const permissions = {
    canManageUsers: checkPermission(user.role, memberRole, "canManageUsers"),
    canCreateWeddings: checkPermission(user.role, memberRole, "canCreateWeddings"),
    canEditWedding: checkPermission(user.role, memberRole, "canEditWedding"),
    canManageGuests: checkPermission(user.role, memberRole, "canManageGuests"),
    canManageTables: checkPermission(user.role, memberRole, "canManageTables"),
    canInviteMembers: checkPermission(user.role, memberRole, "canInviteMembers"),
    canViewAll: checkPermission(user.role, memberRole, "canViewAll"),
  }

  return (
    <WeddingProvider weddingSlug={weddingId} memberRole={memberRole} permissions={permissions}>
      <SidebarProvider>
        <AppSidebar weddingId={weddingId} memberRole={memberRole} />
        <main className="w-full flex-1 overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b px-4 w-full">
            <SidebarTrigger />
          </header>
          <div className="p-4 md:p-6 h-[calc(100vh-4rem)] overflow-auto">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </WeddingProvider>
  )
}

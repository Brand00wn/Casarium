import { listUsers, listUsersHierarchical, listAllWeddings } from "@/app/actions/admin"
import { AdminUsersTabs } from "@/components/admin/admin-users-tabs"
import { CreateGlobalUserDialog } from "@/components/admin/create-global-user-dialog"

export default async function AdminUsersPage() {
  const [allUsers, hierarchical, weddings] = await Promise.all([
    listUsers(),
    listUsersHierarchical(),
    listAllWeddings()
  ])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground/90">Usuários</h1>
          <p className="text-muted-foreground mt-2 text-lg font-light">
            Gerenciamento global de usuários na plataforma.
          </p>
        </div>
        <CreateGlobalUserDialog planners={hierarchical.planners} weddings={weddings} />
      </div>

      <AdminUsersTabs 
        planners={hierarchical.planners}
        staff={hierarchical.staff}
        couples={hierarchical.couples}
        allUsers={allUsers}
      />
    </div>
  )
}

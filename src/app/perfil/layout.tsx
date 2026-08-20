import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function PerfilLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Determine back URL based on user role
  let backUrl = "/"
  if (user.role === "ADMIN") {
    backUrl = "/admin/dashboard"
  } else if (user.role === "PLANNER") {
    backUrl = "/planner/weddings"
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 md:px-8 h-16 flex items-center">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-4">
          <Link
            href={backUrl}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Meu Perfil</h1>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}

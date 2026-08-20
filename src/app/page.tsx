import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function Home() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  if (user.role === "ADMIN") {
    redirect("/admin/dashboard")
  }

  if (user.role === "PLANNER") {
    redirect("/planner")
  }

  // COUPLE, CONCIERGE, etc.
  const memberships = await prisma.weddingMember.findMany({
    where: { userId: user.id },
    include: { wedding: true }
  })

  if (memberships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h1 className="text-3xl font-bold mb-4 text-primary">Bem-vindo(a) ao ConciWedding!</h1>
        <p className="text-muted-foreground max-w-md">
          O seu casamento ainda não foi configurado no sistema. Aguarde a criação ou o convite pelo seu cerimonialista ou administrador.
        </p>
      </div>
    )
  }

  if (memberships.length === 1) {
    // Redireciona para o único casamento
    redirect(`/${memberships[0].wedding.slug}/dashboard`)
  }

  // Tem mais de um casamento
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Meus Eventos</h1>
          <p className="text-muted-foreground mt-2">Você faz parte de múltiplos eventos. Selecione qual deseja acessar:</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {memberships.map((m) => (
            <a 
              key={m.id} 
              href={`/${m.wedding.slug}/dashboard`}
              className="flex flex-col p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow hover:border-primary/50 group"
            >
              <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {m.wedding.partner1Name} & {m.wedding.partner2Name}
              </h2>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>Acessar painel</span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium uppercase">{m.role}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

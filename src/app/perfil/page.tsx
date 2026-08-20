import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"
import { PasswordForm } from "@/components/profile/password-form"

export default async function PerfilPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">Configurações de Conta</h2>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações de segurança.
        </p>
      </div>
      
      <ProfileForm initialName={user.name || ""} email={user.email || ""} />
      
      <PasswordForm />
    </div>
  )
}

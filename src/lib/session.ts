import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MemberRole, Role } from "@prisma/client"
import { checkPermission, Permission } from "./permissions"

export type SessionUser = {
  id: string;
  role: Role;
  email: string;
  name?: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  // Sempre busca os dados mais recentes do banco para refletir alterações de Nome e Cargo imediatamente
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, email: true }
  });

  if (!dbUser) return null;

  return {
    id: session.user.id,
    role: dbUser.role || "COUPLE",
    email: dbUser.email || "",
    name: dbUser.name || undefined,
  }
}

export async function getUserMemberRole(userId: string, weddingSlug: string): Promise<MemberRole | null> {
  const member = await prisma.weddingMember.findFirst({
    where: {
      userId,
      wedding: {
        slug: weddingSlug
      }
    }
  })
  
  return member?.role || null;
}

export async function requirePermission(weddingSlug: string, action: Permission) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Não autenticado")
  }

  // Admin always has access
  if (user.role === "ADMIN") return;

  const memberRole = await getUserMemberRole(user.id, weddingSlug)
  
  console.log('DEBUG PERMISSION:', {userRole: user.role, memberRole, action, weddingSlug});
  if (!checkPermission(user.role, memberRole, action)) {
    throw new Error("Acesso negado")
  }
}

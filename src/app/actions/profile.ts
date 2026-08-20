"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"

export async function updateProfileName(newName: string) {
  const user = await getCurrentUser()
  
  if (!user || !user.id) {
    return { error: "Não autorizado" }
  }

  if (!newName.trim()) {
    return { error: "O nome não pode estar vazio" }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: newName },
    })
    
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("Error updating profile name:", error)
    return { error: "Erro ao atualizar nome" }
  }
}

export async function updatePassword(currentPass: string, newPass: string) {
  const currentUser = await getCurrentUser()
  
  if (!currentUser || !currentUser.id) {
    return { error: "Não autorizado" }
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id }
  })

  if (!user || !user.passwordHash) {
    return { error: "Usuário não encontrado ou não tem senha configurada" }
  }

  const isValid = await bcrypt.compare(currentPass, user.passwordHash)

  if (!isValid) {
    return { error: "Senha atual incorreta" }
  }

  if (newPass.length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres" }
  }

  const newPasswordHash = await bcrypt.hash(newPass, 10)

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })
    return { success: true }
  } catch (error) {
    console.error("Error updating password:", error)
    return { error: "Erro ao alterar a senha" }
  }
}

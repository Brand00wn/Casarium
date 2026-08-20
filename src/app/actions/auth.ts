"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function registerUser(name: string, email: string, password: string) {
  if (!name || !email || !password) {
    return { error: "Todos os campos são obrigatórios" }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: "E-mail já está em uso" }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "COUPLE",
      },
    })
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Erro ao criar usuário" }
  }
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user || !user.passwordHash) {
    return { error: "Usuário não encontrado" }
  }

  const isValid = await bcrypt.compare(oldPassword, user.passwordHash)

  if (!isValid) {
    return { error: "Senha antiga incorreta" }
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Erro ao alterar a senha" }
  }
}

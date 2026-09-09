"use server"

import { prisma } from "@/lib/prisma"
import { resend } from "@/lib/resend"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import ResetPasswordEmail from "@/components/emails/reset-password-email"

export async function requestPasswordReset(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    
    // We always return success to prevent email enumeration attacks
    if (!user) {
      return { success: true }
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour expiration

    // Save token to DB
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      }
    })

    // Send the email
    if (process.env.RESEND_API_KEY) {
      const siteUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const resetLink = `${siteUrl}/reset-password?token=${token}`

      await resend.emails.send({
        from: "Casarium <onboarding@resend.dev>",
        to: email,
        subject: "Redefinição de Senha - Casarium",
        react: ResetPasswordEmail({
          userName: user.name || "Usuário",
          resetLink,
        }),
      })
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error requesting password reset:", error)
    return { success: false, error: "Ocorreu um erro ao processar sua solicitação." }
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    })

    if (!resetToken) {
      return { success: false, error: "O link de redefinição é inválido." }
    }

    if (resetToken.expires < new Date()) {
      return { success: false, error: "O link de redefinição expirou. Solicite um novo." }
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update the user's password
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash }
    })

    // Delete the used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error resetting password:", error)
    return { success: false, error: "Ocorreu um erro ao redefinir sua senha." }
  }
}

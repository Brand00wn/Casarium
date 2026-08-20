"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import bcrypt from "bcryptjs"
import { Resend } from "resend"
import { CoupleInviteEmail } from "@/components/emails/couple-invite-email"
import { revalidatePath } from "next/cache"

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder")

function generateTempPassword(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function createCoupleAccount(data: {
  weddingSlug: string
  coupleName: string
  email: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "PLANNER")) {
      return { success: false, error: "Acesso negado." }
    }

    const wedding = await prisma.wedding.findUnique({
      where: { slug: data.weddingSlug }
    })

    if (!wedding) {
      return { success: false, error: "Casamento não encontrado." }
    }

    // Check if email already exists
    let user = await prisma.user.findUnique({
      where: { email: data.email }
    })

    let tempPassword = ""

    if (!user) {
      // Create new user
      tempPassword = generateTempPassword()
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.coupleName,
          passwordHash,
          role: "COUPLE",
        }
      })
    }

    // Link user to wedding as OWNER
    const existingMembership = await prisma.weddingMember.findUnique({
      where: {
        userId_weddingId: {
          userId: user.id,
          weddingId: wedding.id
        }
      }
    })

    if (!existingMembership) {
      await prisma.weddingMember.create({
        data: {
          userId: user.id,
          weddingId: wedding.id,
          role: "OWNER"
        }
      })
    }

    // Send Email if it's a new user and Resend is configured
    if (tempPassword && process.env.RESEND_API_KEY) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        
        await resend.emails.send({
          from: "ConciWedding <onboarding@resend.dev>",
          to: [data.email],
          subject: "Seu Painel de Casamento foi criado! - ConciWedding",
          react: CoupleInviteEmail({
            coupleName: data.coupleName,
            plannerName: currentUser.name || "Seu Cerimonialista",
            weddingSlug: wedding.slug,
            loginEmail: data.email,
            tempPassword: tempPassword,
            siteUrl: siteUrl
          })
        })
      } catch (emailError) {
        console.error("Failed to send email:", emailError)
        // We don't fail the whole action if email fails, we just return the password so planner can copy it
      }
    }

    revalidatePath("/planner/weddings")
    revalidatePath("/admin/users")

    return { 
      success: true, 
      tempPassword: tempPassword || null, // Will be null if user already existed
      isNewUser: !!tempPassword
    }
  } catch (error: any) {
    console.error("Error creating couple account:", error)
    return { success: false, error: error.message || "Erro interno ao criar conta." }
  }
}

export async function getPlannerUsers() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "PLANNER") throw new Error("Acesso negado")

  const plannerWeddings = await prisma.weddingMember.findMany({
    where: { userId: currentUser.id, role: "PLANNER" },
    select: { weddingId: true }
  })
  const weddingIds = plannerWeddings.map(w => w.weddingId)

  const members = await prisma.weddingMember.findMany({
    where: {
      weddingId: { in: weddingIds },
      user: {
        id: { not: currentUser.id },
        role: { in: ["COUPLE", "PLANNER", "CONCIERGE"] }
      }
    },
    include: {
      user: true,
      wedding: {
        select: { id: true, partner1Name: true, partner2Name: true, slug: true }
      }
    }
  })

  const userMap = new Map()
  members.forEach(m => {
    if (!userMap.has(m.userId)) {
      userMap.set(m.userId, {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        systemRole: m.user.role,
        createdAt: m.user.createdAt,
        weddings: []
      })
    }
    const u = userMap.get(m.userId)
    u.weddings.push({
      id: m.wedding.id,
      name: `${m.wedding.partner1Name} & ${m.wedding.partner2Name}`,
      slug: m.wedding.slug,
      role: m.role
    })
  })

  return Array.from(userMap.values())
}

export async function updateUser(userId: string, data: { name: string, email: string }) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "PLANNER") throw new Error("Acesso negado")

  const hasAccess = await prisma.weddingMember.findFirst({
    where: {
      userId: userId,
      wedding: {
        members: {
          some: { userId: currentUser.id, role: "PLANNER" }
        }
      }
    }
  })
  if (!hasAccess) throw new Error("Acesso negado a este usuário")

  await prisma.user.update({
    where: { id: userId },
    data: { name: data.name, email: data.email }
  })
  revalidatePath("/planner/users")
}

export async function resetUserPassword(userId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "PLANNER") throw new Error("Acesso negado")

  const hasAccess = await prisma.weddingMember.findFirst({
    where: {
      userId: userId,
      wedding: {
        members: {
          some: { userId: currentUser.id, role: "PLANNER" }
        }
      }
    }
  })
  if (!hasAccess) throw new Error("Acesso negado a este usuário")

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  })

  return tempPassword
}

export async function linkUserToWedding(userId: string, weddingId: string, memberRole: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "PLANNER") throw new Error("Acesso negado")

  const hasAccess = await prisma.weddingMember.findUnique({
    where: {
      userId_weddingId: { userId: currentUser.id, weddingId }
    }
  })
  if (!hasAccess || hasAccess.role !== "PLANNER") throw new Error("Você não tem permissão neste casamento")

  await prisma.weddingMember.create({
    data: { userId, weddingId, role: memberRole as any }
  })
  revalidatePath("/planner/users")
}

export async function unlinkUserFromWedding(userId: string, weddingId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "PLANNER") throw new Error("Acesso negado")

  const hasAccess = await prisma.weddingMember.findUnique({
    where: {
      userId_weddingId: { userId: currentUser.id, weddingId }
    }
  })
  if (!hasAccess || hasAccess.role !== "PLANNER") throw new Error("Você não tem permissão neste casamento")

  await prisma.weddingMember.delete({
    where: {
      userId_weddingId: { userId, weddingId }
    }
  })
  revalidatePath("/planner/users")
}

export async function createAndLinkUser(data: {
  name: string
  email: string
  weddingId: string
  role: "OWNER" | "CONCIERGE"
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "PLANNER") return { success: false, error: "Acesso negado" }

  const hasAccess = await prisma.weddingMember.findUnique({
    where: {
      userId_weddingId: { userId: currentUser.id, weddingId: data.weddingId }
    }
  })
  if (!hasAccess || hasAccess.role !== "PLANNER") throw new Error("Você não tem permissão neste casamento")

  let existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  const tempPassword = generateTempPassword()
  const hashedTempPassword = await bcrypt.hash(tempPassword, 10)
  
  let user = existingUser

  if (!existingUser) {
    user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: hashedTempPassword,
        role: data.role === "CONCIERGE" ? "CONCIERGE" : "COUPLE"
      }
    })
  } else if (data.role === "CONCIERGE" && existingUser.role === "COUPLE") {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "CONCIERGE" }
    })
  }

  const existingMembership = await prisma.weddingMember.findUnique({
    where: {
      userId_weddingId: { userId: user!.id, weddingId: data.weddingId }
    }
  })

  if (!existingMembership) {
    await prisma.weddingMember.create({
      data: {
        userId: user!.id,
        weddingId: data.weddingId,
        role: data.role === "CONCIERGE" ? "CONCIERGE" : "OWNER",
      }
    })
  }

  revalidatePath("/planner/users")
  
  return { success: true, tempPassword: existingUser ? null : tempPassword }
}

export async function deleteUser(userId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "PLANNER") throw new Error("Acesso negado")

  // Check if current user manages all weddings this user is part of
  const targetUserMemberships = await prisma.weddingMember.findMany({
    where: { userId }
  })

  const currentUserMemberships = await prisma.weddingMember.findMany({
    where: { userId: currentUser.id, role: "PLANNER" }
  })
  
  const currentUserWeddingIds = currentUserMemberships.map(m => m.weddingId)
  
  const hasOutsideWeddings = targetUserMemberships.some(m => !currentUserWeddingIds.includes(m.weddingId))

  if (hasOutsideWeddings) {
    throw new Error("Este usuário está vinculado a casamentos que você não gerencia. Remova os vínculos que você gerencia ao invés de excluí-lo.")
  }

  await prisma.user.delete({
    where: { id: userId }
  })

  revalidatePath("/planner/users")
}

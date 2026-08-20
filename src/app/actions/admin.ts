"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

async function verifyAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") {
    throw new Error("Acesso negado: Apenas administradores podem executar esta ação.")
  }
  return user
}

export async function listUsers() {
  await verifyAdmin()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      phone: true,
      companyName: true,
      cnpj: true,
      instagram: true,
      website: true,
      address: true,
      city: true,
      logoUrl: true,
      _count: {
        select: { memberships: true }
      }
    }
  })
  return users
}

export async function listUsersHierarchical() {
  await verifyAdmin()
  
  // Planners e seus casamentos
  const planners = await prisma.user.findMany({
    where: { role: "PLANNER" },
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        where: { role: "PLANNER" },
        include: {
          wedding: {
            include: {
              _count: { select: { guests: true } },
              members: {
                where: { role: "OWNER" },
                include: { user: true }
              }
            }
          }
        }
      }
    }
  })

  // Staff (Equipe) e seus vínculos com casamentos para mapear a quais planners pertencem
  const staff = await prisma.user.findMany({
    where: { role: "CONCIERGE" },
    orderBy: { name: "asc" },
    include: {
      memberships: {
        include: {
          wedding: {
            include: {
              members: {
                where: { role: "PLANNER" },
                include: { user: true }
              }
            }
          }
        }
      }
    }
  })

  // Casais e seus casamentos
  const couples = await prisma.user.findMany({
    where: { role: "COUPLE" },
    orderBy: { name: "asc" },
    include: {
      memberships: {
        where: { role: "OWNER" },
        include: { 
          wedding: {
            include: {
              members: {
                where: { role: "PLANNER" },
                include: { user: true }
              }
            }
          }
        }
      }
    }
  })

  return { planners, staff, couples }
}

export async function listAllWeddings() {
  await verifyAdmin()
  const weddings = await prisma.wedding.findMany({
    orderBy: { date: "asc" },
    select: {
      id: true,
      slug: true,
      partner1Name: true,
      partner2Name: true,
      date: true,
      _count: {
        select: {
          guests: true,
          members: true
        }
      }
    }
  })
  return weddings
}

export async function getAdminStats() {
  await verifyAdmin()
  const [totalUsers, totalWeddings, totalGuests, recentWeddings, recentUsers, totalPlanners, totalCouples, totalStaff] = await Promise.all([
    prisma.user.count(),
    prisma.wedding.count(),
    prisma.guest.count(),
    prisma.wedding.findMany({
      take: 5,
      orderBy: { date: "desc" },
      select: { id: true, slug: true, partner1Name: true, partner2Name: true, date: true }
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true, role: true }
    }),
    prisma.user.count({ where: { role: "PLANNER" } }),
    prisma.user.count({ where: { role: "COUPLE" } }),
    prisma.user.count({ where: { role: "CONCIERGE" } })
  ])

  return {
    totalUsers,
    totalWeddings,
    totalGuests,
    recentWeddings,
    recentUsers,
    totalPlanners,
    totalCouples,
    totalStaff
  }
}

function generateTempPassword(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function createPlannerUser(data: { 
  name: string; 
  email: string;
  phone?: string;
  companyName?: string;
  cnpj?: string;
  instagram?: string;
  website?: string;
  address?: string;
  city?: string;
}) {
  await verifyAdmin()
  
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) {
    throw new Error("Já existe um usuário com este e-mail no sistema.")
  }

  const bcrypt = require("bcryptjs")
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      cnpj: data.cnpj,
      instagram: data.instagram,
      website: data.website,
      address: data.address,
      city: data.city,
      passwordHash,
      role: "PLANNER"
    }
  })

  revalidatePath("/admin/users")
  
  return tempPassword
}

export async function createStaffUser(data: { name: string; email: string; plannerId: string }) {
  await verifyAdmin()

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) {
    throw new Error("Já existe um usuário com este e-mail no sistema.")
  }

  const planner = await prisma.user.findUnique({
    where: { id: data.plannerId },
    include: {
      memberships: { where: { role: "PLANNER" } }
    }
  })

  if (!planner) throw new Error("Cerimonialista não encontrado.")

  const bcrypt = require("bcryptjs")
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const staff = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "CONCIERGE"
    }
  })

  // Vincula o staff a todos os casamentos do planner atual
  if (planner.memberships.length > 0) {
    await prisma.weddingMember.createMany({
      data: planner.memberships.map(m => ({
        userId: staff.id,
        weddingId: m.weddingId,
        role: "CONCIERGE"
      }))
    })
  }

  revalidatePath("/admin/users")
  
  return tempPassword
}

export async function createCoupleFromAdmin(data: { name: string; email: string; weddingId: string }) {
  await verifyAdmin()

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) {
    throw new Error("Já existe um usuário com este e-mail no sistema.")
  }

  const bcrypt = require("bcryptjs")
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const couple = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "COUPLE"
    }
  })

  await prisma.weddingMember.create({
    data: {
      userId: couple.id,
      weddingId: data.weddingId,
      role: "OWNER"
    }
  })

  revalidatePath("/admin/users")
  
  return tempPassword
}

export async function updateGlobalUser(userId: string, data: { 
  name: string; 
  email: string;
  companyName?: string;
  cnpj?: string;
  phone?: string;
  instagram?: string;
  website?: string;
}) {
  await verifyAdmin()

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  })

  if (existingUser && existingUser.id !== userId) {
    throw new Error("Já existe outro usuário com este e-mail.")
  }

  await prisma.user.update({
    where: { id: userId },
    data: { 
      name: data.name, 
      email: data.email,
      companyName: data.companyName,
      cnpj: data.cnpj,
      phone: data.phone,
      instagram: data.instagram,
      website: data.website
    }
  })

  revalidatePath("/admin/users")
}

export async function deleteGlobalUser(userId: string) {
  await verifyAdmin()

  // Evitar que o admin se exclua
  const currentUser = await getCurrentUser()
  if (currentUser?.id === userId) {
    throw new Error("Você não pode excluir a si mesmo.")
  }

  // Deleta o usuário, os casamentos onde ele for o único dono podem ficar sem dono, mas continuam existindo
  // Pode ser melhor apenas excluir. O Prisma vai apagar WeddingMember (Cascade)
  await prisma.user.delete({
    where: { id: userId }
  })

  revalidatePath("/admin/users")
}

export async function resetGlobalUserPassword(userId: string) {
  await verifyAdmin()

  const bcrypt = require("bcryptjs")
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  })

  return tempPassword
}

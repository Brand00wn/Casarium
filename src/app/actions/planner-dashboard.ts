"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { MemberRole } from "@prisma/client"

export async function getPlannerDashboardStats() {
  const user = await getCurrentUser()
  if (!user || !["PLANNER", "CONCIERGE"].includes(user.role)) {
    throw new Error("Acesso negado")
  }

  // 1. Fetch all weddings where this user is a PLANNER or CONCIERGE
  const memberships = await prisma.weddingMember.findMany({
    where: { 
      userId: user.id,
      role: { in: [MemberRole.PLANNER, MemberRole.CONCIERGE] }
    },
    include: {
      wedding: {
        include: {
          guests: { select: { rsvpStatus: true } },
          tasks: { select: { id: true, status: true } }
        }
      }
    }
  })

  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0))

  const activeWeddings = memberships.filter(m => new Date(m.wedding.date) >= todayStart)
  const completedWeddings = memberships.filter(m => new Date(m.wedding.date) < todayStart)

  const weddingIds = memberships.map(m => m.weddingId)

  // 2. Calculate Urgent/Overdue Tasks
  const urgentTasksCount = await prisma.task.count({
    where: {
      weddingId: { in: weddingIds },
      status: { not: "DONE" },
      OR: [
        { priority: "URGENT" },
        { dueDate: { lt: new Date() } }
      ]
    }
  })

  // 3. Upcoming Weddings (Top 5 closest)
  const upcomingWeddingsRaw = activeWeddings
    .map(m => m.wedding)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const upcomingWeddings = upcomingWeddingsRaw.map(wedding => {
    const totalTasks = wedding.tasks.length
    const completedTasks = wedding.tasks.filter(t => t.status === "DONE").length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const confirmedGuests = wedding.guests.filter(g => g.rsvpStatus === "CONFIRMED").length

    return {
      id: wedding.id,
      slug: wedding.slug,
      partner1Name: wedding.partner1Name,
      partner2Name: wedding.partner2Name,
      date: wedding.date,
      venue: wedding.venue,
      progress,
      confirmedGuests
    }
  })

  // 4. Urgent Pending Tasks list
  const urgentPendingTasks = await prisma.task.findMany({
    where: {
      weddingId: { in: weddingIds },
      status: { not: "DONE" },
      OR: [
        { priority: "URGENT" },
        { priority: "HIGH" },
        { dueDate: { lt: new Date() } }
      ]
    },
    include: {
      wedding: {
        select: { slug: true, partner1Name: true, partner2Name: true }
      }
    },
    orderBy: [
      { priority: 'desc' }, // URGENT > HIGH > MEDIUM > LOW
      { dueDate: 'asc' }
    ],
    take: 8
  })

  return {
    totalActive: activeWeddings.length,
    totalCompleted: completedWeddings.length,
    urgentTasksCount,
    upcomingWeddings,
    urgentPendingTasks
  }
}

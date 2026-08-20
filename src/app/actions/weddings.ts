"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { MemberRole, Role } from "@prisma/client"
import { DEFAULT_GIFTS } from "@/lib/default-gifts"
import { findAvailableSlug, generateWeddingSlug, slugify } from "@/lib/slug"

export async function createWedding(data: {
  slug?: string
  partner1Name: string
  partner1Role?: string
  partner2Name: string
  partner2Role?: string
  date: Date
  venue?: string
  theme?: string
  coupleEmail?: string
  coupleName?: string
}) {
  const user = await getCurrentUser()
  if (!user || (user.role !== "ADMIN" && user.role !== "PLANNER")) {
    return { success: false, error: "Acesso negado" }
  }

  try {
    let finalSlug = data.slug ? slugify(data.slug) : await findAvailableSlug(generateWeddingSlug(data.partner1Name, data.partner2Name));
    
    if (data.slug) {
      const existing = await prisma.wedding.findUnique({ where: { slug: finalSlug } })
      if (existing) {
        return { success: false, error: "Este link já está em uso" }
      }
    }

    const wedding = await prisma.wedding.create({
      data: {
        slug: finalSlug,
        partner1Name: data.partner1Name,
        partner1Role: data.partner1Role || "Noiva",
        partner2Name: data.partner2Name,
        partner2Role: data.partner2Role || "Noivo",
        date: data.date,
        venue: data.venue,
        theme: data.theme,
      }
    })

    // 2. Assing the PLANNER (the current user, or if ADMIN is creating, they don't have to be a member, but we can add them)
    if (user.role === "PLANNER") {
      await prisma.weddingMember.create({
        data: {
          userId: user.id,
          weddingId: wedding.id,
          role: MemberRole.PLANNER
        }
      })
    }

    // 3. Create or Assign the COUPLE
    if (data.coupleEmail) {
      // For now, we just find existing or create dummy without password.
      // A better flow sends an email invitation with a setup link.
      let couple = await prisma.user.findUnique({ where: { email: data.coupleEmail } })
      if (!couple) {
        // Fallback for demo: create a dummy user
        const bcrypt = require('bcryptjs')
        const defaultPassword = await bcrypt.hash('ConciWedding@2026', 10)
        couple = await prisma.user.create({
          data: {
            email: data.coupleEmail,
            name: data.coupleName || `${data.partner1Name} & ${data.partner2Name}`,
            passwordHash: defaultPassword,
            role: Role.COUPLE
          }
        })
      }

      await prisma.weddingMember.create({
        data: {
          userId: couple.id,
          weddingId: wedding.id,
          role: MemberRole.OWNER
        }
      })
    }

    // 4. Inject Default Gifts
    if (DEFAULT_GIFTS && DEFAULT_GIFTS.length > 0) {
      await prisma.gift.createMany({
        data: DEFAULT_GIFTS.map(gift => ({
          ...gift,
          weddingId: wedding.id
        }))
      })
    }

    revalidatePath("/planner/weddings")
    revalidatePath("/admin/weddings")
    
    return { success: true, wedding }
  } catch (error: any) {
    console.error(error)
    return { success: false, error: "Erro ao criar casamento" }
  }
}

export async function getPlannerWeddings(plannerId: string) {
  const memberships = await prisma.weddingMember.findMany({
    where: { 
      userId: plannerId,
      role: { in: [MemberRole.PLANNER, MemberRole.CONCIERGE] }
    },
    include: {
      wedding: {
        include: {
          guests: {
            select: { id: true, rsvpStatus: true, isPrimary: true }
          },
          members: {
            select: { userId: true, role: true, user: { select: { name: true, email: true } } }
          }
        }
      }
    },
    orderBy: {
      wedding: {
        date: 'asc'
      }
    }
  })

  return memberships.map(m => m.wedding)
}

export async function checkSlugAvailability(slug: string) {
  const cleanSlug = slugify(slug);
  if (!cleanSlug) return { available: false, cleanSlug: "" };
  
  const existing = await prisma.wedding.findUnique({
    where: { slug: cleanSlug },
    select: { id: true }
  });
  
  return { available: !existing, cleanSlug };
}

export async function updateWedding(weddingId: string, data: {
  partner1Name: string
  partner1Role: string
  partner2Name: string
  partner2Role: string
  date: Date
  slug: string
}) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Não autenticado" }

    if (user.role !== "ADMIN") {
      const member = await prisma.weddingMember.findFirst({
        where: { userId: user.id, weddingId }
      });
      if (!member || !["PLANNER", "CONCIERGE", "OWNER"].includes(member.role)) {
        return { success: false, error: "Sem permissão para editar" }
      }
    }

    const currentWedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!currentWedding) return { success: false, error: "Casamento não encontrado" };

    const cleanSlug = slugify(data.slug);
    
    if (cleanSlug !== currentWedding.slug) {
      const existing = await prisma.wedding.findUnique({ where: { slug: cleanSlug } });
      if (existing) {
        return { success: false, error: "Este link (slug) já está em uso" };
      }
    }

    await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        partner1Name: data.partner1Name,
        partner1Role: data.partner1Role,
        partner2Name: data.partner2Name,
        partner2Role: data.partner2Role,
        date: data.date,
        slug: cleanSlug,
      }
    });

    revalidatePath("/planner/weddings")
    revalidatePath("/admin/weddings")
    revalidatePath(`/${currentWedding.slug}/dashboard`)
    if (cleanSlug !== currentWedding.slug) {
      revalidatePath(`/${cleanSlug}/dashboard`)
    }

    return { success: true, slug: cleanSlug };
  } catch (error: any) {
    console.error("Error updating wedding:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteWedding(weddingId: string, confirmationText: string) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== "ADMIN" && user.role !== "PLANNER")) {
      return { success: false, error: "Apenas administradores ou cerimonialistas podem excluir casamentos" }
    }

    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) return { success: false, error: "Casamento não encontrado" };

    const expectedText = `${wedding.partner1Name} e ${wedding.partner2Name}`;
    if (confirmationText.toLowerCase() !== expectedText.toLowerCase()) {
      return { success: false, error: "O texto de confirmação não bate com o nome dos noivos." };
    }

    await prisma.wedding.delete({
      where: { id: weddingId }
    });

    revalidatePath("/planner/weddings")
    revalidatePath("/admin/weddings")

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting wedding:", error);
    return { success: false, error: "Erro ao excluir. Verifique se existem dependências bloqueando." };
  }
}

import { PrismaClient, Role, MemberRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  const defaultPassword = await bcrypt.hash('ConciWedding@2026', 10)

  // 1. Criar ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@conciwedding.com' },
    update: { passwordHash: defaultPassword, role: Role.ADMIN },
    create: {
      email: 'admin@conciwedding.com',
      name: 'Administrador Supremo',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
    },
  })
  console.log(`Created Admin: ${admin.email}`)

  // 2. Criar PLANNER
  const planner = await prisma.user.upsert({
    where: { email: 'cerimonial@teste.com' },
    update: { passwordHash: defaultPassword, role: Role.PLANNER },
    create: {
      email: 'cerimonial@teste.com',
      name: 'Maria Cerimonialista',
      passwordHash: defaultPassword,
      role: Role.PLANNER,
    },
  })
  console.log(`Created Planner: ${planner.email}`)

  // 3. Criar COUPLE (Noivos)
  const couple = await prisma.user.upsert({
    where: { email: 'noivos@teste.com' },
    update: { passwordHash: defaultPassword, role: Role.COUPLE },
    create: {
      email: 'noivos@teste.com',
      name: 'João e Maria',
      passwordHash: defaultPassword,
      role: Role.COUPLE,
    },
  })
  console.log(`Created Couple: ${couple.email}`)

  // 4. Criar VIEWER
  const viewer = await prisma.user.upsert({
    where: { email: 'visitante@teste.com' },
    update: { passwordHash: defaultPassword, role: Role.COUPLE }, // Viewer at application level is COUPLE default role, but WeddingMember role makes it VIEWER
    create: {
      email: 'visitante@teste.com',
      name: 'Visitante Curioso',
      passwordHash: defaultPassword,
      role: Role.COUPLE,
    },
  })
  console.log(`Created Viewer: ${viewer.email}`)

  // 5. Garantir que o Casamento "João e Maria" exista
  const weddingSlug = 'joao-e-maria'
  const wedding = await prisma.wedding.upsert({
    where: { slug: weddingSlug },
    update: {},
    create: {
      slug: weddingSlug,
      partner1Name: 'Ana Clara',
      partner1Role: 'Noiva',
      partner2Name: 'João Pedro',
      partner2Role: 'Noivo',
      date: new Date('2026-12-10T18:00:00Z'),
      venue: 'Fazenda Imperial',
      theme: 'Rústico Chic',
    },
  })
  console.log(`Ensured Wedding exists: ${wedding.slug}`)

  // 6. Associar membros ao Casamento
  
  // Noivos como OWNER
  await prisma.weddingMember.upsert({
    where: {
      userId_weddingId: {
        userId: couple.id,
        weddingId: wedding.id,
      }
    },
    update: { role: MemberRole.OWNER },
    create: {
      userId: couple.id,
      weddingId: wedding.id,
      role: MemberRole.OWNER,
    }
  })

  // Cerimonialista como PLANNER
  await prisma.weddingMember.upsert({
    where: {
      userId_weddingId: {
        userId: planner.id,
        weddingId: wedding.id,
      }
    },
    update: { role: MemberRole.PLANNER },
    create: {
      userId: planner.id,
      weddingId: wedding.id,
      role: MemberRole.PLANNER,
    }
  })

  // Visitante como VIEWER
  await prisma.weddingMember.upsert({
    where: {
      userId_weddingId: {
        userId: viewer.id,
        weddingId: wedding.id,
      }
    },
    update: { role: MemberRole.VIEWER },
    create: {
      userId: viewer.id,
      weddingId: wedding.id,
      role: MemberRole.VIEWER,
    }
  })

  // Update older users to have the default password if they don't have one
  const updatedOldUsers = await prisma.user.updateMany({
    where: { passwordHash: null },
    data: { passwordHash: defaultPassword }
  })
  console.log(`Updated ${updatedOldUsers.count} old users with default password`)

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

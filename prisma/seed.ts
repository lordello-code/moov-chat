import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Planos
  await prisma.plan.createMany({
    data: [
      { name: 'Starter',    type: 'STARTER',    maxLeadsPerMonth: 200,  maxVendedores: 2,  priceMonthly: 197 },
      { name: 'Pro',        type: 'PRO',        maxLeadsPerMonth: 1000, maxVendedores: 10, priceMonthly: 497 },
      { name: 'Enterprise', type: 'ENTERPRISE', maxLeadsPerMonth: 9999, maxVendedores: 50, priceMonthly: 997 },
    ],
    skipDuplicates: true,
  })

  // Super Admin
  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@moovchat.com' },
    update: {},
    create: {
      name:         'Super Admin',
      email:        'admin@moovchat.com',
      passwordHash: hash,
      role:         'SUPER_ADMIN',
    },
  })

  console.log('Seed concluído')
}

main().catch(console.error).finally(() => prisma.$disconnect())

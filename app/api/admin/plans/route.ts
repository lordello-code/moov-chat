import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
  })
  return ok(plans)
}

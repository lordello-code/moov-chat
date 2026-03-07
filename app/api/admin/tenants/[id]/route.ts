import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { plan: true, users: true, briefing: true },
  })
  if (!tenant) return notFound('Loja')
  return ok(tenant)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  const body = await req.json()
  const tenant = await prisma.tenant.update({ where: { id }, data: body })
  return ok(tenant)
}

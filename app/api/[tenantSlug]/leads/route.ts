import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'
import { LeadState } from '@prisma/client'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { tenantSlug } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return forbidden()

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page')     ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 30)
  const state    = searchParams.get('state') as LeadState | null
  const isHot    = searchParams.get('isHot') === 'true' ? true : undefined

  const where: Record<string, unknown> = { tenantId: tenant.id }

  // Vendedor vê apenas seus leads
  if (session.user.role === 'VENDEDOR') {
    where.assignedVendedorId = session.user.id
  }
  if (state) where.state = state
  if (isHot !== undefined) where.isHot = isHot

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedVendedor: { select: { id: true, name: true } },
        conversations: {
          where:   { state: { not: 'FINALIZADA' } },
          select:  { id: true, state: true, lastMessageAt: true, humanSlaStartedAt: true },
          take:    1,
          orderBy: { createdAt: 'desc' },
        },
      },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      orderBy: [{ isHot: 'desc' }, { updatedAt: 'desc' }],
    }),
    prisma.lead.count({ where }),
  ])

  return ok({ data: leads, total, page, pageSize })
}

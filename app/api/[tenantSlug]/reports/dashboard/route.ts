import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  if (session?.user?.role === 'VENDEDOR') return forbidden()
  const { tenantSlug } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return forbidden()

  const { searchParams } = new URL(req.url)
  const from = new Date(searchParams.get('from') ?? new Date().toISOString().slice(0, 10))
  const to   = new Date(searchParams.get('to')   ?? new Date().toISOString().slice(0, 10))
  to.setHours(23, 59, 59, 999)

  const [totalLeads, byState, vendedores, hotLeads] = await Promise.all([
    prisma.lead.count({
      where: { tenantId: tenant.id, createdAt: { gte: from, lte: to } },
    }),
    prisma.lead.groupBy({
      by:     ['state'],
      where:  { tenantId: tenant.id, createdAt: { gte: from, lte: to } },
      _count: true,
    }),
    prisma.user.findMany({
      where:  { tenantId: tenant.id, role: 'VENDEDOR' },
      select: {
        id: true, name: true,
        _count: { select: { assignedLeads: true } },
      },
    }),
    prisma.lead.count({
      where: { tenantId: tenant.id, isHot: true, createdAt: { gte: from, lte: to } },
    }),
  ])

  const stateMap = Object.fromEntries(byState.map(s => [s.state, s._count]))

  return ok({
    period: { from, to },
    kpis: {
      totalLeads,
      hotLeads,
      sold:  stateMap['VENDIDO']  ?? 0,
      lost:  stateMap['PERDIDO']  ?? 0,
      conversionRate: totalLeads > 0
        ? ((stateMap['VENDIDO'] ?? 0) / totalLeads * 100).toFixed(1)
        : '0.0',
    },
    funnel: {
      received:  totalLeads,
      qualified: stateMap['QUALIFICADO']        ?? 0,
      proposal:  stateMap['PROPOSTA_ENVIADA']   ?? 0,
      visit:     stateMap['AGUARDANDO_VISITA']  ?? 0,
      sold:      stateMap['VENDIDO']            ?? 0,
      lost:      stateMap['PERDIDO']            ?? 0,
    },
    vendedorPerformance: vendedores.map(v => ({
      vendedor:      { id: v.id, name: v.name },
      leadsAssigned: v._count.assignedLeads,
    })),
  })
}

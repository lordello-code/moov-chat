import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { tenantSlug, id } = await params

  const lead = await prisma.lead.findFirst({
    where: { id, tenant: { slug: tenantSlug } },
    include: {
      assignedVendedor: true,
      conversations:    { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!lead) return notFound('Lead')
  return ok(lead)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { id, tenantSlug } = await params

  const body = await req.json()
  const { state, notes, primaryInterest, lossReason, lossDetail } = body

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(state           !== undefined ? { state }           : {}),
      ...(notes           !== undefined ? { notes }           : {}),
      ...(primaryInterest !== undefined ? { primaryInterest } : {}),
      ...(lossReason      !== undefined ? { lossReason }      : {}),
      ...(lossDetail      !== undefined ? { lossDetail }      : {}),
      ...(state === 'VENDIDO' ? { soldAt: new Date() } : {}),
    },
  })

  // Agendamento pós-venda: 3 dias após a venda
  if (state === 'VENDIDO') {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (tenant) {
      const executeAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      await prisma.scheduledTask.create({
        data: {
          tenantId: tenant.id,
          leadId:   id,
          taskType: 'FOLLOWUP_3DIAS',
          executeAt,
          status:   'PENDING',
        },
      })
    }
  }
  return ok(lead)
}

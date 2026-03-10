import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  const { tenantSlug } = await params

  if (!session?.user) return forbidden()
  if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantSlug !== tenantSlug) {
    return forbidden()
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { briefing: true },
  })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  return ok(tenant)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  const { tenantSlug } = await params

  if (!session?.user) return forbidden()
  if (session.user.role === 'VENDEDOR') return forbidden()
  if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantSlug !== tenantSlug) {
    return forbidden()
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const body = await req.json()
  const {
    toneOfVoice, businessHoursStart, businessHoursEnd,
    evolutionInstanceName, currentCampaigns, additionalPolicies,
  } = body

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      toneOfVoice,
      businessHoursStart,
      businessHoursEnd,
      evolutionInstanceName: evolutionInstanceName || null,
      briefing: {
        upsert: {
          create: { currentCampaigns, additionalPolicies },
          update: { currentCampaigns, additionalPolicies },
        },
      },
    },
    include: { briefing: true },
  })

  return ok(updated)
}

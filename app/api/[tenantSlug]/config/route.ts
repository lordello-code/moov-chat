import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'
import { Prisma } from '@prisma/client'

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
    toneOfVoice, businessHoursStart, businessHoursEnd, evolutionInstanceName,
    // Campos do briefing (legados)
    currentCampaigns, additionalPolicies,
    // Novos campos do meta (briefing guiado)
    cidade, marcas, foco, diferencial,
    formasPagamento, aceitaTroca, condicaoTroca, prazoEntrega,
    validadeCampanha, nomeAtendente,
  } = body

  // Construir o objeto meta apenas com os campos presentes no body
  const metaFields: Record<string, unknown> = {}
  if (cidade          !== undefined) metaFields.cidade          = cidade
  if (marcas          !== undefined) metaFields.marcas          = marcas
  if (foco            !== undefined) metaFields.foco            = foco
  if (diferencial     !== undefined) metaFields.diferencial     = diferencial
  if (formasPagamento !== undefined) metaFields.formasPagamento = formasPagamento
  if (aceitaTroca     !== undefined) metaFields.aceitaTroca     = aceitaTroca
  if (condicaoTroca   !== undefined) metaFields.condicaoTroca   = condicaoTroca
  if (prazoEntrega    !== undefined) metaFields.prazoEntrega    = prazoEntrega
  if (validadeCampanha !== undefined) metaFields.validadeCampanha = validadeCampanha
  if (nomeAtendente   !== undefined) metaFields.nomeAtendente   = nomeAtendente

  // Buscar meta existente para merge (não sobrescrever campos não enviados)
  const existingBriefing = await prisma.briefing.findUnique({ where: { tenantId: tenant.id } })
  const existingMeta = (existingBriefing?.meta as Record<string, unknown>) ?? {}
  const mergedMeta = { ...existingMeta, ...metaFields } as Prisma.InputJsonValue

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      toneOfVoice,
      businessHoursStart,
      businessHoursEnd,
      evolutionInstanceName: evolutionInstanceName || null,
      briefing: {
        upsert: {
          create: { currentCampaigns, additionalPolicies, meta: mergedMeta },
          update: { currentCampaigns, additionalPolicies, meta: mergedMeta },
        },
      },
    },
    include: { briefing: true },
  })

  return ok(updated)
}

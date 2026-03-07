import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden, notFound } from '@/lib/api-response'
import { getNextVendedor } from '@/lib/lead-assignment'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (session?.user?.role === 'VENDEDOR') return forbidden()
  const { tenantSlug, id } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return notFound('Loja')

  const lead = await prisma.lead.findFirst({ where: { id, tenantId: tenant.id } })
  if (!lead) return notFound('Lead')

  const body = await req.json().catch(() => ({}))
  // Atribuição manual ou round-robin
  const vendedorId = body.vendedorId ?? await getNextVendedor(tenant.id)
  if (!vendedorId) return err('Nenhum vendedor disponível', 'NO_VENDEDOR', 422)

  const updated = await prisma.lead.update({
    where: { id },
    data:  { assignedVendedorId: vendedorId },
  })

  await prisma.leadAssignment.create({
    data: {
      leadId:     id,
      vendedorId,
      assignedBy: session?.user?.id,
      reason:     body.reason ?? (body.vendedorId ? 'manual' : 'round_robin'),
    },
  })

  return ok(updated)
}

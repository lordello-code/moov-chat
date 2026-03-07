import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden, notFound } from '@/lib/api-response'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'GERENTE' && session?.user?.role !== 'SUPER_ADMIN') {
    return forbidden()
  }
  const { id } = await params

  const approval = await prisma.priceApproval.findUnique({ where: { id } })
  if (!approval) return notFound('Aprovação')

  const { status, notes } = await req.json()
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return err('Status inválido. Use APPROVED ou REJECTED')
  }

  await prisma.priceApproval.update({
    where: { id },
    data: {
      status,
      notes,
      approvedById: session.user.id,
      resolvedAt:   new Date(),
    },
  })

  // Se aprovado: aplica o preço proposto ao produto
  if (status === 'APPROVED') {
    if (approval.productType === '0km') {
      await prisma.tenantProduct0km.update({
        where: { id: approval.productId },
        data: { price: approval.proposedPrice, pendingPrice: null },
      })
    } else if (approval.productType === 'used') {
      await prisma.usedMotorcycle.update({
        where: { id: approval.productId },
        data: { price: approval.proposedPrice },
      })
    }
  } else if (status === 'REJECTED') {
    // Limpa o preço pendente
    if (approval.productType === '0km') {
      await prisma.tenantProduct0km.update({
        where: { id: approval.productId },
        data: { pendingPrice: null },
      })
    }
  }

  return ok({ status })
}

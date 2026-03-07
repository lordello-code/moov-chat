import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden, notFound } from '@/lib/api-response'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (session?.user?.role === 'VENDEDOR') return forbidden()
  const { tenantSlug, id } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return notFound('Loja')

  const product = await prisma.tenantProduct0km.findFirst({
    where: { id, tenantId: tenant.id },
  })
  if (!product) return notFound('Produto')

  const body = await req.json()

  // Política de aprovação de preço ativa e preço alterado
  if (
    tenant.policyPriceApproval &&
    body.price !== undefined &&
    Number(body.price) !== Number(product.price)
  ) {
    await prisma.priceApproval.create({
      data: {
        tenantId:      tenant.id,
        productType:   '0km',
        productId:     product.id,
        currentPrice:  product.price,
        proposedPrice: body.price,
        requestedById: session?.user?.id,
      },
    })
    const { price, ...rest } = body
    await prisma.tenantProduct0km.update({
      where: { id },
      data: { ...rest, pendingPrice: price },
    })
    return ok({ message: 'Preço enviado para aprovação', approvalPending: true })
  }

  const updated = await prisma.tenantProduct0km.update({
    where: { id },
    data: {
      price:        body.price,
      modelYear:    body.modelYear,
      color:        body.color,
      availability: body.availability,
      imageUrls:    body.imageUrls,
      videoUrl:     body.videoUrl,
      notes:        body.notes,
      campaignId:   body.campaignId,
    },
  })
  return ok(updated)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (session?.user?.role === 'VENDEDOR') return forbidden()
  const { tenantSlug, id } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return notFound('Loja')

  const product = await prisma.tenantProduct0km.findFirst({ where: { id, tenantId: tenant.id } })
  if (!product) return notFound('Produto')

  await prisma.tenantProduct0km.delete({ where: { id } })
  return ok({ message: 'Produto removido' })
}

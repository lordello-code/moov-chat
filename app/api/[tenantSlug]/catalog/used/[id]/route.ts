import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (session?.user?.role === 'VENDEDOR') return forbidden()
  const { tenantSlug, id } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return notFound('Loja')

  const existing = await prisma.usedMotorcycle.findFirst({ where: { id, tenantId: tenant.id } })
  if (!existing) return notFound('Moto usada')

  const body = await req.json()
  const updated = await prisma.usedMotorcycle.update({
    where: { id },
    data: {
      brand:        body.brand,
      model:        body.model,
      version:      body.version,
      year:         body.year !== undefined ? Number(body.year) : undefined,
      mileage:      body.mileage !== undefined ? Number(body.mileage) : undefined,
      color:        body.color,
      price:        body.price,
      condition:    body.condition,
      notes:        body.notes,
      imageUrls:    body.imageUrls,
      availability: body.availability,
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

  const existing = await prisma.usedMotorcycle.findFirst({ where: { id, tenantId: tenant.id } })
  if (!existing) return notFound('Moto usada')

  await prisma.usedMotorcycle.delete({ where: { id } })
  return ok({ message: 'Moto removida' })
}

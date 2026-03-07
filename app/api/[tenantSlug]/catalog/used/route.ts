import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'

async function getTenant(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { tenantSlug } = await params

  const tenant = await getTenant(tenantSlug)
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const { searchParams } = new URL(req.url)
  const available = searchParams.get('available') === 'true'

  const motorcycles = await prisma.usedMotorcycle.findMany({
    where: {
      tenantId: tenant.id,
      ...(available ? { availability: 'AVAILABLE' } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return ok(motorcycles)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  if (session?.user?.role === 'VENDEDOR') return forbidden()
  const { tenantSlug } = await params

  const tenant = await getTenant(tenantSlug)
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const body = await req.json()

  if (!body.brand || !body.model || !body.year || body.mileage === undefined || !body.price || !body.condition) {
    return err('Campos obrigatórios: brand, model, year, mileage, price, condition')
  }

  const motorcycle = await prisma.usedMotorcycle.create({
    data: {
      brand:        body.brand,
      model:        body.model,
      version:      body.version,
      year:         Number(body.year),
      mileage:      Number(body.mileage),
      color:        body.color,
      price:        body.price,
      condition:    body.condition,
      notes:        body.notes,
      imageUrls:    body.imageUrls ?? [],
      availability: body.availability ?? 'AVAILABLE',
      tenantId:     tenant.id,
    },
  })
  return ok(motorcycle, 201)
}

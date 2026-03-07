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

  const products = await prisma.tenantProduct0km.findMany({
    where: {
      tenantId: tenant.id,
      ...(available ? { availability: 'AVAILABLE' } : {}),
    },
    include: { globalProduct: true, campaign: true },
    orderBy: { createdAt: 'desc' },
  })
  return ok(products)
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

  if (!body.globalProductId || !body.price) {
    return err('Campos obrigatórios: globalProductId, price')
  }

  const product = await prisma.tenantProduct0km.create({
    data: {
      globalProductId: body.globalProductId,
      price:           body.price,
      modelYear:       body.modelYear,
      color:           body.color,
      availability:    body.availability ?? 'AVAILABLE',
      imageUrls:       body.imageUrls ?? [],
      videoUrl:        body.videoUrl,
      notes:           body.notes,
      campaignId:      body.campaignId,
      tenantId:        tenant.id,
    },
    include: { globalProduct: true },
  })
  return ok(product, 201)
}

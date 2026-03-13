import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()

  const products = await prisma.globalProduct0km.findMany({
    where:   { isActive: true },
    orderBy: [{ brand: 'asc' }, { model: 'asc' }],
  })
  return ok(products)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const { brand, model, version, displacement } = body

  if (!brand || !model) return err('Campos obrigatórios: brand, model')

  const existing = await prisma.globalProduct0km.findFirst({
    where: { brand, model, version: version ?? null },
  })
  if (existing) return err('Produto já cadastrado', 'DUPLICATE', 409)

  const product = await prisma.globalProduct0km.create({
    data: {
      brand,
      model,
      version:      version || null,
      displacement: displacement ? Number(displacement) : null,
    },
  })
  return ok(product, 201)
}

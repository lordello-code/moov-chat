import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()

  const { id } = await params
  const existing = await prisma.globalProduct0km.findUnique({ where: { id } })
  if (!existing) return notFound('Produto')

  const body = await req.json()
  const updated = await prisma.globalProduct0km.update({
    where: { id },
    data: {
      brand:        body.brand        !== undefined ? body.brand        : existing.brand,
      model:        body.model        !== undefined ? body.model        : existing.model,
      version:      body.version      !== undefined ? (body.version || null)  : existing.version,
      displacement: body.displacement !== undefined ? (body.displacement ? Number(body.displacement) : null) : existing.displacement,
    },
  })
  return ok(updated)
}

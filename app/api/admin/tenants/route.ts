import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'
import bcrypt from 'bcryptjs'

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)
  const search   = searchParams.get('search') ?? ''
  const status   = searchParams.get('status') as any

  const where = {
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(status  ? { status } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        plan: { select: { name: true, type: true } },
        _count: { select: { leads: true, users: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count({ where }),
  ])

  return ok({ data, total, page, pageSize })
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const {
    name, razaoSocial, slug, planId, email, phone, address, city, state,
    gerenteNome, gerenteEmail, gerenteWhatsapp,
  } = body

  if (!name || !slug || !planId || !gerenteNome || !gerenteEmail) {
    return err('Campos obrigatórios: name, slug, planId, gerenteNome, gerenteEmail')
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } })
  if (existing) return err('Slug já em uso', 'SLUG_TAKEN', 409)

  const hash = await bcrypt.hash('mudar123', 12)

  const tenant = await prisma.tenant.create({
    data: {
      name, razaoSocial, slug, planId,
      email, phone, address, city, state,
      users: {
        create: {
          name:          gerenteNome,
          email:         gerenteEmail,
          passwordHash:  hash,
          whatsappNotif: gerenteWhatsapp,
          role:          'GERENTE',
        },
      },
      briefing: { create: {} },
    },
    include: { plan: true, users: true },
  })

  return ok(tenant, 201)
}

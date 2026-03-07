import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'
import bcrypt from 'bcryptjs'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  const { tenantSlug } = await params

  if (
    !session?.user ||
    (session.user.tenantSlug !== tenantSlug && session.user.role !== 'SUPER_ADMIN')
  ) {
    return forbidden()
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNotif: true,
      role: true,
      status: true,
      lastLeadAssignedAt: true,
      _count: { select: { assignedLeads: true } },
    },
    orderBy: { name: 'asc' },
  })
  return ok(users)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  const { tenantSlug } = await params

  if (session?.user?.role !== 'GERENTE' && session?.user?.role !== 'SUPER_ADMIN') {
    return forbidden()
  }
  if (session.user.role === 'GERENTE' && session.user.tenantSlug !== tenantSlug) {
    return forbidden()
  }

  const body = await req.json()
  const { name, email, password, phone, whatsappNotif, role } = body

  if (!name || !email || !password || !role) {
    return err('Campos obrigatórios: name, email, password, role')
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return err('E-mail já cadastrado', 'EMAIL_TAKEN', 409)

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordHash: hash, phone, whatsappNotif, role, tenantId: tenant.id },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  })
  return ok(user, 201)
}

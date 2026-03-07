import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden, notFound } from '@/lib/api-response'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  const { tenantSlug, id } = await params

  if (session?.user?.role !== 'GERENTE' && session?.user?.role !== 'SUPER_ADMIN') {
    return forbidden()
  }
  if (session.user.role === 'GERENTE' && session.user.tenantSlug !== tenantSlug) {
    return forbidden()
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const existing = await prisma.user.findFirst({ where: { id, tenantId: tenant.id } })
  if (!existing) return notFound('Usuário')

  const body = await req.json()
  const { name, phone, whatsappNotif, role } = body

  const updated = await prisma.user.update({
    where: { id },
    data: { name, phone, whatsappNotif, role },
    select: { id: true, name: true, email: true, role: true, status: true },
  })
  return ok(updated)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  const { tenantSlug, id } = await params

  if (session?.user?.role !== 'GERENTE' && session?.user?.role !== 'SUPER_ADMIN') {
    return forbidden()
  }
  if (session.user.role === 'GERENTE' && session.user.tenantSlug !== tenantSlug) {
    return forbidden()
  }

  // Soft delete: desativa o usuário
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const existing = await prisma.user.findFirst({ where: { id, tenantId: tenant.id } })
  if (!existing) return notFound('Usuário')

  await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } })
  return ok({ message: 'Usuário desativado' })
}

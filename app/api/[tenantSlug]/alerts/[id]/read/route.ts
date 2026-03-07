import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { id } = await params

  const alert = await prisma.alert.findUnique({ where: { id } })
  if (!alert) return notFound('Alerta')

  await prisma.alert.update({
    where: { id },
    data:  { isRead: true, readAt: new Date() },
  })
  return ok({ ok: true })
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { tenantSlug } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return forbidden()

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const where: Record<string, unknown> = {
    tenantId: tenant.id,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(session.user.role === 'VENDEDOR' ? { userId: session.user.id } : {}),
  }

  const alerts = await prisma.alert.findMany({
    where,
    include: { lead: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })
  return ok(alerts)
}

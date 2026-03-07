import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { tenantSlug, id } = await params

  const conversation = await prisma.conversation.findFirst({
    where:   { id, tenant: { slug: tenantSlug } },
    include: {
      lead:            { include: { assignedVendedor: true } },
      humanAttendant:  { select: { id: true, name: true } },
      handoffSummaries: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!conversation) return notFound('Conversa')
  return ok(conversation)
}

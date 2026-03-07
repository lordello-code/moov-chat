import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { tenantSlug, id } = await params

  const conversation = await prisma.conversation.findFirst({
    where: { id, tenant: { slug: tenantSlug } },
  })
  if (!conversation) return notFound('Conversa')

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      state:           'ATIVA_IA',
      humanAttendantId: null,
    },
  })

  await prisma.eventLog.create({
    data: {
      tenantId:       conversation.tenantId,
      conversationId: conversation.id,
      leadId:         conversation.leadId,
      eventType:      'conversa_devolvida_para_ia',
      actorType:      'humano',
      actorId:        session.user.id,
    },
  })

  return ok(updated)
}

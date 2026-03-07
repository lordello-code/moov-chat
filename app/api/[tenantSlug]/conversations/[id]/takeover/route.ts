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
      state:            'EM_ATENDIMENTO_HUMANO',
      humanAttendantId: session.user.id,
      humanTookOverAt:  new Date(),
      humanSlaStartedAt: null,
    },
  })

  await prisma.eventLog.create({
    data: {
      tenantId:       conversation.tenantId,
      conversationId: conversation.id,
      leadId:         conversation.leadId,
      eventType:      'conversa_assumida_por_humano',
      actorType:      'humano',
      actorId:        session.user.id,
    },
  })

  // Cancelar tarefas de SLA pendentes
  await prisma.scheduledTask.updateMany({
    where: {
      conversationId: id,
      taskType:       { in: ['SLA_ALERT_10MIN', 'SLA_ALERT_30MIN', 'SLA_ALERT_1H', 'SLA_ALERT_2H'] },
      status:         'PENDING',
    },
    data: { status: 'CANCELLED' },
  })

  return ok(updated)
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden, notFound } from '@/lib/api-response'
import { sendText } from '@/lib/evolution'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { id } = await params

  const messages = await prisma.message.findMany({
    where:   { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })
  return ok(messages)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  const session = await auth()
  if (!session?.user) return forbidden()
  const { tenantSlug, id } = await params

  const body = await req.json()
  const { contentType = 'TEXT', contentText, isInternal = false } = body

  if (!contentText) return err('contentText é obrigatório')

  const conversation = await prisma.conversation.findFirst({
    where:   { id, tenant: { slug: tenantSlug } },
    include: { lead: true, tenant: true },
  })
  if (!conversation) return notFound('Conversa')

  const actorType = session.user.role === 'GERENTE' ? 'HUMANO_GERENTE' : 'HUMANO_VENDEDOR'

  const message = await prisma.message.create({
    data: {
      tenantId:       conversation.tenantId,
      conversationId: id,
      actorType,
      actorId:        session.user.id,
      direction:      'OUTBOUND',
      contentType,
      contentText,
      isInternal,
      status:         'PENDING',
    },
  })

  // Enviar via Evolution API (somente mensagens públicas)
  if (!isInternal && conversation.tenant.evolutionInstanceName) {
    try {
      const result = await sendText(
        conversation.tenant.evolutionInstanceName,
        conversation.lead.phone,
        contentText
      )
      await prisma.message.update({
        where: { id: message.id },
        data:  { whatsappMsgId: result?.key?.id, status: 'SENT' },
      })
    } catch (e) {
      console.error('[Messages] Erro ao enviar via Evolution:', e)
    }
  }

  // Atualizar timestamps da conversa
  await prisma.conversation.update({
    where: { id },
    data:  { lastHumanMessageAt: new Date(), lastMessageAt: new Date() },
  })

  // Cancelar alertas de SLA (vendedor respondeu)
  await prisma.scheduledTask.updateMany({
    where: {
      conversationId: id,
      taskType:       { in: ['SLA_ALERT_10MIN', 'SLA_ALERT_30MIN', 'SLA_ALERT_1H', 'SLA_ALERT_2H'] },
      status:         'PENDING',
    },
    data: { status: 'CANCELLED' },
  })

  return ok(message, 201)
}

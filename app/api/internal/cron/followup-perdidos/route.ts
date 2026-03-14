import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/evolution'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 dias atrás

  // Leads perdidos há mais de 3 dias, sem tarefa de reativação já agendada
  const leads = await prisma.lead.findMany({
    where: {
      state:     'PERDIDO',
      updatedAt: { lte: cutoff },
      scheduledTasks: {
        none: {
          taskType: 'REATIVACAO',
          status:   { in: ['PENDING', 'DONE', 'FAILED'] },
        },
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          evolutionInstanceName: true,
        },
      },
    },
    take: 50,
  })

  let sent = 0
  let failed = 0

  for (const lead of leads) {
    if (!lead.phone || !lead.tenant.evolutionInstanceName) {
      failed++
      continue
    }

    const message =
      `Olá${lead.name ? ` ${lead.name}` : ''}! 👋\n\n` +
      `Passamos para dizer que continuamos aqui para ajudar com sua busca pela moto ideal. ` +
      `Se quiser conversar, é só responder esta mensagem. 🏍️\n\n` +
      `— Equipe ${lead.tenant.name}`

    try {
      await sendText(
        lead.tenant.evolutionInstanceName,
        lead.phone,
        message,
      )

      await prisma.scheduledTask.create({
        data: {
          tenantId: lead.tenantId,
          leadId:   lead.id,
          taskType: 'REATIVACAO',
          executeAt: new Date(),
          status:    'DONE',
          payload:   { message, sentAt: new Date().toISOString() },
        },
      })
      sent++
    } catch (err) {
      console.error(`[FollowupPerdidos] Erro ao enviar para ${lead.phone}:`, err)

      await prisma.scheduledTask.create({
        data: {
          tenantId:     lead.tenantId,
          leadId:       lead.id,
          taskType:     'REATIVACAO',
          executeAt:    new Date(),
          status:       'FAILED',
          errorMessage: String(err),
        },
      })
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed: leads.length, sent, failed })
}

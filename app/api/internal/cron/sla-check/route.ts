import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/evolution'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

interface SlaLevel {
  minutes: number
  type: 'SLA_VENDEDOR_10MIN' | 'SLA_VENDEDOR_30MIN' | 'SLA_GERENTE_1H' | 'SLA_GERENTE_2H'
  severity: 'WARNING' | 'CRITICAL'
  notifyGerente: boolean
  label: string
}

const SLA_LEVELS: SlaLevel[] = [
  { minutes:  10, type: 'SLA_VENDEDOR_10MIN', severity: 'WARNING',  notifyGerente: false, label: '10 minutos' },
  { minutes:  30, type: 'SLA_VENDEDOR_30MIN', severity: 'WARNING',  notifyGerente: false, label: '30 minutos' },
  { minutes:  60, type: 'SLA_GERENTE_1H',     severity: 'CRITICAL', notifyGerente: true,  label: '1 hora' },
  { minutes: 120, type: 'SLA_GERENTE_2H',     severity: 'CRITICAL', notifyGerente: true,  label: '2 horas' },
]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let alertsCreated = 0

  // Busca conversas aguardando vendedor com SLA iniciado
  const conversations = await prisma.conversation.findMany({
    where: {
      state:             'AGUARDANDO_VENDEDOR',
      humanSlaStartedAt: { not: null },
    },
    include: {
      lead:   { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true, evolutionInstanceName: true } },
    },
  })

  for (const conv of conversations) {
    if (!conv.humanSlaStartedAt) continue
    const elapsedMs = now.getTime() - conv.humanSlaStartedAt.getTime()
    const elapsedMinutes = Math.floor(elapsedMs / 60_000)

    for (const level of SLA_LEVELS) {
      if (elapsedMinutes < level.minutes) continue

      // Verificar se este nível de alerta já foi criado para esta conversa
      const existing = await prisma.alert.findFirst({
        where: {
          conversationId: conv.id,
          type:           level.type,
        },
      })
      if (existing) continue

      // Buscar destinatários
      const roles: ('VENDEDOR' | 'GERENTE')[] = level.notifyGerente
        ? ['VENDEDOR', 'GERENTE']
        : ['VENDEDOR']

      const users = await prisma.user.findMany({
        where: { tenantId: conv.tenant.id, role: { in: roles }, status: 'ACTIVE' },
      })

      for (const user of users) {
        // Criar Alert no painel
        await prisma.alert.create({
          data: {
            tenantId:       conv.tenant.id,
            leadId:         conv.lead.id,
            conversationId: conv.id,
            userId:         user.id,
            type:           level.type,
            severity:       level.severity,
            message:        `⏰ SLA ${level.label}: ${conv.lead.name ?? conv.lead.phone} aguarda atendimento há ${elapsedMinutes} minutos`,
          },
        })
        alertsCreated++

        // Enviar WhatsApp (se usuário tem número e tenant tem Evolution)
        if (user.whatsappNotif && conv.tenant.evolutionInstanceName) {
          try {
            const emoji = level.severity === 'CRITICAL' ? '🚨' : '⚠️'
            await sendText(
              conv.tenant.evolutionInstanceName,
              user.whatsappNotif.replace(/\D/g, ''),
              `${emoji} *MOOV Chat — SLA Alert*\n\nO lead *${conv.lead.name ?? conv.lead.phone}* aguarda atendimento há *${elapsedMinutes} minutos*.\n\nAcesse o painel para assumir o atendimento.`,
            )
          } catch (e) {
            console.error(`[SLA Cron] Erro ao enviar WhatsApp para ${user.email}:`, e)
          }
        }
      }

      console.log(`[SLA Cron] Alert ${level.type} criado para conversa ${conv.id} (${elapsedMinutes}min)`)
    }
  }

  return NextResponse.json({
    ok:            true,
    checked:       conversations.length,
    alertsCreated,
    timestamp:     now.toISOString(),
  })
}

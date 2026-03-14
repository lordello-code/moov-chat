import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/evolution'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const tasks = await prisma.scheduledTask.findMany({
    where: {
      taskType:  'FOLLOWUP_3DIAS',
      status:    'PENDING',
      executeAt: { lte: now },
    },
    include: {
      lead:   { select: { id: true, name: true, phone: true } },
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

  for (const task of tasks) {
    if (!task.lead?.phone || !task.tenant.evolutionInstanceName) {
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data:  { status: 'CANCELLED', errorMessage: 'lead sem telefone ou instância não configurada' },
      })
      failed++
      continue
    }

    const message =
      `Olá${task.lead.name ? ` ${task.lead.name}` : ''}! 🎉\n\n` +
      `Parabéns pela sua nova moto! Esperamos que esteja amando a experiência. 🏍️\n\n` +
      `Caso tenha alguma dúvida ou precise de suporte, conte com a gente. ` +
      `Ficamos felizes com uma avaliação da sua experiência — sua opinião nos ajuda muito!\n\n` +
      `— Equipe ${task.tenant.name}`

    try {
      await sendText(
        task.tenant.evolutionInstanceName,
        task.lead.phone,
        message,
      )

      await prisma.scheduledTask.update({
        where: { id: task.id },
        data:  { status: 'DONE', payload: { message, sentAt: new Date().toISOString() } },
      })
      sent++
    } catch (err) {
      console.error(`[PosVenda] Erro ao enviar para ${task.lead.phone}:`, err)

      await prisma.scheduledTask.update({
        where: { id: task.id },
        data:  { status: 'FAILED', errorMessage: String(err) },
      })
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed: tasks.length, sent, failed })
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  // Validar token da Evolution API
  const token = req.headers.get('apikey')
  if (token !== process.env.EVOLUTION_API_GLOBAL_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantSlug } = await params
  const body = await req.json()

  // Ignorar mensagens enviadas pelo próprio sistema
  if (body.data?.key?.fromMe === true) {
    return NextResponse.json({ ok: true })
  }

  // Processar apenas eventos de mensagem recebida
  if (body.event !== 'messages.upsert') {
    return NextResponse.json({ ok: true })
  }

  // Encaminhar ao n8n de forma assíncrona (fire-and-forget)
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (n8nUrl) {
    fetch(`${n8nUrl}/webhook/whatsapp-inbound`, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Tenant-Slug':     tenantSlug,
        'X-Internal-Secret': process.env.NEXTJS_INTERNAL_API_SECRET ?? '',
      },
      body: JSON.stringify({ ...body, tenantSlug }),
    }).catch(err => console.error('[Webhook] Erro ao encaminhar ao n8n:', err))
  }

  return NextResponse.json({ ok: true })
}

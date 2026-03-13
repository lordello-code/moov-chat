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

  console.log(`[Webhook] messages.upsert recebido para tenant: ${tenantSlug}`)

  // Processar mensagem internamente (chamada direta ao endpoint interno)
  // Em produção, isso será feito via n8n para orquestração avançada
  const internalUrl = `${req.nextUrl.origin}/api/webhooks/internal/process-message`
  fetch(internalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.NEXTJS_INTERNAL_API_SECRET ?? '',
    },
    body: JSON.stringify({ ...body, tenantSlug }),
  })
    .then(res => res.json())
    .then(result => console.log('[Webhook] Processamento concluido:', JSON.stringify(result).substring(0, 200)))
    .catch(err => console.error('[Webhook] Erro ao processar mensagem:', err))

  // Também encaminhar ao n8n (quando disponível) para tracking/logging
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

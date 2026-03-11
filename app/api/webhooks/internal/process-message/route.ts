import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/evolution'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const LLM_MODEL_SDR = process.env.LLM_MODEL_SDR || 'gpt-4o-mini'

const DEFAULT_SDR_PROMPT = `Voce e um assistente de vendas virtual (SDR) da revenda de motos "{storeName}".

Seu papel:
- Atender leads que chegam via WhatsApp de forma amigavel e profissional
- Identificar o interesse do cliente (moto nova, usada, peca, servico)
- Coletar informacoes iniciais (nome, modelo de interesse, orcamento)
- Qualificar o lead e encaminhar para um vendedor humano quando necessario

Tom de voz: {toneOfVoice}

Regras:
- Seja breve e objetivo (mensagens curtas, como no WhatsApp)
- Use emojis com moderacao
- Nunca invente precos ou condicoes de pagamento
- Se o cliente perguntar sobre preco, diga que vai verificar com a equipe
- Se o cliente demonstrar urgencia ou interesse forte, sinalize que vai conectar com um vendedor
- Responda sempre em portugues brasileiro`

// ─── Monta contexto rico da loja a partir do briefing ────────────────────────
function buildBriefingContext(
  briefing: {
    brands: string[]
    currentCampaigns: string | null
    additionalPolicies: string | null
    meta: unknown
  } | null,
  toneOfVoice: string | null,
): string {
  if (!briefing) return ''

  const meta = (briefing.meta ?? {}) as Record<string, unknown>
  const parts: string[] = []

  // Bloco: Sobre a loja
  const lojaLines = [
    meta.cidade       && `Cidade/Bairro: ${meta.cidade}`,
    meta.marcas       && `Marcas: ${meta.marcas}`,
    meta.foco         && `Segmento: ${meta.foco}`,
    meta.diferencial  && `Diferencial: ${meta.diferencial}`,
  ].filter(Boolean)
  if (lojaLines.length) parts.push(`SOBRE A LOJA:\n${lojaLines.join('\n')}`)

  // Bloco: Políticas comerciais
  const politicasLines: string[] = []
  if (Array.isArray(meta.formasPagamento) && (meta.formasPagamento as string[]).length) {
    politicasLines.push(`Pagamento aceito: ${(meta.formasPagamento as string[]).join(', ')}`)
  }
  if (meta.aceitaTroca === true) {
    politicasLines.push(`Aceita troca: Sim${meta.condicaoTroca ? ` — ${meta.condicaoTroca}` : ''}`)
  } else if (meta.aceitaTroca === false) {
    politicasLines.push('Aceita troca: Não')
  }
  if (meta.prazoEntrega)           politicasLines.push(`Prazo entrega 0km: ${meta.prazoEntrega}`)
  if (briefing.additionalPolicies) politicasLines.push(briefing.additionalPolicies)
  if (politicasLines.length) parts.push(`POLÍTICAS COMERCIAIS:\n${politicasLines.join('\n')}`)

  // Bloco: Campanhas ativas
  const campanhasLines = [
    briefing.currentCampaigns || meta.currentCampaigns,
    meta.validadeCampanha && `Válida até: ${meta.validadeCampanha}`,
  ].filter(Boolean)
  if (campanhasLines.length) parts.push(`CAMPANHAS ATIVAS:\n${campanhasLines.join('\n')}`)

  // Bloco: Tom de voz
  const tomLines = [
    toneOfVoice        && `Tom de voz: ${toneOfVoice}`,
    meta.nomeAtendente && `Nome do atendente: ${meta.nomeAtendente}`,
  ].filter(Boolean)
  if (tomLines.length) parts.push(`TOM DE VOZ:\n${tomLines.join('\n')}`)

  if (!parts.length) return ''
  return `\n\n--- INFORMAÇÕES DA LOJA ---\n${parts.join('\n\n')}`
}

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.NEXTJS_INTERNAL_API_SECRET) {
    console.error('[ProcessMessage] Unauthorized - invalid internal secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { tenantSlug, data, event } = body

    console.log(`[ProcessMessage] Received event: ${event} for tenant: ${tenantSlug}`)

    // Should already be filtered by the webhook handler, but double-check
    if (event !== 'messages.upsert') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'not messages.upsert' })
    }

    // Extract message data from Evolution API payload
    const remoteJid = data?.key?.remoteJid as string
    const whatsappMsgId = data?.key?.id as string
    const pushName = data?.pushName as string | undefined
    const messageText = (
      data?.message?.conversation ||
      data?.message?.extendedTextMessage?.text ||
      ''
    ) as string

    if (!remoteJid || !messageText) {
      console.warn('[ProcessMessage] Missing remoteJid or messageText', { remoteJid, messageText: messageText?.substring(0, 50) })
      return NextResponse.json({ error: 'Missing message data' }, { status: 400 })
    }

    // Skip group messages
    if (remoteJid.endsWith('@g.us')) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'group message' })
    }

    // Clean phone number
    const phone = remoteJid.replace('@s.whatsapp.net', '')
    console.log(`[ProcessMessage] Message from ${phone}: "${messageText.substring(0, 80)}"`)

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { briefing: true },
    })
    if (!tenant) {
      console.error(`[ProcessMessage] Tenant '${tenantSlug}' not found`)
      return NextResponse.json({ error: `Tenant '${tenantSlug}' not found` }, { status: 404 })
    }

    // ─── Find or create Lead ───
    let lead = await prisma.lead.findUnique({
      where: { tenantId_phone: { tenantId: tenant.id, phone } },
    })
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          phone,
          name: pushName || null,
          origin: 'WHATSAPP',
          state: 'NOVO_LEAD',
          firstContactAt: new Date(),
        },
      })
      console.log(`[ProcessMessage] New lead created: ${lead.id} (${phone})`)
    }

    // ─── Find or create active Conversation ───
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        state: { notIn: ['FINALIZADA'] },
      },
    })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          state: 'ATIVA_IA',
          currentAgent: 'SDR',
        },
      })
      console.log(`[ProcessMessage] New conversation created: ${conversation.id}`)
    }

    // ─── Check for duplicate message ───
    if (whatsappMsgId) {
      const existing = await prisma.message.findUnique({ where: { whatsappMsgId } })
      if (existing) {
        console.log(`[ProcessMessage] Duplicate message skipped: ${whatsappMsgId}`)
        return NextResponse.json({ ok: true, skipped: true, reason: 'duplicate' })
      }
    }

    // ─── Save inbound message ───
    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        actorType: 'SISTEMA',
        direction: 'INBOUND',
        contentType: 'TEXT',
        contentText: messageText,
        whatsappMsgId,
        status: 'DELIVERED',
      },
    })

    // Update conversation timestamps
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastClientMessageAt: new Date(),
        lastMessageAt: new Date(),
        totalMessages: { increment: 1 },
      },
    })

    console.log(`[ProcessMessage] Inbound message saved. Conversation: ${conversation.id}`)

    // ─── AI Response Generation ───
    // If conversation is not in IA mode, skip AI response
    if (conversation.state !== 'ATIVA_IA') {
      console.log(`[ProcessMessage] Conversation not in AI mode (${conversation.state}), skipping AI response`)
      return NextResponse.json({
        ok: true,
        data: { leadId: lead.id, conversationId: conversation.id, aiSkipped: true },
      })
    }

    // Get conversation history
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    // Build OpenAI messages
    const briefingContext = buildBriefingContext(tenant.briefing, tenant.toneOfVoice)
    const systemPrompt = DEFAULT_SDR_PROMPT
      .replace('{storeName}', tenant.name)
      .replace('{toneOfVoice}', tenant.toneOfVoice || 'Amigavel, profissional e prestativo')
      + briefingContext

    const openaiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]

    for (const msg of history) {
      openaiMessages.push({
        role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
        content: msg.contentText || '',
      })
    }

    // Call OpenAI (if API key is configured)
    let aiResponse = ''

    if (OPENAI_API_KEY && OPENAI_API_KEY.length > 10 && !OPENAI_API_KEY.endsWith('...')) {
      try {
        console.log(`[ProcessMessage] Calling OpenAI (${LLM_MODEL_SDR})...`)
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL_SDR,
            messages: openaiMessages,
            max_tokens: 300,
            temperature: 0.7,
          }),
        })

        if (openaiRes.ok) {
          const openaiData = await openaiRes.json()
          aiResponse = openaiData.choices?.[0]?.message?.content || ''
          console.log(`[ProcessMessage] OpenAI response received (${aiResponse.length} chars)`)
        } else {
          const errorText = await openaiRes.text()
          console.error(`[ProcessMessage] OpenAI error: ${openaiRes.status} ${errorText}`)
        }
      } catch (e) {
        console.error('[ProcessMessage] OpenAI call failed:', e)
      }
    } else {
      console.log('[ProcessMessage] OpenAI API key not configured, using fallback response')
    }

    // Fallback response if OpenAI is not configured or failed
    if (!aiResponse) {
      const greeting = pushName ? ` ${pushName}` : ''
      aiResponse = `Ola${greeting}! Obrigado por entrar em contato com a ${tenant.name}. Como posso te ajudar hoje? Estamos aqui para te ajudar a encontrar a moto ideal!`
      console.log('[ProcessMessage] Using fallback response')
    }

    // ─── Save AI response ───
    const aiMessage = await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        actorType: 'SDR_IA',
        direction: 'OUTBOUND',
        contentType: 'TEXT',
        contentText: aiResponse,
        status: 'PENDING',
      },
    })

    // ─── Send via Evolution API ───
    let sentStatus = 'FAILED'
    let sentWhatsappId: string | null = null
    const instanceName = tenant.evolutionInstanceName

    if (instanceName) {
      try {
        const result = await sendText(instanceName, phone, aiResponse)
        sentStatus = 'SENT'
        sentWhatsappId = result?.key?.id || null
        console.log(`[ProcessMessage] Sent via Evolution API: ${sentWhatsappId}`)
      } catch (e) {
        console.error('[ProcessMessage] Evolution API send failed:', e)
      }
    } else {
      console.warn('[ProcessMessage] Tenant has no evolutionInstanceName configured')
    }

    // Update message status
    await prisma.message.update({
      where: { id: aiMessage.id },
      data: {
        status: sentStatus as 'SENT' | 'FAILED',
        whatsappMsgId: sentWhatsappId,
      },
    })

    // Update conversation timestamps
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastIaMessageAt: new Date(),
        lastMessageAt: new Date(),
        totalMessages: { increment: 1 },
        consecutiveIaMessages: { increment: 1 },
      },
    })

    console.log(`[ProcessMessage] Complete! Lead: ${lead.id}, Conversation: ${conversation.id}, Sent: ${sentStatus}`)

    return NextResponse.json({
      ok: true,
      data: {
        leadId: lead.id,
        conversationId: conversation.id,
        inboundSaved: true,
        aiResponsePreview: aiResponse.substring(0, 80) + '...',
        sentStatus,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error'
    console.error('[ProcessMessage] Unexpected error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

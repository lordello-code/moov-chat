# Flow 01 — Inbound Message Processing

**Trigger:** Webhook POST `/webhook/whatsapp-inbound`
**Headers de entrada:** `X-Tenant-Slug`, `X-Internal-Secret`

## Sequência de Nodes

```
1. Webhook Trigger
   ├─ path: whatsapp-inbound
   └─ httpMethod: POST

2. Validate Secret
   └─ IF X-Internal-Secret !== NEXTJS_INTERNAL_SECRET → STOP 401

3. Set Variables
   ├─ phone      = data.key.remoteJid.split('@')[0]
   ├─ text       = data.message.conversation || data.message.extendedTextMessage.text
   ├─ msgId      = data.key.id
   ├─ pushName   = data.pushName
   └─ tenantSlug = headers['x-tenant-slug']

4. PostgreSQL: Get Tenant
   SELECT id, slug, ia_max_consecutive_messages, evolution_instance_name,
          policy_pix_enabled, policy_reservation, tone_of_voice
   FROM tenants WHERE slug = '{{ $json.tenantSlug }}'
   └─ IF não encontrado → STOP

5. PostgreSQL: Upsert Lead
   INSERT INTO leads (tenant_id, phone, name, origin)
   VALUES (tenantId, phone, pushName, 'WHATSAPP')
   ON CONFLICT (tenant_id, phone) DO UPDATE SET name = EXCLUDED.name
   RETURNING id, state, is_hot, assigned_vendedor_id

6. PostgreSQL: Get or Create Conversation
   SELECT id, state, consecutive_ia_messages, human_sla_started_at
   FROM conversations
   WHERE lead_id = leadId AND state NOT IN ('FINALIZADA', 'PAUSADA')
   ORDER BY created_at DESC LIMIT 1
   → Se não existe: INSERT com state='ATIVA_IA'

7. PostgreSQL: Insert Inbound Message
   INSERT INTO messages (tenant_id, conversation_id, actor_type, direction,
                         content_type, content_text, whatsapp_msg_id, status)
   VALUES (tenantId, convId, 'SISTEMA', 'INBOUND', 'TEXT', text, msgId, 'DELIVERED')

8. IF: state == 'EM_ATENDIMENTO_HUMANO'
   └─ STOP (IA silenciosa, vendedor está respondendo)

9. IF: state == 'AGUARDANDO_VENDEDOR'
   └─ STOP (aguardando, IA não responde)

10. IF: consecutiveIaMessages >= iaMaxConsecutiveMessages
    ├─ UPDATE conversations SET state='PAUSADA'
    └─ STOP

11. Execute Sub-flow: Flow 07 — Prompt Assembly
    Input: { tenantId, agentType: 'SDR', conversationId: convId }
    Output: { systemPrompt }

12. Execute Sub-flow: Flow 06 — Intelligence
    Input: { messageText: text, leadId, tenantId, convId }
    Output: { isHot, hasUrgency, mentionedCompetitor, leadScore }

13. HTTP Request: OpenAI Chat Completions
    POST https://api.openai.com/v1/chat/completions
    Body: {
      model: LLM_MODEL_SDR,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: 500
    }

14. Set: iaResponse = choices[0].message.content

15. IF: iaResponse contains handoff keywords
    ["falar com vendedor","atendente humano","pessoa real","quero falar","responsável"]
    └─ Execute Sub-flow: Flow 02 — Handoff

16. PostgreSQL: Insert Outbound Message
    INSERT INTO messages (tenant_id, conversation_id, actor_type, direction,
                          content_type, content_text, status)
    VALUES (tenantId, convId, 'SDR_IA', 'OUTBOUND', 'TEXT', iaResponse, 'PENDING')

17. HTTP Request: Evolution API — Send Text
    POST {{ EVOLUTION_API_URL }}/message/sendText/{{ evolutionInstanceName }}
    Headers: { apikey: EVOLUTION_TOKEN }
    Body: {
      number: phone,
      options: { delay: 1200, presence: 'composing' },
      textMessage: { text: iaResponse }
    }

18. PostgreSQL: Update Message Status
    UPDATE messages SET whatsapp_msg_id = result.key.id, status = 'SENT'
    WHERE id = messageId

19. PostgreSQL: Update Conversation
    UPDATE conversations SET
      consecutive_ia_messages = consecutive_ia_messages + 1,
      last_ia_message_at = NOW(),
      last_message_at = NOW()

20. PostgreSQL: Cancel pending FOLLOWUP tasks
    UPDATE scheduled_tasks SET status='CANCELLED'
    WHERE conversation_id = convId AND task_type LIKE 'FOLLOWUP_%' AND status='PENDING'

21. PostgreSQL: Create FOLLOWUP_10MIN task
    INSERT INTO scheduled_tasks (tenant_id, lead_id, conversation_id, task_type, execute_at)
    VALUES (tenantId, leadId, convId, 'FOLLOWUP_10MIN', NOW() + INTERVAL '10 minutes')

22. PostgreSQL: Insert EventLog
    INSERT INTO event_logs (tenant_id, conversation_id, lead_id, event_type, actor_type, payload)
    VALUES (tenantId, convId, leadId, 'mensagem_enviada_ia', 'sdr_ia', { model: LLM_MODEL_SDR })
```

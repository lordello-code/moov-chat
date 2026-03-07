# Flow 04 — Follow-up Automático (Cron)

**Trigger:** Cron a cada 2 minutos
**Objetivo:** Enviar follow-ups para leads sem resposta

## Sequência de Nodes

```
1. Cron Trigger — a cada 2 minutos

2. PostgreSQL: Get Pending FOLLOWUP Tasks
   SELECT st.*, t.evolution_instance_name, t.tone_of_voice,
          l.name, l.phone, l.primary_interest,
          c.id as conv_id, c.state
   FROM scheduled_tasks st
   JOIN tenants t ON t.id = st.tenant_id
   JOIN leads l ON l.id = st.lead_id
   JOIN conversations c ON c.id = st.conversation_id
   WHERE st.task_type LIKE 'FOLLOWUP_%'
     AND st.status = 'PENDING'
     AND st.execute_at <= NOW()
     AND c.state IN ('ATIVA_IA', 'AGUARDANDO_RESPOSTA_CLIENTE')

3. Loop: For each task

   3a. Set follow-up message based on task_type:
       - FOLLOWUP_10MIN  → 'Olá {{ name }}! Ainda posso ajudar com {{ interest }}? 😊'
       - FOLLOWUP_6H     → 'Boa tarde! Você conseguiu pensar na proposta?'
       - FOLLOWUP_3DIAS  → 'Oi {{ name }}, tudo bem? Ainda tem interesse?'

   3b. HTTP Request: OpenAI — Personalizar mensagem
       (Opcional: usar LLM para personalizar baseado no histórico)

   3c. HTTP Request: Evolution API — Send Text
       POST /message/sendText/{{ instanceName }}
       Body: { number: phone, textMessage: { text: followupMessage } }

   3d. PostgreSQL: Insert Outbound Message
       INSERT INTO messages (tenant_id, conversation_id, actor_type, direction,
                             content_type, content_text)
       VALUES (tenantId, convId, 'SDR_IA', 'OUTBOUND', 'TEXT', followupMessage)

   3e. Escalonar próximo follow-up:
       - Se FOLLOWUP_10MIN → create FOLLOWUP_6H (execute_at + 6h)
       - Se FOLLOWUP_6H    → create FOLLOWUP_3DIAS (execute_at + 3d)
       - Se FOLLOWUP_3DIAS → não criar mais (lead encerrado automaticamente)

   3f. PostgreSQL: Mark task DONE

4. PostgreSQL: Insert EventLog para cada follow-up enviado
```

# Flow 02 — Handoff IA → Vendedor (Sub-flow)

**Trigger:** Execute Workflow (chamado pelo Flow 01 ou pelo Flow 06)
**Input:** `{ convId, leadId, tenantId, phone, reason }`

## Sequência de Nodes

```
1. Execute Workflow Trigger
   Input: { convId, leadId, tenantId, phone, reason }

2. PostgreSQL: Get Conversation + Lead
   SELECT c.*, l.name, l.phone, l.primary_interest, l.assigned_vendedor_id
   FROM conversations c JOIN leads l ON l.id = c.lead_id
   WHERE c.id = convId

3. HTTP Request: LLM — Gerar HandoffSummary
   POST https://api.openai.com/v1/chat/completions
   Body: {
     model: LLM_MODEL_SDR,
     messages: [
       { role: 'system', content: 'Você é um assistente que gera resumos de atendimento...' },
       { role: 'user',   content: 'Gere um resumo do atendimento para o vendedor...' }
     ]
   }

4. PostgreSQL: Insert HandoffSummary
   INSERT INTO handoff_summaries (
     conversation_id, vendedor_id, client_name, client_phone,
     contact_reason, model_interest, urgency_signals,
     negotiation_status, handoff_reason, next_step_suggested
   ) VALUES (...)

5. PostgreSQL: Update Conversation
   UPDATE conversations SET
     state = 'AGUARDANDO_VENDEDOR',
     human_sla_started_at = NOW(),
     consecutive_ia_messages = 0
   WHERE id = convId

6. PostgreSQL: Get Assigned Vendedor (ou round-robin)
   SELECT u.id, u.name, u.whatsapp_notif
   FROM users u
   WHERE u.id = assignedVendedorId (ou round-robin)

7. HTTP Request: Evolution API — Notificar Vendedor
   POST /message/sendText/{{ instanceName }}
   Body: {
     number: vendedor.whatsapp_notif,
     textMessage: { text: '🔔 Novo lead aguardando! {{ lead.name }} quer {{ primaryInterest }}' }
   }

8. PostgreSQL: Create SLA_ALERT_10MIN task
   INSERT INTO scheduled_tasks (task_type, execute_at, tenant_id, lead_id, conversation_id)
   VALUES ('SLA_ALERT_10MIN', NOW() + INTERVAL '10 minutes', ...)

9. PostgreSQL: Create Alert
   INSERT INTO alerts (tenant_id, lead_id, conversation_id, user_id, type, severity, message)
   VALUES (tenantId, leadId, convId, vendedorId, 'SLA_VENDEDOR', 'WARNING',
           'Lead aguardando atendimento humano')

10. PostgreSQL: Insert EventLog
    INSERT INTO event_logs (..., event_type='handoff_solicitado', payload={reason})
```

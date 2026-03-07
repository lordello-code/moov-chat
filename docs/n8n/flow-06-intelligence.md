# Flow 06 — Intelligence Agent (Sub-flow)

**Trigger:** Execute Workflow (chamado pelo Flow 01)
**Input:** `{ messageText, leadId, tenantId, convId }`
**Output:** `{ isHot, hasUrgency, mentionedCompetitor, leadScore, shouldHandoff, handoffReason }`

## Sequência de Nodes

```
1. Execute Workflow Trigger

2. HTTP Request: OpenAI — Classify Intent
   POST https://api.openai.com/v1/chat/completions
   Body: {
     model: LLM_MODEL_SDR,
     messages: [
       {
         role: 'system',
         content: `Você é um classificador de intenções para vendas de motos.
                   Analise a mensagem e retorne JSON com:
                   - is_hot: boolean (lead com alta intenção de compra)
                   - has_urgency: boolean (precisa urgente, hoje, amanhã)
                   - mentioned_competitor: boolean (citou outra loja/marca)
                   - lead_score: 0-100
                   - should_handoff: boolean (quer falar com humano)
                   - handoff_reason: string (se should_handoff)
                   - intent: "interest"|"negotiation"|"objection"|"support"|"other"`
       },
       { role: 'user', content: messageText }
     ],
     response_format: { type: 'json_object' }
   }

3. Set: Parse JSON response
   ├─ isHot               = result.is_hot
   ├─ hasUrgency          = result.has_urgency
   ├─ mentionedCompetitor = result.mentioned_competitor
   ├─ leadScore           = result.lead_score
   ├─ shouldHandoff       = result.should_handoff
   └─ handoffReason       = result.handoff_reason

4. PostgreSQL: Update Lead Intelligence
   UPDATE leads SET
     is_hot                = isHot,
     has_urgency           = hasUrgency,
     mentioned_competitor  = mentionedCompetitor,
     lead_score            = leadScore
   WHERE id = leadId

5. IF: mentionedCompetitor == true
   └─ INSERT into alerts (type='CONCORRENTE_DETECTADO', severity='WARNING')

6. IF: hasUrgency == true AND leadScore > 70
   └─ INSERT into alerts (type='URGENCIA_DETECTADA', severity='CRITICAL')
      + UPDATE leads SET is_hot = true

7. Return: { isHot, hasUrgency, mentionedCompetitor, leadScore, shouldHandoff, handoffReason }
```

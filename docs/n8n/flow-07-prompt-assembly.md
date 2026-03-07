# Flow 07 — Prompt Assembly (Sub-flow)

**Trigger:** Execute Workflow (chamado pelo Flow 01)
**Input:** `{ tenantId, agentType, conversationId }`
**Output:** `{ systemPrompt }` (string completa pronta para o LLM)

## Sequência de Nodes

```
1. Execute Workflow Trigger

2. PostgreSQL: Get Tenant Context
   SELECT t.name, t.tone_of_voice, t.policy_pix_enabled,
          t.policy_reservation, t.policy_on_order, t.policy_exchange,
          t.policy_payment_warning, t.policy_security_message,
          t.ia_max_consecutive_messages,
          b.current_campaigns, b.additional_policies
   FROM tenants t LEFT JOIN briefings b ON b.tenant_id = t.id
   WHERE t.id = tenantId

3. PostgreSQL: Get Active Prompt Config
   SELECT prompt_base, block_store_context, block_policies, block_security,
          block_campaigns, block_handoff, block_tone_of_voice
   FROM prompt_configs
   WHERE tenant_id = tenantId AND agent_type = agentType AND is_active = true
   ORDER BY version DESC LIMIT 1
   → Se não encontrado: usar prompt global (tenant_id IS NULL)

4. PostgreSQL: Get Catalog Context (últimas 20 motos disponíveis)
   SELECT gp.brand, gp.model, gp.version, tp.price, tp.availability, tp.color
   FROM tenant_products_0km tp
   JOIN global_products_0km gp ON gp.id = tp.global_product_id
   WHERE tp.tenant_id = tenantId AND tp.availability = 'AVAILABLE'
   ORDER BY tp.created_at DESC LIMIT 20

5. PostgreSQL: Get Recent Conversation (últimas 10 mensagens)
   SELECT actor_type, direction, content_text, created_at
   FROM messages
   WHERE conversation_id = conversationId
   ORDER BY created_at DESC LIMIT 10

6. Set: Assemble System Prompt
   promptFinal = [
     promptBase,
     '## Contexto da Loja\n' + blockStoreContext,
     '## Políticas\n' + blockPolicies,
     '## Segurança\n' + blockSecurity,
     '## Campanhas Ativas\n' + (blockCampaigns || currentCampaigns),
     '## Tom de Voz\n' + (blockToneOfVoice || toneOfVoice),
     '## Handoff\n' + blockHandoff,
     '## Catálogo Resumido\n' + formatCatalog(products),
     '## Histórico Recente\n' + formatHistory(messages),
   ].filter(Boolean).join('\n\n')

7. Return: { systemPrompt: promptFinal }
```

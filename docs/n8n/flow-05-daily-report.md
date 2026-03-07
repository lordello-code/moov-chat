# Flow 05 — Relatório Diário (Cron)

**Trigger:** Cron diário às 08:00 (horário do tenant)
**Objetivo:** Enviar resumo do dia anterior para gerentes

## Sequência de Nodes

```
1. Cron Trigger — todos os dias às 08:00

2. PostgreSQL: Get Active Tenants
   SELECT t.id, t.name, t.evolution_instance_name,
          u.whatsapp_notif, u.name as gerente_name
   FROM tenants t
   JOIN users u ON u.tenant_id = t.id AND u.role = 'GERENTE' AND u.status = 'ACTIVE'
   WHERE t.status = 'ACTIVE'

3. Loop: For each tenant

   3a. PostgreSQL: Calculate Yesterday's Metrics
       SELECT
         COUNT(*) as total_leads,
         SUM(CASE WHEN state = 'VENDIDO' THEN 1 ELSE 0 END) as vendidos,
         SUM(CASE WHEN state = 'PERDIDO' THEN 1 ELSE 0 END) as perdidos,
         SUM(CASE WHEN is_hot = true     THEN 1 ELSE 0 END) as hot_leads
       FROM leads
       WHERE tenant_id = tenantId
         AND created_at >= CURRENT_DATE - 1
         AND created_at < CURRENT_DATE

   3b. PostgreSQL: Get Vendedor Performance
       SELECT u.name, COUNT(l.id) as leads_count
       FROM users u
       LEFT JOIN leads l ON l.assigned_vendedor_id = u.id
         AND l.created_at >= CURRENT_DATE - 1
       WHERE u.tenant_id = tenantId AND u.role = 'VENDEDOR'
       GROUP BY u.id, u.name
       ORDER BY leads_count DESC

   3c. Set: Format Report Message
       '📊 Relatório MOOV Chat — {{ yesterday }}
        ───────────────────
        Leads recebidos: {{ total_leads }}
        Vendas realizadas: {{ vendidos }}
        Leads perdidos: {{ perdidos }}
        Leads quentes: {{ hot_leads }}

        Top Vendedores:
        {{ vendedor_ranking }}

        Bom dia, {{ gerente_name }}! 🚀'

   3d. HTTP Request: Evolution API — Send Text
       POST /message/sendText/{{ instanceName }}
       Body: { number: gerente.whatsapp_notif, textMessage: { text: report } }

   3e. PostgreSQL: Insert DailyReport
       INSERT INTO daily_reports (tenant_id, date, total_leads, sold_leads,
                                  lost_leads, hot_leads, report_sent_at)
       VALUES (...)
```

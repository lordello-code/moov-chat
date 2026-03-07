# Flow 03 — SLA Alerts (Cron)

**Trigger:** Cron a cada 5 minutos
**Objetivo:** Notificar vendedores/gerentes sobre SLAs vencidos

## Sequência de Nodes

```
1. Cron Trigger — a cada 5 minutos

2. PostgreSQL: Get Pending SLA Tasks
   SELECT st.*, t.evolution_instance_name,
          l.name as lead_name, l.phone as lead_phone,
          u.whatsapp_notif, u.name as user_name
   FROM scheduled_tasks st
   JOIN tenants t ON t.id = st.tenant_id
   JOIN leads l ON l.id = st.lead_id
   LEFT JOIN conversations c ON c.id = st.conversation_id
   LEFT JOIN users u ON u.id = c.human_attendant_id
   WHERE st.task_type IN ('SLA_ALERT_10MIN','SLA_ALERT_30MIN','SLA_ALERT_1H','SLA_ALERT_2H')
     AND st.status = 'PENDING'
     AND st.execute_at <= NOW()

3. Loop: For each task

   3a. IF task_type == 'SLA_ALERT_10MIN'
       ├─ Notificar vendedor: '⚠️ 10min sem resposta para {{ lead_name }}'
       ├─ Criar SLA_ALERT_30MIN para daqui 20min
       └─ Mark task DONE

   3b. IF task_type == 'SLA_ALERT_30MIN'
       ├─ Notificar gerente: '🚨 30min sem resposta: {{ lead_name }}'
       ├─ Criar SLA_ALERT_1H para daqui 30min
       └─ Mark task DONE

   3c. IF task_type == 'SLA_ALERT_1H'
       ├─ Notificar gerente com CRITICAL: '🔴 1h sem resposta!'
       ├─ Criar SLA_ALERT_2H para daqui 1h
       ├─ INSERT alert severity=CRITICAL
       └─ Mark task DONE

   3d. IF task_type == 'SLA_ALERT_2H'
       ├─ Notificar gerente: '💀 2h sem resposta — verificar lead {{ lead_name }}'
       ├─ UPDATE lead SET is_hot = true
       └─ Mark task DONE

4. HTTP Request: Evolution API — Send Text (para cada notificação)
   POST /message/sendText/{{ instanceName }}

5. PostgreSQL: Update scheduled_tasks SET status='DONE' WHERE id = taskId
```

# n8n Flows — MOOV Chat

## Como importar

1. Acesse o n8n em `http://localhost:5678`
2. Menu → **Workflows → Import from File**
3. Selecione o arquivo JSON do flow desejado
4. Configure as credenciais (PostgreSQL, OpenAI, Evolution API)
5. Ative o workflow

## Credenciais necessárias

| Credencial | Tipo | Valores |
|---|---|---|
| PostgreSQL | Database | host=supabase-pooler, port=6543, db=postgres |
| OpenAI | API Key | `OPENAI_API_KEY` do `.env` |
| Evolution API | HTTP Header | `apikey: EVOLUTION_API_GLOBAL_TOKEN` |
| Next.js Internal | HTTP Header | `X-Internal-Secret: NEXTJS_INTERNAL_API_SECRET` |

## Ordem de importação

1. `flow-07-prompt-assembly.json` — sub-flow, sem trigger próprio
2. `flow-06-intelligence.json`    — sub-flow, sem trigger próprio
3. `flow-02-handoff.json`         — sub-flow, sem trigger próprio
4. `flow-01-inbound.json`         — **webhook trigger** (principal)
5. `flow-03-sla-alerts.json`      — cron a cada 5 min
6. `flow-04-followup.json`        — cron a cada 2 min
7. `flow-05-daily-report.json`    — cron diário às 08:00

## Variáveis de ambiente no n8n

Configure em **Settings → Environment Variables**:

```env
NEXTJS_URL=http://host.docker.internal:3000
EVOLUTION_API_URL=http://evolution:8080
EVOLUTION_TOKEN=seu-token-global-aqui
LLM_MODEL_SDR=gpt-4o-mini
LLM_MODEL_VENDEDOR=gpt-4o
NEXTJS_INTERNAL_SECRET=<igual ao NEXTJS_INTERNAL_API_SECRET do .env>
```

## Pseudocódigo dos flows

Ver arquivos `flow-XX-*.md` nesta pasta para a lógica detalhada de cada flow.
Os JSONs finais são gerados pelo n8n após construção visual ou via importação.

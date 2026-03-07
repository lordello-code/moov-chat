# MOOV Chat — Plano de Validação Local

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rodar o MOOV Chat end-to-end localmente — UI funcionando, WhatsApp recebendo mensagens e IA respondendo — para validar o produto antes do deploy em VPS.

**Architecture:** Next.js local → Supabase (DB cloud) + n8n local + Evolution API local + ngrok (túnel público para webhooks WhatsApp).

**Tech Stack:** Node 24, npm, Docker Compose, Supabase, ngrok, OpenAI API, Evolution API, n8n

**Pré-requisitos que o usuário precisa ter:**
- Conta Supabase (gratuita): https://supabase.com
- Chave OpenAI API (gpt-4o-mini é suficiente): https://platform.openai.com/api-keys
- ngrok conta gratuita: https://ngrok.com
- Número WhatsApp dedicado para testes (chip de homologação — NÃO use o pessoal)

---

## Task 1: Criar projeto Supabase e configurar .env

**Files:**
- Create: `.env` (copiado de `.env.example` e preenchido)

**Step 1: Criar projeto no Supabase**

1. Acesse https://supabase.com → "New Project"
2. Nome: `moovchat-dev` | Senha do DB: anote em local seguro | Region: South America (São Paulo)
3. Aguarde ~2 min o projeto ser criado

**Step 2: Obter as URLs do banco**

Em Settings → Database → Connection String:
- Copie a aba **Transaction** (porta 6543) → será o `DATABASE_URL`
- Copie a aba **Session** (porta 5432) → será o `DIRECT_URL`

Formato: `postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

**Step 3: Gerar NEXTAUTH_SECRET**

```bash
openssl rand -base64 32
```

Copie o output.

**Step 4: Criar `.env` na raiz do projeto**

```bash
cp .env.example .env
```

Abra `.env` e preencha:

```env
DATABASE_URL="postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[saída do openssl acima]"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_GLOBAL_TOKEN="moovchat-token-local-123"
N8N_WEBHOOK_URL="http://localhost:5678"
N8N_API_KEY="moovchat-n8n-key-123"
N8N_ENCRYPTION_KEY="[32 chars — gere com: openssl rand -hex 16]"
NEXTJS_INTERNAL_API_SECRET="moovchat-internal-secret-123"
OPENAI_API_KEY="sk-..."
LLM_PROVIDER_SDR="openai"
LLM_MODEL_SDR="gpt-4o-mini"
LLM_PROVIDER_VENDEDOR="openai"
LLM_MODEL_VENDEDOR="gpt-4o"
LLM_PROVIDER_INTELLIGENCE="openai"
LLM_MODEL_INTELLIGENCE="gpt-4o-mini"
```

**Step 5: Adicionar DIRECT_URL ao schema.prisma**

Abrir `prisma/schema.prisma` e adicionar `directUrl`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Expected: arquivo salvo.

**Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "chore: adicionar directUrl no schema para Supabase"
```

---

## Task 2: Instalar dependências e rodar migrations

**Files:**
- Executa: `npm install`, `prisma migrate dev`, `prisma db seed`

**Step 1: Instalar dependências**

```bash
npm install
```

Expected: pasta `node_modules/` criada, sem erros críticos.

**Step 2: Gerar client Prisma**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`.

**Step 3: Rodar migration**

```bash
npx prisma migrate dev --name init
```

Expected: `Your database is now in sync with your schema.`

Se der erro de conexão: verificar DATABASE_URL e DIRECT_URL no `.env`.

**Step 4: Rodar seed**

```bash
npx prisma db seed
```

Expected: `Seed concluído`

Isso cria:
- Planos: Starter (R$197), Pro (R$497), Enterprise (R$997)
- Super Admin: `admin@moovchat.com` / senha `admin123`

**Step 5: Abrir Supabase Table Editor**

Acesse https://supabase.com → seu projeto → Table Editor.
Verifique que as tabelas foram criadas (plans, users, tenants, leads, etc.).

---

## Task 3: Rodar Next.js e validar UI

**Step 1: Iniciar servidor de desenvolvimento**

```bash
npm run dev
```

Expected: `✓ Ready in Xs — http://localhost:3000`

**Step 2: Fazer login como super admin**

Abra http://localhost:3000
- Email: `admin@moovchat.com`
- Senha: `admin123`

Expected: redirecionado para `/admin/dashboard`

**Step 3: Criar primeira loja (tenant)**

1. Menu → Lojas → Nova Loja
2. Preencha:
   - Nome: `Moto Teste Ltda`
   - Slug: `moto-teste`
   - Plano: Starter
   - WhatsApp: `+5511999990000` (número fictício por ora)
3. Salve

Expected: loja aparece na lista.

**Step 4: Criar usuários da loja**

Acesse `/moto-teste/equipe`:
1. Criar um **Gerente**: nome, email, senha
2. Criar um **Vendedor**: nome, email, senha

**Step 5: Verificar fila e inbox**

- Acesse `/moto-teste/fila` → deve mostrar fila vazia
- Acesse `/admin/prompts` → deve mostrar formulário de configuração

Expected: UI funcionando sem erros no console do browser.

**Checkpoint:** UI 100% validada. Se chegou aqui sem erros, a camada Next.js + Supabase está funcionando. ✅

---

## Task 4: Subir n8n + Evolution API localmente

**Step 1: Subir containers**

```bash
docker compose up -d
```

Expected:
```
✔ Container moov-chat-n8n-1        Started
✔ Container moov-chat-evolution-1  Started
```

**Step 2: Verificar n8n**

Abra http://localhost:5678
- Crie conta de admin local (email + senha qualquer — é só local)
- Expected: dashboard do n8n

**Step 3: Configurar variáveis de ambiente no n8n**

n8n → Settings → Environment Variables → adicionar:

| Variável | Valor |
|---|---|
| `NEXTJS_URL` | `http://host.docker.internal:3000` |
| `EVOLUTION_API_URL` | `http://host.docker.internal:8080` |
| `EVOLUTION_TOKEN` | `moovchat-token-local-123` |
| `LLM_MODEL_SDR` | `gpt-4o-mini` |
| `LLM_MODEL_VENDEDOR` | `gpt-4o` |
| `NEXTJS_INTERNAL_SECRET` | `moovchat-internal-secret-123` |

Salvar e reiniciar o n8n se solicitado.

**Step 4: Verificar Evolution API**

```bash
curl http://localhost:8080 -H "apikey: moovchat-token-local-123"
```

Expected: resposta JSON com info da Evolution API.

---

## Task 5: Configurar ngrok (túnel público)

WhatsApp precisa de URL pública para enviar webhooks. ngrok cria um túnel do localhost para internet.

**Step 1: Instalar ngrok**

Baixe em https://ngrok.com/download e instale.
Ou via npm:
```bash
npm install -g ngrok
```

**Step 2: Autenticar ngrok**

```bash
ngrok config add-authtoken [seu-token-do-ngrok]
```

Token disponível em: https://dashboard.ngrok.com/authtokens

**Step 3: Criar túnel para o Next.js**

```bash
ngrok http 3000
```

Expected:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copie a URL https** (ex: `https://abc123.ngrok-free.app`) — será usada nos próximos passos.

**Step 4: Atualizar .env com URL pública**

Edite `.env`:
```env
NEXTAUTH_URL="https://abc123.ngrok-free.app"
NEXT_PUBLIC_APP_URL="https://abc123.ngrok-free.app"
```

Reinicie o Next.js:
```bash
# Ctrl+C no terminal do npm run dev
npm run dev
```

**Step 5: Testar acesso externo**

Abra `https://abc123.ngrok-free.app` no browser.
Expected: página de login do MOOV Chat carrega via ngrok.

> ⚠️ ngrok gratuito: URL muda a cada reinício. Para validação, deixe o terminal aberto.

---

## Task 6: Conectar WhatsApp via Evolution API

**Step 1: Criar instância WhatsApp**

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: moovchat-token-local-123" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "moto-teste",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

Expected: resposta com `{"instance": {"instanceName": "moto-teste", "status": "created"}}`

**Step 2: Obter QR Code**

```bash
curl http://localhost:8080/instance/connect/moto-teste \
  -H "apikey: moovchat-token-local-123"
```

Expected: resposta com `qrcode.base64` — uma string longa.

**Step 3: Visualizar QR Code**

Cole o base64 em https://base64.guru/converter/decode/image
Ou use qualquer conversor base64 → imagem.

**Step 4: Escanear QR Code**

No celular com o chip de homologação:
- WhatsApp → ⋮ → Aparelhos conectados → Conectar aparelho
- Escaneie o QR Code

Expected: `{"instance": {"state": "open"}}` em alguns segundos.

**Step 5: Verificar conexão**

```bash
curl http://localhost:8080/instance/connectionState/moto-teste \
  -H "apikey: moovchat-token-local-123"
```

Expected: `{"instance": {"state": "open"}}`

**Step 6: Configurar webhook para Next.js**

```bash
curl -X POST http://localhost:8080/webhook/set/moto-teste \
  -H "apikey: moovchat-token-local-123" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://abc123.ngrok-free.app/api/webhooks/whatsapp/moto-teste",
      "webhookByEvents": false,
      "webhookBase64": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

Substitua `abc123.ngrok-free.app` pela sua URL do ngrok.

Expected: `{"webhook": {"enabled": true}}`

**Step 7: Atualizar instância na loja**

No admin do MOOV Chat: Lojas → Moto Teste → editar campo `evolutionInstanceName` = `moto-teste`.

---

## Task 7: Construir flows n8n

Os flows estão documentados em `docs/n8n/`. Agora vamos construí-los no n8n UI.

**Ordem de construção (sub-flows primeiro):**

### Flow 07 — Prompt Assembly (sub-flow)

1. n8n → New Workflow → renomear para `MOOV - Flow 07: Prompt Assembly`
2. Adicionar node: **Execute Workflow Trigger** (sem configuração)
3. Adicionar node: **PostgreSQL** → `Get Tenant Context`
   - Credencial: criar credencial PostgreSQL com URL do Supabase
   - Query:
   ```sql
   SELECT t.name, t.tone_of_voice, t.policy_pix_enabled,
          t.policy_reservation, t.policy_on_order, t.policy_exchange,
          b.current_campaigns, b.additional_policies
   FROM tenants t LEFT JOIN briefings b ON b.tenant_id = t.id
   WHERE t.id = '{{ $json.tenantId }}'
   ```
4. Adicionar node: **PostgreSQL** → `Get Active Prompt Config`
   ```sql
   SELECT prompt_base, block_store_context, block_policies, block_security,
          block_campaigns, block_handoff, block_tone_of_voice
   FROM prompt_configs
   WHERE (tenant_id = '{{ $json.tenantId }}' OR tenant_id IS NULL)
     AND agent_type = '{{ $json.agentType }}'
     AND is_active = true
   ORDER BY tenant_id NULLS LAST, version DESC LIMIT 1
   ```
5. Adicionar node: **PostgreSQL** → `Get Catalog`
   ```sql
   SELECT gp.brand, gp.model, gp.version, tp.price, tp.color
   FROM tenant_products_0km tp
   JOIN global_products_0km gp ON gp.id = tp.global_product_id
   WHERE tp.tenant_id = '{{ $json.tenantId }}'
     AND tp.availability = 'AVAILABLE'
   ORDER BY tp.created_at DESC LIMIT 20
   ```
6. Adicionar node: **PostgreSQL** → `Get History`
   ```sql
   SELECT actor_type, direction, content_text
   FROM messages
   WHERE conversation_id = '{{ $json.conversationId }}'
   ORDER BY created_at DESC LIMIT 10
   ```
7. Adicionar node: **Code** → `Assemble Prompt`
   ```javascript
   const tenant = $('Get Tenant Context').first().json;
   const promptCfg = $('Get Active Prompt Config').first().json;
   const products = $('Get Catalog').all().map(i => i.json);
   const history = $('Get History').all().map(i => i.json);

   const catalog = products.map(p =>
     `${p.brand} ${p.model} ${p.version} — R$${p.price} (${p.color})`
   ).join('\n');

   const conv = history.reverse().map(m =>
     `[${m.actor_type}/${m.direction}]: ${m.content_text}`
   ).join('\n');

   const prompt = [
     promptCfg.prompt_base || 'Você é uma assistente de vendas de motos.',
     promptCfg.block_store_context ? `## Contexto\n${promptCfg.block_store_context}` : '',
     promptCfg.block_policies ? `## Políticas\n${promptCfg.block_policies}` : '',
     promptCfg.block_security ? `## Segurança\n${promptCfg.block_security}` : '',
     promptCfg.block_campaigns || tenant.current_campaigns ? `## Campanhas\n${promptCfg.block_campaigns || tenant.current_campaigns}` : '',
     promptCfg.block_tone_of_voice || tenant.tone_of_voice ? `## Tom\n${promptCfg.block_tone_of_voice || tenant.tone_of_voice}` : '',
     promptCfg.block_handoff ? `## Handoff\n${promptCfg.block_handoff}` : '',
     catalog ? `## Catálogo\n${catalog}` : '',
     conv ? `## Histórico\n${conv}` : '',
   ].filter(Boolean).join('\n\n');

   return [{ json: { systemPrompt: prompt } }];
   ```
8. Conectar nodes em sequência. Salvar. Ativar workflow.

> Para os demais flows, siga os pseudocódigos em `docs/n8n/flow-XX-*.md`.
> Priorize para validação: **Flow 01 (Inbound)** — é o que recebe as mensagens.

### Flow 01 — Inbound (webhook principal)

1. New Workflow → `MOOV - Flow 01: Inbound`
2. Node **Webhook**:
   - Path: `whatsapp-inbound`
   - Method: POST
   - Authentication: Header Auth → `X-Internal-Secret` = `moovchat-internal-secret-123`
3. Node **Code** → `Extract Variables`:
   ```javascript
   const data = $json.body?.data || $json.data;
   return [{
     json: {
       phone: data?.key?.remoteJid?.split('@')[0] || '',
       text: data?.message?.conversation || data?.message?.extendedTextMessage?.text || '',
       msgId: data?.key?.id || '',
       pushName: data?.pushName || '',
       tenantSlug: $json.headers?.['x-tenant-slug'] || '',
     }
   }];
   ```
4. Seguir a sequência completa conforme `docs/n8n/flow-01-inbound.md`
5. O node **HTTP Request LLM** chama OpenAI:
   - URL: `https://api.openai.com/v1/chat/completions`
   - Auth: Bearer → `{{ $env.OPENAI_API_KEY }}`
   - Body: `{ "model": "{{ $env.LLM_MODEL_SDR }}", "messages": [...], "max_tokens": 500 }`
6. Salvar. Ativar.

**Webhook URL do flow:** `http://localhost:5678/webhook/whatsapp-inbound`

---

## Task 8: Teste end-to-end

**Step 1: Enviar mensagem WhatsApp para o número de teste**

Do seu celular pessoal, envie uma mensagem para o chip de homologação:
```
Olá, quero saber sobre motos disponíveis
```

**Step 2: Verificar logs no n8n**

n8n → Executions → verificar se Flow 01 foi acionado.

Expected: execução bem-sucedida mostrando todos os nodes verdes.

**Step 3: Verificar resposta no WhatsApp**

O número de homologação deve ter respondido automaticamente.

**Step 4: Verificar no MOOV Chat**

Acesse `/moto-teste/fila`:
- O lead deve aparecer na fila com nome e última mensagem

Acesse o inbox do lead:
- Histórico de mensagens deve aparecer
- Botão "Assumir atendimento" disponível

**Step 5: Testar handoff**

Responda "quero falar com vendedor" no WhatsApp.
Expected:
- Estado do lead muda para `AGUARDANDO_VENDEDOR`
- Alert criado para o vendedor
- No inbox: botão "Assumir" disponível para o vendedor

**Step 6: Vendedor assume e responde**

1. Login como vendedor
2. `/moto-teste/fila` → assumir lead
3. Enviar mensagem pelo inbox
4. Verificar que chegou no WhatsApp do cliente

---

## Task 9: Commit final de validação

```bash
git add .env.example  # se fez alguma melhoria (nunca commitar .env real)
git commit -m "chore: validação local completa — WhatsApp + IA + handoff funcionando"
```

> ⚠️ Nunca commitar o arquivo `.env` — ele contém credenciais reais.
> Verifique que `.gitignore` tem a linha `.env`.

---

## Resultado esperado ao final

| Componente | Status |
|---|---|
| Next.js rodando em localhost:3000 | ✅ |
| Supabase com schema + seed | ✅ |
| Login super admin + criação de tenant | ✅ |
| n8n rodando em localhost:5678 | ✅ |
| Evolution API conectada ao WhatsApp | ✅ |
| Flow 01 respondendo mensagens com IA | ✅ |
| Handoff IA → Vendedor funcionando | ✅ |
| Leads aparecendo na fila e inbox | ✅ |

**Com isso validado, o deploy em VPS é apenas repetir os passos em produção — sem surpresas.**

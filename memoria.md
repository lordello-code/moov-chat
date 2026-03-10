# MOOV Chat — Memória do Projeto

> Arquivo mantido pelo Claude para preservar contexto entre sessões.
> Atualizado em: 2026-03-10 — Plano de Validação Local 100% concluído. Commit: `afab339`

---

## Visão Geral

**Produto:** MOOV Chat — SaaS de assistente de vendas via WhatsApp + IA para revendas de motos.

**Stack:**
- **Frontend/Backend:** Next.js 15 (App Router, TypeScript strict)
- **Banco de dados:** PostgreSQL via Supabase (Prisma 7 + PrismaPg adapter)
- **Auth:** NextAuth v5 (Auth.js) com Credentials provider
- **UI:** Tailwind CSS v4 + shadcn-style components (`@base-ui/react`)
- **Toast:** Sonner v2.0.7
- **Automação:** n8n (porta 5678)
- **WhatsApp:** Evolution API (porta 8080)
- **Tunelamento:** ngrok

**Diretório do projeto:** `C:\Users\USER\Documents\saas-revenda-moto (2)`

---

## Plano de Validação Local — Status

| # | Task | Status |
|---|------|--------|
| 1 | Configurar Supabase + `.env` | ✅ Concluído |
| 2 | Instalar dependências + rodar migrations | ✅ Concluído |
| 3 | Rodar Next.js e validar UI | ✅ Concluído |
| 4 | Subir n8n + Evolution API (Docker) | ✅ Concluído |
| 5 | Configurar ngrok (túnel público) | ✅ Concluído |
| 6 | Conectar WhatsApp via Evolution API | ✅ Concluído |
| 7 | Construir flows n8n | ✅ Concluído |
| 8 | Teste end-to-end | ✅ Concluído |
| 9 | Commit final de validação | ✅ Concluído |

---

## Task 1 — Supabase + .env ✅

**Arquivo `.env` criado com:**
```
DATABASE_URL=postgresql://...   (Supabase connection pooler, porta 6543)
DIRECT_URL=postgresql://...     (conexão direta, porta 5432)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

**Nota:** Prisma 7 requer `PrismaPg` adapter (não `pg` direto). Configuração em `lib/prisma.ts` usando `@prisma/adapter-pg`.

---

## Task 2 — Migrations ✅

```bash
npx prisma migrate deploy   # aplicou todas as migrations
npx prisma db seed          # criou dados iniciais
```

**Seed cria:**
- Super Admin: `admin@moov.chat` / `admin123`
- Plano Starter + 1 tenant de teste: slug `moto-teste`
- (Usuários vendedor/gerente criados via UI da loja)

---

## Task 3 — UI Validada ✅

### Servidor dev
- Arquivo: `.claude/launch.json` — configurado com `cmd /c npm run dev`
- Porta: **3000**
- Iniciar: use o tool `preview_start` com `"Next.js (MOOV Chat)"` ou rode `npm run dev` no terminal

### Bugs corrigidos nesta task

#### Bug 1 — Sidebar links quebrando (`//equipe` → `http://equipe/`)
- **Causa:** `app/(loja)/layout.tsx` não recebe `params.tenantSlug` (está fora do segment `[tenantSlug]`)
- **Fix:** Criado `app/(loja)/[tenantSlug]/layout.tsx` com o Sidebar real; o `(loja)/layout.tsx` virou passthrough

#### Bug 2 — `tenants.map is not a function` na página Prompts
- **Causa:** `/api/admin/tenants` retorna paginação `{ data: { data: [...], total, page, pageSize } }` — a resposta é duplamente aninhada via `ok()`
- **Fix:** `d.data?.data ?? []` em vez de `d.data ?? []` no `app/(admin)/prompts/page.tsx`

#### Bug 3 — Config page trava a tela (tela escurece e fica presa)
- **Causa:** `import { toast } from 'sonner'` em Client Component sem `<Toaster />` no root layout pode causar erro durante SSR/pré-render
- **Fix 1:** Adicionado `<Toaster richColors position="top-right" />` ao `app/layout.tsx`
- **Fix 2:** Removido `toast from 'sonner'` de `config/page.tsx` — substituído por estado `saveStatus: 'idle' | 'success' | 'error'` com feedback inline

#### Bug 4 — TypeScript: `Select.onValueChange` não aceita `Dispatch<SetStateAction<string>>`
- **Causa:** `@base-ui/react` Select passa `value: string | null` mas `setState` não aceita `null`
- **Fix:** Wrap com handler inline: `onValueChange={(v) => setState(v ?? '')}` em `prompts/page.tsx`

#### Outros fixes
- `app/(admin)/lojas/page.tsx`: adicionado botão "Abrir Loja" → `/{slug}/fila`
- `app/(loja)/[tenantSlug]/equipe/page.tsx`: removido `buttonVariants` de Server Component (causava crash)
- `app/(admin)/lojas/[id]/page.tsx`: removidos imports não usados `buttonVariants` e `cn`

### Páginas criadas nesta task

| Arquivo | Descrição |
|---------|-----------|
| `app/(loja)/[tenantSlug]/layout.tsx` | Layout com Sidebar + auth para rotas loja |
| `app/(loja)/[tenantSlug]/config/page.tsx` | Config da loja (toneOfVoice, horários, evolution, campanhas) |
| `app/(loja)/[tenantSlug]/aprovacoes/page.tsx` | Stub de aprovações pendentes |
| `app/(loja)/[tenantSlug]/inbox/page.tsx` | Lista de conversas do tenant |
| `app/(loja)/[tenantSlug]/inbox/[conversationId]/page.tsx` | Visualização de conversa individual |
| `app/(loja)/[tenantSlug]/equipe/novo/page.tsx` | Formulário criar novo membro |
| `app/(loja)/[tenantSlug]/equipe/[id]/page.tsx` | Formulário editar/desativar membro |
| `app/api/[tenantSlug]/config/route.ts` | GET + PATCH config do tenant (toneOfVoice, horários, briefing) |

### Estrutura completa de rotas validada

**Admin (`/dashboard`, `/lojas`, `/prompts`):**
- Layout: `app/(admin)/layout.tsx` — exige `role === SUPER_ADMIN`
- Sidebar admin: Dashboard, Lojas, Prompts

**Loja (`/{tenantSlug}/...`):**
- Layout: `app/(loja)/[tenantSlug]/layout.tsx` — exige sessão + passa slug para Sidebar
- Sidebar loja: Fila, Inbox, Métricas, Equipe, Config, Aprovações
- Vendedores só veem: Fila, Inbox

---

## Task 4 — n8n + Evolution API ✅

### Docker Compose

**Arquivo:** `docker-compose.yml` na raiz do projeto.

**Containers:**
| Container | Imagem | Porta | Status |
|-----------|--------|-------|--------|
| moov-n8n | n8nio/n8n:latest | 5678 | Rodando |
| moov-evolution | evoapicloud/evolution-api:v2.3.7 | 8080 | Rodando |

**Comandos:**
```bash
# Subir
docker compose up -d

# Parar
docker compose down

# Ver logs
docker logs moov-n8n --tail 20
docker logs moov-evolution --tail 20
```

### Endpoints
- n8n: http://localhost:5678 (health: `/healthz`)
- Evolution API: http://localhost:8080 (retorna versão 2.3.7)
- Evolution Manager: http://localhost:8080/manager

### Variáveis (lidas do `.env`)
- n8n: `N8N_ENCRYPTION_KEY`, `N8N_WEBHOOK_URL`, `N8N_API_KEY`
- Evolution API: `EVOLUTION_API_URL` (SERVER_URL), `EVOLUTION_API_GLOBAL_TOKEN` (API_KEY)

### Decisão: Banco de dados do Evolution API
- Evolution API v2 usa schema **separado** (`evolution`) no Supabase via `DIRECT_URL?schema=evolution`
- Isso evita conflito com as tabelas do app MOOV Chat (schema `public`)
- Usa conexão direta (porta 5432, não pooler 6543) para suportar DDL/migrations

### Nota sobre containers antigos
- Existiam containers antigos (`saas_moto_evolution`, `saas_moto_postgres`, `saas_moto_redis`) de configuração anterior
- `saas_moto_evolution` foi parado para liberar porta 8080

---

## Task 5 — ngrok (túnel público) ✅

### Instalação
- Instalado via `winget install ngrok.ngrok`
- Binário: `C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe`
- Versão: 3.37.1 (atualizado de 3.3.1 que era incompatível)
- Auth token configurado em `C:\Users\USER\AppData\Local\ngrok\ngrok.yml`

### Túnel
- **Porta tunelada:** 8080 (Evolution API)
- **URL pública:** `https://<subdominio-aleatorio>.ngrok-free.dev` (muda a cada reinício)
- **Inspect/Dashboard local:** http://127.0.0.1:4040

### Comandos
```bash
# Iniciar túnel (como processo Windows em background)
powershell -Command "Start-Process -FilePath 'C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe' -ArgumentList 'http','8080' -WindowStyle Hidden"

# Consultar URL pública atual
curl -s http://127.0.0.1:4040/api/tunnels | jq '.tunnels[0].public_url'

# Parar ngrok
taskkill /IM ngrok.exe /F
```

### Notas
- Plano free: URL aleatória muda a cada reinício — precisará atualizar `SERVER_URL` do Evolution API
- Requests via browser mostram aviso ngrok (bypass com header `ngrok-skip-browser-warning: true`)
- Requests programáticos (webhooks WhatsApp, n8n) funcionam sem problemas
- Painel em http://127.0.0.1:4040 permite inspecionar requests em tempo real

---

## Task 6 — Conectar WhatsApp via Evolution API ✅

### Instância
- **Nome:** `moov-teste`
- **Integration:** WHATSAPP-BAILEYS
- **Perfil conectado:** Leomar Lordello
- **Estado:** `open`
- **Instance Token:** `37B75D48-2749-4415-A6DA-FD8976E19418`

### Evolution API atualizada
- Imagem antiga `atendai/evolution-api:v2.2.3` não gerava QR Code (Baileys incompatível)
- Atualizada para `evoapicloud/evolution-api:v2.3.7` (novo repositório oficial)

### Webhook configurado
- **URL:** `http://host.docker.internal:3000/api/webhooks/whatsapp/loja-teste`
- **Eventos:** `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`
- O `host.docker.internal` permite que o container Evolution acesse o Next.js (no host)
- O webhook handler do Next.js processa internamente E encaminha ao n8n para tracking

### Comandos úteis
```bash
# Verificar estado da conexão
curl -s http://localhost:8080/instance/connectionState/moov-teste \
  -H "apikey: moovchat-token-local-123"

# Gerar novo QR code (se desconectar)
curl -s http://localhost:8080/instance/connect/moov-teste \
  -H "apikey: moovchat-token-local-123"

# Ver instâncias
curl -s http://localhost:8080/instance/fetchInstances \
  -H "apikey: moovchat-token-local-123"
```

### Nota sobre QR Code
- QR Code expira em ~60 segundos
- Para gerar: deletar instância → recriar com `qrcode: true` → salvar PNG do base64
- Arquivo temporário: `qrcode-whatsapp.png` (na raiz do projeto)

---

## Task 7 — Flows n8n + Pipeline WhatsApp ✅

### Arquitetura do Pipeline

```
WhatsApp -> Evolution API -> Next.js webhook handler -> process-message (interno) -> IA -> Evolution API -> WhatsApp
                                                     \-> n8n (tracking/logging)
```

### Endpoint criado: `POST /api/webhooks/internal/process-message`

**Arquivo:** `app/api/webhooks/internal/process-message/route.ts`

Endpoint interno que recebe o payload da Evolution API e executa o pipeline completo:
1. Valida `X-Internal-Secret`
2. Extrai dados da mensagem (remoteJid, pushName, texto)
3. Encontra ou cria **Lead** (por phone + tenantId)
4. Encontra ou cria **Conversation** ativa (estado `ATIVA_IA`, agente `SDR`)
5. Salva **Message** inbound (direction: `INBOUND`, actorType: `SISTEMA`)
6. Gera resposta IA via OpenAI (ou fallback se API key nao configurada)
7. Salva **Message** outbound (direction: `OUTBOUND`, actorType: `SDR_IA`)
8. Envia resposta via **Evolution API** (`sendText`)
9. Atualiza timestamps da conversa

### Webhook handler atualizado

**Arquivo:** `app/api/webhooks/whatsapp/[tenantSlug]/route.ts`

- Agora chama `process-message` internamente (chamada direta via fetch)
- Tambem encaminha ao n8n para tracking/logging
- Em producao, o n8n assumira a orquestracao completa

### Workflow n8n

**Arquivo:** `n8n-workflow-whatsapp-inbound.json`

- Workflow importado no n8n via CLI: `n8n import:workflow`
- Publicado e ativado via: `n8n publish:workflow --id=moov-whatsapp-inbound`
- Webhook path: `/webhook/whatsapp-inbound`
- Usa Code node para processar dados
- Para reimportar: `docker cp workflow.json moov-n8n:/tmp/ && docker exec moov-n8n n8n import:workflow --input=/tmp/workflow.json`

### Tenant configurado

- **Slug:** `loja-teste` (tenant existente no banco)
- **evolutionInstanceName:** `moov-teste` (configurado via Prisma update)
- **Status:** `ACTIVE`
- **Usuarios:** Gerente (rodrigo@email.com) + Vendedor (gustavo@email.com)

### OpenAI / IA

- Modelo SDR: `gpt-4o-mini` (configuravel via `LLM_MODEL_SDR`)
- Prompt SDR embutido no endpoint com placeholders: `{storeName}`, `{toneOfVoice}`
- **Fallback:** Se `OPENAI_API_KEY` nao configurada, envia resposta generica de boas-vindas
- Para IA funcionar: configurar `OPENAI_API_KEY` valida no `.env`

### Teste E2E validado

```
[INBOUND]  Carlos Santos -> "Ola, quero saber sobre motos novas"
           -> Lead criado (NOVO_LEAD)
           -> Conversation criada (ATIVA_IA, SDR)
           -> Message salva (DELIVERED)
[OUTBOUND] SDR_IA -> "Ola Carlos Santos! Obrigado por entrar em contato..."
           -> Message salva (FAILED - numero ficticio)
```
- `sentStatus: FAILED` e esperado com numeros ficticios
- Com numero real de WhatsApp + Evolution conectado, o envio funciona

### Nota sobre n8n CLI (Windows/Docker)

- Git Bash converte paths Linux automaticamente (`/bin/sh` -> `C:/Program Files/Git/usr/bin/sh`)
- Usar `MSYS_NO_PATHCONV=1` antes do `docker exec` para evitar conversao
- Exemplo: `MSYS_NO_PATHCONV=1 docker exec moov-n8n /bin/sh -c "n8n list:workflow"`

---

## Task 8 — Teste End-to-End ✅

### Estado da infraestrutura no momento do teste (2026-03-10)

| Serviço | Status |
|---------|--------|
| Next.js (porta 3000) | ✅ Rodando (HTTP 307) |
| moov-n8n (porta 5678) | ✅ Rodando |
| moov-evolution (porta 8080) | ✅ Rodando |
| WhatsApp `moov-teste` | ✅ Conectado (`open`) |

**WhatsApp conectado como:** Leomar Lordello — número `5527997397138`

### Fluxo testado via simulação de webhook

Payload enviado via `POST /api/webhooks/whatsapp/loja-teste`:
```json
{
  "event": "messages.upsert",
  "instance": "moov-teste",
  "data": {
    "key": { "remoteJid": "5511999991234@s.whatsapp.net", "fromMe": false, "id": "E2E_TEST_MSG_001" },
    "pushName": "João Comprador",
    "message": { "conversation": "Olá! Tenho interesse em uma moto Honda. Podem me ajudar?" }
  }
}
```

### Resultados validados no banco (Supabase)

| Entidade | Resultado | Detalhe |
|----------|-----------|---------|
| **Lead** | ✅ Criado | phone=`5511999991234`, name=`João Comprador` |
| **Conversation** | ✅ Criada | state=`ATIVA_IA`, currentAgent=`SDR` |
| **INBOUND Message** | ✅ Salva | actorType=`SISTEMA`, status=`DELIVERED` |
| **OUTBOUND Message** | ✅ Salva | actorType=`SDR_IA`, status=`FAILED` (número fake — esperado) |

**Resposta gerada pela IA (OpenAI gpt-4o-mini):**
> "Ola João Comprador! Obrigado por entrar em contato com a loja teste. Como posso..."

### Notas

- `status=FAILED` no OUTBOUND é **esperado** com número fictício — Evolution API não consegue entregar
- Com número real de WhatsApp (conectado), o status seria `SENT`/`DELIVERED`
- O campo `status` no DB (coluna `messages.status`) corresponde ao campo `sentStatus` no Prisma model
- O campo `contentText` no DB corresponde ao campo `content` no Prisma model — mapeamento via `@map`
- Dados de teste foram limpos do banco após validação

### Tabelas reais no banco (snake_case)

O banco Supabase usa snake_case enquanto os modelos Prisma usam PascalCase — mapeados via `@@map`:
- `Lead` → `leads`
- `Conversation` → `conversations`
- `Message` → `messages`
- `Tenant` → `tenants`

---

## Arquitetura de API Response

Todas as rotas API usam helpers em `lib/api-response.ts`:
```typescript
ok(data)      → { data: <data> }         (status 200)
err(msg, code) → { error: { message, code } } (status 4xx/5xx)
forbidden()   → err('Forbidden', 'FORBIDDEN', 403)
```

**ATENÇÃO:** `/api/admin/tenants` retorna **paginação** → `ok({ data: [...], total, page, pageSize })` → resposta final é `{ data: { data: [...], total, ... } }`. Sempre usar `d.data?.data` para acessar o array de tenants.

---

## Credenciais de Teste

| Role | Email | Senha |
|------|-------|-------|
| SUPER_ADMIN | admin@moov.chat | admin123 |
| (criar via UI) | /{slug}/equipe/novo | — |

**Tenant de teste:** slug = `loja-teste`
**URL loja:** http://localhost:3000/loja-teste/fila

---

## Notas Técnicas Importantes

### Next.js App Router — params em layouts
- Layouts só recebem `params` de segments **na própria rota**, não de filhos
- `app/(loja)/layout.tsx` NÃO recebe `[tenantSlug]` → usar `app/(loja)/[tenantSlug]/layout.tsx`

### Sonner + Next.js SSR
- `import { toast } from 'sonner'` em Client Components pode causar erro SSR se `<Toaster />` não estiver no layout
- **Solução:** Sempre ter `<Toaster />` em `app/layout.tsx` (já adicionado)
- Em páginas loja, preferir feedback de estado (`useState`) em vez de `toast` para evitar dependência

### Prisma 7 + Supabase
- Usa `@prisma/adapter-pg` com pool de conexões
- `DATABASE_URL` → pooler (porta 6543) para queries normais
- `DIRECT_URL` → direto (porta 5432) para migrations

### buttonVariants em Server Components
- `buttonVariants` de `@/components/ui/button` NÃO pode ser importado em Server Components (causa crash)
- Substituir por classes Tailwind inline: `"inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground..."`

### @base-ui/react Select — onValueChange
- Assinatura real: `(value: string | null, eventDetails) => void`
- Nunca passar `setState` diretamente — sempre usar wrapper: `(v) => setState(v ?? '')`

### Mapeamento Prisma ↔ Banco (snake_case)
- Modelos Prisma (PascalCase) mapeiam para tabelas snake_case via `@@map`
- Ex.: `Lead` → `leads`, `Conversation` → `conversations`, `Message` → `messages`
- Campos também mapeados: `contentText` (DB) = `content` (Prisma), `status` (DB) = `sentStatus` (Prisma)
- Ao fazer queries raw (pg, psql), usar nomes snake_case do banco

---

## Histórico de Commits

| Hash | Mensagem |
|------|----------|
| `afab339` | feat: validação local completa — pipeline WhatsApp + IA + UI loja |
| `b8675a3` | debug: adicionar logging + try/catch no POST /api/admin/tenants |
| `a00ba3d` | fix: nova loja — select de planos + try/catch na API |
| `c3b2d05` | fix: remover buttonVariants de Server Components + corrigir hrefs |
| `325be86` | fix: mover nav items com ícones para dentro do Sidebar |
| `49e7bdb` | fix: corrigir rotas admin — route group não adiciona /admin à URL |
| `19a2525` | fix: migrations usam DIRECT_URL (porta 5432) |
| `4779a77` + `1dca41f` | fix/chore: Prisma 7 adapter + schema.prisma Supabase |
| `90d9c1d` | docs: plano de validação local |

---

## Estado Atual do Projeto (2026-03-10)

**Branch:** `main` | **Commit HEAD:** `afab339`

### O que está funcionando

| Funcionalidade | Status |
|----------------|--------|
| Login/auth (SUPER_ADMIN + loja) | ✅ |
| Admin: Lojas (listar, criar, detalhar) | ✅ |
| Admin: Prompts (listar, criar, editar) | ✅ |
| Loja: Sidebar + navegação | ✅ |
| Loja: Fila (visualização) | ✅ stub |
| Loja: Inbox (lista conversas + visualizar) | ✅ stub |
| Loja: Equipe (listar, criar, editar membro) | ✅ |
| Loja: Config (toneOfVoice, horários, Evolution) | ✅ |
| Loja: Aprovações | ✅ stub |
| Webhook Evolution API → Next.js | ✅ |
| Pipeline WhatsApp → IA → resposta automática | ✅ |
| n8n workflow (tracking/logging) | ✅ importado e ativo |
| WhatsApp conectado (`moov-teste`) | ✅ estado `open` |

### Limitações conhecidas / Pendente para próxima fase

| Item | Descrição |
|------|-----------|
| Fila em tempo real | Página stub — não busca dados reais do banco |
| Inbox em tempo real | Lista estática — precisa integrar com DB e WebSocket |
| Pipeline IA simplificado | Sem histórico de conversa, sem tool calling |
| Prompt SDR hardcoded | Deveria ler do banco (`PromptConfig`) |
| Aprovações de preço | Stub — lógica não implementada |
| Métricas | Stub — sem cálculos reais |
| Deploy produção | Apenas local — não há ambiente staging/prod |
| Multi-tenant isolamento | Webhook valida tenant pelo slug, mas não verifica token por instância |

---

## Próximas Etapas Sugeridas

### Opção A — Melhorar o Pipeline de IA
1. Ler `PromptConfig` do banco para montar o prompt do SDR
2. Incluir histórico das últimas N mensagens no contexto do OpenAI
3. Implementar tool calling (consulta de estoque, agendamento)
4. Tratar mensagens de áudio, imagem, documento

### Opção B — Fazer Inbox e Fila funcionarem em tempo real
1. `GET /api/[tenantSlug]/conversations` — listar conversas com paginação
2. `GET /api/[tenantSlug]/conversations/[id]/messages` — buscar mensagens
3. `POST /api/[tenantSlug]/conversations/[id]/messages` — enviar mensagem manual
4. Supabase Realtime ou polling para inbox ao vivo

### Opção C — Deploy em staging (VPS Hostinger)
1. Configurar VPS com Docker + Caddy (reverse proxy)
2. Fazer deploy da imagem Next.js (ou configurar CI/CD)
3. Configurar domínio + HTTPS
4. Testar fluxo completo com WhatsApp real

### Opção D — Fluxo de Aprovação de Preços
1. Lógica de detecção de pedido de desconto pela IA
2. Criação de `PriceApproval` no banco
3. Notificação para gerente (WhatsApp ou UI)
4. Aprovação/rejeição com resposta automática ao lead

---

## Como Iniciar o Projeto

```bash
# Servidor Next.js (dev)
cd "C:\Users\USER\Documents\saas-revenda-moto (2)"
npm run dev
# Acesse: http://localhost:3000

# Ou via Claude Preview tool:
# preview_start("Next.js (MOOV Chat)")
```

---

## Arquivos Chave do Projeto

```
app/
  layout.tsx                          ← Root layout (tem <Toaster />)
  (admin)/
    layout.tsx                        ← Exige SUPER_ADMIN
    dashboard/page.tsx
    lojas/page.tsx                    ← Lista lojas + botão "Abrir Loja"
    lojas/nova/page.tsx
    lojas/[id]/page.tsx
    prompts/page.tsx                  ← Usa toast (funciona com Toaster no root)
  (loja)/
    layout.tsx                        ← Passthrough simples
    [tenantSlug]/
      layout.tsx                      ← Auth + Sidebar com slug correto
      fila/page.tsx
      inbox/page.tsx
      inbox/[conversationId]/page.tsx
      metricas/page.tsx
      equipe/page.tsx
      equipe/novo/page.tsx
      equipe/[id]/page.tsx
      config/page.tsx                 ← Sem sonner, usa saveStatus state
      aprovacoes/page.tsx
  api/
    webhooks/
      whatsapp/[tenantSlug]/route.ts  ← Webhook Evolution API → processa + encaminha n8n
      internal/
        process-message/route.ts      ← Pipeline completo: Lead → Conversa → IA → Envio
    admin/
      tenants/route.ts                ← GET retorna paginação { data: { data:[],total } }
      prompts/route.ts
      prompts/[id]/route.ts
    [tenantSlug]/
      config/route.ts                 ← GET + PATCH config do tenant
      users/route.ts
      users/[id]/route.ts
  auth/signin/page.tsx

components/
  shared/sidebar.tsx                  ← Sidebar admin e loja
  loja/
    fila/lead-card.tsx
    inbox/conversation-view.tsx
    inbox/lead-info-panel.tsx
    inbox/message-input.tsx
  ui/                                 ← button, input, label, textarea, card, badge, select...

lib/
  auth.ts                             ← NextAuth config
  prisma.ts                           ← Prisma client com PrismaPg adapter
  evolution.ts                        ← sendText(), sendMedia(), createInstance()
  api-response.ts                     ← ok(), err(), forbidden()
  utils.ts                            ← cn()

n8n-workflow-whatsapp-inbound.json    ← Workflow n8n para import

prisma/
  schema.prisma                       ← Schema completo (Tenant, User, Lead, Conversation, etc.)
  migrations/                         ← Aplicadas via prisma migrate deploy
  seed.ts                             ← Cria admin + plano + tenant moto-teste
```

# MOOV Chat — PRD Técnico Modular
**Versão:** 1.0.0
**Data:** 2026-03-06
**Status:** Aprovado para desenvolvimento
**Produto:** SaaS de Atendimento Comercial por WhatsApp para Revendas de Moto

---

## Índice

1. [Visão do Produto](#1-visão-do-produto)
2. [Decisões de Arquitetura (ADRs)](#2-decisões-de-arquitetura-adrs)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Design System & UI](#4-design-system--ui)
5. [Database Schema (Prisma)](#5-database-schema-prisma)
6. [Ambiente & Infraestrutura](#6-ambiente--infraestrutura)
7. [Módulo 01 — Autenticação](#7-módulo-01--autenticação)
8. [Módulo 02 — Gestão de Tenants](#8-módulo-02--gestão-de-tenants)
9. [Módulo 03 — Gestão de Usuários](#9-módulo-03--gestão-de-usuários)
10. [Módulo 04 — Catálogo](#10-módulo-04--catálogo)
11. [Módulo 05 — Configuração de Prompts](#11-módulo-05--configuração-de-prompts)
12. [Módulo 06 — Lead & Conversa](#12-módulo-06--lead--conversa)
13. [Módulo 07 — WhatsApp Gateway](#13-módulo-07--whatsapp-gateway)
14. [Módulo 08 — Orquestração IA (n8n)](#14-módulo-08--orquestração-ia-n8n)
15. [Módulo 09 — Handoff IA → Humano](#15-módulo-09--handoff-ia--humano)
16. [Módulo 10 — Inbox Humano](#16-módulo-10--inbox-humano)
17. [Módulo 11 — Scheduler & Follow-ups](#17-módulo-11--scheduler--follow-ups)
18. [Módulo 12 — SLA Alerts](#18-módulo-12--sla-alerts)
19. [Módulo 13 — Inteligência Comercial](#19-módulo-13--inteligência-comercial)
20. [Módulo 14 — QA Monitoring](#20-módulo-14--qa-monitoring)
21. [Módulo 15 — Relatórios & Analytics](#21-módulo-15--relatórios--analytics)
22. [API Routes Reference](#22-api-routes-reference)
23. [Conformidade LGPD](#23-conformidade-lgpd)
24. [Roadmap de Desenvolvimento](#24-roadmap-de-desenvolvimento)

---

## 1. Visão do Produto

### 1.1 Nome
**MOOV Chat** — SaaS multi-tenant de atendimento comercial por WhatsApp para revendas de motos.

### 1.2 Problema
Revendas de motos perdem leads por:
- Demora no primeiro atendimento
- Falta de acompanhamento consistente
- Atendimento irregular entre vendedores
- Ausência de controle sobre o funil
- Falta de padronização da comunicação

### 1.3 Solução
Plataforma SaaS com **operação híbrida IA + humano** que garante:
- Resposta imediata via IA a qualquer hora
- Qualificação automática de leads
- Sugestão de motos compatíveis com interesse do cliente
- Handoff inteligente para vendedor no momento certo
- Funil comercial visível do ponta a ponta
- Alertas de SLA para gestores

### 1.4 Público-alvo
- Revendas de motos (0km, seminovas ou mix)
- Operações com 1 ou mais vendedores
- Lojas com foco em WhatsApp como canal principal

### 1.5 Modelo de operação
- **Multi-tenant:** cada loja opera em ambiente logicamente isolado
- **Empresa operadora:** controla prompts, planos e ativação
- **Loja cliente:** gerencia catálogo, equipe e políticas internas
- **Atendimento híbrido:** IA atende, humano assume quando necessário

### 1.6 Métricas de sucesso do produto
| Métrica | Meta MVP |
|---|---|
| Tempo médio 1ª resposta (IA) | < 60 segundos |
| Taxa de leads sem resposta | < 5% |
| Taxa de handoff IA → humano | configurável por loja |
| Uptime do fluxo de mensagens | > 99.5% |
| Onboarding de nova loja | < 2 horas |

---

## 2. Decisões de Arquitetura (ADRs)

### ADR-001: Next.js como stack full-stack (sem Node.js separado)
**Decisão:** Next.js 14 App Router substituiu um backend Node.js/Express separado.
**Motivo:** Next.js Route Handlers cobrem todo o CRUD, auth e business logic necessários. Elimina um serviço a gerenciar e simplifica o deploy.
**Consequência:** API reside em `/app/api/**`. Lógica de negócio em Server Actions ou Route Handlers.

### ADR-002: n8n como motor de automação e orquestração IA
**Decisão:** n8n é responsável por todos os fluxos de automação: WhatsApp → IA → resposta, schedulers, SLA alerts, relatório diário.
**Motivo:** Permite iterar flows sem alterar código. JSON dos flows é versionável. Suporte nativo a Evolution API, PostgreSQL e LLMs.
**Consequência:** Nenhuma lógica de automação no Next.js. n8n é o único consumidor de webhooks da Evolution API.

### ADR-003: PostgreSQL como estado compartilhado
**Decisão:** PostgreSQL com Prisma ORM é o único banco de dados. Tanto Next.js quanto n8n leem e escrevem nele.
**Motivo:** Consistência de dados, transações ACID, queries complexas para relatórios.
**Consequência:** n8n acessa o banco via node PostgreSQL nativo (não via API Next.js), exceto para operações de negócio que exijam validação.

### ADR-004: Evolution API para WhatsApp
**Decisão:** Evolution API auto-hospedada como gateway WhatsApp.
**Motivo:** Gratuita, amplamente usada no Brasil, compatível com n8n, suporta multi-instância (uma por tenant).
**Consequência:** Cada loja tem uma instância Evolution API. Banco de dados de mensagens é o PostgreSQL próprio, não o da Evolution.

### ADR-005: Multi-provider de LLM
**Decisão:** O sistema não acopla a um único provedor de LLM.
**Motivo:** Permite trocar entre OpenAI, Anthropic e Groq por custo, velocidade ou qualidade conforme o tipo de tarefa.
**Consequência:** Cada flow n8n expõe `LLM_PROVIDER` e `LLM_MODEL` como variáveis de ambiente configuráveis.

### ADR-006: Estado do lead é sempre alterado manualmente
**Decisão:** Apenas vendedor ou gerente pode confirmar mudança de `LeadState`.
**Motivo:** PRD original exige confirmação humana para estados oficiais. IA pode sugerir, nunca confirmar.
**Consequência:** IA atualiza apenas campos de inteligência (`isHot`, `leadScore`, `hasUrgency`). `state` só muda via API autenticada.

### ADR-007: IDs com cuid()
**Decisão:** Todos os IDs usam `cuid()`.
**Motivo:** URL-safe, sem colisão cross-tenant, legível em logs, sem overhead de UUID v4.

---

## 3. Arquitetura do Sistema

### 3.1 Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE FINAL                           │
│                    (WhatsApp no celular)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ mensagem
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EVOLUTION API                              │
│              (auto-hospedado, 1 instância/loja)                 │
│                    Porta: 8080                                   │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ webhook POST                  │ sendMessage API
           ▼                              │
┌──────────────────────┐                 │
│        n8n           │─────────────────┘
│  (automation engine) │
│    Porta: 5678       │──────────────► LLM Providers
│                      │                (OpenAI / Claude / Groq)
│  - Flow 1: Inbound   │
│  - Flow 2: Handoff   │──────────────► Evolution API (envio)
│  - Flow 3: SLA       │
│  - Flow 4: Follow-up │
│  - Flow 5: Relatório │
│  - Flow 6: Intel.    │
│  - Flow 7: Prompts   │
└──────────┬───────────┘
           │ SQL direto
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL                                │
│              (estado compartilhado, Porta: 5432)                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Prisma ORM
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router                        │
│                       Porta: 3000                               │
│                                                                 │
│  /app/(admin)/*    → Painel Super Admin                        │
│  /app/(loja)/*     → Painel Loja (Gerente + Vendedor)          │
│  /app/api/**       → 35 Route Handlers REST                    │
│  middleware.ts     → Auth + tenant isolation                    │
└─────────────────────────────────────────────────────────────────┘
           │ acessa via browser
           ▼
┌──────────────────────┬──────────────────────────────────────────┐
│   SUPER ADMIN        │    GERENTE / VENDEDOR                    │
│   (empresa op.)      │    (loja cliente)                        │
└──────────────────────┴──────────────────────────────────────────┘
```

### 3.2 Responsabilidades por componente

| Componente | Responsabilidade |
|---|---|
| **Next.js** | UI dos painéis, API REST (auth, CRUD, relatórios), Prisma ORM |
| **n8n** | Receber webhook WhatsApp, orquestrar IA, schedulers, SLA, relatório diário |
| **PostgreSQL** | Estado persistente de todos os dados, fonte única da verdade |
| **Evolution API** | Gateway WhatsApp: receber e enviar mensagens, gerenciar sessões |
| **LLM Provider** | Geração de respostas dos agentes, classificação de inteligência comercial |

### 3.3 Fluxo de dados — mensagem recebida

```
1. Cliente envia mensagem no WhatsApp
2. Evolution API dispara POST /api/webhooks/whatsapp/:tenantSlug no n8n
3. n8n identifica tenant pelo slug
4. n8n faz upsert de Lead e Conversation no PostgreSQL
5. n8n salva Message (INBOUND) no PostgreSQL
6. n8n verifica estado da Conversation
   ├── EM_ATENDIMENTO_HUMANO → para (IA silenciosa)
   ├── AGUARDANDO_VENDEDOR   → para (aguardando humano)
   └── demais estados        → continua
7. n8n chama Flow 6 (Inteligência Comercial) — atualiza Lead.isHot, etc.
8. n8n chama Flow 7 (Prompt Assembly) — monta system prompt + histórico
9. n8n chama LLM → obtém resposta do agente
10. n8n verifica se resposta contém trigger de handoff
    ├── sim → chama Flow 2 (Handoff)
    └── não → continua
11. n8n salva Message (OUTBOUND) no PostgreSQL
12. n8n envia mensagem via Evolution API
13. n8n atualiza Conversation (contadores, timestamps)
14. n8n registra EventLog
15. n8n cancela follow-ups pendentes e agenda novo FOLLOWUP_10MIN
```

---

## 4. Design System & UI

### 4.1 Stack visual
- **Componentes:** `shadcn/ui` + Tailwind CSS
- **Primitivos:** Radix UI (acessibilidade built-in)
- **Ícones:** `lucide-react`
- **Fontes:** Inter (UI), JetBrains Mono (código/IDs)
- **Tema:** Dark mode nativo

### 4.2 Paleta de cores — MOOV Chat

```css
/* globals.css — CSS Variables */
:root {
  --color-dark:           #0F1115; /* sidebar, topbar, fundo profundo */
  --color-dark-gray:      #1F2329; /* background principal do conteúdo */
  --color-card:           #2A2F38; /* cards, inputs, painéis internos */
  --color-border:         #353B45; /* bordas e divisores */
  --color-primary:        #FF6A00; /* botões primários, badges, CTAs */
  --color-primary-hover:  #FF8C1A; /* hover, gradientes */
  --color-white:          #FFFFFF; /* textos sobre fundos escuros */
  --color-muted:          #8B949E; /* textos secundários, timestamps */
  --color-destructive:    #EF4444; /* SLA estourado, alertas críticos */
  --color-warning:        #F59E0B; /* SLA próximo, lead esfriando */
  --color-success:        #10B981; /* lead vendido, conectado */
  --color-info:           #3B82F6; /* informativo, in-progress */
}
```

### 4.3 Tokens de status de lead

```typescript
// lib/lead-status.ts
export const LEAD_STATE_CONFIG = {
  NOVO_LEAD:             { label: 'Novo Lead',           color: 'info',        icon: 'UserPlus' },
  INTERESSADO:           { label: 'Interessado',          color: 'info',        icon: 'Eye' },
  QUALIFICADO:           { label: 'Qualificado',          color: 'primary',     icon: 'CheckCircle' },
  NEGOCIANDO:            { label: 'Negociando',           color: 'warning',     icon: 'MessageSquare' },
  AGUARDANDO_APROVACAO:  { label: 'Aguard. Aprovação',    color: 'warning',     icon: 'Clock' },
  AGUARDANDO_VISITA:     { label: 'Aguard. Visita',       color: 'primary',     icon: 'MapPin' },
  VISITOU:               { label: 'Visitou',              color: 'primary',     icon: 'Store' },
  PROPOSTA_ENVIADA:      { label: 'Proposta Enviada',     color: 'primary',     icon: 'FileText' },
  PERDIDO:               { label: 'Perdido',              color: 'destructive', icon: 'XCircle' },
  VENDIDO:               { label: 'Vendido',              color: 'success',     icon: 'Trophy' },
} as const
```

### 4.4 Layout — Painel do Super Admin

```
┌─────────────────────────────────────────────────────────────────┐
│ [#0F1115] ■ MOOV Chat Admin        [🔔 3]    [avatar] João ▼   │
├──────────┬──────────────────────────────────────────────────────┤
│[#0F1115] │ [#1F2329]                                            │
│          │  Lojas Ativas                          [+ Nova Loja] │
│ Dashboard│ ┌──────────────────────────────────────────────────┐ │
│          │ │ 🔍 Buscar loja...                    [Filtros ▼] │ │
│ Lojas    │ └──────────────────────────────────────────────────┘ │
│          │                                                      │
│ Prompts  │  Loja            Plano    Leads/30d  WhatsApp Status │
│          │  ─────────────────────────────────────────────────  │
│ Planos   │  Moto Center SP  Pro      342        ● Ativa         │
│          │  Motos & Cia RJ  Starter  89         ● Ativa         │
│ Usuários │  Speed Motos BH  Pro      201        ● Ativa         │
│          │  Bike Shop POA   Starter  12         ⚠ Onboarding   │
│ QA Logs  │                                                      │
│          │  [←] 1 2 3 ... [→]                                  │
│ Config   │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### 4.5 Layout — Painel da Loja (Fila de Leads)

```
┌─────────────────────────────────────────────────────────────────┐
│ [#0F1115] ■ Moto Center SP     [⚠ 2 alertas]  [avatar] Carlos▼│
├──────────┬──────────────────────────────────────────────────────┤
│[#0F1115] │ [#1F2329] Fila de Leads              [Filtros][Sort] │
│          │                                                      │
│ 🏠 Início│ 🔴 URGENTE ──────────────────────────────────────── │
│          │ ┌────────────────────────────────────────────────┐  │
│ 📋 Fila  │ │🔥 João Silva    CG 160 2024    Aguard.Vendedor │  │
│    (14)  │ │   há 4min sem resposta          [Assumir]      │  │
│          │ └────────────────────────────────────────────────┘  │
│ 💬 Inbox │                                                      │
│          │ ⚡ EM ATENDIMENTO IA ──────────────────────────────  │
│ 📊 Métr. │ ┌────────────────────────────────────────────────┐  │
│          │ │  Maria Souza    Titan 160      Qualificado      │  │
│ 🏍 Catál.│ │  há 12min · IA atendendo        [Ver]          │  │
│          │ ├────────────────────────────────────────────────┤  │
│ 👥 Equipe│ │  Pedro Costa    Pop 110i       Interessado      │  │
│          │ │  há 28min · IA atendendo        [Ver]          │  │
│ ⚙ Config │ └────────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────┘
```

### 4.6 Layout — Inbox de Atendimento Humano

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Fila   João Silva · CG 160 2024 · 🔥 Lead Quente    [⋮]     │
├──────────────────────────────┬──────────────────────────────────┤
│  💬 CONVERSA [#1F2329]       │  📋 LEAD INFO [#2A2F38]         │
│                              │                                  │
│  [SDR IA] 14:32              │  Estado: [● Qualificado    ▼]  │
│  ┌──────────────────────┐    │  Vendedor: Carlos M.            │
│  │ Olá! Vi o anúncio da │    │  Interesse: CG 160 Azul 2024   │
│  │ CG 160. Tem em azul? │    │  Tel: (11) 9xxxx-xxxx          │
│  └──────────────────────┘    │  Score: ██████░░░░ 62/100      │
│                              │                                  │
│          [VOCÊ] 14:33        │  📝 RESUMO DA IA (handoff)     │
│  ┌────────────────────┐      │  ─────────────────────────────  │
│  │ Sim! Temos em azul │      │  Busca CG 160 azul.            │
│  │ e vermelho. Posso  │      │  Perguntou financiamento.      │
│  │ te mostrar? 🏍     │      │  Urgência: compra essa semana. │
│  └────────────────────┘      │  Próximo: enviar proposta.     │
│                              │                                  │
│  [SDR IA] 14:34              │  ⚡ AÇÕES RÁPIDAS              │
│  ┌──────────────────────┐    │  [Enviar proposta PDF]         │
│  │ Vocês fazem          │    │  [Agendar visita]              │
│  │ financiamento?       │    │  [Devolver p/ IA]              │
│  └──────────────────────┘    │  [Marcar como perdido]         │
│                              │                                  │
│ ┌──────────────────────────┐ │  🕐 SLA: 8min ✅              │
│ │ Digite sua resposta...   │ │                                │
│ │                    [📎]  │ │                                │
│ └──────────────[Enviar]───┘ │                                │
└──────────────────────────────┴──────────────────────────────────┘
```

### 4.7 Layout — Dashboard de Métricas

```
┌─────────────────────────────────────────────────────────────────┐
│ Métricas                                   [Hoje ▼] [Exportar] │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │ Leads Rec.  │ │ 1ª Resposta │ │ Handoff IA  │ │ Vendas   │ │
│  │     47      │ │   < 1min    │ │    34%      │ │    3     │ │
│  │  +12% ↑    │ │  ✅ OK      │ │             │ │          │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
│                                                                  │
│  Funil do Período              Performance Vendedores           │
│  ──────────────────            ───────────────────────────────  │
│  Recebidos ████████ 47         Carlos M.  12 leads · 2 vendas  │
│  Qualif.   ██████   31         Ana P.      8 leads · 1 venda   │
│  Proposta  ████     18         Pedro L.    5 leads · 0 vendas  │
│  Visita    ██        9         ⚠ Pedro: 3 leads em atraso      │
│  Vendidos  █         3                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.8 Responsividade

| Breakpoint | Comportamento |
|---|---|
| Desktop ≥ 1280px | Sidebar fixa 240px + conteúdo + painel lateral no inbox |
| Tablet 768–1279px | Sidebar colapsável em ícones (64px) + drawer para painel de lead |
| Mobile < 768px | Bottom navigation 5 tabs + inbox em tela cheia (vendedor em campo) |

---

## 5. Database Schema (Prisma)

### 5.1 Setup

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 5.2 Enums

```prisma
enum TenantStatus         { ONBOARDING ACTIVE SUSPENDED INACTIVE }
enum PlanType             { STARTER PRO ENTERPRISE }
enum UserRole             { SUPER_ADMIN GERENTE VENDEDOR }
enum UserStatus           { ACTIVE INACTIVE }
enum LeadState            { NOVO_LEAD INTERESSADO QUALIFICADO NEGOCIANDO
                            AGUARDANDO_APROVACAO AGUARDANDO_VISITA VISITOU
                            PROPOSTA_ENVIADA PERDIDO VENDIDO }
enum ConversationState    { ATIVA_IA AGUARDANDO_RESPOSTA_CLIENTE
                            AGUARDANDO_VENDEDOR EM_ATENDIMENTO_HUMANO
                            PAUSADA FINALIZADA REATIVACAO_AGENDADA }
enum AgentType            { ORQUESTRADOR SDR VENDEDOR QA NOTIFICADOR_SLA }
enum MessageActorType     { SDR_IA VENDEDOR_IA ORQUESTRADORA_IA
                            HUMANO_VENDEDOR HUMANO_GERENTE SISTEMA }
enum MessageDirection     { INBOUND OUTBOUND }
enum MessageContentType   { TEXT IMAGE VIDEO AUDIO DOCUMENT LOCATION }
enum MessageStatus        { PENDING SENT DELIVERED READ FAILED }
enum AvailabilityStatus   { AVAILABLE UNAVAILABLE ON_ORDER RESERVED }
enum MotorcycleCondition  { EXCELLENT GOOD REGULAR POOR }
enum AlertType            { SLA_VENDEDOR SLA_GERENTE LEAD_QUENTE
                            CONCORRENTE_DETECTADO URGENCIA_DETECTADA
                            ERRO_QA PRECO_PENDENTE ONBOARDING }
enum AlertSeverity        { INFO WARNING CRITICAL }
enum ScheduledTaskType    { FOLLOWUP_10MIN FOLLOWUP_6H FOLLOWUP_3DIAS
                            SLA_ALERT_10MIN SLA_ALERT_30MIN SLA_ALERT_1H
                            SLA_ALERT_2H RELATORIO_DIARIO REATIVACAO }
enum ScheduledTaskStatus  { PENDING RUNNING DONE CANCELLED FAILED }
enum PriceApprovalStatus  { PENDING APPROVED REJECTED }
enum LeadDistributionType { ROUND_ROBIN VENDEDOR_FIXO MANUAL }
enum LeadOrigin           { WHATSAPP MANUAL IMPORTADO }
```

### 5.3 Models — Infraestrutura SaaS

```prisma
model Plan {
  id               String   @id @default(cuid())
  name             String
  type             PlanType
  maxLeadsPerMonth Int
  maxVendedores    Int
  priceMonthly     Decimal  @db.Decimal(10, 2)
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tenants          Tenant[]
  @@map("plans")
}

model Tenant {
  id                       String               @id @default(cuid())
  slug                     String               @unique
  name                     String
  razaoSocial              String?
  status                   TenantStatus         @default(ONBOARDING)
  planId                   String
  plan                     Plan                 @relation(fields: [planId], references: [id])
  whatsappPhone            String?              @unique
  whatsappConnected        Boolean              @default(false)
  evolutionInstanceName    String?              @unique
  phone                    String?
  email                    String?
  address                  String?
  city                     String?
  state                    String?
  zipCode                  String?
  businessHoursStart       String?
  businessHoursEnd         String?
  businessDays             String[]
  leadDistributionType     LeadDistributionType @default(ROUND_ROBIN)
  policyPriceApproval      Boolean              @default(false)
  policyReservation        Boolean              @default(false)
  policyExchange           Boolean              @default(false)
  policyOnOrder            Boolean              @default(false)
  policyPixEnabled         Boolean              @default(false)
  policyPaymentWarning     String?              @db.Text
  policySecurityMessage    String?              @db.Text
  toneOfVoice              String?              @db.Text
  iaMaxConsecutiveMessages Int                  @default(3)
  createdAt                DateTime             @default(now())
  updatedAt                DateTime             @updatedAt
  users            User[]
  leads            Lead[]
  conversations    Conversation[]
  messages         Message[]
  products0km      TenantProduct0km[]
  usedMotorcycles  UsedMotorcycle[]
  accessories      Accessory[]
  campaigns        Campaign[]
  promotionalItems PromotionalItem[]
  promptConfigs    PromptConfig[]
  eventLogs        EventLog[]
  scheduledTasks   ScheduledTask[]
  alerts           Alert[]
  dailyReports     DailyReport[]
  priceApprovals   PriceApproval[]
  briefing         Briefing?
  @@map("tenants")
}

model Briefing {
  id                 String    @id @default(cuid())
  tenantId           String    @unique
  tenant             Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  brands             String[]
  currentCampaigns   String?   @db.Text
  additionalPolicies String?   @db.Text
  completedAt        DateTime?
  validatedAt        DateTime?
  validatedById      String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  @@map("briefings")
}
```

### 5.4 Models — Usuários

```prisma
model User {
  id                 String     @id @default(cuid())
  tenantId           String?
  tenant             Tenant?    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name               String
  email              String     @unique
  phone              String?
  whatsappNotif      String?
  role               UserRole
  status             UserStatus @default(ACTIVE)
  lastLeadAssignedAt DateTime?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  assignedLeads      Lead[]          @relation("AssignedLeads")
  managedLeads       Lead[]          @relation("ManagedLeads")
  conversations      Conversation[]
  alerts             Alert[]
  priceApprovals     PriceApproval[]
  promptsCreated     PromptConfig[]
  @@index([tenantId, role])
  @@map("users")
}
```

### 5.5 Models — Core de Atendimento

```prisma
model Lead {
  id                  String     @id @default(cuid())
  tenantId            String
  tenant              Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name                String?
  phone               String
  origin              LeadOrigin @default(WHATSAPP)
  state               LeadState  @default(NOVO_LEAD)
  assignedVendedorId  String?
  assignedVendedor    User?      @relation("AssignedLeads", fields: [assignedVendedorId], references: [id])
  assignedGerenteId   String?
  assignedGerente     User?      @relation("ManagedLeads",  fields: [assignedGerenteId],  references: [id])
  primaryInterest     String?
  notes               String?    @db.Text
  leadScore           Int        @default(0)
  isHot               Boolean    @default(false)
  hasUrgency          Boolean    @default(false)
  mentionedCompetitor Boolean    @default(false)
  lossReason          String?
  lossDetail          String?    @db.Text
  firstContactAt      DateTime?
  firstResponseAt     DateTime?
  soldAt              DateTime?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt
  conversations       Conversation[]
  eventLogs           EventLog[]
  scheduledTasks      ScheduledTask[]
  alerts              Alert[]
  assignments         LeadAssignment[]
  @@unique([tenantId, phone])
  @@index([tenantId, state])
  @@index([tenantId, isHot])
  @@index([assignedVendedorId])
  @@map("leads")
}

model LeadAssignment {
  id         String   @id @default(cuid())
  leadId     String
  lead       Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  vendedorId String
  assignedAt DateTime @default(now())
  assignedBy String?
  reason     String?
  @@index([leadId])
  @@map("lead_assignments")
}

model Conversation {
  id                    String            @id @default(cuid())
  tenantId              String
  tenant                Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leadId                String
  lead                  Lead              @relation(fields: [leadId], references: [id], onDelete: Cascade)
  state                 ConversationState @default(ATIVA_IA)
  currentAgent          AgentType?
  humanAttendantId      String?
  humanAttendant        User?             @relation(fields: [humanAttendantId], references: [id])
  humanTookOverAt       DateTime?
  humanSlaStartedAt     DateTime?
  consecutiveIaMessages Int               @default(0)
  totalMessages         Int               @default(0)
  lastMessageAt         DateTime?
  lastClientMessageAt   DateTime?
  lastIaMessageAt       DateTime?
  lastHumanMessageAt    DateTime?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  messages         Message[]
  eventLogs        EventLog[]
  scheduledTasks   ScheduledTask[]
  alerts           Alert[]
  handoffSummaries HandoffSummary[]
  @@index([tenantId, state])
  @@index([leadId])
  @@map("conversations")
}

model Message {
  id             String             @id @default(cuid())
  tenantId       String
  tenant         Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  conversationId String
  conversation   Conversation       @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  actorType      MessageActorType
  actorId        String?
  direction      MessageDirection
  contentType    MessageContentType @default(TEXT)
  contentText    String?            @db.Text
  mediaUrl       String?
  mediaCaption   String?
  whatsappMsgId  String?            @unique
  status         MessageStatus      @default(PENDING)
  isInternal     Boolean            @default(false)
  createdAt      DateTime           @default(now())
  @@index([conversationId])
  @@index([tenantId])
  @@map("messages")
}

model HandoffSummary {
  id                 String       @id @default(cuid())
  conversationId     String
  conversation       Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  vendedorId         String?
  clientName         String?
  clientPhone        String
  contactReason      String?      @db.Text
  modelInterest      String?
  answeredQuestions  String?      @db.Text
  urgencySignals     String?      @db.Text
  negotiationStatus  String?      @db.Text
  handoffReason      String
  nextStepSuggested  String?      @db.Text
  createdAt          DateTime     @default(now())
  @@index([conversationId])
  @@map("handoff_summaries")
}
```

### 5.6 Models — Catálogo

```prisma
model GlobalProduct0km {
  id             String   @id @default(cuid())
  brand          String
  model          String
  version        String?
  displacement   Int?
  description    String?  @db.Text
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  tenantProducts TenantProduct0km[]
  @@unique([brand, model, version])
  @@map("global_products_0km")
}

model TenantProduct0km {
  id              String             @id @default(cuid())
  tenantId        String
  tenant          Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  globalProductId String
  globalProduct   GlobalProduct0km   @relation(fields: [globalProductId], references: [id])
  modelYear       Int?
  color           String?
  price           Decimal            @db.Decimal(10, 2)
  availability    AvailabilityStatus @default(AVAILABLE)
  imageUrls       String[]
  videoUrl        String?
  notes           String?            @db.Text
  campaignId      String?
  campaign        Campaign?          @relation(fields: [campaignId], references: [id])
  pendingPrice    Decimal?           @db.Decimal(10, 2)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  @@index([tenantId, availability])
  @@map("tenant_products_0km")
}

model UsedMotorcycle {
  id           String             @id @default(cuid())
  tenantId     String
  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  brand        String
  model        String
  version      String?
  year         Int
  mileage      Int
  color        String?
  price        Decimal            @db.Decimal(10, 2)
  condition    MotorcycleCondition
  notes        String?            @db.Text
  imageUrls    String[]
  availability AvailabilityStatus @default(AVAILABLE)
  enteredAt    DateTime           @default(now())
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  @@index([tenantId, availability])
  @@map("used_motorcycles")
}

model Accessory {
  id            String    @id @default(cuid())
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name          String
  category      String?
  sku           String?
  price         Decimal   @db.Decimal(10, 2)
  description   String?
  imageUrl      String?
  compatibility String?
  isAvailable   Boolean   @default(true)
  campaignId    String?
  campaign      Campaign? @relation(fields: [campaignId], references: [id])
  validUntil    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([tenantId])
  @@map("accessories")
}

model Campaign {
  id               String   @id @default(cuid())
  tenantId         String
  tenant           Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name             String
  description      String?  @db.Text
  startsAt         DateTime
  endsAt           DateTime
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  products0km      TenantProduct0km[]
  promotionalItems PromotionalItem[]
  accessories      Accessory[]
  @@index([tenantId, isActive])
  @@map("campaigns")
}

model PromotionalItem {
  id          String    @id @default(cuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  campaignId  String?
  campaign    Campaign? @relation(fields: [campaignId], references: [id])
  name        String
  description String?
  eligibility String?
  validUntil  DateTime?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([tenantId])
  @@map("promotional_items")
}

model PriceApproval {
  id            String              @id @default(cuid())
  tenantId      String
  tenant        Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  productType   String
  productId     String
  currentPrice  Decimal             @db.Decimal(10, 2)
  proposedPrice Decimal             @db.Decimal(10, 2)
  requestedById String?
  approvedById  String?
  approver      User?               @relation(fields: [approvedById], references: [id])
  status        PriceApprovalStatus @default(PENDING)
  notes         String?
  resolvedAt    DateTime?
  createdAt     DateTime            @default(now())
  @@index([tenantId, status])
  @@map("price_approvals")
}
```

### 5.7 Models — IA, Automação e Relatórios

```prisma
model PromptConfig {
  id                String    @id @default(cuid())
  tenantId          String?
  tenant            Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agentType         AgentType
  version           Int       @default(1)
  promptBase        String    @db.Text
  blockStoreContext String?   @db.Text
  blockPolicies     String?   @db.Text
  blockSecurity     String?   @db.Text
  blockCampaigns    String?   @db.Text
  blockHandoff      String?   @db.Text
  blockToneOfVoice  String?   @db.Text
  isActive          Boolean   @default(true)
  createdById       String?
  createdBy         User?     @relation(fields: [createdById], references: [id])
  createdAt         DateTime  @default(now())
  @@unique([tenantId, agentType, version])
  @@index([tenantId, agentType, isActive])
  @@map("prompt_configs")
}

model EventLog {
  id             String        @id @default(cuid())
  tenantId       String
  tenant         Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leadId         String?
  lead           Lead?         @relation(fields: [leadId], references: [id])
  conversationId String?
  conversation   Conversation? @relation(fields: [conversationId], references: [id])
  eventType      String
  actorType      String?
  actorId        String?
  severity       AlertSeverity @default(INFO)
  payload        Json?
  createdAt      DateTime      @default(now())
  @@index([tenantId, eventType])
  @@index([conversationId])
  @@map("event_logs")
}

model ScheduledTask {
  id             String              @id @default(cuid())
  tenantId       String
  tenant         Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leadId         String?
  lead           Lead?               @relation(fields: [leadId], references: [id])
  conversationId String?
  conversation   Conversation?       @relation(fields: [conversationId], references: [id])
  taskType       ScheduledTaskType
  executeAt      DateTime
  status         ScheduledTaskStatus @default(PENDING)
  payload        Json?
  errorMessage   String?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  @@index([status, executeAt])
  @@index([tenantId, status])
  @@map("scheduled_tasks")
}

model Alert {
  id             String        @id @default(cuid())
  tenantId       String
  tenant         Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leadId         String?
  lead           Lead?         @relation(fields: [leadId], references: [id])
  conversationId String?
  conversation   Conversation? @relation(fields: [conversationId], references: [id])
  userId         String?
  user           User?         @relation(fields: [userId], references: [id])
  type           AlertType
  severity       AlertSeverity @default(WARNING)
  message        String        @db.Text
  isRead         Boolean       @default(false)
  readAt         DateTime?
  createdAt      DateTime      @default(now())
  @@index([tenantId, isRead])
  @@index([userId, isRead])
  @@map("alerts")
}

model DailyReport {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  reportDate      DateTime @db.Date
  payload         Json
  sentViaWhatsapp Boolean  @default(false)
  sentAt          DateTime?
  createdAt       DateTime @default(now())
  @@unique([tenantId, reportDate])
  @@index([tenantId])
  @@map("daily_reports")
}
```

---

## 6. Ambiente & Infraestrutura

### 6.1 Variáveis de ambiente

```env
# .env

# ── Banco de dados ──────────────────────────────────────────
DATABASE_URL="postgresql://moov:password@localhost:5432/moovchat"

# ── Next.js ─────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ── Evolution API ───────────────────────────────────────────
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_GLOBAL_TOKEN="seu-token-global-aqui"

# ── n8n ─────────────────────────────────────────────────────
N8N_WEBHOOK_URL="http://localhost:5678"
N8N_API_KEY="sua-api-key-n8n"
# Usado pelos flows n8n para chamar de volta o Next.js se necessário
NEXTJS_INTERNAL_API_SECRET="secret-para-chamadas-internas"

# ── LLM Providers (configure ao menos um) ───────────────────
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GROQ_API_KEY="gsk_..."

# ── LLM padrão por agente (configurável por flow n8n) ───────
LLM_PROVIDER_ORCHESTRATOR="openai"
LLM_MODEL_ORCHESTRATOR="gpt-4o"
LLM_PROVIDER_SDR="openai"
LLM_MODEL_SDR="gpt-4o-mini"
LLM_PROVIDER_VENDEDOR="openai"
LLM_MODEL_VENDEDOR="gpt-4o"
LLM_PROVIDER_INTELLIGENCE="openai"
LLM_MODEL_INTELLIGENCE="gpt-4o-mini"

# ── Upload de mídia (opcional MVP) ──────────────────────────
STORAGE_PROVIDER="local"  # "local" | "s3" | "cloudflare-r2"
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
```

### 6.2 Docker Compose (desenvolvimento local)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: moov
      POSTGRES_PASSWORD: password
      POSTGRES_DB: moovchat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  n8n:
    image: n8nio/n8n:latest
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=moov
      - DB_POSTGRESDB_PASSWORD=password
      - N8N_ENCRYPTION_KEY=gere-uma-chave-aqui
      - WEBHOOK_URL=http://localhost:5678
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  evolution-api:
    image: atendai/evolution-api:latest
    environment:
      - SERVER_URL=http://localhost:8080
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=seu-token-global-aqui
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://moov:password@postgres:5432/evolution
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
  n8n_data:
```

### 6.3 Estrutura de pastas Next.js

```
/
├── app/
│   ├── (admin)/                    # Layout Super Admin
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── lojas/page.tsx
│   │   ├── lojas/[id]/page.tsx
│   │   ├── prompts/page.tsx
│   │   ├── planos/page.tsx
│   │   └── qa-logs/page.tsx
│   ├── (loja)/                     # Layout Loja (Gerente + Vendedor)
│   │   ├── layout.tsx
│   │   ├── [tenantSlug]/
│   │   │   ├── fila/page.tsx
│   │   │   ├── inbox/[conversationId]/page.tsx
│   │   │   ├── metricas/page.tsx       # gerente only
│   │   │   ├── equipe/page.tsx         # gerente only
│   │   │   ├── catalogo/page.tsx
│   │   │   ├── aprovacoes/page.tsx     # gerente only
│   │   │   └── config/page.tsx         # gerente only
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── webhooks/whatsapp/[tenantSlug]/route.ts
│   │   ├── admin/
│   │   │   ├── tenants/route.ts
│   │   │   ├── tenants/[id]/route.ts
│   │   │   ├── plans/route.ts
│   │   │   └── prompts/route.ts
│   │   └── [tenantSlug]/
│   │       ├── leads/route.ts
│   │       ├── leads/[id]/route.ts
│   │       ├── leads/[id]/assign/route.ts
│   │       ├── conversations/[id]/route.ts
│   │       ├── conversations/[id]/takeover/route.ts
│   │       ├── conversations/[id]/release/route.ts
│   │       ├── conversations/[id]/messages/route.ts
│   │       ├── catalog/products-0km/route.ts
│   │       ├── catalog/used/route.ts
│   │       ├── catalog/accessories/route.ts
│   │       ├── catalog/campaigns/route.ts
│   │       ├── users/route.ts
│   │       ├── alerts/route.ts
│   │       ├── alerts/[id]/read/route.ts
│   │       ├── price-approvals/[id]/route.ts
│   │       └── reports/dashboard/route.ts
│   ├── auth/
│   │   └── signin/page.tsx
│   ├── layout.tsx
│   └── page.tsx                    # redirect por role
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── admin/
│   ├── loja/
│   │   ├── fila/
│   │   ├── inbox/
│   │   ├── catalogo/
│   │   └── metricas/
│   └── shared/
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── auth.ts                     # NextAuth config
│   ├── lead-status.ts
│   └── utils.ts
├── types/
│   └── api.ts
├── middleware.ts
├── prisma/
│   └── schema.prisma
├── docs/
│   └── plans/
│       └── 2026-03-06-moov-chat-prd.md
└── docker-compose.yml
```

---

## 7. Módulo 01 — Autenticação

### Responsabilidade
Autenticar usuários, emitir JWT com role + tenantSlug, proteger todas as rotas.

### Stack
- `next-auth` v5 (Auth.js)
- Credentials provider (email + senha)
- JWT strategy (stateless, compatível com VPS)

### Implementação

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize({ email, password }) {
        const user = await prisma.user.findUnique({
          where: { email: email as string },
          include: { tenant: { select: { slug: true } } },
        })
        if (!user || user.status === 'INACTIVE') return null
        // Nota: adicionar campo passwordHash no model User
        const valid = await bcrypt.compare(password as string, user.passwordHash)
        if (!valid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug ?? null,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantSlug = user.tenantSlug
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      session.user.tenantId = token.tenantId
      session.user.tenantSlug = token.tenantSlug
      return session
    },
  },
  pages: { signIn: '/auth/signin' },
})
```

```typescript
// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // Rotas admin: apenas SUPER_ADMIN
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Rotas de loja: valida tenant
  const tenantMatch = pathname.match(/^\/(api\/)?([^\/]+)\//)
  if (tenantMatch && session.user.role !== 'SUPER_ADMIN') {
    const slug = tenantMatch[2]
    if (session.user.tenantSlug !== slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Rotas gerente only: bloqueia vendedor
  const gerenteOnlyPaths = ['/metricas', '/equipe', '/aprovacoes', '/config']
  if (gerenteOnlyPaths.some(p => pathname.includes(p))) {
    if (session.user.role === 'VENDEDOR') {
      return NextResponse.redirect(new URL(`/${session.user.tenantSlug}/fila`, req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'],
}
```

### Nota: adicionar campo ao schema
```prisma
// Adicionar ao model User:
passwordHash String
```

---

## 8. Módulo 02 — Gestão de Tenants

### Responsabilidade
CRUD de lojas, ativação, configuração de plano, onboarding, briefing.

### User stories
| Story | Role | Critério de aceite |
|---|---|---|
| Criar loja | SUPER_ADMIN | Loja criada com status ONBOARDING, gerente inicial criado, email de boas-vindas enviado |
| Ativar loja | SUPER_ADMIN | Status muda para ACTIVE, WhatsApp conectável |
| Suspender loja | SUPER_ADMIN | Status SUSPENDED, n8n para de processar mensagens da loja |
| Editar políticas | SUPER_ADMIN / GERENTE | Políticas salvas e refletidas nos prompts na próxima montagem |
| Conectar WhatsApp | SUPER_ADMIN | Evolution API cria instância, QR code exibido, webhooks configurados automaticamente |

### API Routes

```typescript
// POST /api/admin/tenants
interface CreateTenantBody {
  name: string
  razaoSocial?: string
  slug: string               // validar único, lowercase, sem espaços
  planId: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  gerenteNome: string        // cria User GERENTE junto
  gerenteEmail: string
  gerenteWhatsapp?: string
}

// PUT /api/admin/tenants/[id]
interface UpdateTenantBody {
  name?: string
  status?: TenantStatus
  planId?: string
  businessHoursStart?: string
  businessHoursEnd?: string
  businessDays?: string[]
  leadDistributionType?: LeadDistributionType
  policyPriceApproval?: boolean
  policyReservation?: boolean
  policyExchange?: boolean
  policyOnOrder?: boolean
  policyPixEnabled?: boolean
  policyPaymentWarning?: string
  policySecurityMessage?: string
  toneOfVoice?: string
  iaMaxConsecutiveMessages?: number
}
```

### Integração Evolution API (ao conectar WhatsApp)
```typescript
// Chamada ao conectar WhatsApp de uma loja
async function createEvolutionInstance(tenant: Tenant) {
  // 1. Criar instância
  await fetch(`${EVOLUTION_API_URL}/instance/create`, {
    method: 'POST',
    headers: { 'apikey': EVOLUTION_API_GLOBAL_TOKEN },
    body: JSON.stringify({
      instanceName: tenant.slug,
      qrcode: true,
      webhook: `${N8N_WEBHOOK_URL}/webhook/whatsapp/${tenant.slug}`,
      webhookByEvents: true,
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
    })
  })
  // 2. Salvar nome da instância no tenant
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { evolutionInstanceName: tenant.slug }
  })
}
```

---

## 9. Módulo 03 — Gestão de Usuários

### Responsabilidade
CRUD de usuários da loja (gerente + vendedores), controle de status.

### Regras de negócio
- Gerente pode criar/editar/desativar vendedores da própria loja
- Gerente não pode criar outro SUPER_ADMIN
- Vendedor desativado não recebe leads no round-robin
- `lastLeadAssignedAt` controla posição no round-robin

### API Routes

```typescript
// GET /api/[tenantSlug]/users
// POST /api/[tenantSlug]/users
interface CreateUserBody {
  name: string
  email: string
  password: string          // hash no server antes de salvar
  phone?: string
  whatsappNotif?: string    // número para alertas SLA
  role: 'GERENTE' | 'VENDEDOR'
}

// PUT /api/[tenantSlug]/users/[id]
interface UpdateUserBody {
  name?: string
  phone?: string
  whatsappNotif?: string
  status?: UserStatus
  role?: 'GERENTE' | 'VENDEDOR'
}
```

### Round-robin helper

```typescript
// lib/lead-assignment.ts
export async function getNextVendedor(tenantId: string): Promise<string | null> {
  const vendedor = await prisma.user.findFirst({
    where: {
      tenantId,
      role: 'VENDEDOR',
      status: 'ACTIVE',
    },
    orderBy: [
      { lastLeadAssignedAt: 'asc' },  // quem faz mais tempo sem receber
      { createdAt: 'asc' },
    ],
  })
  if (!vendedor) return null
  await prisma.user.update({
    where: { id: vendedor.id },
    data: { lastLeadAssignedAt: new Date() },
  })
  return vendedor.id
}
```

---

## 10. Módulo 04 — Catálogo

### Responsabilidade
CRUD de motos 0km, usadas, acessórios, campanhas, brindes e aprovação de preço.

### Regras de negócio
- Catálogo global (0km) é gerenciado pelo Super Admin
- Cada loja personaliza preço, disponibilidade, cor e fotos
- Se `policyPriceApproval = true`, mudança de preço cria `PriceApproval` em PENDING
- IA só oferece produtos com `availability = AVAILABLE`
- IA só oferece `ON_ORDER` se `policyOnOrder = true`

### User stories
| Story | Role | Critério de aceite |
|---|---|---|
| Cadastrar moto usada | GERENTE | Moto salva com fotos, disponível para IA |
| Alterar preço 0km | GERENTE | Se política exige aprovação → cria PriceApproval; senão → aplica imediatamente |
| Aprovar preço | GERENTE | PriceApproval resolvida, preço aplicado ao produto |
| Vincular campanha | GERENTE | Produtos vinculados à campanha aparecem com badge no painel e contexto da IA |

### API Routes

```typescript
// GET /api/[tenantSlug]/catalog/products-0km
// Query: ?available=true&brand=Honda

// POST /api/[tenantSlug]/catalog/products-0km
interface CreateProduct0kmBody {
  globalProductId: string
  modelYear?: number
  color?: string
  price: number
  availability?: AvailabilityStatus
  imageUrls?: string[]
  videoUrl?: string
  notes?: string
  campaignId?: string
}

// PUT /api/[tenantSlug]/catalog/products-0km/[id]
interface UpdateProduct0kmBody {
  price?: number          // cria PriceApproval se política exigir
  availability?: AvailabilityStatus
  color?: string
  imageUrls?: string[]
  campaignId?: string | null
  notes?: string
}

// PUT /api/[tenantSlug]/price-approvals/[id]
interface ResolvePriceApprovalBody {
  status: 'APPROVED' | 'REJECTED'
  notes?: string
}
```

---

## 11. Módulo 05 — Configuração de Prompts

### Responsabilidade
Criação, versionamento e ativação de prompts por agente e por loja. Exclusivo do Super Admin.

### Estrutura de blocos do prompt

```
[promptBase]           → comportamento geral do agente, persona, restrições
[blockStoreContext]    → nome da loja, endereço, horário, marcas
[blockPolicies]        → políticas de negociação, reserva, troca, encomenda
[blockSecurity]        → mensagem oficial de segurança, aviso de pagamento
[blockCampaigns]       → campanhas ativas, brindes vigentes
[blockHandoff]         → quando e como transferir para humano
[blockToneOfVoice]     → estilo de comunicação, linguagem, emojis
[historyMessages]      → últimas N mensagens da conversa (montado em runtime pelo Flow 7)
```

### Regras de negócio
- Apenas SUPER_ADMIN pode criar/editar prompts
- Versionamento automático (version++)
- Ao publicar nova versão, versão anterior fica `isActive = false`
- Se loja não tiver prompt específico, usa o prompt global

### API Routes

```typescript
// GET /api/admin/prompts?tenantId=x&agentType=SDR
// POST /api/admin/prompts
interface CreatePromptBody {
  tenantId?: string
  agentType: AgentType
  promptBase: string
  blockStoreContext?: string
  blockPolicies?: string
  blockSecurity?: string
  blockCampaigns?: string
  blockHandoff?: string
  blockToneOfVoice?: string
}
// PUT /api/admin/prompts/[id]  — mesmos campos, cria nova versão
```

---

## 12. Módulo 06 — Lead & Conversa

### Responsabilidade
Gerenciar state machines de Lead e Conversation, persistir mensagens, controlar transições.

### State Machine — Lead

```
NOVO_LEAD
   └─► INTERESSADO
          └─► QUALIFICADO
                 ├─► NEGOCIANDO
                 │      ├─► AGUARDANDO_APROVACAO ──► NEGOCIANDO
                 │      ├─► PROPOSTA_ENVIADA
                 │      │      └─► AGUARDANDO_VISITA
                 │      │               ├─► VISITOU
                 │      │               │      ├─► VENDIDO
                 │      │               │      └─► PERDIDO
                 │      │               └─► PERDIDO
                 │      └─► PERDIDO
                 └─► PERDIDO
```

**Regra:** Apenas vendedor ou gerente altera `state` via API. IA nunca chama PUT /leads/[id].

### State Machine — Conversation

```
ATIVA_IA ──────────────────────────────────────────► FINALIZADA
   │                                                      ▲
   ├─► AGUARDANDO_RESPOSTA_CLIENTE                        │
   │        └─► ATIVA_IA (cliente responde)               │
   │        └─► REATIVACAO_AGENDADA (silêncio 3 dias)     │
   │                  └─► ATIVA_IA (reativação)           │
   │                                                      │
   └─► AGUARDANDO_VENDEDOR ─────────────────────────────► │
              └─► EM_ATENDIMENTO_HUMANO                   │
                        ├─► ATIVA_IA (devolvida para IA)  │
                        └─► FINALIZADA ───────────────────┘

PAUSADA (atingiu limite de mensagens consecutivas sem resposta)
   └─► ATIVA_IA (cliente volta a responder)
```

### Campos críticos para o n8n

```typescript
// O n8n consulta estes campos para decidir ação
interface ConversationContext {
  id: string
  state: ConversationState
  consecutiveIaMessages: number      // bloqueia IA se >= iaMaxConsecutiveMessages
  lastClientMessageAt: string | null // base para follow-ups
  humanSlaStartedAt: string | null   // base para alertas SLA
  lead: {
    state: LeadState
    isHot: boolean
    hasUrgency: boolean
    primaryInterest: string | null
  }
}
```

---

## 13. Módulo 07 — WhatsApp Gateway

### Responsabilidade
Receber mensagens da Evolution API via webhook e encaminhar ao n8n. Enviar mensagens de volta.

### Webhook endpoint

```typescript
// app/api/webhooks/whatsapp/[tenantSlug]/route.ts
// Este endpoint é chamado pela Evolution API
// Valida o token e repassa ao n8n

export async function POST(
  req: Request,
  { params }: { params: { tenantSlug: string } }
) {
  const token = req.headers.get('apikey')
  if (token !== process.env.EVOLUTION_API_GLOBAL_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Ignora mensagens enviadas pelo próprio sistema (fromMe)
  if (body.data?.key?.fromMe) {
    return Response.json({ ok: true })
  }

  // Repassa ao n8n de forma assíncrona
  fetch(`${process.env.N8N_WEBHOOK_URL}/webhook/inbound-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': params.tenantSlug,
    },
    body: JSON.stringify(body),
  }).catch(console.error) // fire-and-forget

  return Response.json({ ok: true })
}
```

### Serviço de envio de mensagens

```typescript
// lib/evolution.ts
export async function sendTextMessage(instanceName: string, phone: string, text: string) {
  return fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.EVOLUTION_API_GLOBAL_TOKEN!,
    },
    body: JSON.stringify({
      number: phone,
      options: { delay: 1200, presence: 'composing' },
      textMessage: { text },
    }),
  })
}

export async function sendMediaMessage(instanceName: string, phone: string, mediaUrl: string, caption?: string) {
  return fetch(`${process.env.EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.EVOLUTION_API_GLOBAL_TOKEN!,
    },
    body: JSON.stringify({
      number: phone,
      mediaMessage: { mediatype: 'image', media: mediaUrl, caption },
    }),
  })
}
```

---

## 14. Módulo 08 — Orquestração IA (n8n)

### Flow 1 — Nova Mensagem Inbound

**Trigger:** `POST /webhook/inbound-message` (chamado pelo Next.js webhook)

```
[Webhook Trigger]
  → [Set: extrair phone, text, mediaType, whatsappMsgId, tenantSlug]
  → [PostgreSQL: SELECT tenant WHERE slug = tenantSlug]
  → [PostgreSQL: UPSERT lead WHERE tenantId + phone]
  → [PostgreSQL: SELECT conversation ativa WHERE leadId]
      → se não existe: INSERT conversation (state=ATIVA_IA)
  → [PostgreSQL: INSERT message (INBOUND)]
  → [IF: state == EM_ATENDIMENTO_HUMANO] → STOP
  → [IF: state == AGUARDANDO_VENDEDOR]   → STOP
  → [IF: consecutiveIaMessages >= tenant.iaMaxConsecutiveMessages]
      → [UPDATE conversation state=PAUSADA] → STOP
  → [Execute Sub-flow: Flow 6 — Inteligência Comercial]
  → [Execute Sub-flow: Flow 7 — Prompt Assembly]
  → [HTTP: LLM API — chat completion]
  → [IF: response tem trigger de handoff]
      → [Execute Sub-flow: Flow 2 — Handoff]
  → [PostgreSQL: INSERT message (OUTBOUND, actorType)]
  → [HTTP: Evolution API — sendMessage]
  → [PostgreSQL: UPDATE conversation (lastIaMessageAt, consecutiveIaMessages+1)]
  → [PostgreSQL: INSERT EventLog]
  → [PostgreSQL: DELETE scheduled_tasks FOLLOWUP pendentes deste lead]
  → [PostgreSQL: INSERT scheduled_task FOLLOWUP_10MIN executeAt=now+10min]
```

### Flow 2 — Handoff IA → Humano

**Trigger:** Sub-flow (recebe conversationId, reason)

```
  → [PostgreSQL: SELECT conversation + lead + messages (last 20)]
  → [HTTP: LLM — gerar HandoffSummary JSON]
  → [PostgreSQL: INSERT handoff_summary]
  → [Lib: getNextVendedor(tenantId)] via HTTP GET /api/[slug]/users/next-vendedor
  → [PostgreSQL: UPDATE conversation {state: AGUARDANDO_VENDEDOR, humanSlaStartedAt}]
  → [PostgreSQL: UPDATE lead {assignedVendedorId}]
  → [PostgreSQL: INSERT lead_assignment]
  → [PostgreSQL: INSERT event_log (handoff_iniciado)]
  → [HTTP: Evolution API — informar cliente da transferência]
  → [HTTP: Evolution API — notificar vendedor no WhatsApp]
  → [PostgreSQL: INSERT alert {type: SLA_VENDEDOR, userId: vendedorId}]
  → [PostgreSQL: INSERT scheduled_task SLA_ALERT_10MIN executeAt=now+10min]
```

### Flow 3 — SLA Alerts

**Trigger:** `Cron */5 * * * *`

```
  → [PostgreSQL: SELECT scheduled_tasks WHERE type IN SLA_ALERTS AND status=PENDING AND executeAt <= now()]
  → [Split por task]
  → [PostgreSQL: SELECT conversation]
  → [IF: state não é AGUARDANDO_VENDEDOR nem EM_ATENDIMENTO_HUMANO] → CANCEL task
  → [Switch taskType]:
      SLA_ALERT_10MIN → WhatsApp vendedor + novo task 30min
      SLA_ALERT_30MIN → WhatsApp vendedor + novo task 1h
      SLA_ALERT_1H    → WhatsApp vendedor + gerente + INSERT Alert CRITICAL + novo task 2h
      SLA_ALERT_2H    → WhatsApp vendedor + gerente + INSERT Alert CRITICAL (sem novo task)
  → [PostgreSQL: UPDATE task status=DONE]
  → [PostgreSQL: INSERT EventLog]
```

### Flow 4 — Follow-up após Silêncio

**Trigger:** `Cron */5 * * * *`

```
  → [PostgreSQL: SELECT tasks WHERE type IN FOLLOWUPS AND status=PENDING AND executeAt <= now()]
  → [Split por task]
  → [PostgreSQL: SELECT conversation]
  → [IF: lastClientMessageAt > task.createdAt] → CANCEL (cliente respondeu)
  → [IF: state == EM_ATENDIMENTO_HUMANO ou FINALIZADA] → CANCEL
  → [Switch taskType]:
      FOLLOWUP_10MIN → msg "Ficou com alguma dúvida? 😊" + task FOLLOWUP_6H
      FOLLOWUP_6H    → msg "Posso ajudar com mais informações? 🏍" + task FOLLOWUP_3DIAS
      FOLLOWUP_3DIAS → [Flow 7: Prompt Assembly com instrução de retomada contextual]
                        → LLM gera mensagem contextual
                        → UPDATE conversation state=REATIVACAO_AGENDADA
  → [HTTP: Evolution API — sendMessage]
  → [PostgreSQL: INSERT message OUTBOUND]
  → [PostgreSQL: INSERT EventLog followup_executado]
  → [PostgreSQL: UPDATE task status=DONE]
```

### Flow 5 — Relatório Diário

**Trigger:** `Cron 0 8 * * *`

```
  → [PostgreSQL: SELECT tenants WHERE status=ACTIVE]
  → [Split por tenant]
  → [PostgreSQL: executar 10 queries de métricas do dia anterior]
  → [Set: montar payload JSON]
  → [PostgreSQL: INSERT daily_report]
  → [HTTP: LLM — formatar mensagem humanizada para WhatsApp]
  → [PostgreSQL: SELECT gerentes do tenant com whatsappNotif]
  → [Split por gerente]
  → [HTTP: Evolution API — sendMessage ao gerente]
  → [PostgreSQL: UPDATE daily_report sentViaWhatsapp=true]
```

### Flow 6 — Inteligência Comercial (sub-flow)

**Trigger:** Sub-flow (recebe messageText, leadId, tenantId)

```
  → [HTTP: LLM — classificar mensagem]
      prompt: "Retorne JSON: {isHot, hasUrgency, mentionedCompetitor, competitorName, suggestedLeadScore}"
  → [PostgreSQL: UPDATE lead {isHot, hasUrgency, mentionedCompetitor, leadScore}]
  → [IF: isHot == true]
      → [PostgreSQL: INSERT alert {type: LEAD_QUENTE, severity: CRITICAL}]
      → [HTTP: Evolution API — notificar gerente]
  → [PostgreSQL: INSERT EventLog com payload de inteligência]
  → [Return: {isHot, hasUrgency, mentionedCompetitor, suggestedLeadScore}]
```

### Flow 7 — Prompt Assembly (sub-flow)

**Trigger:** Sub-flow (recebe tenantId, agentType, conversationId)

```
  → [PostgreSQL: SELECT prompt_config ativo para {tenantId, agentType}]
      fallback: SELECT prompt_config global se não há específico do tenant
  → [PostgreSQL: SELECT tenant com todas as políticas]
  → [PostgreSQL: SELECT conversation + lead + messages (last 30)]
  → [PostgreSQL: SELECT catálogo disponível (0km + usadas)]
  → [PostgreSQL: SELECT campanhas ativas + brindes]
  → [Set: concatenar todos os blocos do prompt]
  → [Return: {systemPrompt, userMessage, model, temperature}]
```

---

## 15. Módulo 09 — Handoff IA → Humano

### Gatilhos obrigatórios de handoff
1. Cliente solicitar explicitamente falar com humano
2. Reclamação detectada
3. Cliente nervoso/irritado (tom detectado pelo LLM)
4. Menção a troca de moto
5. Necessidade de finalizar compra (LLM detecta intenção de compra imediata)
6. Contexto fora da zona autorizada da IA (pergunta jurídica, dado bancário, etc.)

### Comportamento pós-handoff
- IA informa ao cliente: *"Vou conectar você com nosso especialista. Ele te atende em instantes! 🏍"*
- Conversation state → `AGUARDANDO_VENDEDOR`
- IA entra em **modo observação silenciosa** (não responde, continua gravando eventos)
- Vendedor recebe notificação via WhatsApp + alerta no painel
- Vendedor vê HandoffSummary completo ao abrir a conversa

### HandoffSummary — campos enviados ao vendedor

```typescript
interface HandoffSummary {
  clientName: string | null
  clientPhone: string
  contactReason: string          // "interesse em compra de moto"
  modelInterest: string | null   // "CG 160 2024 Azul"
  answeredQuestions: string      // "Perguntou sobre financiamento e cores disponíveis"
  urgencySignals: string         // "Quer comprar ainda essa semana"
  negotiationStatus: string      // "Em fase de qualificação, não recebeu proposta ainda"
  handoffReason: string          // motivo da transferência
  nextStepSuggested: string      // "Enviar proposta com simulação de financiamento"
}
```

### Devolução para IA
- Vendedor clica em "Devolver para IA" no painel
- Conversation state → `ATIVA_IA`
- IA retoma com memória preservada (histórico completo no Flow 7)
- EventLog registra `conversa_devolvida_para_ia`

---

## 16. Módulo 10 — Inbox Humano

### Responsabilidade
Interface do painel onde vendedor e gerente visualizam e respondem conversas.

### Funcionalidades

```typescript
// Componentes principais do Inbox

// 1. LeadQueue — lista priorizada de leads
// Ordenação: isHot DESC, humanSlaStartedAt ASC (mais urgente primeiro), lastMessageAt DESC

// 2. ConversationView — chat + painel lateral de informações

// 3. LeadInfoPanel — dados do lead, estado, resumo da IA, ações rápidas

// 4. MessageInput — campo de resposta com suporte a texto e mídia
```

### Polling para atualizações em tempo real
- Painel faz polling a cada **5 segundos** em `/api/[tenant]/conversations/[id]` quando inbox está aberto
- Fila faz polling a cada **15 segundos** para atualizar contadores e prioridades
- Badge de alertas atualiza a cada **30 segundos**

### Envio de mensagem pelo painel

```typescript
// POST /api/[tenantSlug]/conversations/[id]/messages
// Salva no banco + envia via Evolution API diretamente (não passa pelo n8n)
async function sendHumanMessage(conversationId: string, body: SendMessageBody, session: SessionUser) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })

  // Verifica que humano é o atendente atual
  if (conversation.humanAttendantId !== session.id && session.role !== 'GERENTE') {
    throw new Error('Forbidden')
  }

  // Salva mensagem
  const message = await prisma.message.create({
    data: {
      tenantId: conversation.tenantId,
      conversationId,
      actorType: session.role === 'GERENTE' ? 'HUMANO_GERENTE' : 'HUMANO_VENDEDOR',
      actorId: session.id,
      direction: 'OUTBOUND',
      contentType: body.contentType,
      contentText: body.contentText,
      isInternal: body.isInternal ?? false,
    }
  })

  // Envia via Evolution API (se não for nota interna)
  if (!body.isInternal) {
    const tenant = await prisma.tenant.findUnique({ where: { id: conversation.tenantId } })
    await sendTextMessage(tenant.evolutionInstanceName!, lead.phone, body.contentText!)
  }

  // Atualiza timestamps
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastHumanMessageAt: new Date(), lastMessageAt: new Date() }
  })

  // Cancela alertas SLA pendentes (humano respondeu)
  await prisma.scheduledTask.updateMany({
    where: { conversationId, taskType: { in: ['SLA_ALERT_10MIN','SLA_ALERT_30MIN','SLA_ALERT_1H','SLA_ALERT_2H'] }, status: 'PENDING' },
    data: { status: 'CANCELLED' }
  })

  return message
}
```

---

## 17. Módulo 11 — Scheduler & Follow-ups

### Responsabilidade
Agendar e executar follow-ups automáticos após silêncio do cliente.

### Temporizadores de follow-up

| Tempo sem resposta do cliente | Ação da IA |
|---|---|
| 10 minutos | "Ficou com alguma dúvida? Posso te ajudar! 😊" |
| 6 horas | "Oi! Ainda está pensando na moto? Posso te passar mais informações 🏍" |
| 3 dias | Mensagem contextual gerada pelo LLM retomando a conversa anterior |

### Limite de mensagens consecutivas
- IA envia no máximo `tenant.iaMaxConsecutiveMessages` (padrão: 3) mensagens sem resposta
- Ao atingir o limite: `Conversation.state → PAUSADA`
- Ao cliente responder: estado volta para `ATIVA_IA`, contador resetado

### Lógica de cancelamento
- Se cliente responde antes do follow-up: task CANCELLED
- Se conversa vai para EM_ATENDIMENTO_HUMANO: tasks de follow-up CANCELLED
- Se conversa FINALIZADA: todas as tasks CANCELLED

---

## 18. Módulo 12 — SLA Alerts

### Responsabilidade
Monitorar atrasos do vendedor humano em responder leads e notificar proativamente.

### Escalonamento de alertas

| Tempo sem resposta do vendedor | Notificação |
|---|---|
| 10 minutos | WhatsApp ao vendedor + Alert no painel |
| 30 minutos | WhatsApp ao vendedor (reforço) + Alert no painel |
| 1 hora | WhatsApp ao vendedor **e gerente** + Alert CRITICAL no painel |
| 2 horas | WhatsApp ao vendedor **e gerente** (reforço) + Alert CRITICAL |

### Cancelamento do SLA
- Vendedor envia mensagem: todos os SLA tasks desse lead → CANCELLED
- Vendedor devolve para IA: SLA tasks → CANCELLED (novo timer não iniciado)
- Lead marcado como PERDIDO ou VENDIDO: SLA tasks → CANCELLED

---

## 19. Módulo 13 — Inteligência Comercial

### Responsabilidade
Detectar automaticamente sinais comerciais nas mensagens para priorizar atendimento.

### Detecções

| Sinal | Como detectar | Ação |
|---|---|---|
| **Lead quente** | LLM detecta intenção clara de compra, prazo curto, verba definida | `lead.isHot = true`, alert CRITICAL ao gerente |
| **Urgência** | "quero hoje", "só tenho hoje", "preciso urgente" | `lead.hasUrgency = true`, prioridade máxima na fila |
| **Concorrente** | Menção a outra loja ou marca concorrente | `lead.mentionedCompetitor = true`, sugere handoff rápido |

### Prompt de classificação (Flow 6)

```
Analise esta mensagem de um cliente interessado em moto e retorne SOMENTE um JSON válido:
{
  "isHot": boolean,           // true se há forte intenção de compra com prazo/verba definidos
  "hasUrgency": boolean,      // true se cliente expressou urgência de tempo
  "mentionedCompetitor": boolean,   // true se citou outra loja ou marca concorrente
  "competitorName": string | null,  // nome do concorrente se mencionado
  "suggestedLeadScore": number      // 0 a 100, score de intenção de compra
}

Mensagem do cliente: "{messageText}"
```

### Prioridade na fila de leads

```typescript
// Ordenação da fila de leads (decrescente de prioridade)
const ORDER = `
  ORDER BY
    CASE WHEN l.is_hot = true THEN 0 ELSE 1 END,
    CASE WHEN l.has_urgency = true THEN 0 ELSE 1 END,
    CASE WHEN c.state = 'AGUARDANDO_VENDEDOR' THEN 0 ELSE 1 END,
    c.human_sla_started_at ASC NULLS LAST,
    c.last_client_message_at DESC NULLS LAST
`
```

---

## 20. Módulo 14 — QA Monitoring

### Responsabilidade
Detectar atendimentos problemáticos da IA e notificar a empresa operadora para revisão.

### Critérios de detecção de erro (executado pelo n8n após envio da resposta)

```
Resposta da IA é problemática quando:
- Contradiz diretamente uma política da loja (ex: "pode pagar por PIX" quando policy_pix_enabled=false)
- Cita preço diferente do catálogo atual
- Responde com informação genérica sendo que o catálogo tem dado específico
- Promete algo que não está na política (ex: reserva quando policyReservation=false)
- Contém conteúdo com risco jurídico (garantias indevidas, compromissos formais)
- Revela que é IA quando não deveria (conforme política da loja)
```

### Prompt de QA

```
Você é um auditor de qualidade de atendimento comercial.
Analise a resposta da IA abaixo e retorne JSON:
{
  "hasIssue": boolean,
  "issueType": "policy_violation" | "wrong_price" | "generic_response" | "legal_risk" | "ai_disclosure" | null,
  "severity": "LOW" | "MEDIUM" | "HIGH" | null,
  "description": string | null
}

Política da loja: {blockPolicies}
Catálogo atual: {catalogSummary}
Resposta da IA: {iaResponse}
```

### Ação ao detectar erro

```typescript
// Flow n8n: se hasIssue == true
// 1. INSERT EventLog com tipo "erro_qa_detectado" e payload do erro
// 2. INSERT Alert { type: ERRO_QA, severity, tenantId, conversationId }
// 3. Notificar Super Admin via WhatsApp (ou painel interno)
// 4. NÃO modifica a mensagem já enviada (é post-hoc)
```

---

## 21. Módulo 15 — Relatórios & Analytics

### Responsabilidade
Dashboard de métricas em tempo real e relatório diário via WhatsApp.

### Métricas do dashboard

```typescript
interface DashboardMetrics {
  period: { from: Date; to: Date }
  kpis: {
    totalLeads: number
    avgFirstResponseSeconds: number    // IA — meta: < 60s
    avgHumanResponseSeconds: number    // humano — meta: < 600s
    handoffRate: number                // % leads que foram para humano
    qualifiedRate: number
    proposalRate: number
    visitRate: number
    saleRate: number
  }
  funnel: {
    received: number
    qualified: number
    proposal: number
    visit: number
    sold: number
    lost: number
  }
  vendedorPerformance: Array<{
    vendedor: { id: string; name: string }
    leadsAssigned: number
    leadsAnswered: number
    sales: number
    avgResponseSeconds: number
    slaBreaches: number
  }>
  alerts: {
    leadsWithoutResponse: number
    leadsOverdue: number
    hotLeadsOpen: number
  }
}
```

### Queries SQL principais

```sql
-- Tempo médio de primeira resposta da IA
SELECT AVG(EXTRACT(EPOCH FROM (l.first_response_at - l.first_contact_at)))
FROM leads l
WHERE l.tenant_id = $1
  AND l.first_response_at IS NOT NULL
  AND l.created_at >= $2 AND l.created_at <= $3;

-- Taxa de leads por estado
SELECT state, COUNT(*) as total
FROM leads
WHERE tenant_id = $1 AND created_at >= $2
GROUP BY state;

-- Performance do vendedor
SELECT
  u.id, u.name,
  COUNT(DISTINCT l.id) FILTER (WHERE l.assigned_vendedor_id = u.id) as leads_assigned,
  COUNT(DISTINCT l.id) FILTER (WHERE l.state = 'VENDIDO') as sales,
  COUNT(DISTINCT st.id) FILTER (WHERE st.task_type LIKE 'SLA_%' AND st.status = 'DONE') as sla_breaches
FROM users u
LEFT JOIN leads l ON l.assigned_vendedor_id = u.id
LEFT JOIN scheduled_tasks st ON st.tenant_id = u.tenant_id
WHERE u.tenant_id = $1 AND u.role = 'VENDEDOR'
GROUP BY u.id, u.name;
```

### Formato do relatório diário (WhatsApp)

```
📊 *MOOV Chat — Resumo do dia {DATA}*
Loja: {NOME DA LOJA}

📥 *Leads recebidos:* {N}
⚡ *Tempo médio de 1ª resposta:* {Xmin}
🤝 *Handoffs realizados:* {N}
📋 *Propostas enviadas:* {N}
🏪 *Visitas agendadas:* {N}
✅ *Vendas registradas:* {N}

👥 *Performance da equipe:*
• {Vendedor A}: {N} leads · {N} vendas
• {Vendedor B}: {N} leads · {N} vendas

⚠️ *Atenção:*
• {N} leads sem resposta há mais de 1h
• {N} leads quentes aguardando atendimento

_Acesse o painel para mais detalhes._
```

---

## 22. API Routes Reference

### Autenticação
| Método | Rota | Role | Descrição |
|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | público | Login/logout NextAuth |

### Webhook
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/webhooks/whatsapp/[tenantSlug]` | API Key | Evolution API → n8n |

### Admin
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/admin/tenants` | SUPER_ADMIN | Listar lojas |
| POST | `/api/admin/tenants` | SUPER_ADMIN | Criar loja |
| GET | `/api/admin/tenants/[id]` | SUPER_ADMIN | Detalhe da loja |
| PUT | `/api/admin/tenants/[id]` | SUPER_ADMIN | Editar loja |
| DELETE | `/api/admin/tenants/[id]` | SUPER_ADMIN | Desativar loja |
| GET | `/api/admin/plans` | SUPER_ADMIN | Listar planos |
| GET | `/api/admin/prompts` | SUPER_ADMIN | Listar prompts |
| POST | `/api/admin/prompts` | SUPER_ADMIN | Criar/versionar prompt |
| PUT | `/api/admin/prompts/[id]` | SUPER_ADMIN | Editar prompt |

### Leads
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/[slug]/leads` | GER/VEND | Listar leads (filtrado por role) |
| POST | `/api/[slug]/leads` | GER | Criar lead manual |
| GET | `/api/[slug]/leads/[id]` | GER/VEND | Detalhe do lead |
| PUT | `/api/[slug]/leads/[id]` | GER/VEND | Alterar estado, notas |
| POST | `/api/[slug]/leads/[id]/assign` | GER | Reatribuir a vendedor |

### Conversas
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/[slug]/conversations/[id]` | GER/VEND | Conversa + mensagens + resumo |
| POST | `/api/[slug]/conversations/[id]/takeover` | GER/VEND | Assumir conversa |
| POST | `/api/[slug]/conversations/[id]/release` | GER/VEND | Devolver para IA |
| POST | `/api/[slug]/conversations/[id]/messages` | GER/VEND | Enviar mensagem |

### Catálogo
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET/POST | `/api/[slug]/catalog/products-0km` | GER/VEND | Listar/criar 0km |
| PUT | `/api/[slug]/catalog/products-0km/[id]` | GER | Editar 0km |
| GET/POST | `/api/[slug]/catalog/used` | GER | Listar/criar usadas |
| PUT | `/api/[slug]/catalog/used/[id]` | GER | Editar usada |
| GET/POST | `/api/[slug]/catalog/accessories` | GER | Listar/criar acessórios |
| GET/POST | `/api/[slug]/catalog/campaigns` | GER | Listar/criar campanhas |
| PUT | `/api/[slug]/price-approvals/[id]` | GER | Aprovar/rejeitar preço |

### Usuários da loja
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/[slug]/users` | GER | Listar usuários |
| POST | `/api/[slug]/users` | GER | Criar usuário |
| PUT | `/api/[slug]/users/[id]` | GER | Editar usuário |

### Alertas
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/[slug]/alerts` | GER/VEND | Listar alertas |
| PUT | `/api/[slug]/alerts/[id]/read` | GER/VEND | Marcar como lido |

### Relatórios
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/[slug]/reports/dashboard` | GER | Métricas do período |
| GET | `/api/[slug]/reports/daily` | GER | Histórico de relatórios diários |

---

## 23. Conformidade LGPD

### Dados pessoais tratados
| Dado | Finalidade | Base legal |
|---|---|---|
| Nome do cliente | Identificação e atendimento | Legítimo interesse |
| Telefone (WhatsApp) | Canal de comunicação | Contrato/legítimo interesse |
| Histórico de mensagens | Qualidade do atendimento e auditoria | Legítimo interesse |
| Intenção de compra | Qualificação comercial | Legítimo interesse |

### Boas práticas implementadas
- **Isolamento por tenant:** dados de cada loja nunca se cruzam (tenantId em toda query)
- **Minimização:** apenas dados necessários para o atendimento são coletados
- **Auditoria:** EventLog registra quem acessou/alterou dados críticos
- **Retenção:** política de retenção de mensagens configurável por tenant (não no MVP — fase 2)
- **Segurança comercial:** sistema avisa ao cliente que o atendimento é oficial da loja X

### Nota de desenvolvimento
- Nunca logar `contentText` de mensagens em logs de servidor (pode conter dados pessoais)
- Campos de senha sempre hashados com bcrypt (saltRounds: 12)
- Variáveis de ambiente nunca commitadas no repositório
- Adicionar `.env` e `.env.local` ao `.gitignore`

---

## 24. Roadmap de Desenvolvimento

### Visão geral das fases

```
Fase 1 — MVP Core (8 semanas)
   └── Infraestrutura + Auth + Tenant + Catálogo básico + WhatsApp + IA básica + Handoff + Alertas SLA + Relatório diário

Fase 2 — Inteligência (4 semanas)
   └── Lead score + Inteligência comercial avançada + QA monitoring + Prompt versionado

Fase 3 — Escala (4 semanas)
   └── Multi-instância Evolution API + Otimizações de performance + Integrações externas básicas
```

---

### Fase 1 — MVP Core

**Objetivo:** Sistema funcional do fluxo completo — lead chega pelo WhatsApp, IA atende, vendedor assume, gerente acompanha.

#### Etapa 1.1 — Infraestrutura e Setup (Semana 1)
- [ ] Scaffoldar projeto Next.js 14 com App Router + TypeScript
- [ ] Configurar Tailwind CSS + shadcn/ui com paleta MOOV Chat
- [ ] Configurar Prisma + PostgreSQL (rodar `prisma migrate dev`)
- [ ] Configurar NextAuth.js com Credentials provider
- [ ] Docker Compose com PostgreSQL + n8n + Evolution API
- [ ] Middleware de autenticação e autorização por role
- [ ] Estrutura base de pastas `/app/(admin)` e `/app/(loja)`
- [ ] `.env.example` documentado

#### Etapa 1.2 — Admin e Tenant (Semana 2)
- [ ] Painel Super Admin — layout base com sidebar
- [ ] CRUD de Planos
- [ ] CRUD de Lojas (criar, editar, ativar, suspender)
- [ ] Criação automática de gerente ao criar loja
- [ ] Integração com Evolution API: criar instância + configurar webhooks
- [ ] Tela de briefing de onboarding
- [ ] CRUD de Usuários da loja (pelo gerente)

#### Etapa 1.3 — Catálogo (Semana 3)
- [ ] Catálogo global 0km (Super Admin)
- [ ] Catálogo da loja — 0km (preço, disponibilidade, fotos)
- [ ] Catálogo — Motos usadas
- [ ] Catálogo — Acessórios
- [ ] Campanhas e brindes
- [ ] Fluxo de aprovação de preço (quando `policyPriceApproval = true`)

#### Etapa 1.4 — Fluxo WhatsApp + IA (Semana 4)
- [ ] Endpoint webhook `/api/webhooks/whatsapp/[tenantSlug]`
- [ ] n8n: Flow 7 — Prompt Assembly
- [ ] n8n: Flow 1 — Inbound (receber + chamar LLM + responder)
- [ ] Estrutura de prompts base (SDR IA + Vendedor IA)
- [ ] Tela de configuração de prompts no Admin
- [ ] Testes com mensagens reais no WhatsApp

#### Etapa 1.5 — Handoff e Inbox Humano (Semana 5)
- [ ] n8n: Flow 2 — Handoff IA → Humano
- [ ] HandoffSummary gerado por LLM
- [ ] Painel da loja — Fila de Leads com priorização
- [ ] Painel da loja — Inbox (chat + painel de informações do lead)
- [ ] Takeover (assumir conversa) e release (devolver para IA)
- [ ] Envio de mensagem pelo painel (Next.js → Evolution API direto)
- [ ] Alteração manual de estado do lead

#### Etapa 1.6 — Automações e Alertas (Semana 6)
- [ ] n8n: Flow 3 — SLA Alerts (10min, 30min, 1h, 2h)
- [ ] n8n: Flow 4 — Follow-up após silêncio do cliente
- [ ] n8n: Flow 5 — Relatório diário via WhatsApp
- [ ] Painel de alertas no frontend
- [ ] Badge de alertas no header

#### Etapa 1.7 — Dashboard e Polimento (Semana 7)
- [ ] Dashboard de métricas (Gerente)
- [ ] Queries SQL de performance
- [ ] Responsividade mobile (bottom nav)
- [ ] Tratamento de erros e loading states
- [ ] Testes end-to-end dos fluxos principais

#### Etapa 1.8 — Testes e Deploy (Semana 8)
- [ ] Testes com loja piloto real
- [ ] Deploy em VPS (Hetzner/Railway/Render)
- [ ] Configuração de HTTPS e domínio
- [ ] Monitoramento básico (uptime, logs de erro)
- [ ] Documentação de onboarding para empresa operadora

---

### Fase 2 — Inteligência (Semanas 9–12)

#### Etapa 2.1 — Inteligência Comercial (Semana 9)
- [ ] n8n: Flow 6 — Inteligência Comercial completo
- [ ] Lead score visível na fila e no inbox
- [ ] Badge "🔥 Lead Quente" na fila
- [ ] Notificação ao gerente de lead com alta probabilidade de compra no dia
- [ ] Detecção de menção a concorrente com alerta

#### Etapa 2.2 — QA Monitoring (Semana 10)
- [ ] n8n: sub-flow de QA pós-envio
- [ ] Tela de QA Logs no Admin
- [ ] Alert de erro QA com severidade
- [ ] Classificação de tipo de erro

#### Etapa 2.3 — Prompt Versionado e Sandbox (Semana 11)
- [ ] Interface de edição de prompts com blocos visuais
- [ ] Histórico de versões de prompt
- [ ] Comparação entre versões
- [ ] Rollback de versão

#### Etapa 2.4 — Recuperação de Leads (Semana 12)
- [ ] Registro de motivo de perda
- [ ] Filtro de leads perdidos por motivo
- [ ] Cadência de recuperação configurável
- [ ] Relatório de leads recuperados

---

### Fase 3 — Escala (Semanas 13–16)

#### Etapa 3.1 — Performance e Escala (Semana 13)
- [ ] Índices adicionais no PostgreSQL baseados em queries lentas
- [ ] Cache de catálogo (Redis ou cache em memória do n8n)
- [ ] Paginação cursor-based na fila de leads
- [ ] Limitar histórico de mensagens enviado ao LLM (janela deslizante)

#### Etapa 3.2 — Integrações Externas (Semana 14)
- [ ] Exportação de leads para CSV
- [ ] Webhook de saída (notificar sistemas externos sobre eventos)
- [ ] API pública básica para integradores

#### Etapa 3.3 — Funcionalidades Avançadas (Semanas 15–16)
- [ ] Pós-venda automático (mensagem de agradecimento + pedido de avaliação)
- [ ] Distribuição inteligente de leads (por especialidade do vendedor)
- [ ] Automações gerenciais avançadas (campanha de Black Friday, etc.)
- [ ] App mobile PWA (vendedor em campo)

---

### Critérios de saída do MVP (Fase 1)

Para considerar o MVP completo e pronto para a primeira loja real:

- [ ] Lead recebe resposta da IA em menos de 60 segundos após enviar mensagem
- [ ] Handoff funciona corretamente com resumo visível ao vendedor
- [ ] Alertas SLA chegam no WhatsApp do vendedor e gerente
- [ ] Relatório diário é enviado automaticamente às 8h
- [ ] Gerente consegue ver fila de leads, métricas e equipe
- [ ] Vendedor consegue assumir lead, responder e devolver para IA
- [ ] Catálogo básico cadastrado e sendo usado pela IA nas respostas
- [ ] Sistema rodando em VPS com uptime > 99%

---

*Documento gerado em: 2026-03-06*
*Stack: Next.js 14 + n8n + PostgreSQL + Evolution API*
*Produto: MOOV Chat — SaaS de Atendimento para Revendas de Moto*

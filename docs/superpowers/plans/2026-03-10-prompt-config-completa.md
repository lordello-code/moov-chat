# Prompt Config Completa (Task 14) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar a Task 14 com 3 melhorias: (1) preview do prompt montado no admin, (2) histórico de versões com reativação, (3) briefing guiado de IA para o gerente na página de config da loja.

**Architecture:** Abordagem A — estender `Briefing` model com campo `meta Json?` (1 migration) para guardar os novos campos do briefing. Admin ganha preview client-side + toggle de histórico. `process-message` usa os novos campos `meta` para enriquecer o system prompt.

**Tech Stack:** Next.js 15 App Router, Prisma 7, Tailwind CSS, TypeScript strict, sem testes unitários (verificação manual + curl)

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `prisma/schema.prisma` | Modify | Adicionar `meta Json?` ao model `Briefing` |
| `app/api/admin/prompts/route.ts` | Modify | Aceitar `?showAll=true` |
| `app/api/admin/prompts/[id]/route.ts` | Modify | Aceitar `{ reactivate: true }` no PATCH |
| `app/(admin)/prompts/page.tsx` | Modify | Preview dialog + toggle histórico |
| `app/api/[tenantSlug]/config/route.ts` | Modify | Salvar campos do `meta` no PATCH |
| `app/(loja)/[tenantSlug]/config/page.tsx` | Modify | Substituir seção "Campanhas e Políticas" por briefing guiado |
| `app/api/webhooks/internal/process-message/route.ts` | Modify | Expandir system prompt com campos do `meta` |

---

## Chunk 1: Schema + APIs Admin

### Task 1: Adicionar `meta Json?` ao Briefing e rodar migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1.1: Adicionar campo `meta` ao model `Briefing`**

Em `prisma/schema.prisma`, dentro do model `Briefing`, adicionar após `additionalPolicies`:

```prisma
meta               Json?
```

O model completo fica:

```prisma
model Briefing {
  id                 String    @id @default(cuid())
  tenantId           String    @unique
  tenant             Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  brands             String[]
  currentCampaigns   String?   @db.Text
  additionalPolicies String?   @db.Text
  meta               Json?
  completedAt        DateTime?
  validatedAt        DateTime?
  validatedById      String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@map("briefings")
}
```

- [ ] **Step 1.2: Criar e aplicar migration**

```bash
cd "C:/Users/USER/Documents/saas-revenda-moto (2)"
npx prisma migrate dev --name add-briefing-meta
```

Esperado: migration criada e aplicada sem erros. O campo `meta` é `Json?` (nullable) — migration não-destrutiva, todos os registros existentes ficam com `meta = NULL`, sem perda de dados.

- [ ] **Step 1.3: Verificar migration**

```bash
npx prisma studio
```

Abrir a tabela `briefings` e confirmar que a coluna `meta` existe (null em registros existentes — correto e esperado). Fechar o Prisma Studio.

- [ ] **Step 1.4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: briefing.meta Json field — suporte a briefing guiado"
```

---

### Task 2: Admin API — `GET /api/admin/prompts` com `?showAll=true`

**Files:**
- Modify: `app/api/admin/prompts/route.ts`

Atualmente a query filtra `isActive: true`. Quando `showAll=true` é passado, retornar todas as versões (ativas e inativas), ordenadas por (tenantId, agentType, version desc).

- [ ] **Step 2.1: Atualizar GET para aceitar `showAll`**

Substituir o corpo do `GET` em `app/api/admin/prompts/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const tenantId  = searchParams.get('tenantId')
  const agentType = searchParams.get('agentType') as string | undefined
  const showAll   = searchParams.get('showAll') === 'true'

  const prompts = await prisma.promptConfig.findMany({
    where: {
      ...(tenantId  ? { tenantId }  : {}),
      ...(agentType ? { agentType } : {}),
      ...(showAll   ? {}            : { isActive: true }),
    },
    include: { tenant: { select: { name: true, slug: true } } },
    orderBy: [{ tenantId: 'asc' }, { agentType: 'asc' }, { version: 'desc' }],
  })
  return ok(prompts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const { tenantId, agentType, promptBase, blockStoreContext, blockPolicies,
          blockSecurity, blockCampaigns, blockHandoff, blockToneOfVoice } = body

  // Desativar versão anterior
  await prisma.promptConfig.updateMany({
    where: { tenantId: tenantId ?? null, agentType, isActive: true },
    data:  { isActive: false },
  })

  // Calcular próxima versão
  const last = await prisma.promptConfig.findFirst({
    where: { tenantId: tenantId ?? null, agentType },
    orderBy: { version: 'desc' },
  })
  const version = (last?.version ?? 0) + 1

  const prompt = await prisma.promptConfig.create({
    data: {
      tenantId, agentType, version, promptBase,
      blockStoreContext, blockPolicies, blockSecurity,
      blockCampaigns, blockHandoff, blockToneOfVoice,
      isActive: true,
      createdById: session.user.id,
    },
  })
  return ok(prompt, 201)
}
```

- [ ] **Step 2.2: Verificar manualmente**

Com o servidor rodando:
```
GET http://localhost:3000/api/admin/prompts           → só prompts isActive=true
GET http://localhost:3000/api/admin/prompts?showAll=true → todos, inclusive inativos
```

- [ ] **Step 2.3: Commit**

```bash
git add app/api/admin/prompts/route.ts
git commit -m "feat: GET /api/admin/prompts aceita ?showAll=true"
```

---

### Task 3: Admin API — `PATCH /api/admin/prompts/[id]` com `reactivate`

**Files:**
- Modify: `app/api/admin/prompts/[id]/route.ts`

Quando o body contiver `{ reactivate: true }`, o PATCH deve:
1. Buscar o prompt pelo id para obter `(tenantId, agentType)`
2. Desativar todos os prompts ativos do mesmo `(tenantId, agentType)`
3. Ativar o prompt solicitado

- [ ] **Step 3.1: Atualizar PATCH**

Substituir o handler `PATCH` em `app/api/admin/prompts/[id]/route.ts`:

```typescript
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  const body = await req.json()

  // Reativação de versão anterior
  if (body.reactivate === true) {
    const target = await prisma.promptConfig.findUnique({ where: { id } })
    if (!target) return notFound('Prompt')

    // Desativa a versão ativa atual do mesmo (tenantId, agentType)
    await prisma.promptConfig.updateMany({
      where: {
        tenantId:  target.tenantId,
        agentType: target.agentType,
        isActive:  true,
      },
      data: { isActive: false },
    })

    // Ativa o prompt solicitado
    const reactivated = await prisma.promptConfig.update({
      where: { id },
      data:  { isActive: true },
    })
    return ok(reactivated)
  }

  // PATCH genérico (campos individuais)
  const prompt = await prisma.promptConfig.update({
    where: { id },
    data:  body,
  })
  return ok(prompt)
}
```

O arquivo completo `app/api/admin/prompts/[id]/route.ts` fica:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  const prompt = await prisma.promptConfig.findUnique({
    where: { id },
    include: { tenant: { select: { name: true, slug: true } } },
  })
  if (!prompt) return notFound('Prompt')
  return ok(prompt)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  const body = await req.json()

  if (body.reactivate === true) {
    const target = await prisma.promptConfig.findUnique({ where: { id } })
    if (!target) return notFound('Prompt')

    await prisma.promptConfig.updateMany({
      where: {
        tenantId:  target.tenantId,
        agentType: target.agentType,
        isActive:  true,
      },
      data: { isActive: false },
    })

    const reactivated = await prisma.promptConfig.update({
      where: { id },
      data:  { isActive: true },
    })
    return ok(reactivated)
  }

  const prompt = await prisma.promptConfig.update({
    where: { id },
    data:  body,
  })
  return ok(prompt)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const { id } = await params
  await prisma.promptConfig.update({
    where: { id },
    data: { isActive: false },
  })
  return ok({ message: 'Prompt desativado' })
}
```

- [ ] **Step 3.2: Verificar manualmente**

Com 2+ versões do mesmo (tenantId, agentType) no banco (criar via admin UI):
```
PATCH http://localhost:3000/api/admin/prompts/<id-inativo>
Body: { "reactivate": true }
→ Versão inativa fica ativa; versão ativa anterior fica inativa
```

- [ ] **Step 3.3: Commit**

```bash
git add app/api/admin/prompts/[id]/route.ts
git commit -m "feat: PATCH /api/admin/prompts/[id] aceita reactivate — swap de versão ativa"
```

---

## Chunk 2: Admin UI — Preview + Histórico

### Task 4: Admin UI — Dialog de Preview e Toggle de Histórico

**Files:**
- Modify: `app/(admin)/prompts/page.tsx`

Esta task substitui o arquivo completo da página admin de prompts por uma versão que inclui:
- **Preview dialog**: botão "👁 Preview" que abre um `<dialog>` com o prompt montado client-side
- **Toggle "Mostrar histórico"**: checkbox que ao ser ativado busca `?showAll=true` e exibe versões inativas com badge + botão "Reativar"

- [ ] **Step 4.1: Substituir `app/(admin)/prompts/page.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Eye, X, History } from 'lucide-react'

type Prompt = {
  id: string
  tenantId: string | null
  agentType: string
  version: number
  promptBase: string
  blockStoreContext: string | null
  blockPolicies: string | null
  blockSecurity: string | null
  blockCampaigns: string | null
  blockHandoff: string | null
  blockToneOfVoice: string | null
  isActive: boolean
  tenant: { name: string; slug: string } | null
}

type Tenant = { id: string; name: string; slug: string }

const AGENT_TYPES = ['SDR', 'VENDEDOR_IA', 'ORQUESTRADOR', 'QA', 'NOTIFICADOR_SLA']

// ─── Monta o texto completo do prompt ────────────────────────────────────────
function assemblePrompt(p: {
  promptBase: string
  blockStoreContext: string | null
  blockPolicies: string | null
  blockSecurity: string | null
  blockCampaigns: string | null
  blockHandoff: string | null
  blockToneOfVoice: string | null
}): string {
  const sections: string[] = [p.promptBase.trim()]
  const blocks: [string, string | null][] = [
    ['=== Contexto da Loja ===',     p.blockStoreContext],
    ['=== Políticas Comerciais ===', p.blockPolicies],
    ['=== Segurança ===',            p.blockSecurity],
    ['=== Campanhas Ativas ===',     p.blockCampaigns],
    ['=== Handoff ===',              p.blockHandoff],
    ['=== Tom de Voz ===',          p.blockToneOfVoice],
  ]
  for (const [header, content] of blocks) {
    if (content?.trim()) sections.push(`${header}\n${content.trim()}`)
  }
  return sections.join('\n\n')
}

export default function PromptsPage() {
  const [prompts, setPrompts]       = useState<Prompt[]>([])
  const [tenants, setTenants]       = useState<Tenant[]>([])
  const [selected, setSelected]     = useState<Prompt | null>(null)
  const [loading, setLoading]       = useState(false)
  const [showAll, setShowAll]       = useState(false)
  const [previewOpen, setPreview]   = useState(false)

  // Form state
  const [tenantId, setTenantId]             = useState('global')
  const [agentType, setAgentType]           = useState('SDR')
  const [promptBase, setPromptBase]         = useState('')
  const [blockStoreContext, setBlockStore]  = useState('')
  const [blockPolicies, setBlockPolicies]   = useState('')
  const [blockSecurity, setBlockSecurity]   = useState('')
  const [blockCampaigns, setBlockCampaigns] = useState('')
  const [blockHandoff, setBlockHandoff]     = useState('')
  const [blockToneOfVoice, setBlockTone]    = useState('')

  const fetchPrompts = useCallback(async () => {
    const url = showAll ? '/api/admin/prompts?showAll=true' : '/api/admin/prompts'
    const d = await fetch(url).then(r => r.json())
    setPrompts(d.data ?? [])
  }, [showAll])

  useEffect(() => {
    fetchPrompts()
    fetch('/api/admin/tenants').then(r => r.json()).then(d => setTenants(d.data?.data ?? []))
  }, [fetchPrompts])

  function loadPrompt(p: Prompt) {
    setSelected(p)
    setTenantId(p.tenantId ?? 'global')
    setAgentType(p.agentType)
    setPromptBase(p.promptBase)
    setBlockStore(p.blockStoreContext ?? '')
    setBlockPolicies(p.blockPolicies ?? '')
    setBlockSecurity(p.blockSecurity ?? '')
    setBlockCampaigns(p.blockCampaigns ?? '')
    setBlockHandoff(p.blockHandoff ?? '')
    setBlockTone(p.blockToneOfVoice ?? '')
  }

  function resetForm() {
    setSelected(null)
    setTenantId('global')
    setAgentType('SDR')
    setPromptBase('')
    setBlockStore('')
    setBlockPolicies('')
    setBlockSecurity('')
    setBlockCampaigns('')
    setBlockHandoff('')
    setBlockTone('')
  }

  // Texto do preview (usa o estado atual do formulário)
  const previewText = assemblePrompt({
    promptBase, blockStoreContext, blockPolicies,
    blockSecurity, blockCampaigns, blockHandoff, blockToneOfVoice,
  })
  const charCount  = previewText.length
  const tokenEst   = Math.ceil(charCount / 4)

  async function handleSave() {
    if (!promptBase.trim()) { toast.error('Prompt base é obrigatório'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId === 'global' ? null : tenantId,
          agentType,
          promptBase,
          blockStoreContext: blockStoreContext || null,
          blockPolicies:     blockPolicies || null,
          blockSecurity:     blockSecurity || null,
          blockCampaigns:    blockCampaigns || null,
          blockHandoff:      blockHandoff || null,
          blockToneOfVoice:  blockToneOfVoice || null,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Prompt salvo com nova versão')
      resetForm()
      fetchPrompts()
    } catch {
      toast.error('Erro ao salvar prompt')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(id: string) {
    await fetch(`/api/admin/prompts/${id}`, { method: 'DELETE' })
    toast.success('Prompt desativado')
    fetchPrompts()
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/admin/prompts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactivate: true }),
    })
    if (res.ok) { toast.success('Versão reativada'); fetchPrompts() }
    else toast.error('Erro ao reativar')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuração de Prompts</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Lista de prompts ── */}
        <div className="lg:col-span-1 space-y-3">
          {/* Toggle histórico */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Prompts
            </h2>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                className="rounded"
              />
              <History size={12} />
              Histórico
            </label>
          </div>

          {prompts.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Nenhum prompt configurado.</p>
          )}

          {prompts.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border bg-card p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                selected?.id === p.id ? 'border-primary' : 'border-border'
              }`}
              onClick={() => loadPrompt(p)}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-xs font-mono">{p.agentType}</Badge>
                <div className="flex items-center gap-1">
                  {p.isActive
                    ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Ativo</span>
                    : <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Inativo</span>
                  }
                  <span className="text-xs text-muted-foreground">v{p.version}</span>
                </div>
              </div>
              <p className="text-sm font-medium">{p.tenant?.name ?? 'Global'}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.promptBase}</p>
              <div className="flex gap-2 mt-2">
                {p.isActive ? (
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs text-destructive hover:text-destructive h-6 px-2"
                    onClick={(e) => { e.stopPropagation(); handleDeactivate(p.id) }}
                  >
                    Desativar
                  </Button>
                ) : (
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs text-primary hover:text-primary h-6 px-2"
                    onClick={(e) => { e.stopPropagation(); handleReactivate(p.id) }}
                  >
                    Reativar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Formulário ── */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {selected ? `Editando v${selected.version} — nova versão será criada` : 'Novo Prompt'}
            </h2>
            <div className="flex items-center gap-2">
              {promptBase && (
                <Button
                  variant="outline" size="sm"
                  className="text-xs gap-1"
                  onClick={() => setPreview(true)}
                >
                  <Eye size={12} /> Preview
                </Button>
              )}
              {selected && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs text-muted-foreground">
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Loja (tenant)</Label>
              <Select value={tenantId} onValueChange={(v) => setTenantId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todas as lojas)</SelectItem>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de Agente</Label>
              <Select value={agentType} onValueChange={(v) => setAgentType(v ?? '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Prompt Base *</Label>
            <Textarea
              value={promptBase}
              onChange={e => setPromptBase(e.target.value)}
              rows={6}
              placeholder="Você é um assistente de vendas da loja..."
              className="font-mono text-sm resize-y"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Contexto da Loja', value: blockStoreContext,  set: setBlockStore    },
              { label: 'Políticas',        value: blockPolicies,      set: setBlockPolicies  },
              { label: 'Segurança',        value: blockSecurity,      set: setBlockSecurity  },
              { label: 'Campanhas',        value: blockCampaigns,     set: setBlockCampaigns },
              { label: 'Handoff',          value: blockHandoff,       set: setBlockHandoff   },
              { label: 'Tom de Voz',       value: blockToneOfVoice,   set: setBlockTone      },
            ].map(({ label, value, set }) => (
              <div key={label} className="space-y-1">
                <Label className="text-muted-foreground text-xs">{label}</Label>
                <Textarea
                  value={value}
                  onChange={e => set(e.target.value)}
                  rows={2}
                  placeholder={`Bloco de ${label.toLowerCase()}...`}
                  className="font-mono text-xs resize-y"
                />
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full bg-primary hover:bg-primary/90">
            {loading ? 'Salvando...' : 'Salvar Nova Versão'}
          </Button>
        </div>
      </div>

      {/* ── Dialog de Preview ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-semibold">Preview do Prompt Montado</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {charCount.toLocaleString('pt-BR')} caracteres · ~{tokenEst.toLocaleString('pt-BR')} tokens
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreview(false)}>
                <X size={16} />
              </Button>
            </div>
            <textarea
              readOnly
              value={previewText}
              className="flex-1 p-4 font-mono text-xs bg-secondary/30 resize-none focus:outline-none overflow-y-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4.2: Verificar no browser**

1. Acessar `http://localhost:3000/prompts` logado como SUPER_ADMIN
2. Com um prompt existente selecionado, clicar "👁 Preview" → dialog abre com texto completo
3. Ativar o toggle "Histórico" → lista mostra versões inativas com badge "Inativo"
4. Clicar "Reativar" numa versão inativa → toast "Versão reativada", lista atualiza

- [ ] **Step 4.3: Commit**

```bash
git add "app/(admin)/prompts/page.tsx"
git commit -m "feat: admin prompts — preview dialog + toggle histórico de versões"
```

---

## Chunk 3: Loja Config — Briefing Guiado

### Task 5: Config API — aceitar novos campos do `meta` no PATCH

**Files:**
- Modify: `app/api/[tenantSlug]/config/route.ts`

O PATCH atual só salva `currentCampaigns` e `additionalPolicies` no briefing. Agora precisa salvar também os novos campos em `briefing.meta` (JSON).

- [ ] **Step 5.1: Atualizar PATCH em `app/api/[tenantSlug]/config/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  const { tenantSlug } = await params

  if (!session?.user) return forbidden()
  if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantSlug !== tenantSlug) {
    return forbidden()
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { briefing: true },
  })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  return ok(tenant)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const session = await auth()
  const { tenantSlug } = await params

  if (!session?.user) return forbidden()
  if (session.user.role === 'VENDEDOR') return forbidden()
  if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantSlug !== tenantSlug) {
    return forbidden()
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const body = await req.json()
  const {
    toneOfVoice, businessHoursStart, businessHoursEnd, evolutionInstanceName,
    // Campos do briefing (legados)
    currentCampaigns, additionalPolicies,
    // Novos campos do meta (briefing guiado)
    cidade, marcas, foco, diferencial,
    formasPagamento, aceitaTroca, condicaoTroca, prazoEntrega,
    validadeCampanha, nomeAtendente,
  } = body

  // Construir o objeto meta apenas com os campos presentes no body
  const metaFields: Record<string, unknown> = {}
  if (cidade          !== undefined) metaFields.cidade          = cidade
  if (marcas          !== undefined) metaFields.marcas          = marcas
  if (foco            !== undefined) metaFields.foco            = foco
  if (diferencial     !== undefined) metaFields.diferencial     = diferencial
  if (formasPagamento !== undefined) metaFields.formasPagamento = formasPagamento
  if (aceitaTroca     !== undefined) metaFields.aceitaTroca     = aceitaTroca
  if (condicaoTroca   !== undefined) metaFields.condicaoTroca   = condicaoTroca
  if (prazoEntrega    !== undefined) metaFields.prazoEntrega    = prazoEntrega
  if (validadeCampanha !== undefined) metaFields.validadeCampanha = validadeCampanha
  if (nomeAtendente   !== undefined) metaFields.nomeAtendente   = nomeAtendente

  // Buscar meta existente para merge (não sobrescrever campos não enviados)
  const existingBriefing = await prisma.briefing.findUnique({ where: { tenantId: tenant.id } })
  const existingMeta = (existingBriefing?.meta as Record<string, unknown>) ?? {}
  const mergedMeta = { ...existingMeta, ...metaFields }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      toneOfVoice,
      businessHoursStart,
      businessHoursEnd,
      evolutionInstanceName: evolutionInstanceName || null,
      briefing: {
        upsert: {
          create: { currentCampaigns, additionalPolicies, meta: mergedMeta },
          update: { currentCampaigns, additionalPolicies, meta: mergedMeta },
        },
      },
    },
    include: { briefing: true },
  })

  return ok(updated)
}
```

- [ ] **Step 5.2: Verificar manualmente**

```bash
# PATCH — salva novos campos do meta
curl -X PATCH http://localhost:3000/api/<slug>/config \
  -H "Content-Type: application/json" \
  -b "<cookie de sessão>" \
  -d '{"cidade":"Curitiba","marcas":"Honda, Yamaha","aceitaTroca":true,"formasPagamento":["Pix","Financiamento"]}'

# GET — confirma que meta foi persistido
curl http://localhost:3000/api/<slug>/config -b "<cookie>"
```

Response esperada do GET (trecho relevante):
```json
{
  "data": {
    "briefing": {
      "currentCampaigns": null,
      "additionalPolicies": null,
      "meta": {
        "cidade": "Curitiba",
        "marcas": "Honda, Yamaha",
        "aceitaTroca": true,
        "formasPagamento": ["Pix", "Financiamento"]
      }
    }
  }
}
```

- [ ] **Step 5.3: Commit**

```bash
git add "app/api/[tenantSlug]/config/route.ts"
git commit -m "feat: config PATCH aceita meta do briefing guiado"
```

---

### Task 6: Loja Config UI — Seção "Configuração de IA" com briefing guiado

**Files:**
- Modify: `app/(loja)/[tenantSlug]/config/page.tsx`

Substituir o arquivo completo. A seção "Campanhas e Políticas" vira 4 cards de briefing guiado: Sobre a Loja, Políticas Comerciais, Campanhas Ativas, Tom de Voz.

- [ ] **Step 6.1: Substituir `app/(loja)/[tenantSlug]/config/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Forma de pagamento disponíveis ────────────────────────────────────────
const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Cartão', 'Financiamento', 'Consórcio']
const FOCO_OPTIONS     = [
  { value: 'zerokm',  label: 'Motos 0km'   },
  { value: 'usadas',  label: 'Motos Usadas' },
  { value: 'ambos',   label: 'Ambos (0km e Usadas)' },
]
const TOM_OPTIONS = [
  { value: 'Formal',       label: '👔 Formal'       },
  { value: 'Amigável',     label: '😊 Amigável'     },
  { value: 'Descontraído', label: '😄 Descontraído' },
]

type Meta = {
  cidade?: string; marcas?: string; foco?: string; diferencial?: string
  formasPagamento?: string[]; aceitaTroca?: boolean
  condicaoTroca?: string; prazoEntrega?: string
  validadeCampanha?: string; nomeAtendente?: string
}

type Form = {
  // Campos legados (TenantConfig)
  toneOfVoice: string
  businessHoursStart: string
  businessHoursEnd: string
  evolutionInstanceName: string
  currentCampaigns: string
  // Meta campos (briefing guiado)
  cidade: string; marcas: string; foco: string; diferencial: string
  formasPagamento: string[]; aceitaTroca: boolean
  condicaoTroca: string; prazoEntrega: string
  validadeCampanha: string; nomeAtendente: string
}

const DEFAULT: Form = {
  toneOfVoice: '', businessHoursStart: '', businessHoursEnd: '',
  evolutionInstanceName: '', currentCampaigns: '',
  cidade: '', marcas: '', foco: 'ambos', diferencial: '',
  formasPagamento: [], aceitaTroca: false, condicaoTroca: '',
  prazoEntrega: '', validadeCampanha: '', nomeAtendente: '',
}

export default function ConfigPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [form, setForm]           = useState<Form>(DEFAULT)
  const [saving, setSaving]       = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!tenantSlug) return
    fetch(`/api/${tenantSlug}/config`)
      .then(r => r.json())
      .then(d => {
        if (!d.data) return
        const meta: Meta = (d.data.briefing?.meta ?? {}) as Meta
        setForm({
          toneOfVoice:           d.data.toneOfVoice           ?? '',
          businessHoursStart:    d.data.businessHoursStart    ?? '',
          businessHoursEnd:      d.data.businessHoursEnd      ?? '',
          evolutionInstanceName: d.data.evolutionInstanceName ?? '',
          currentCampaigns:      d.data.briefing?.currentCampaigns ?? '',
          cidade:           meta.cidade           ?? '',
          marcas:           meta.marcas           ?? '',
          foco:             meta.foco             ?? 'ambos',
          diferencial:      meta.diferencial      ?? '',
          formasPagamento:  meta.formasPagamento  ?? [],
          aceitaTroca:      meta.aceitaTroca      ?? false,
          condicaoTroca:    meta.condicaoTroca    ?? '',
          prazoEntrega:     meta.prazoEntrega     ?? '',
          validadeCampanha: meta.validadeCampanha ?? '',
          nomeAtendente:    meta.nomeAtendente    ?? '',
        })
      })
  }, [tenantSlug])

  const set = <K extends keyof Form>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function togglePagamento(fp: string) {
    setForm(f => ({
      ...f,
      formasPagamento: f.formasPagamento.includes(fp)
        ? f.formasPagamento.filter(x => x !== fp)
        : [...f.formasPagamento, fp],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveStatus('idle')
    try {
      const res = await fetch(`/api/${tenantSlug}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações da Loja</h1>
      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Atendimento ── */}
        <Card>
          <CardHeader><CardTitle>Atendimento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessHoursStart">Horário de Abertura</Label>
                <Input id="businessHoursStart" value={form.businessHoursStart}
                  onChange={set('businessHoursStart')} placeholder="08:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessHoursEnd">Horário de Fechamento</Label>
                <Input id="businessHoursEnd" value={form.businessHoursEnd}
                  onChange={set('businessHoursEnd')} placeholder="18:00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evolutionInstanceName">Instância WhatsApp (Evolution API)</Label>
              <Input id="evolutionInstanceName" value={form.evolutionInstanceName}
                onChange={set('evolutionInstanceName')} placeholder="moto-teste" className="font-mono" />
            </div>
          </CardContent>
        </Card>

        {/* ── Configuração de IA — Sobre a Loja ── */}
        <Card>
          <CardHeader><CardTitle>🏪 Sobre a Loja</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Em qual cidade/bairro fica sua loja?
              </Label>
              <Input value={form.cidade} onChange={set('cidade')} placeholder="Ex: Curitiba / Bairro Portão" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Quais marcas você trabalha?
              </Label>
              <Input value={form.marcas} onChange={set('marcas')} placeholder="Ex: Honda, Yamaha, Shineray" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Sua loja foca em qual segmento?
              </Label>
              <select value={form.foco} onChange={set('foco')} className={inp}>
                {FOCO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Qual é o grande diferencial da sua loja?
              </Label>
              <Textarea value={form.diferencial} onChange={set('diferencial')} rows={2}
                placeholder="Ex: Maior estoque da região, financiamento próprio, 20 anos no mercado..." />
            </div>
          </CardContent>
        </Card>

        {/* ── Configuração de IA — Políticas Comerciais ── */}
        <Card>
          <CardHeader><CardTitle>📋 Políticas Comerciais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">
                Quais formas de pagamento aceita?
              </Label>
              <div className="flex flex-wrap gap-2">
                {FORMAS_PAGAMENTO.map(fp => (
                  <label key={fp}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      form.formasPagamento.includes(fp)
                        ? 'bg-primary/20 border-primary text-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.formasPagamento.includes(fp)}
                      onChange={() => togglePagamento(fp)}
                      className="sr-only"
                    />
                    {fp}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">
                Aceita troca de moto?
              </Label>
              <div className="flex gap-3">
                {[true, false].map(v => (
                  <label key={String(v)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                      form.aceitaTroca === v
                        ? 'bg-primary/20 border-primary text-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <input type="radio" checked={form.aceitaTroca === v}
                      onChange={() => setForm(f => ({ ...f, aceitaTroca: v }))}
                      className="sr-only"
                    />
                    {v ? 'Sim' : 'Não'}
                  </label>
                ))}
              </div>
            </div>
            {form.aceitaTroca && (
              <div>
                <Label className="text-muted-foreground text-sm mb-1 block">
                  Se sim, quais condições?
                </Label>
                <Textarea value={form.condicaoTroca} onChange={set('condicaoTroca')} rows={2}
                  placeholder="Ex: Aceitamos apenas motos até 5 anos e com documentação em dia..." />
              </div>
            )}
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Qual o prazo de entrega para motos 0km?
              </Label>
              <Input value={form.prazoEntrega} onChange={set('prazoEntrega')}
                placeholder="Ex: até 7 dias úteis, entrega imediata, sob encomenda..." />
            </div>
          </CardContent>
        </Card>

        {/* ── Configuração de IA — Campanhas Ativas ── */}
        <Card>
          <CardHeader><CardTitle>📣 Campanhas Ativas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Tem alguma promoção ou campanha ativa agora?
              </Label>
              <Textarea value={form.currentCampaigns} onChange={set('currentCampaigns')} rows={3}
                placeholder="Ex: Feirão de motos — desconto de R$ 1.000 em todas as Honda até 30/03..." />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Válida até quando?
              </Label>
              <Input type="date" value={form.validadeCampanha} onChange={set('validadeCampanha')} />
            </div>
          </CardContent>
        </Card>

        {/* ── Configuração de IA — Tom de Voz ── */}
        <Card>
          <CardHeader><CardTitle>🎙 Tom de Voz da IA</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">
                Como a IA deve se comunicar com o cliente?
              </Label>
              <div className="flex gap-3">
                {TOM_OPTIONS.map(o => (
                  <label key={o.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                      form.toneOfVoice === o.value
                        ? 'bg-primary/20 border-primary text-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <input type="radio" checked={form.toneOfVoice === o.value}
                      onChange={() => setForm(f => ({ ...f, toneOfVoice: o.value }))}
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1 block">
                Como a IA deve se apresentar ao cliente?
              </Label>
              <Input value={form.nomeAtendente} onChange={set('nomeAtendente')}
                placeholder="Ex: Mavi da Moto Center, Ana da Central de Motos..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          {saveStatus === 'success' && (
            <p className="text-sm text-emerald-500 font-medium">✓ Salvo com sucesso!</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-sm text-destructive">Erro ao salvar. Tente novamente.</p>
          )}
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 6.2: Verificar no browser**

1. Login como GERENTE → acessar `http://localhost:3000/<slug>/config`
2. Preencher os campos de briefing: cidade, marcas, foco, diferencial
3. Marcar checkboxes de forma de pagamento (ex: Pix + Financiamento)
4. Ativar "Aceita troca = Sim" → campo de condições aparece
5. Selecionar tom de voz "Amigável"
6. Salvar → toast/mensagem "Salvo com sucesso"
7. Recarregar a página → todos os campos persistidos corretamente

- [ ] **Step 6.3: Commit**

```bash
git add "app/(loja)/[tenantSlug]/config/page.tsx"
git commit -m "feat: loja config — briefing guiado de IA (sobre a loja, políticas, campanhas, tom)"
```

---

## Chunk 4: process-message — Expandir System Prompt

### Task 7: Usar campos do `meta` no system prompt do `process-message`

**Files:**
- Modify: `app/api/webhooks/internal/process-message/route.ts`

Atualmente o system prompt só substitui `{storeName}` e `{toneOfVoice}`. Agora deve incluir um bloco de contexto rico montado a partir do `briefing.meta`.

- [ ] **Step 7.1: Adicionar função `buildBriefingContext` e usá-la no prompt**

Localizar a seção no arquivo `process-message/route.ts` onde o `systemPrompt` é montado:

```typescript
// Trecho atual (encontre e substitua):
const systemPrompt = DEFAULT_SDR_PROMPT
  .replace('{storeName}', tenant.name)
  .replace('{toneOfVoice}', tenant.toneOfVoice || 'Amigavel, profissional e prestativo')
```

Adicionar a função `buildBriefingContext` logo antes do `export async function POST(...)` e atualizar a montagem do prompt:

```typescript
// ─── Monta contexto rico a partir do briefing.meta ──────────────────────────
function buildBriefingContext(
  briefing: {
    currentCampaigns?: string | null
    additionalPolicies?: string | null
    meta?: Record<string, unknown> | null
  } | null
): string {
  if (!briefing) return ''
  const meta = (briefing.meta ?? {}) as Record<string, unknown>
  const parts: string[] = []

  // Bloco: Sobre a Loja
  const lojaLines = [
    meta.cidade      && `Cidade/Bairro: ${meta.cidade}`,
    meta.marcas      && `Marcas trabalhadas: ${meta.marcas}`,
    meta.foco        && `Segmento: ${meta.foco === 'zerokm' ? '0km' : meta.foco === 'usadas' ? 'Usadas' : '0km e Usadas'}`,
    meta.diferencial && `Diferencial da loja: ${meta.diferencial}`,
  ].filter(Boolean)
  if (lojaLines.length) parts.push(`SOBRE A LOJA:\n${lojaLines.join('\n')}`)

  // Bloco: Políticas
  const politicaLines = [
    meta.formasPagamento &&
      Array.isArray(meta.formasPagamento) &&
      meta.formasPagamento.length &&
      `Formas de pagamento: ${(meta.formasPagamento as string[]).join(', ')}`,
    meta.aceitaTroca === true  && `Aceita troca: Sim${meta.condicaoTroca ? ` — ${meta.condicaoTroca}` : ''}`,
    meta.aceitaTroca === false && `Aceita troca: Não`,
    meta.prazoEntrega          && `Prazo de entrega 0km: ${meta.prazoEntrega}`,
    briefing.additionalPolicies && briefing.additionalPolicies,
  ].filter(Boolean)
  if (politicaLines.length) parts.push(`POLÍTICAS COMERCIAIS:\n${politicaLines.join('\n')}`)

  // Bloco: Campanhas
  const campanhaLines = [
    briefing.currentCampaigns && briefing.currentCampaigns,
    meta.validadeCampanha     && `Válida até: ${meta.validadeCampanha}`,
  ].filter(Boolean)
  if (campanhaLines.length) parts.push(`CAMPANHAS ATIVAS:\n${campanhaLines.join('\n')}`)

  // Bloco: Atendente
  if (meta.nomeAtendente) {
    parts.push(`ATENDENTE: Apresente-se como "${meta.nomeAtendente}"`)
  }

  return parts.join('\n\n')
}
```

Atualizar a montagem do `systemPrompt` para incluir o contexto do briefing:

_(A montagem do systemPrompt está documentada no Step 7.1 — veja o bloco "DEPOIS" acima.)_

Atualizar a montagem do `systemPrompt` para incluir o contexto do briefing — **substituir** o trecho atual de montagem do prompt:

```typescript
// ANTES (remover):
const systemPrompt = DEFAULT_SDR_PROMPT
  .replace('{storeName}', tenant.name)
  .replace('{toneOfVoice}', tenant.toneOfVoice || 'Amigavel, profissional e prestativo')

// DEPOIS (substituir por):
const briefingContext = buildBriefingContext(
  tenant.briefing as {
    currentCampaigns?: string | null
    additionalPolicies?: string | null
    meta?: Record<string, unknown> | null
  } | null
)
const systemPrompt = [
  DEFAULT_SDR_PROMPT
    .replace('{storeName}', tenant.name)
    .replace('{toneOfVoice}', tenant.toneOfVoice || 'Amigavel, profissional e prestativo'),
  briefingContext ? `\n\n--- INFORMAÇÕES DA LOJA ---\n${briefingContext}` : '',
].join('')
```

**Nota importante:** a linha `include: { briefing: true }` no `prisma.tenant.findUnique` já existe. Não duplicar. O `briefingContext` retorna string vazia (`''`) quando `briefing` é null ou quando todos os campos do meta estão vazios — o filtro `filter(Boolean)` dentro da função garante isso.

- [ ] **Step 7.2: Verificar tipagem TypeScript**

```bash
cd "C:/Users/USER/Documents/saas-revenda-moto (2)"
npx tsc --noEmit
```

Esperado: sem erros. Se houver erro de tipo no `briefing`, fazer cast explícito: `(tenant.briefing as { currentCampaigns?: string | null; meta?: Record<string, unknown> | null } | null)`.

- [ ] **Step 7.3: Verificar comportamento**

Com uma loja configurada com briefing (cidade, marcas, formasPagamento), enviar uma mensagem de teste via WhatsApp ou via `curl` direto:

```bash
curl -X POST http://localhost:3000/api/webhooks/internal/process-message \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: <NEXTJS_INTERNAL_API_SECRET>" \
  -d '{
    "tenantSlug": "<slug>",
    "remoteJid": "5511999999999@s.whatsapp.net",
    "messageText": "Olá, quero saber sobre motos 0km",
    "pushName": "Teste"
  }'
```

Verificar nos logs do servidor que o `systemPrompt` inclui o bloco `--- INFORMAÇÕES DA LOJA ---` com os dados do briefing.

- [ ] **Step 7.4: Commit**

```bash
git add "app/api/webhooks/internal/process-message/route.ts"
git commit -m "feat: process-message usa briefing.meta no system prompt (contexto rico)"
```

---

## Chunk 5: Finalização

### Task 8: Atualizar `memoria.md` e commit final

**Files:**
- Modify: `memoria.md`

- [ ] **Step 8.1: Atualizar Task 14 em `memoria.md`**

Alterar linha da Task 14:

```
| Task 14 | Prompt Configuration (Admin UI completa) | ✅ Concluído (preview + histórico + briefing guiado gerente) |
```

Atualizar "Próxima Tarefa" para Task 13 (n8n Flows) ou Task 15 (Playwright).

Adicionar à seção "Arquivos Chave":
```
app/(admin)/prompts/page.tsx             ← Prompts admin: preview + histórico de versões
app/(loja)/[tenantSlug]/config/page.tsx  ← Config loja: briefing guiado de IA
```

- [ ] **Step 8.2: Commit final**

```bash
git add memoria.md
git commit -m "docs: Task 14 concluída — Prompt Config completa"
```

---

## Critérios de Aceite

- [ ] Admin vê preview do prompt completo client-side antes de salvar
- [ ] Preview exibe contagem de caracteres e tokens estimados
- [ ] Toggle "Histórico" mostra versões inativas com badge e botão "Reativar"
- [ ] Reativar uma versão inativa desativa a versão ativa atual do mesmo grupo
- [ ] Gerente preenche briefing guiado (sem jargão de "prompt")
- [ ] Campo `aceitaTroca = Não` oculta `condicaoTroca`
- [ ] `formasPagamento` persiste como array no `briefing.meta`
- [ ] `buildBriefingContext` enriquece o system prompt com os dados do briefing
- [ ] Dados existentes (`currentCampaigns`, `additionalPolicies`) permanecem funcionais
- [ ] `npx tsc --noEmit` sem erros

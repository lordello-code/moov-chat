# MOOV Chat — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir o MVP do MOOV Chat — SaaS multi-tenant de atendimento comercial por WhatsApp para revendas de moto com IA + humano.

**Architecture:** Next.js 14 App Router (full-stack) + n8n (automação/IA) + PostgreSQL/Prisma (banco compartilhado) + Evolution API (WhatsApp gateway). Next.js serve UI e API REST; n8n processa todas as mensagens WhatsApp e executa flows de IA, SLA e follow-ups.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth.js v5, shadcn/ui, Tailwind CSS, n8n, Evolution API, Vitest, Playwright

**PRD:** `docs/plans/2026-03-06-moov-chat-prd.md`

---

## Task 1: Scaffold do Projeto Next.js

**Files:**
- Create: `package.json` (via CLI)
- Create: `tailwind.config.ts`
- Create: `app/globals.css`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Criar projeto Next.js**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
```

**Step 2: Instalar dependências principais**

```bash
npm install prisma @prisma/client next-auth@beta \
  bcryptjs @types/bcryptjs \
  lucide-react clsx tailwind-merge \
  @tanstack/react-query

npm install -D vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @playwright/test jsdom
```

**Step 3: Instalar shadcn/ui**

```bash
npx shadcn@latest init
# Escolher: Dark theme, CSS variables: yes
```

**Step 4: Adicionar componentes shadcn base**

```bash
npx shadcn@latest add button input label card badge \
  dropdown-menu dialog sheet table tabs avatar \
  form select textarea toast sonner
```

**Step 5: Configurar CSS variables MOOV Chat**

Em `app/globals.css`, substituir o bloco `:root` e `.dark` por:

```css
@layer base {
  :root {
    --background: 220 13% 10%;        /* #0F1115 dark */
    --foreground: 0 0% 100%;
    --card: 220 11% 16%;              /* #1F2329 */
    --card-foreground: 0 0% 100%;
    --popover: 220 11% 16%;
    --popover-foreground: 0 0% 100%;
    --primary: 22 100% 50%;           /* #FF6A00 */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 9% 21%;          /* #2A2F38 */
    --secondary-foreground: 0 0% 100%;
    --muted: 220 9% 21%;
    --muted-foreground: 220 9% 55%;   /* #8B949E */
    --accent: 220 9% 21%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;         /* #EF4444 */
    --destructive-foreground: 0 0% 100%;
    --border: 220 9% 25%;             /* #353B45 */
    --input: 220 9% 25%;
    --ring: 22 100% 50%;
    --radius: 0.5rem;
    --success: 160 84% 39%;           /* #10B981 */
    --warning: 38 92% 50%;            /* #F59E0B */
  }
}
```

**Step 6: Criar `.env.example`**

```env
DATABASE_URL="postgresql://moov:password@localhost:5432/moovchat"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_GLOBAL_TOKEN="seu-token-global-aqui"
N8N_WEBHOOK_URL="http://localhost:5678"
N8N_API_KEY="sua-api-key-n8n"
NEXTJS_INTERNAL_API_SECRET="secret-para-chamadas-internas"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GROQ_API_KEY="gsk_..."
LLM_PROVIDER_SDR="openai"
LLM_MODEL_SDR="gpt-4o-mini"
LLM_PROVIDER_VENDEDOR="openai"
LLM_MODEL_VENDEDOR="gpt-4o"
LLM_PROVIDER_INTELLIGENCE="openai"
LLM_MODEL_INTELLIGENCE="gpt-4o-mini"
```

**Step 7: Criar `docker-compose.yml`**

```yaml
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
      - N8N_ENCRYPTION_KEY=mude-esta-chave-32chars-minimo
      - WEBHOOK_URL=http://localhost:5678
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  evolution:
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

**Step 8: Subir serviços**

```bash
cp .env.example .env
# editar .env com valores reais
docker-compose up -d
```

Expected: postgres, n8n e evolution-api rodando.

**Step 9: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js 14 + shadcn/ui + docker-compose"
```

---

## Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

**Step 1: Inicializar Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

**Step 2: Escrever `prisma/schema.prisma`**

Copiar o schema completo do PRD (Seção 5). O schema inclui todos os enums e 20 models: Plan, Tenant, Briefing, User, Lead, LeadAssignment, Conversation, Message, HandoffSummary, GlobalProduct0km, TenantProduct0km, UsedMotorcycle, Accessory, Campaign, PromotionalItem, PriceApproval, PromptConfig, EventLog, ScheduledTask, Alert, DailyReport.

> Ver schema completo em: `docs/plans/2026-03-06-moov-chat-prd.md` seções 5.2–5.7

**Nota:** Adicionar campo `passwordHash` ao model `User`:
```prisma
model User {
  // ... demais campos
  passwordHash String
  // ...
}
```

**Step 3: Rodar migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration aplicada, tabelas criadas.

**Step 4: Criar `lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 5: Seed inicial (planos + super admin)**

Criar `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Planos
  await prisma.plan.createMany({
    data: [
      { name: 'Starter', type: 'STARTER', maxLeadsPerMonth: 200,  maxVendedores: 2,  priceMonthly: 197 },
      { name: 'Pro',     type: 'PRO',     maxLeadsPerMonth: 1000, maxVendedores: 10, priceMonthly: 497 },
      { name: 'Enterprise', type: 'ENTERPRISE', maxLeadsPerMonth: 9999, maxVendedores: 50, priceMonthly: 997 },
    ],
    skipDuplicates: true,
  })

  // Super Admin
  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@moovchat.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@moovchat.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('Seed concluído')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

Adicionar ao `package.json`:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

```bash
npm install -D tsx
npx prisma db seed
```

**Step 6: Commit**

```bash
git add prisma/ lib/prisma.ts
git commit -m "feat: prisma schema + migrations + seed"
```

---

## Task 3: Autenticação (NextAuth.js v5)

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/auth/signin/page.tsx`
- Create: `middleware.ts`
- Create: `types/next-auth.d.ts`

**Step 1: Criar `lib/auth.ts`**

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Senha',    type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: { select: { slug: true } } },
        })

        if (!user || user.status === 'INACTIVE') return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        return {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          tenantId:    user.tenantId ?? null,
          tenantSlug:  user.tenant?.slug ?? null,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id         = user.id
        token.role       = (user as any).role
        token.tenantId   = (user as any).tenantId
        token.tenantSlug = (user as any).tenantSlug
      }
      return token
    },
    session({ session, token }) {
      session.user.id         = token.id as string
      session.user.role       = token.role as string
      session.user.tenantId   = token.tenantId as string | null
      session.user.tenantSlug = token.tenantSlug as string | null
      return session
    },
  },
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
})
```

**Step 2: Criar `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

**Step 3: Criar `types/next-auth.d.ts`**

```typescript
import 'next-auth'
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      tenantId: string | null
      tenantSlug: string | null
    }
  }
}
```

**Step 4: Criar `middleware.ts`**

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/auth/signin', '/api/auth', '/api/webhooks']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // Rotas admin: apenas SUPER_ADMIN
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (session.user.role !== 'SUPER_ADMIN') {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/auth/signin', req.url))
    }
  }

  // Rotas de tenant: valida pertencimento
  const tenantMatch = pathname.match(/^(?:\/api\/)?([a-z0-9-]+)\//)
  if (tenantMatch && !['admin', 'auth', 'api'].includes(tenantMatch[1])) {
    const slug = tenantMatch[1]
    if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantSlug !== slug) {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/auth/signin', req.url))
    }
  }

  // Rotas gerente only
  const GERENTE_ONLY = ['/metricas', '/equipe', '/aprovacoes', '/config']
  if (GERENTE_ONLY.some(p => pathname.includes(p)) && session.user.role === 'VENDEDOR') {
    return NextResponse.redirect(
      new URL(`/${session.user.tenantSlug}/fila`, req.url)
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 5: Criar página de login `app/auth/signin/page.tsx`**

```typescript
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const res = await signIn('credentials', {
      email:    form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    if (res?.error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
      <Card className="w-full max-w-sm bg-[#1F2329] border-[#353B45]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">MOOV Chat</CardTitle>
          <p className="text-[#8B949E] text-sm">Faça login para continuar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input id="email" name="email" type="email" required
                className="bg-[#2A2F38] border-[#353B45] text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Senha</Label>
              <Input id="password" name="password" type="password" required
                className="bg-[#2A2F38] border-[#353B45] text-white" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" disabled={loading}
              className="w-full bg-[#FF6A00] hover:bg-[#FF8C1A] text-white">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 6: Testar login**

```bash
npm run dev
# Acessar http://localhost:3000/auth/signin
# Login com admin@moovchat.com / admin123
# Deve redirecionar para /
```

**Step 7: Commit**

```bash
git add lib/auth.ts app/api/auth app/auth middleware.ts types/
git commit -m "feat: nextauth credentials + middleware de autorização"
```

---

## Task 4: Layouts Base (Admin + Loja)

**Files:**
- Create: `components/shared/sidebar.tsx`
- Create: `components/shared/top-bar.tsx`
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/dashboard/page.tsx`
- Create: `app/(loja)/layout.tsx`
- Create: `app/(loja)/[tenantSlug]/fila/page.tsx`
- Create: `app/page.tsx` (redirect por role)

**Step 1: Criar `components/shared/sidebar.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  gerenteOnly?: boolean
}

interface SidebarProps {
  items: NavItem[]
  role: string
}

export function Sidebar({ items, role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-[#0F1115] border-r border-[#353B45] flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-[#353B45]">
        <span className="text-white font-bold text-lg">MOOV Chat</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items
          .filter(item => !item.gerenteOnly || role !== 'VENDEDOR')
          .map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                pathname === item.href
                  ? 'bg-[#FF6A00] text-white'
                  : 'text-[#8B949E] hover:bg-[#1F2329] hover:text-white'
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
      </nav>
    </aside>
  )
}
```

**Step 2: Criar `app/(admin)/layout.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'
import { LayoutDashboard, Store, FileText, CreditCard, Users, ShieldAlert } from 'lucide-react'

const adminNavItems = [
  { label: 'Dashboard',  href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Lojas',      href: '/admin/lojas',      icon: Store },
  { label: 'Prompts',    href: '/admin/prompts',    icon: FileText },
  { label: 'Planos',     href: '/admin/planos',     icon: CreditCard },
  { label: 'Usuários',   href: '/admin/usuarios',   icon: Users },
  { label: 'QA Logs',    href: '/admin/qa-logs',    icon: ShieldAlert },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/auth/signin')

  return (
    <div className="flex min-h-screen bg-[#1F2329]">
      <Sidebar items={adminNavItems} role="SUPER_ADMIN" />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

**Step 3: Criar `app/(loja)/layout.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'
import { Home, List, MessageSquare, BarChart2, Bike, Users, Settings, CheckSquare } from 'lucide-react'

export default async function LojaLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { tenantSlug: string }
}) {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  const slug = params.tenantSlug ?? session.user.tenantSlug
  const lojaNavItems = [
    { label: 'Início',      href: `/${slug}/inicio`,    icon: Home },
    { label: 'Fila',        href: `/${slug}/fila`,      icon: List },
    { label: 'Inbox',       href: `/${slug}/inbox`,     icon: MessageSquare },
    { label: 'Métricas',    href: `/${slug}/metricas`,  icon: BarChart2,   gerenteOnly: true },
    { label: 'Catálogo',    href: `/${slug}/catalogo`,  icon: Bike },
    { label: 'Aprovações',  href: `/${slug}/aprovacoes`,icon: CheckSquare, gerenteOnly: true },
    { label: 'Equipe',      href: `/${slug}/equipe`,    icon: Users,       gerenteOnly: true },
    { label: 'Config',      href: `/${slug}/config`,    icon: Settings,    gerenteOnly: true },
  ]

  return (
    <div className="flex min-h-screen bg-[#1F2329]">
      <Sidebar items={lojaNavItems} role={session.user.role} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

**Step 4: Criar `app/page.tsx` (redirect por role)**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  if (session.user.role === 'SUPER_ADMIN') redirect('/admin/dashboard')
  if (session.user.tenantSlug) redirect(`/${session.user.tenantSlug}/fila`)
  redirect('/auth/signin')
}
```

**Step 5: Criar placeholders de página**

```typescript
// app/(admin)/dashboard/page.tsx
export default function AdminDashboard() {
  return <h1 className="text-white text-2xl">Dashboard Admin</h1>
}

// app/(loja)/[tenantSlug]/fila/page.tsx
export default function FilaPage() {
  return <h1 className="text-white text-2xl">Fila de Leads</h1>
}
```

**Step 6: Testar navegação**

```bash
npm run dev
# Login como admin@moovchat.com → deve ir para /admin/dashboard
# Sidebar admin deve exibir os 6 itens de navegação
```

**Step 7: Commit**

```bash
git add app/ components/shared/
git commit -m "feat: layouts admin e loja com sidebar + redirect por role"
```

---

## Task 5: Helpers de API + Tipos TypeScript

**Files:**
- Create: `types/api.ts`
- Create: `lib/api-response.ts`
- Create: `lib/get-session-or-throw.ts`

**Step 1: Criar `types/api.ts`**

```typescript
export type ApiSuccess<T> = { data: T; error?: never }
export type ApiError     = { data?: never; error: { code: string; message: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}
```

**Step 2: Criar `lib/api-response.ts`**

```typescript
import { NextResponse } from 'next/server'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function err(message: string, code = 'ERROR', status = 400) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function unauthorized() {
  return err('Unauthorized', 'UNAUTHORIZED', 401)
}

export function forbidden() {
  return err('Forbidden', 'FORBIDDEN', 403)
}

export function notFound(resource = 'Resource') {
  return err(`${resource} not found`, 'NOT_FOUND', 404)
}
```

**Step 3: Criar `lib/get-session-or-throw.ts`**

```typescript
import { auth } from '@/lib/auth'

export async function getSessionOrThrow() {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

export async function assertRole(role: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(role)) throw new Error('FORBIDDEN')
}

export async function assertTenant(sessionSlug: string | null, paramSlug: string, role: string) {
  if (role === 'SUPER_ADMIN') return
  if (sessionSlug !== paramSlug) throw new Error('FORBIDDEN')
}
```

**Step 4: Commit**

```bash
git add types/ lib/api-response.ts lib/get-session-or-throw.ts
git commit -m "feat: helpers de API response e autorização"
```

---

## Task 6: Super Admin — CRUD de Planos e Lojas

**Files:**
- Create: `app/api/admin/plans/route.ts`
- Create: `app/api/admin/tenants/route.ts`
- Create: `app/api/admin/tenants/[id]/route.ts`
- Create: `app/(admin)/lojas/page.tsx`
- Create: `app/(admin)/lojas/[id]/page.tsx`

**Step 1: Criar `app/api/admin/plans/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET() {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthly: 'asc' } })
  return ok(plans)
}
```

**Step 2: Criar `app/api/admin/tenants/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'
import bcrypt from 'bcryptjs'

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)
  const search   = searchParams.get('search') ?? ''
  const status   = searchParams.get('status') as any

  const where = {
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(status  ? { status } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: { plan: { select: { name: true, type: true } }, _count: { select: { leads: true, users: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count({ where }),
  ])

  return ok({ data, total, page, pageSize })
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const body = await req.json()
  const { name, razaoSocial, slug, planId, email, phone, address, city, state,
          gerenteNome, gerenteEmail, gerenteWhatsapp } = body

  if (!name || !slug || !planId || !gerenteNome || !gerenteEmail) {
    return err('Campos obrigatórios: name, slug, planId, gerenteNome, gerenteEmail')
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } })
  if (existing) return err('Slug já em uso', 'SLUG_TAKEN', 409)

  const hash = await bcrypt.hash('mudar123', 12)

  const tenant = await prisma.tenant.create({
    data: {
      name, razaoSocial, slug, planId,
      email, phone, address, city, state,
      users: {
        create: {
          name:         gerenteNome,
          email:        gerenteEmail,
          passwordHash: hash,
          whatsappNotif: gerenteWhatsapp,
          role:         'GERENTE',
        },
      },
      briefing: { create: {} },
    },
    include: { plan: true, users: true },
  })

  return ok(tenant, 201)
}
```

**Step 3: Criar `app/api/admin/tenants/[id]/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { plan: true, users: true, briefing: true },
  })
  if (!tenant) return notFound('Loja')
  return ok(tenant)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()
  const body = await req.json()
  const tenant = await prisma.tenant.update({ where: { id: params.id }, data: body })
  return ok(tenant)
}
```

**Step 4: Criar página de listagem `app/(admin)/lojas/page.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function LojasPage() {
  const tenants = await prisma.tenant.findMany({
    include: { plan: true, _count: { select: { leads: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">Lojas</h1>
        <Button asChild className="bg-[#FF6A00] hover:bg-[#FF8C1A]">
          <Link href="/admin/lojas/nova">+ Nova Loja</Link>
        </Button>
      </div>
      <div className="bg-[#1F2329] rounded-lg border border-[#353B45] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[#353B45]">
            <tr className="text-[#8B949E]">
              <th className="text-left p-4">Loja</th>
              <th className="text-left p-4">Plano</th>
              <th className="text-left p-4">Leads/30d</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} className="border-b border-[#353B45] hover:bg-[#2A2F38]">
                <td className="p-4 text-white font-medium">{t.name}</td>
                <td className="p-4 text-[#8B949E]">{t.plan.name}</td>
                <td className="p-4 text-[#8B949E]">{t._count.leads}</td>
                <td className="p-4">
                  <Badge variant={t.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={t.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : ''}>
                    {t.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/lojas/${t.id}`} className="text-[#8B949E]">Editar</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add app/api/admin/ app/\(admin\)/lojas/
git commit -m "feat: admin CRUD de planos e lojas"
```

---

## Task 7: Gestão de Usuários da Loja

**Files:**
- Create: `app/api/[tenantSlug]/users/route.ts`
- Create: `app/api/[tenantSlug]/users/[id]/route.ts`
- Create: `lib/lead-assignment.ts`
- Create: `app/(loja)/[tenantSlug]/equipe/page.tsx`

**Step 1: Criar `app/api/[tenantSlug]/users/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'
import bcrypt from 'bcryptjs'

export async function GET(_: Request, { params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (!session || (session.user.tenantSlug !== params.tenantSlug && session.user.role !== 'SUPER_ADMIN')) return forbidden()

  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    select: { id: true, name: true, email: true, phone: true, whatsappNotif: true, role: true, status: true, lastLeadAssignedAt: true, _count: { select: { assignedLeads: true } } },
    orderBy: { name: 'asc' },
  })
  return ok(users)
}

export async function POST(req: Request, { params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (session?.user.role !== 'GERENTE' && session?.user.role !== 'SUPER_ADMIN') return forbidden()
  if (session.user.role === 'GERENTE' && session.user.tenantSlug !== params.tenantSlug) return forbidden()

  const body = await req.json()
  const { name, email, password, phone, whatsappNotif, role } = body

  if (!name || !email || !password || !role) return err('Campos obrigatórios: name, email, password, role')

  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } })
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordHash: hash, phone, whatsappNotif, role, tenantId: tenant.id },
  })
  return ok(user, 201)
}
```

**Step 2: Criar `lib/lead-assignment.ts`**

```typescript
import { prisma } from '@/lib/prisma'

export async function getNextVendedor(tenantId: string): Promise<string | null> {
  const vendedor = await prisma.user.findFirst({
    where: { tenantId, role: 'VENDEDOR', status: 'ACTIVE' },
    orderBy: [{ lastLeadAssignedAt: 'asc' }, { createdAt: 'asc' }],
  })
  if (!vendedor) return null
  await prisma.user.update({
    where: { id: vendedor.id },
    data: { lastLeadAssignedAt: new Date() },
  })
  return vendedor.id
}
```

**Step 3: Commit**

```bash
git add app/api/ lib/lead-assignment.ts app/\(loja\)/
git commit -m "feat: gestão de usuários da loja + helper round-robin"
```

---

## Task 8: Catálogo — Produtos 0km e Usadas

**Files:**
- Create: `app/api/[tenantSlug]/catalog/products-0km/route.ts`
- Create: `app/api/[tenantSlug]/catalog/products-0km/[id]/route.ts`
- Create: `app/api/[tenantSlug]/catalog/used/route.ts`
- Create: `app/api/[tenantSlug]/catalog/used/[id]/route.ts`
- Create: `app/api/[tenantSlug]/price-approvals/[id]/route.ts`

**Step 1: Criar `app/api/[tenantSlug]/catalog/products-0km/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden } from '@/lib/api-response'

async function getTenant(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } })
}

export async function GET(req: Request, { params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const tenant = await getTenant(params.tenantSlug)
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const { searchParams } = new URL(req.url)
  const available = searchParams.get('available') === 'true'

  const products = await prisma.tenantProduct0km.findMany({
    where: {
      tenantId: tenant.id,
      ...(available ? { availability: 'AVAILABLE' } : {}),
    },
    include: { globalProduct: true, campaign: true },
    orderBy: { createdAt: 'desc' },
  })
  return ok(products)
}

export async function POST(req: Request, { params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (session?.user.role === 'VENDEDOR') return forbidden()

  const tenant = await getTenant(params.tenantSlug)
  if (!tenant) return err('Loja não encontrada', 'NOT_FOUND', 404)

  const body = await req.json()
  const product = await prisma.tenantProduct0km.create({
    data: { ...body, tenantId: tenant.id },
  })
  return ok(product, 201)
}
```

**Step 2: Criar `app/api/[tenantSlug]/catalog/products-0km/[id]/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden, notFound } from '@/lib/api-response'

export async function PUT(req: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (session?.user.role === 'VENDEDOR') return forbidden()

  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } })
  if (!tenant) return notFound('Loja')

  const product = await prisma.tenantProduct0km.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  })
  if (!product) return notFound('Produto')

  const body = await req.json()

  // Se política de aprovação ativa e preço mudou → criar PriceApproval
  if (tenant.policyPriceApproval && body.price && body.price !== Number(product.price)) {
    await prisma.priceApproval.create({
      data: {
        tenantId:     tenant.id,
        productType:  '0km',
        productId:    product.id,
        currentPrice: product.price,
        proposedPrice: body.price,
        requestedById: session?.user.id,
      },
    })
    const { price, ...rest } = body
    await prisma.tenantProduct0km.update({ where: { id: params.id }, data: { ...rest, pendingPrice: price } })
    return ok({ message: 'Preço enviado para aprovação', approvalPending: true })
  }

  const updated = await prisma.tenantProduct0km.update({ where: { id: params.id }, data: body })
  return ok(updated)
}
```

**Step 3: Criar `app/api/[tenantSlug]/price-approvals/[id]/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function PUT(req: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (session?.user.role !== 'GERENTE' && session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const approval = await prisma.priceApproval.findUnique({ where: { id: params.id } })
  if (!approval) return notFound('Aprovação')

  const { status, notes } = await req.json()

  await prisma.priceApproval.update({
    where: { id: params.id },
    data: { status, notes, approvedById: session.user.id, resolvedAt: new Date() },
  })

  // Se aprovado, aplicar preço
  if (status === 'APPROVED' && approval.productType === '0km') {
    await prisma.tenantProduct0km.update({
      where: { id: approval.productId },
      data: { price: approval.proposedPrice, pendingPrice: null },
    })
  }

  return ok({ status })
}
```

**Step 4: Criar APIs de usadas e acessórios (mesmo padrão)**

```typescript
// app/api/[tenantSlug]/catalog/used/route.ts
// Mesmo padrão do GET/POST de products-0km mas para UsedMotorcycle
// Campos: brand, model, version, year, mileage, color, price, condition, notes, imageUrls

// app/api/[tenantSlug]/catalog/accessories/route.ts
// Mesmo padrão para Accessory

// app/api/[tenantSlug]/catalog/campaigns/route.ts
// Mesmo padrão para Campaign + PromotionalItem
```

**Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: catálogo 0km, usadas + fluxo de aprovação de preço"
```

---

## Task 9: WhatsApp Gateway (Webhook)

**Files:**
- Create: `app/api/webhooks/whatsapp/[tenantSlug]/route.ts`
- Create: `lib/evolution.ts`

**Step 1: Criar `lib/evolution.ts`**

```typescript
const BASE = process.env.EVOLUTION_API_URL!
const TOKEN = process.env.EVOLUTION_API_GLOBAL_TOKEN!

async function evolutionFetch(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', apikey: TOKEN },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Evolution API error: ${res.status}`)
  return res.json()
}

export async function sendText(instance: string, phone: string, text: string) {
  return evolutionFetch(`/message/sendText/${instance}`, {
    number: phone,
    options: { delay: 1200, presence: 'composing' },
    textMessage: { text },
  })
}

export async function sendMedia(instance: string, phone: string, mediaUrl: string, caption?: string) {
  return evolutionFetch(`/message/sendMedia/${instance}`, {
    number: phone,
    mediaMessage: { mediatype: 'image', media: mediaUrl, caption },
  })
}

export async function createInstance(instanceName: string, webhookUrl: string) {
  return evolutionFetch('/instance/create', {
    instanceName,
    qrcode: true,
    webhook: webhookUrl,
    webhookByEvents: true,
    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
  })
}
```

**Step 2: Criar webhook endpoint**

```typescript
// app/api/webhooks/whatsapp/[tenantSlug]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  // Validar token da Evolution API
  const token = req.headers.get('apikey')
  if (token !== process.env.EVOLUTION_API_GLOBAL_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Ignorar mensagens enviadas pelo próprio sistema
  if (body.data?.key?.fromMe === true) {
    return NextResponse.json({ ok: true })
  }

  // Ignorar eventos que não são mensagens
  if (body.event !== 'messages.upsert') {
    return NextResponse.json({ ok: true })
  }

  // Encaminhar ao n8n de forma assíncrona (fire-and-forget)
  const n8nUrl = `${process.env.N8N_WEBHOOK_URL}/webhook/whatsapp-inbound`
  fetch(n8nUrl, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': params.tenantSlug,
      'X-Internal-Secret': process.env.NEXTJS_INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ ...body, tenantSlug: params.tenantSlug }),
  }).catch(err => console.error('[Webhook] Erro ao encaminhar ao n8n:', err))

  return NextResponse.json({ ok: true })
}
```

**Step 3: Commit**

```bash
git add app/api/webhooks/ lib/evolution.ts
git commit -m "feat: webhook Evolution API + serviço de envio de mensagens"
```

---

## Task 10: Leads e Conversas — API Core

**Files:**
- Create: `app/api/[tenantSlug]/leads/route.ts`
- Create: `app/api/[tenantSlug]/leads/[id]/route.ts`
- Create: `app/api/[tenantSlug]/leads/[id]/assign/route.ts`
- Create: `app/api/[tenantSlug]/conversations/[id]/route.ts`
- Create: `app/api/[tenantSlug]/conversations/[id]/takeover/route.ts`
- Create: `app/api/[tenantSlug]/conversations/[id]/release/route.ts`
- Create: `app/api/[tenantSlug]/conversations/[id]/messages/route.ts`

**Step 1: Criar `app/api/[tenantSlug]/leads/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET(req: Request, { params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } })
  if (!tenant) return forbidden()

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 30)

  const where: any = { tenantId: tenant.id }

  // Vendedor vê apenas seus leads
  if (session.user.role === 'VENDEDOR') {
    where.assignedVendedorId = session.user.id
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedVendedor: { select: { id: true, name: true } },
        conversations: {
          where: { state: { not: 'FINALIZADA' } },
          select: { id: true, state: true, lastMessageAt: true, humanSlaStartedAt: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
      orderBy: [
        { isHot: 'desc' },
        { conversations: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
    }),
    prisma.lead.count({ where }),
  ])

  return ok({ data: leads, total, page, pageSize })
}
```

**Step 2: Criar `app/api/[tenantSlug]/leads/[id]/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function GET(_: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (!session) return forbidden()
  const lead = await prisma.lead.findFirst({
    where: {
      id: params.id,
      tenant: { slug: params.tenantSlug },
    },
    include: { assignedVendedor: true, conversations: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  if (!lead) return notFound('Lead')
  return ok(lead)
}

export async function PUT(req: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const body = await req.json()
  const { state, notes, primaryInterest, lossReason, lossDetail } = body

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      ...(state           ? { state }          : {}),
      ...(notes           ? { notes }          : {}),
      ...(primaryInterest ? { primaryInterest }: {}),
      ...(lossReason      ? { lossReason }     : {}),
      ...(lossDetail      ? { lossDetail }     : {}),
      ...(state === 'VENDIDO' ? { soldAt: new Date() } : {}),
    },
  })
  return ok(lead)
}
```

**Step 3: Criar `app/api/[tenantSlug]/conversations/[id]/takeover/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function POST(_: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, tenant: { slug: params.tenantSlug } },
  })
  if (!conversation) return notFound('Conversa')

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: {
      state:            'EM_ATENDIMENTO_HUMANO',
      humanAttendantId: session.user.id,
      humanTookOverAt:  new Date(),
    },
  })

  await prisma.eventLog.create({
    data: {
      tenantId:       conversation.tenantId,
      conversationId: conversation.id,
      leadId:         conversation.leadId,
      eventType:      'conversa_assumida_por_humano',
      actorType:      'humano',
      actorId:        session.user.id,
    },
  })

  // Cancelar SLA tasks pendentes (vendedor assumiu)
  await prisma.scheduledTask.updateMany({
    where: {
      conversationId: params.id,
      taskType: { in: ['SLA_ALERT_10MIN', 'SLA_ALERT_30MIN', 'SLA_ALERT_1H', 'SLA_ALERT_2H'] },
      status: 'PENDING',
    },
    data: { status: 'CANCELLED' },
  })

  return ok(updated)
}
```

**Step 4: Criar `app/api/[tenantSlug]/conversations/[id]/release/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden, notFound } from '@/lib/api-response'

export async function POST(_: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, tenant: { slug: params.tenantSlug } },
  })
  if (!conversation) return notFound('Conversa')

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: { state: 'ATIVA_IA', humanAttendantId: null },
  })

  await prisma.eventLog.create({
    data: {
      tenantId:       conversation.tenantId,
      conversationId: conversation.id,
      leadId:         conversation.leadId,
      eventType:      'conversa_devolvida_para_ia',
      actorType:      'humano',
      actorId:        session.user.id,
    },
  })

  return ok(updated)
}
```

**Step 5: Criar `app/api/[tenantSlug]/conversations/[id]/messages/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err, forbidden, notFound } from '@/lib/api-response'
import { sendText } from '@/lib/evolution'

export async function GET(_: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return ok(messages)
}

export async function POST(req: Request, { params }: { params: { tenantSlug: string; id: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const body = await req.json()
  const { contentType = 'TEXT', contentText, isInternal = false } = body

  if (!contentText) return err('contentText é obrigatório')

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, tenant: { slug: params.tenantSlug } },
    include: { lead: true, tenant: true },
  })
  if (!conversation) return notFound('Conversa')

  const actorType = session.user.role === 'GERENTE' ? 'HUMANO_GERENTE' : 'HUMANO_VENDEDOR'

  const message = await prisma.message.create({
    data: {
      tenantId:       conversation.tenantId,
      conversationId: params.id,
      actorType,
      actorId:        session.user.id,
      direction:      'OUTBOUND',
      contentType,
      contentText,
      isInternal,
    },
  })

  // Enviar via Evolution API (se não for nota interna)
  if (!isInternal && conversation.tenant.evolutionInstanceName) {
    try {
      const result = await sendText(
        conversation.tenant.evolutionInstanceName,
        conversation.lead.phone,
        contentText
      )
      await prisma.message.update({
        where: { id: message.id },
        data: { whatsappMsgId: result?.key?.id, status: 'SENT' },
      })
    } catch (e) {
      console.error('[Messages] Erro ao enviar:', e)
    }
  }

  // Atualizar timestamps e cancelar SLA
  await prisma.conversation.update({
    where: { id: params.id },
    data: { lastHumanMessageAt: new Date(), lastMessageAt: new Date() },
  })

  await prisma.scheduledTask.updateMany({
    where: {
      conversationId: params.id,
      taskType: { in: ['SLA_ALERT_10MIN', 'SLA_ALERT_30MIN', 'SLA_ALERT_1H', 'SLA_ALERT_2H'] },
      status: 'PENDING',
    },
    data: { status: 'CANCELLED' },
  })

  return ok(message, 201)
}
```

**Step 6: Commit**

```bash
git add app/api/
git commit -m "feat: API de leads, conversas, takeover, release e mensagens"
```

---

## Task 11: Fila de Leads + Inbox (UI)

**Files:**
- Create: `app/(loja)/[tenantSlug]/fila/page.tsx`
- Create: `components/loja/fila/lead-card.tsx`
- Create: `app/(loja)/[tenantSlug]/inbox/[conversationId]/page.tsx`
- Create: `components/loja/inbox/conversation-view.tsx`
- Create: `components/loja/inbox/lead-info-panel.tsx`
- Create: `components/loja/inbox/message-input.tsx`

**Step 1: Criar `components/loja/fila/lead-card.tsx`**

```typescript
'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame } from 'lucide-react'
import Link from 'next/link'

interface LeadCardProps {
  lead: any
  tenantSlug: string
}

export function LeadCard({ lead, tenantSlug }: LeadCardProps) {
  const conv = lead.conversations?.[0]
  const isAwaitingHuman = conv?.state === 'AGUARDANDO_VENDEDOR'
  const minutesWaiting = conv?.humanSlaStartedAt
    ? Math.floor((Date.now() - new Date(conv.humanSlaStartedAt).getTime()) / 60000)
    : null

  return (
    <div className={`bg-[#2A2F38] rounded-lg border p-4 flex items-center justify-between
      ${isAwaitingHuman ? 'border-orange-500/50' : 'border-[#353B45]'}`}>
      <div className="flex items-center gap-3">
        {lead.isHot && <Flame size={16} className="text-orange-400" />}
        <div>
          <p className="text-white font-medium">{lead.name ?? lead.phone}</p>
          <p className="text-[#8B949E] text-sm">{lead.primaryInterest ?? 'Interesse não definido'}</p>
          {minutesWaiting !== null && (
            <p className={`text-xs mt-1 ${minutesWaiting > 30 ? 'text-red-400' : 'text-amber-400'}`}>
              Aguardando há {minutesWaiting}min
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">{lead.state}</Badge>
        <Button size="sm" asChild className="bg-[#FF6A00] hover:bg-[#FF8C1A] text-white">
          <Link href={`/${tenantSlug}/inbox/${conv?.id ?? ''}`}>
            {isAwaitingHuman ? 'Assumir' : 'Ver'}
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Criar `app/(loja)/[tenantSlug]/fila/page.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LeadCard } from '@/components/loja/fila/lead-card'

export default async function FilaPage({ params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } })
  if (!tenant) return null

  const where: any = { tenantId: tenant.id, conversations: { some: { state: { not: 'FINALIZADA' } } } }
  if (session?.user.role === 'VENDEDOR') where.assignedVendedorId = session.user.id

  const leads = await prisma.lead.findMany({
    where,
    include: {
      conversations: {
        where: { state: { not: 'FINALIZADA' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ isHot: 'desc' }, { updatedAt: 'desc' }],
    take: 50,
  })

  const urgent = leads.filter(l => l.conversations[0]?.state === 'AGUARDANDO_VENDEDOR' || l.isHot)
  const normal = leads.filter(l => !urgent.includes(l))

  return (
    <div className="space-y-6">
      <h1 className="text-white text-2xl font-bold">Fila de Leads</h1>

      {urgent.length > 0 && (
        <div className="space-y-2">
          <p className="text-red-400 text-sm font-medium uppercase tracking-wide">🔴 Urgente</p>
          {urgent.map(l => <LeadCard key={l.id} lead={l} tenantSlug={params.tenantSlug} />)}
        </div>
      )}

      {normal.length > 0 && (
        <div className="space-y-2">
          <p className="text-[#8B949E] text-sm font-medium uppercase tracking-wide">⚡ Em atendimento IA</p>
          {normal.map(l => <LeadCard key={l.id} lead={l} tenantSlug={params.tenantSlug} />)}
        </div>
      )}

      {leads.length === 0 && (
        <p className="text-[#8B949E] text-center py-12">Nenhum lead ativo no momento.</p>
      )}
    </div>
  )
}
```

**Step 3: Criar `app/(loja)/[tenantSlug]/inbox/[conversationId]/page.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ConversationView } from '@/components/loja/inbox/conversation-view'

export default async function InboxPage({ params }: { params: { tenantSlug: string; conversationId: string } }) {
  const session = await auth()
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.conversationId, tenant: { slug: params.tenantSlug } },
    include: {
      lead: { include: { assignedVendedor: true } },
      messages: { orderBy: { createdAt: 'asc' }, take: 100 },
      handoffSummaries: { orderBy: { createdAt: 'desc' }, take: 1 },
      humanAttendant: { select: { id: true, name: true } },
    },
  })

  if (!conversation) return notFound()

  return (
    <ConversationView
      conversation={conversation}
      tenantSlug={params.tenantSlug}
      currentUserId={session!.user.id}
      currentUserRole={session!.user.role}
    />
  )
}
```

**Step 4: Criar `components/loja/inbox/conversation-view.tsx` (client component com polling)**

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MessageInput } from './message-input'
import { LeadInfoPanel } from './lead-info-panel'

export function ConversationView({ conversation, tenantSlug, currentUserId, currentUserRole }: any) {
  const [messages, setMessages] = useState(conversation.messages)
  const [conv, setConv]         = useState(conversation)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Polling a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/${tenantSlug}/conversations/${conv.id}/messages`)
      if (res.ok) {
        const { data } = await res.json()
        setMessages(data)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [conv.id, tenantSlug])

  // Auto-scroll para última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleTakeover() {
    await fetch(`/api/${tenantSlug}/conversations/${conv.id}/takeover`, { method: 'POST' })
    setConv((c: any) => ({ ...c, state: 'EM_ATENDIMENTO_HUMANO', humanAttendantId: currentUserId }))
  }

  async function handleRelease() {
    await fetch(`/api/${tenantSlug}/conversations/${conv.id}/release`, { method: 'POST' })
    setConv((c: any) => ({ ...c, state: 'ATIVA_IA', humanAttendantId: null }))
  }

  const isMyConversation = conv.humanAttendantId === currentUserId || currentUserRole === 'GERENTE'

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* Painel da conversa */}
      <div className="flex-1 flex flex-col bg-[#1F2329] rounded-lg border border-[#353B45] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#353B45]">
          <div>
            <p className="text-white font-medium">{conv.lead.name ?? conv.lead.phone}</p>
            <p className="text-[#8B949E] text-sm">{conv.lead.primaryInterest}</p>
          </div>
          <div className="flex gap-2">
            {conv.state === 'AGUARDANDO_VENDEDOR' && (
              <Button onClick={handleTakeover} size="sm" className="bg-[#FF6A00] hover:bg-[#FF8C1A]">
                Assumir Atendimento
              </Button>
            )}
            {conv.state === 'EM_ATENDIMENTO_HUMANO' && isMyConversation && (
              <Button onClick={handleRelease} variant="outline" size="sm">
                Devolver para IA
              </Button>
            )}
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm
                ${msg.direction === 'OUTBOUND'
                  ? 'bg-[#FF6A00] text-white'
                  : 'bg-[#2A2F38] text-white'}`}>
                {msg.isInternal && <span className="text-xs text-amber-300 block mb-1">📌 Nota interna</span>}
                <p>{msg.contentText}</p>
                <p className={`text-xs mt-1 ${msg.direction === 'OUTBOUND' ? 'text-orange-200' : 'text-[#8B949E]'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{msg.actorType}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {(conv.state === 'EM_ATENDIMENTO_HUMANO' && isMyConversation) ? (
          <MessageInput conversationId={conv.id} tenantSlug={tenantSlug}
            onSent={(msg) => setMessages((m: any[]) => [...m, msg])} />
        ) : (
          <div className="p-4 text-center text-[#8B949E] text-sm border-t border-[#353B45]">
            {conv.state === 'ATIVA_IA' ? '🤖 IA está atendendo' : '⏳ Aguardando vendedor'}
          </div>
        )}
      </div>

      {/* Painel lateral */}
      <LeadInfoPanel lead={conv.lead} handoffSummary={conv.handoffSummaries?.[0]} tenantSlug={tenantSlug} />
    </div>
  )
}
```

**Step 5: Criar `components/loja/inbox/message-input.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

export function MessageInput({ conversationId, tenantSlug, onSent }: any) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!text.trim()) return
    setLoading(true)
    const res = await fetch(`/api/${tenantSlug}/conversations/${conversationId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ contentType: 'TEXT', contentText: text }),
    })
    if (res.ok) {
      const { data } = await res.json()
      onSent(data)
      setText('')
    }
    setLoading(false)
  }

  return (
    <div className="p-4 border-t border-[#353B45] flex gap-2">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Digite sua mensagem..."
        className="flex-1 bg-[#2A2F38] border-[#353B45] text-white resize-none"
        rows={2}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
      />
      <Button onClick={handleSend} disabled={loading || !text.trim()}
        className="bg-[#FF6A00] hover:bg-[#FF8C1A] self-end">
        <Send size={16} />
      </Button>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add app/\(loja\)/ components/loja/
git commit -m "feat: fila de leads + inbox com polling + envio de mensagens"
```

---

## Task 12: Alertas e Dashboard de Métricas

**Files:**
- Create: `app/api/[tenantSlug]/alerts/route.ts`
- Create: `app/api/[tenantSlug]/alerts/[id]/read/route.ts`
- Create: `app/api/[tenantSlug]/reports/dashboard/route.ts`
- Create: `app/(loja)/[tenantSlug]/metricas/page.tsx`

**Step 1: Criar `app/api/[tenantSlug]/alerts/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET(req: Request, { params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (!session) return forbidden()

  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } })
  if (!tenant) return forbidden()

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const where: any = {
    tenantId: tenant.id,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(session.user.role === 'VENDEDOR' ? { userId: session.user.id } : {}),
  }

  const alerts = await prisma.alert.findMany({
    where,
    include: { lead: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return ok(alerts)
}
```

**Step 2: Criar `app/api/[tenantSlug]/reports/dashboard/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET(req: Request, { params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (session?.user.role === 'VENDEDOR') return forbidden()

  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } })
  if (!tenant) return forbidden()

  const { searchParams } = new URL(req.url)
  const from = new Date(searchParams.get('from') ?? new Date().toISOString().slice(0, 10))
  const to   = new Date(searchParams.get('to')   ?? new Date().toISOString().slice(0, 10))
  to.setHours(23, 59, 59)

  const [totalLeads, byState, vendedores] = await Promise.all([
    prisma.lead.count({ where: { tenantId: tenant.id, createdAt: { gte: from, lte: to } } }),
    prisma.lead.groupBy({
      by: ['state'],
      where: { tenantId: tenant.id, createdAt: { gte: from, lte: to } },
      _count: true,
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id, role: 'VENDEDOR' },
      select: {
        id: true, name: true,
        _count: { select: { assignedLeads: true } },
      },
    }),
  ])

  const stateMap = Object.fromEntries(byState.map(s => [s.state, s._count]))

  return ok({
    period: { from, to },
    kpis: { totalLeads },
    funnel: {
      received:  totalLeads,
      qualified: stateMap['QUALIFICADO']        ?? 0,
      proposal:  stateMap['PROPOSTA_ENVIADA']    ?? 0,
      visit:     stateMap['AGUARDANDO_VISITA']   ?? 0,
      sold:      stateMap['VENDIDO']             ?? 0,
      lost:      stateMap['PERDIDO']             ?? 0,
    },
    vendedorPerformance: vendedores.map(v => ({
      vendedor: { id: v.id, name: v.name },
      leadsAssigned: v._count.assignedLeads,
    })),
  })
}
```

**Step 3: Criar página de métricas `app/(loja)/[tenantSlug]/metricas/page.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function MetricasPage({ params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (session?.user.role === 'VENDEDOR') redirect(`/${params.tenantSlug}/fila`)

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/${params.tenantSlug}/reports/dashboard`,
    { cache: 'no-store' }
  )
  const { data } = await res.json()

  return (
    <div className="space-y-6">
      <h1 className="text-white text-2xl font-bold">Métricas</h1>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Leads Recebidos', value: data.kpis.totalLeads },
          { label: 'Qualificados',    value: data.funnel.qualified },
          { label: 'Propostas',       value: data.funnel.proposal  },
          { label: 'Vendas',          value: data.funnel.sold      },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#2A2F38] rounded-lg border border-[#353B45] p-4">
            <p className="text-[#8B949E] text-sm">{kpi.label}</p>
            <p className="text-white text-3xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Performance vendedores */}
      <div className="bg-[#2A2F38] rounded-lg border border-[#353B45] p-4">
        <h2 className="text-white font-medium mb-4">Performance da Equipe</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#8B949E] border-b border-[#353B45]">
              <th className="text-left pb-2">Vendedor</th>
              <th className="text-right pb-2">Leads</th>
            </tr>
          </thead>
          <tbody>
            {data.vendedorPerformance.map((v: any) => (
              <tr key={v.vendedor.id} className="border-b border-[#353B45]/50">
                <td className="text-white py-2">{v.vendedor.name}</td>
                <td className="text-[#8B949E] text-right py-2">{v.leadsAssigned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add app/api/ app/\(loja\)/
git commit -m "feat: alertas + dashboard de métricas"
```

---

## Task 13: n8n — Flows de Automação (JSONs)

**Files:**
- Create: `docs/n8n/flow-01-inbound.json`
- Create: `docs/n8n/flow-02-handoff.json`
- Create: `docs/n8n/flow-03-sla-alerts.json`
- Create: `docs/n8n/flow-04-followup.json`
- Create: `docs/n8n/flow-05-daily-report.json`
- Create: `docs/n8n/flow-06-intelligence.json`
- Create: `docs/n8n/flow-07-prompt-assembly.json`
- Create: `docs/n8n/README.md`

**Step 1: Criar `docs/n8n/README.md`**

```markdown
# n8n Flows — MOOV Chat

## Como importar

1. Acesse o n8n em http://localhost:5678
2. Menu → Workflows → Import from File
3. Selecione o arquivo JSON do flow desejado
4. Configure as credenciais (PostgreSQL, OpenAI, Evolution API)
5. Ative o workflow

## Credenciais necessárias

- **PostgreSQL:** host=localhost, port=5432, db=moovchat, user=moov, password=password
- **OpenAI:** API Key do .env
- **HTTP Request (Evolution API):** Header apikey = EVOLUTION_API_GLOBAL_TOKEN

## Ordem de importação

1. flow-07-prompt-assembly.json (sub-flow, sem trigger)
2. flow-06-intelligence.json    (sub-flow, sem trigger)
3. flow-02-handoff.json         (sub-flow, sem trigger)
4. flow-01-inbound.json         (webhook trigger)
5. flow-03-sla-alerts.json      (cron trigger)
6. flow-04-followup.json        (cron trigger)
7. flow-05-daily-report.json    (cron trigger)

## Variáveis de ambiente no n8n

Configure em Settings → Environment Variables:
- NEXTJS_URL = http://host.docker.internal:3000
- EVOLUTION_API_URL = http://evolution:8080
- EVOLUTION_TOKEN = seu-token-global-aqui
- LLM_MODEL_SDR = gpt-4o-mini
- LLM_MODEL_VENDEDOR = gpt-4o
```

**Step 2: Criar estrutura base dos flows**

Os flows n8n são documentados como pseudocódigo abaixo (a geração do JSON real é feita pelo n8n ao construir via UI ou pelo assistente de IA usando o pseudocódigo do PRD como referência).

Estrutura de cada flow JSON:

```json
{
  "name": "MOOV - Flow 1: Inbound",
  "nodes": [
    {
      "id": "webhook-trigger",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp-inbound",
        "httpMethod": "POST"
      }
    },
    {
      "id": "set-vars",
      "name": "Extract Variables",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            { "name": "phone",       "value": "={{ $json.data.key.remoteJid.split('@')[0] }}" },
            { "name": "text",        "value": "={{ $json.data.message.conversation }}" },
            { "name": "tenantSlug",  "value": "={{ $json.tenantSlug }}" },
            { "name": "msgId",       "value": "={{ $json.data.key.id }}" }
          ]
        }
      }
    }
  ],
  "connections": {}
}
```

> **Nota para implementação:** Os flows completos em JSON devem ser construídos no n8n UI seguindo as sequências descritas no PRD (Seção 14, Módulo 08). O arquivo JSON pode ser exportado do n8n após construção visual e commitado aqui.

**Step 3: Criar `docs/n8n/flow-01-inbound-pseudocode.md`**

```markdown
# Flow 1 — Inbound Message Processing

## Trigger
Webhook POST /webhook/whatsapp-inbound
Header: X-Tenant-Slug

## Nodes em sequência

1. **Webhook Trigger** — recebe payload da Evolution API (via Next.js)

2. **Set Variables**
   - phone = remoteJid sem '@s.whatsapp.net'
   - text = message.conversation
   - tenantSlug = header X-Tenant-Slug
   - pushName = data.pushName

3. **PostgreSQL: Get Tenant**
   SELECT id, slug, ia_max_consecutive_messages, evolution_instance_name,
          policy_pix_enabled, policy_reservation, tone_of_voice
   FROM tenants WHERE slug = '{{ tenantSlug }}'

4. **PostgreSQL: Upsert Lead**
   INSERT INTO leads (tenant_id, phone, name, origin)
   VALUES (tenantId, phone, pushName, 'WHATSAPP')
   ON CONFLICT (tenant_id, phone) DO UPDATE SET name = EXCLUDED.name
   RETURNING id, state, is_hot

5. **PostgreSQL: Get or Create Conversation**
   SELECT * FROM conversations
   WHERE lead_id = leadId AND state NOT IN ('FINALIZADA', 'PAUSADA')
   ORDER BY created_at DESC LIMIT 1
   — se não existe: INSERT conversations (tenant_id, lead_id, state='ATIVA_IA')

6. **PostgreSQL: Insert Message (INBOUND)**
   INSERT INTO messages (tenant_id, conversation_id, actor_type, direction,
                         content_type, content_text, whatsapp_msg_id)
   VALUES (tenantId, convId, 'SISTEMA', 'INBOUND', 'TEXT', text, msgId)

7. **IF: state == 'EM_ATENDIMENTO_HUMANO'** → STOP (IA silenciosa)

8. **IF: state == 'AGUARDANDO_VENDEDOR'** → STOP

9. **IF: consecutiveIaMessages >= iaMaxConsecutiveMessages**
   → UPDATE conversations SET state='PAUSADA' → STOP

10. **Execute Sub-flow: Flow 6 — Intelligence**
    Input: { messageText: text, leadId, tenantId }

11. **Execute Sub-flow: Flow 7 — Prompt Assembly**
    Input: { tenantId, agentType: 'SDR', conversationId: convId }

12. **HTTP Request: LLM API**
    POST https://api.openai.com/v1/chat/completions
    Body: { model, messages: [{ role:'system', content: systemPrompt }, { role:'user', content: text }] }

13. **Set: iaResponse = choices[0].message.content**

14. **IF: iaResponse contains handoff keywords**
    ["falar com vendedor","atendente humano","pessoa real","responsável"]
    → Execute Sub-flow: Flow 2 — Handoff

15. **PostgreSQL: Insert Message (OUTBOUND)**
    INSERT INTO messages (..., actor_type='SDR_IA', direction='OUTBOUND', content_text=iaResponse)

16. **HTTP Request: Evolution API — Send Message**
    POST /message/sendText/{{ evolutionInstanceName }}
    Body: { number: phone, textMessage: { text: iaResponse } }

17. **PostgreSQL: Update Conversation**
    UPDATE conversations SET
      consecutive_ia_messages = consecutive_ia_messages + 1,
      last_ia_message_at = NOW(),
      last_message_at = NOW()

18. **PostgreSQL: Insert EventLog**
    INSERT INTO event_logs (tenant_id, conversation_id, lead_id, event_type, actor_type, payload)
    VALUES (tenantId, convId, leadId, 'mensagem_enviada_ia', 'ia', { model, agentType })

19. **PostgreSQL: Cancel pending FOLLOWUP tasks**
    UPDATE scheduled_tasks SET status='CANCELLED'
    WHERE conversation_id = convId
      AND task_type LIKE 'FOLLOWUP_%'
      AND status = 'PENDING'

20. **PostgreSQL: Create FOLLOWUP_10MIN task**
    INSERT INTO scheduled_tasks (tenant_id, lead_id, conversation_id, task_type, execute_at, status)
    VALUES (tenantId, leadId, convId, 'FOLLOWUP_10MIN', NOW() + INTERVAL '10 minutes', 'PENDING')
```

**Step 4: Commit**

```bash
mkdir -p docs/n8n
git add docs/n8n/
git commit -m "docs: n8n flow pseudocode e README de importação"
```

---

## Task 14: Prompt Configuration (Admin UI)

**Files:**
- Create: `app/api/admin/prompts/route.ts`
- Create: `app/api/admin/prompts/[id]/route.ts`
- Create: `app/(admin)/prompts/page.tsx`

**Step 1: Criar `app/api/admin/prompts/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, forbidden } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'SUPER_ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const tenantId  = searchParams.get('tenantId')
  const agentType = searchParams.get('agentType') as any

  const prompts = await prisma.promptConfig.findMany({
    where: {
      ...(tenantId  ? { tenantId }  : {}),
      ...(agentType ? { agentType } : {}),
      isActive: true,
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

**Step 2: Commit**

```bash
git add app/api/admin/prompts/ app/\(admin\)/prompts/
git commit -m "feat: configuração de prompts com versionamento automático"
```

---

## Task 15: Testes E2E com Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/leads.spec.ts`

**Step 1: Configurar Playwright**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Step 2: Criar `tests/e2e/auth.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test('login como super admin redireciona para /admin/dashboard', async ({ page }) => {
  await page.goto('/auth/signin')
  await page.fill('input[name="email"]',    'admin@moovchat.com')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/admin/dashboard')
})

test('acesso direto a /admin sem login redireciona para signin', async ({ page }) => {
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL('/auth/signin')
})
```

**Step 3: Rodar testes**

```bash
npx playwright test tests/e2e/auth.spec.ts
```

Expected: 2 testes passando.

**Step 4: Commit**

```bash
git add playwright.config.ts tests/
git commit -m "test: testes e2e de autenticação com playwright"
```

---

## Task 16: Deploy em VPS

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docs/deploy.md`

**Step 1: Criar `Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

**Step 2: Adicionar ao `next.config.ts`**

```typescript
const nextConfig = {
  output: 'standalone',
}
export default nextConfig
```

**Step 3: Criar `docs/deploy.md` com checklist**

```markdown
# Checklist de Deploy — MOOV Chat

## Pré-requisitos no VPS
- [ ] Ubuntu 22.04 LTS
- [ ] Docker + Docker Compose instalados
- [ ] Domínio apontando para o IP do servidor
- [ ] Portas 80 e 443 abertas

## Deploy

1. Clonar repositório no servidor
2. Copiar .env.example → .env e preencher valores de produção
3. `docker-compose up -d` (inicia PostgreSQL, n8n, Evolution API)
4. `npx prisma migrate deploy` (rodar migrations)
5. `npx prisma db seed` (seed inicial)
6. Build e run da aplicação Next.js:
   `docker build -t moovchat . && docker run -p 3000:3000 --env-file .env moovchat`
7. Configurar Nginx como reverse proxy para porta 3000
8. Configurar SSL com Certbot

## Após deploy
- [ ] Testar login em /auth/signin
- [ ] Criar primeira loja no painel Admin
- [ ] Conectar WhatsApp via Evolution API
- [ ] Importar flows no n8n
- [ ] Testar fluxo completo com mensagem real
```

**Step 4: Commit final**

```bash
git add Dockerfile .dockerignore docs/deploy.md next.config.ts
git commit -m "chore: dockerfile + checklist de deploy"
```

---

## Critérios de Conclusão do MVP

Antes de considerar o MVP completo, verificar:

- [ ] `npm run build` sem erros
- [ ] `npx playwright test` — todos os testes passando
- [ ] Login funciona para super_admin, gerente e vendedor
- [ ] Loja criada com gerente inicial via Admin
- [ ] WhatsApp conectado via Evolution API
- [ ] Mensagem enviada ao WhatsApp → IA responde em < 60 segundos
- [ ] Handoff funciona: IA detecta gatilho → vendedor recebe notificação → painel mostra HandoffSummary
- [ ] Vendedor assume conversa no painel → responde → mensagem aparece no WhatsApp
- [ ] Vendedor devolve para IA → IA retoma atendimento
- [ ] Alertas SLA chegam via WhatsApp do vendedor após 10 minutos
- [ ] Relatório diário enviado às 8h para gerente
- [ ] Dashboard de métricas exibe dados do dia
- [ ] Deploy no VPS sem erros

---

*Plano gerado em: 2026-03-06*
*Baseado em: docs/plans/2026-03-06-moov-chat-prd.md*

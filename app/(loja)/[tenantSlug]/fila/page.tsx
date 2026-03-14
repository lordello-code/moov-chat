import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LeadCard } from '@/components/loja/fila/lead-card'

export default async function FilaPage({
  params,
  searchParams,
}: {
  params:       Promise<{ tenantSlug: string }>
  searchParams: Promise<{ cursor?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')
  const { tenantSlug } = await params
  const { cursor } = await searchParams
  const PAGE_SIZE = 30

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) redirect('/auth/signin')

  const where: Record<string, unknown> = {
    tenantId:      tenant.id,
    conversations: { some: { state: { not: 'FINALIZADA' } } },
  }
  if (session.user.role === 'VENDEDOR') {
    where.assignedVendedorId = session.user.id
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      conversations: {
        where:   { state: { not: 'FINALIZADA' } },
        orderBy: { createdAt: 'desc' },
        take:    1,
      },
    },
    orderBy: [
      { isHot: 'desc' },
      { hasUrgency: 'desc' },
      { leadScore: 'desc' },
      { updatedAt: 'desc' },
    ],
    take:   PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore    = leads.length > PAGE_SIZE
  const page       = hasMore ? leads.slice(0, PAGE_SIZE) : leads
  const nextCursor = hasMore ? page[page.length - 1].id : null

  const urgent = page.filter(
    l => l.conversations[0]?.state === 'AGUARDANDO_VENDEDOR' || l.isHot
  )
  const normal = page.filter(l => !urgent.includes(l))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fila de Leads</h1>

      {urgent.length > 0 && (
        <div className="space-y-2">
          <p className="text-red-400 text-sm font-medium uppercase tracking-wide">🔴 Urgente</p>
          {urgent.map(l => (
            <LeadCard
              key={l.id}
              lead={{
                ...l,
                conversations: l.conversations.map(c => ({
                  ...c,
                  humanSlaStartedAt: c.humanSlaStartedAt?.toISOString() ?? null,
                })),
              }}
              tenantSlug={tenantSlug}
            />
          ))}
        </div>
      )}

      {normal.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">⚡ Em atendimento IA</p>
          {normal.map(l => (
            <LeadCard
              key={l.id}
              lead={{
                ...l,
                conversations: l.conversations.map(c => ({
                  ...c,
                  humanSlaStartedAt: c.humanSlaStartedAt?.toISOString() ?? null,
                })),
              }}
              tenantSlug={tenantSlug}
            />
          ))}
        </div>
      )}

      {page.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          Nenhum lead ativo no momento. 🎉
        </p>
      )}

      {nextCursor && (
        <div className="pt-4 text-center">
          <a
            href={`/${tenantSlug}/fila?cursor=${nextCursor}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Carregar mais leads →
          </a>
        </div>
      )}
    </div>
  )
}

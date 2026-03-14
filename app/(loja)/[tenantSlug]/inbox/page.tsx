import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function InboxPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')
  const { tenantSlug } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) redirect('/auth/signin')

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: tenant.id },
    include: {
      lead: { select: { name: true, phone: true, primaryInterest: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  const STATE_LABELS: Record<string, string> = {
    ATIVA_IA:             '🤖 IA atendendo',
    AGUARDANDO_VENDEDOR:  '⏳ Aguardando vendedor',
    EM_ATENDIMENTO_HUMANO:'👤 Em atendimento',
    FINALIZADA:           '✅ Finalizada',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <a
          href={`/api/${tenantSlug}/leads/export`}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary/50 transition-colors"
        >
          ⬇ Exportar CSV
        </a>
      </div>

      {conversations.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          Nenhuma conversa ainda. As conversas aparecerão aqui quando chegarem mensagens pelo WhatsApp.
        </p>
      )}

      <div className="space-y-2">
        {conversations.map(conv => {
          const lastMsg = conv.messages[0]
          return (
            <Link
              key={conv.id}
              href={`/${tenantSlug}/inbox/${conv.id}`}
              className="flex items-center justify-between bg-card border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{conv.lead.name ?? conv.lead.phone}</p>
                <p className="text-muted-foreground text-sm truncate">
                  {lastMsg?.contentText ?? 'Sem mensagens'}
                </p>
              </div>
              <div className="ml-4 text-right shrink-0">
                <p className="text-xs text-muted-foreground">{STATE_LABELS[conv.state] ?? conv.state}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

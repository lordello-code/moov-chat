import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ConversationView } from '@/components/loja/inbox/conversation-view'

export default async function InboxPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; conversationId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')
  const { tenantSlug, conversationId } = await params

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenant: { slug: tenantSlug } },
    include: {
      lead: {
        include: { assignedVendedor: { select: { id: true, name: true } } },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take:    100,
      },
      handoffSummaries: { orderBy: { createdAt: 'desc' }, take: 1 },
      humanAttendant:   { select: { id: true, name: true } },
    },
  })

  if (!conversation) notFound()

  // Serializar datas para client component
  const serialized = {
    ...conversation,
    messages: conversation.messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  }

  return (
    <ConversationView
      conversation={serialized}
      tenantSlug={tenantSlug}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  )
}

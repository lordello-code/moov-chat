import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'

export default async function QaLogsPage() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/auth/signin')

  const alerts = await prisma.alert.findMany({
    where:   { type: 'ERRO_QA' },
    include: {
      tenant:       { select: { name: true, slug: true } },
      lead:         { select: { name: true, phone: true } },
      conversation: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take:    100,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">QA Logs</h1>
      <p className="text-muted-foreground text-sm">
        Respostas da IA reprovadas pelo monitoramento de qualidade.
      </p>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card">
            <tr className="text-muted-foreground">
              <th className="text-left p-4">Data</th>
              <th className="text-left p-4">Loja</th>
              <th className="text-left p-4">Lead</th>
              <th className="text-left p-4">Severidade</th>
              <th className="text-left p-4">Problema</th>
              <th className="text-left p-4">Conversa</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(a => (
              <tr key={a.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleString('pt-BR')}
                </td>
                <td className="p-4 font-medium">{a.tenant.name}</td>
                <td className="p-4 text-muted-foreground">
                  {a.lead?.name ?? a.lead?.phone ?? '—'}
                </td>
                <td className="p-4">
                  <Badge
                    variant="secondary"
                    className={
                      a.severity === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }
                  >
                    {a.severity}
                  </Badge>
                </td>
                <td className="p-4 text-xs text-muted-foreground max-w-xs truncate">
                  {a.message.replace('🔍 QA reprovado: ', '')}
                </td>
                <td className="p-4">
                  {a.conversation && a.lead && (
                    <a
                      href={`/${a.tenant.slug}/inbox/${a.conversation.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Ver conversa
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhum erro de QA registrado. ✅
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

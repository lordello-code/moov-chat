import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'

import Link from 'next/link'


export default async function LojasPage() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/auth/signin')

  const tenants = await prisma.tenant.findMany({
    include: {
      plan: true,
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lojas</h1>
        <Link
          href="/lojas/nova"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          + Nova Loja
        </Link>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card">
            <tr className="text-muted-foreground">
              <th className="text-left p-4">Loja</th>
              <th className="text-left p-4">Slug</th>
              <th className="text-left p-4">Plano</th>
              <th className="text-left p-4">Leads</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                <td className="p-4 font-medium">{t.name}</td>
                <td className="p-4 text-muted-foreground font-mono text-xs">{t.slug}</td>
                <td className="p-4 text-muted-foreground">{t.plan.name}</td>
                <td className="p-4 text-muted-foreground">{t._count.leads}</td>
                <td className="p-4">
                  <Badge
                    variant={t.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={t.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
                  >
                    {t.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/lojas/${t.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhuma loja cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

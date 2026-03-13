import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function LojaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/auth/signin')

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      plan: true,
      users: { orderBy: { createdAt: 'asc' } },
      briefing: true,
      _count: { select: { leads: true } },
    },
  })
  if (!tenant) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground text-sm font-mono">{tenant.slug}</p>
        </div>
        <div className="flex gap-3 items-center">
          <Badge
            variant={tenant.status === 'ACTIVE' ? 'default' : 'secondary'}
            className={tenant.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
          >
            {tenant.status}
          </Badge>
          <Link
            href="/lojas"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-border bg-background text-sm hover:bg-muted transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Plano</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-lg">{tenant.plan.name}</p>
            <p className="text-muted-foreground">R$ {tenant.plan.priceMonthly.toString()}/mês</p>
            <p className="text-muted-foreground">Limite: {tenant.plan.maxLeadsPerMonth} leads/mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Estatísticas</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Total de leads: <span className="text-foreground font-medium">{tenant._count.leads}</span>
            </p>
            <p className="text-muted-foreground">
              Usuários: <span className="text-foreground font-medium">{tenant.users.length}</span>
            </p>
            <p className="text-muted-foreground">
              Criada: <span className="text-foreground font-medium">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Usuários</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2">Nome</th>
                <th className="text-left pb-2">E-mail</th>
                <th className="text-left pb-2">Role</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map(u => (
                <tr key={u.id} className="border-b border-border/50 py-2">
                  <td className="py-2 font-medium">{u.name}</td>
                  <td className="py-2 text-muted-foreground">{u.email}</td>
                  <td className="py-2">
                    <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                  </td>
                  <td className="py-2">
                    <Badge
                      variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className={u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs' : 'text-xs'}
                    >
                      {u.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

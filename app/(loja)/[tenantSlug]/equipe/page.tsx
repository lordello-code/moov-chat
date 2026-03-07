import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function EquipePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')
  if (session.user.role === 'VENDEDOR') redirect(`/${(await params).tenantSlug}/fila`)

  const { tenantSlug } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      users: {
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        include: { _count: { select: { assignedLeads: true } } },
      },
    },
  })
  if (!tenant) redirect('/auth/signin')

  const ROLE_LABELS: Record<string, string> = {
    GERENTE: 'Gerente',
    VENDEDOR: 'Vendedor',
    SUPER_ADMIN: 'Super Admin',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipe</h1>
        <Link
          href={`/${tenantSlug}/equipe/novo`}
          className={cn(buttonVariants({ variant: 'default' }), 'bg-primary hover:bg-primary/90')}
        >
          + Novo Membro
        </Link>
      </div>

      <div className="grid gap-3">
        {tenant.users.map(u => (
          <Card key={u.id} className="border-border">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-muted-foreground text-sm">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">{u._count.assignedLeads} leads</p>
                  {u.whatsappNotif && (
                    <p className="text-muted-foreground text-xs">{u.whatsappNotif}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABELS[u.role] ?? u.role}
                </Badge>
                <Link
                  href={`/${tenantSlug}/equipe/${u.id}`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}
                >
                  Editar
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {tenant.users.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum membro na equipe ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

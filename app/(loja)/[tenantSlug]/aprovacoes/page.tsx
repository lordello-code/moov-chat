import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AprovacoesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')
  if (session.user.role === 'VENDEDOR') {
    const { tenantSlug } = await params
    redirect(`/${tenantSlug}/fila`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Aprovações</h1>
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          Nenhuma aprovação pendente no momento.
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Aprovações de propostas e descontos aparecerão aqui quando solicitadas pelos vendedores.
        </p>
      </div>
    </div>
  )
}

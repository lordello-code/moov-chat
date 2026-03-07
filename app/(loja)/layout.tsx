import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'
import { Home, List, MessageSquare, BarChart2, Bike, Users, Settings, CheckSquare } from 'lucide-react'

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  // Para SUPER_ADMIN sem tenant, usa string vazia (não acessa rotas de loja normalmente)
  const slug = session.user.tenantSlug ?? ''

  const lojaNavItems = [
    { label: 'Início',      href: `/${slug}/inicio`,     icon: Home },
    { label: 'Fila',        href: `/${slug}/fila`,        icon: List },
    { label: 'Inbox',       href: `/${slug}/inbox`,       icon: MessageSquare },
    { label: 'Métricas',    href: `/${slug}/metricas`,    icon: BarChart2,   gerenteOnly: true },
    { label: 'Catálogo',    href: `/${slug}/catalogo`,    icon: Bike },
    { label: 'Aprovações',  href: `/${slug}/aprovacoes`,  icon: CheckSquare, gerenteOnly: true },
    { label: 'Equipe',      href: `/${slug}/equipe`,      icon: Users,       gerenteOnly: true },
    { label: 'Config',      href: `/${slug}/config`,      icon: Settings,    gerenteOnly: true },
  ]

  return (
    <div className="flex min-h-screen bg-card">
      <Sidebar items={lojaNavItems} role={session.user.role} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

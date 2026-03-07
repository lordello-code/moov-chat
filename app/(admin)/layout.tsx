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
  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') redirect('/auth/signin')

  return (
    <div className="flex min-h-screen bg-card">
      <Sidebar items={adminNavItems} role="SUPER_ADMIN" />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const slug = session.user.tenantSlug ?? ''

  return (
    <div className="flex min-h-screen bg-card">
      <Sidebar variant="loja" role={session.user.role} tenantSlug={slug} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

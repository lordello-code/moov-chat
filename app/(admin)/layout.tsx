import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') redirect('/auth/signin')

  return (
    <div className="flex min-h-screen bg-card">
      <Sidebar variant="admin" role={session.user.role} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

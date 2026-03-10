import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  // Este layout está em app/(loja)/[tenantSlug]/layout.tsx
  // então params.tenantSlug é sempre o slug da URL — funciona para SUPER_ADMIN também
  const { tenantSlug } = await params

  return (
    <div className="flex min-h-screen bg-card">
      <Sidebar variant="loja" role={session.user.role} tenantSlug={tenantSlug} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

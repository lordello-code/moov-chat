import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  if (session.user.role === 'SUPER_ADMIN') redirect('/admin/dashboard')
  if (session.user.tenantSlug) redirect(`/${session.user.tenantSlug}/fila`)
  redirect('/auth/signin')
}

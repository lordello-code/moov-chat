import { auth } from '@/lib/auth'

export async function getSessionOrThrow() {
  const session = await auth()
  if (!session?.user) throw new Error('UNAUTHORIZED')
  return session
}

export async function assertRole(role: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(role)) throw new Error('FORBIDDEN')
}

export async function assertTenant(sessionSlug: string | null, paramSlug: string, role: string) {
  if (role === 'SUPER_ADMIN') return
  if (sessionSlug !== paramSlug) throw new Error('FORBIDDEN')
}

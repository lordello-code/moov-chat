import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/auth/signin', '/api/auth', '/api/webhooks']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // Rotas admin: apenas SUPER_ADMIN (route group (admin) → URLs sem prefixo /admin)
  const ADMIN_PATHS = ['/dashboard', '/lojas', '/prompts']
  if (ADMIN_PATHS.some(p => pathname.startsWith(p)) || pathname.startsWith('/api/admin')) {
    if (session.user.role !== 'SUPER_ADMIN') {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/auth/signin', req.url))
    }
  }

  // Rotas de tenant: valida pertencimento
  const tenantMatch = pathname.match(/^(?:\/api\/)?([a-z0-9-]+)\//)
  if (tenantMatch && !['admin', 'auth', 'api'].includes(tenantMatch[1])) {
    const slug = tenantMatch[1]
    if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantSlug !== slug) {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/auth/signin', req.url))
    }
  }

  // Rotas gerente only
  const GERENTE_ONLY = ['/metricas', '/equipe', '/aprovacoes', '/config']
  if (GERENTE_ONLY.some(p => pathname.includes(p)) && session.user.role === 'VENDEDOR') {
    return NextResponse.redirect(
      new URL(`/${session.user.tenantSlug}/fila`, req.url)
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

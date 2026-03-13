import type { NextAuthConfig } from 'next-auth'

// Edge-safe config — sem imports de Prisma ou bcrypt
// Usado pelo middleware (Edge Runtime)
export const authConfig = {
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' as const },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id         = user.id
        token.role       = user.role
        token.tenantId   = user.tenantId
        token.tenantSlug = user.tenantSlug
      }
      return token
    },
    session({ session, token }) {
      session.user.id         = token.id as string
      session.user.role       = token.role as string
      session.user.tenantId   = token.tenantId as string | null
      session.user.tenantSlug = token.tenantSlug as string | null
      return session
    },
    authorized({ auth }) {
      return !!auth?.user
    },
  },
  providers: [],
} satisfies NextAuthConfig

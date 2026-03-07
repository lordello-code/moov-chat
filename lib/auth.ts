import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Senha',    type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: { select: { slug: true } } },
        })

        if (!user || user.status === 'INACTIVE') return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        return {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          tenantId:    user.tenantId ?? null,
          tenantSlug:  user.tenant?.slug ?? null,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id         = user.id
        token.role       = (user as any).role
        token.tenantId   = (user as any).tenantId
        token.tenantSlug = (user as any).tenantSlug
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
  },
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
})

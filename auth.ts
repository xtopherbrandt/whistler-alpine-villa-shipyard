import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,
  session: {
    // Credentials provider requires JWT — database sessions are incompatible with Credentials
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await db.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash || !user.isActive) return null

        // 72-char max before bcrypt truncates
        if (password.length > 72) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isDirector: user.isDirector,
          isCaretaker: user.isCaretaker,
          isActive: user.isActive,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
        token.isAdmin = user.isAdmin
        token.isDirector = user.isDirector
        token.isCaretaker = user.isCaretaker
        token.isActive = user.isActive
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.isAdmin = token.isAdmin
      session.user.isDirector = token.isDirector
      session.user.isCaretaker = token.isCaretaker
      session.user.isActive = token.isActive
      return session
    },
  },
})

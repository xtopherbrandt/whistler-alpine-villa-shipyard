import type { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      isDirector: boolean
      isCaretaker: boolean
      isActive: boolean
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    isAdmin: boolean
    isDirector: boolean
    isCaretaker: boolean
    isActive: boolean
  }
}

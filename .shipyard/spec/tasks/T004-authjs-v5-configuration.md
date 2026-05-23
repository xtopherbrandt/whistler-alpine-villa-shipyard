---
id: T004
title: "Auth.js v5 Configuration"
feature: F001
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T002]
verify_command: null
---

# Auth.js v5 Configuration

## What
Wire Auth.js v5 with the credentials provider, Prisma adapter, and 30-day rolling sessions.

## Red Step
`auth()` called in a server component returns `null` even after seeded user credentials are supplied — credentials provider not configured.

## Steps
1. Create `auth.ts` at project root:
   ```typescript
   import NextAuth from 'next-auth'
   import Credentials from 'next-auth/providers/credentials'
   import { PrismaAdapter } from '@auth/prisma-adapter'
   import { db } from '@/lib/db'
   import bcrypt from 'bcryptjs'
   export const { handlers, auth, signIn, signOut } = NextAuth({ ... })
   ```
2. Configure credentials provider `authorize` callback — this is where the actual credential check lives:
   ```typescript
   authorize: async (credentials) => {
     const user = await db.user.findUnique({ where: { email: credentials.email } })
     if (!user || !user.passwordHash || !user.isActive) return null
     if (credentials.password.length > 72) return null
     const valid = await bcrypt.compare(credentials.password, user.passwordHash)
     return valid ? user : null
   }
   ```
3. Set session strategy: `session: { strategy: 'database', maxAge: 30 * 24 * 60 * 60 }`
4. Extend session callback to include role flags (see Technical Notes)
5. Create `app/api/auth/[...nextauth]/route.ts` that exports `handlers`
6. Add `AUTH_SECRET` to `.env.local`

## Acceptance Probe
`auth()` in a server component returns a session object with `user.id`, `user.isAdmin`, `user.isActive` after login with valid credentials.

## Technical Notes
The credentials provider callback should NOT perform rate limiting or bcrypt comparison — those live in the login Server Action (T005). The provider callback receives an already-validated signal from the action.

Session strategy: use `'database'` (not `'jwt'`). T015 deactivates users by deleting their Session rows — this only works with database sessions. With JWT sessions, the token lives in the cookie and deleting DB rows has no effect. Database sessions also mean role changes take effect immediately on the next page load (the user's data is re-read from DB on each request) without requiring re-login.

The app runs on Node.js runtime (not edge), so the DB call in middleware is acceptable for ~70 users.

Extend the session callback to include role flags from the User record:
```typescript
callbacks: {
  session({ session, user }) {
    session.user.id = user.id
    session.user.isAdmin = user.isAdmin
    session.user.isDirector = user.isDirector
    session.user.isCaretaker = user.isCaretaker
    session.user.isActive = user.isActive
    return session
  }
}
```

Add TypeScript module augmentation for the extended `Session` and `User` types (create `src/types/next-auth.d.ts`).

Note: with database strategy, the `jwt` callback is not used. Use the `session` callback with the `user` parameter instead.

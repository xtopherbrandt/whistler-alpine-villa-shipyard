---
id: T009
title: "Logout + Route Protection Middleware"
feature: F001
kind: feature
sprint: sprint-001
effort: S
status: approved
dependencies: [T006]
verify_command: null
---

# Logout + Route Protection Middleware

## What
`middleware.ts` that protects all authenticated routes, plus a sign-out action wired to a shared layout.

## Red Step
Integration test: unauthenticated GET to `/admin/users` returns 200 instead of a redirect to `/login`.

## Steps
1. Create `middleware.ts` at the project root:
   ```typescript
   import { auth } from './auth'
   export default auth((req) => {
     if (!req.auth) return Response.redirect(new URL('/login', req.url))
   })
   export const config = {
     matcher: ['/((?!api/auth|_next/static|_next/image|favicon|login|forgot-password|reset-password|invite).*)']
   }
   ```
2. Add sign-out form/button to a shared authenticated layout (e.g., `app/(app)/layout.tsx`)
3. Sign-out form calls `signOut()` server action with `redirectTo: '/login'`

## Acceptance Probe
Unauthenticated GET `/admin/*` → 307 redirect to `/login`. Authenticated GET `/admin/*` → 200. `POST /api/auth/signout` clears session. `/invite/[token]` accessible without auth.

## Technical Notes
The middleware matcher must exclude:
- `/api/auth/*` — Auth.js handler routes
- `/(auth)/*` — login, forgot-password, reset-password pages
- `/invite/*` — invite activation pages (new users arrive here without an account)
- Next.js internals (`_next/static`, `_next/image`, `favicon.ico`)

Use the regex negative-lookahead pattern in `matcher` — the string above is a starting point, adjust to match the actual route group structure.

Inactive users (`isActive: false`) with a session token: middleware passes them through (they have a valid session cookie). Individual admin pages should check `session.user.isActive` and redirect if needed, or deactivation can rely on session row deletion (T015) which makes the next request fail the `auth()` check.

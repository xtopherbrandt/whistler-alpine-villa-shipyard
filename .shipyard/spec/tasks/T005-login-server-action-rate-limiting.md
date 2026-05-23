---
id: T005
title: "Login Server Action + Rate Limiting"
feature: F001
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T004]
verify_command: null
---

# Login Server Action + Rate Limiting

## What
`loginAction()` Server Action with DB-backed rate limiting: 5 failed attempts per 10-minute window triggers a 15-minute lockout.

## Red Step
Unit test: 5 prior failed `LoginAttempt` rows for an email within 10 minutes → `loginAction` still returns wrong-password error instead of lockout message.

## Steps
1. Create `src/lib/actions/auth.ts` with `loginAction(formData: FormData): Promise<ActionResult<void>>`
2. Extract email + password from formData
3. Query `LoginAttempt` for this email in the last 10 minutes; count `success: false` rows
4. If count >= 5: return `{ data: null, error: "Too many failed attempts. Try again in 15 minutes." }`
5. Determine role-based redirect: look up user by email to get `isAdmin` flag
6. Call `signIn` inside a try/catch:
   ```typescript
   try {
     await signIn('credentials', { email, password, redirectTo: isAdmin ? '/admin/users' : '/' })
   } catch (e) {
     if (e instanceof AuthError) {
       await db.loginAttempt.create({ data: { email, success: false } })
       return { data: null, error: 'Invalid email or password.' }
     }
     throw e  // re-throw NEXT_REDIRECT — do NOT swallow it
   }
   ```
7. Success path: `signIn` throws `NEXT_REDIRECT` which propagates through — redirect happens

## Acceptance Probe
Unit tests: lockout after 5 failures returns lockout message. Wrong password records failed attempt and returns generic error. Successful login calls signIn and propagates the redirect.

## Technical Notes
Auth.js v5 credentials: the `authorize` callback in `auth.ts` (T004) does the actual bcrypt check. This action is responsible for rate limiting and recording failed attempts only.

The `signIn` call always invokes `authorize`. If `authorize` returns null (wrong password, user not found, inactive), `signIn` throws `AuthError`. Catch it, record the attempt, return the generic error.

`redirect()` / `NEXT_REDIRECT` in Next.js App Router throws internally. Re-throw anything that is NOT `AuthError` — swallowing the redirect breaks the success flow.

Rate limiting checks by **email** (not IP). Lockout window: `success: false` AND `attemptedAt > now() - 10 minutes`. Threshold: 5.

For the role-based redirect: the DB lookup to get `isAdmin` before `signIn` is acceptable. If the user doesn't exist, `authorize` returns null anyway — still passes through the catch block correctly.

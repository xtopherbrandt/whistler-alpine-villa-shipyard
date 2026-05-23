---
id: T008
title: "Password Reset Server Action + Page"
feature: F001
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T007]
verify_command: null
---

# Password Reset Server Action + Page

## What
`resetPasswordAction()` Server Action and `/reset-password` page that validates the token and allows the user to set a new password.

## Red Step
Unit test: `resetPasswordAction` with an expired token (expiresAt 2 hours ago) accepts the password change — it must not.

## Steps
1. Add `resetPasswordAction(token: string, formData: FormData): Promise<ActionResult<void>>` to `src/lib/actions/reset.ts`
2. Token validation: look up by token string; reject if not found, `usedAt` is set, or `expiresAt < now()`
3. Validate password: 8–72 chars (return error if outside range)
4. Hash with `bcryptjs.hash(password, 12)`
5. Update `User.passwordHash`, set `PasswordResetToken.usedAt = now()`
6. Redirect to `/login` with message "Password updated. Please log in."
7. Create `app/(auth)/reset-password/page.tsx` — reads `token` from query param, shows error page or password form

## Acceptance Probe
Expired token → spec-exact error. Valid token + valid password → user.passwordHash updated, token.usedAt set, redirect to login. Used token → same error as expired.

## Technical Notes
Return the same error for expired and used tokens: "This link has expired or has already been used." Do not distinguish between them — prevents token probing.

Enforce max 72-char limit before bcrypt hash: `if (password.length > 72) return { data: null, error: "Password must be 72 characters or fewer." }`. bcrypt silently truncates inputs at 72 bytes.

The `/reset-password` page reads `token` from `searchParams` — in Next.js 15 App Router: `const { token } = await searchParams` (searchParams is async in server components).

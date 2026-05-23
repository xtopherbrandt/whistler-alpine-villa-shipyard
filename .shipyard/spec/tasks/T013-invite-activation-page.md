---
id: T013
title: "Invite Activation Page + activateAccount()"
feature: F002
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T010]
verify_command: null
---

# Invite Activation Page + activateAccount()

## What
`/invite/[token]` page that validates the token and renders either an error page or a password-set form, plus the `activateAccount()` Server Action.

## Red Step
GET `/invite/<expired-token>` renders the password form instead of the spec-exact error message.

## Steps
1. Create `app/invite/[token]/page.tsx` — Server Component
2. In the page: look up token (`await params` — Next.js 15 async params), validate (exists + `usedAt: null` + `expiresAt > now()`)
3. If invalid/expired: render static error page with exact message: "This invitation has expired. Please ask your administrator to resend the invite."
4. If valid: render password-set form (Client Component)
5. Create `activateAccount(token: string, formData: FormData): Promise<ActionResult<void>>` in `src/lib/actions/users.ts`
6. Validate password 8–72 chars, bcrypt hash, update User (`passwordHash`, `isActive: true`), set `InvitationToken.usedAt = now()`
7. Redirect to `/login` with message "Account activated. Please log in."

## Acceptance Probe
Expired token shows spec-exact error message. Valid token renders password form. Password < 8 chars returns validation error. Valid password → user.isActive = true, token.usedAt set, redirect to `/login`.

## Technical Notes
Token validation must be re-run inside `activateAccount()` (not just in the page) — the form could be submitted with an expired token if the page was opened before expiry.

Used and expired tokens must show the same error message (indistinguishable to user) — prevents token probing.

`await params` required in Next.js 15: `const { token } = await params` — `params` is a Promise in App Router.

The `/invite/*` route must NOT be protected by middleware (T009). A new user arrives here before they have an account.

Max 72-char password check: enforce before bcrypt hash to prevent silent truncation.

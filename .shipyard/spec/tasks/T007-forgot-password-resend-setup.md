---
id: T007
title: "Forgot Password Flow + Resend Setup"
feature: F001
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T004]
verify_command: null
---

# Forgot Password Flow + Resend Setup

## What
`forgotPasswordAction()` Server Action with email-blind response, `PasswordResetToken` creation, and Resend integration. Establishes the shared email-sending utility used by F002 (T011).

## Red Step
Unit test: `forgotPasswordAction` called with an unregistered email calls Resend — it must not.

## Steps
1. Create `src/lib/email/send.ts` — wrapper around Resend client:
   ```typescript
   import { Resend } from 'resend'
   const resend = new Resend(process.env.RESEND_API_KEY)
   export async function sendEmail({ to, subject, react }: EmailPayload) { ... }
   ```
2. Create `src/lib/actions/reset.ts` with `forgotPasswordAction(formData: FormData): Promise<ActionResult<void>>`
3. Look up user by email; if not found, return the same success message as if found (no email enumeration)
4. If user found: generate `crypto.randomBytes(32).toString('hex')`, create `PasswordResetToken { expiresAt: now + 1hr }`, send reset email via `sendEmail`
5. Return `{ data: null, error: null }` (success) with message "If that email is registered, a reset link has been sent."
6. Create `app/(auth)/forgot-password/page.tsx` with form + success state

## Acceptance Probe
`forgotPasswordAction` with unregistered email: Resend not called, returns success. With registered email: token created in DB, Resend called once.

## Technical Notes
Password reset token expiry: **1 hour** (shorter than invite token's 72h — higher security, user is actively trying to reset).

`sendEmail` must be mockable in tests — export the Resend instance or accept it as a dependency so tests can substitute a mock.

`RESEND_FROM_ADDRESS` env var is required at runtime. In development without a verified domain, Resend only sends to the account owner's address — use a test email address. Document this limitation in `.env.local.example`.

This task establishes the `sendEmail` utility that T011 (InviteEmail) will also use — keep it generic.

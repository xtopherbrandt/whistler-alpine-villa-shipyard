---
id: T017
title: "Resend Invite Server Action"
feature: F003
kind: feature
sprint: sprint-001
effort: S
status: approved
dependencies: [T011, T014]
verify_command: null
---

# Resend Invite Server Action

## What
`resendInvite()` Server Action that invalidates the existing invitation token and sends a fresh invite email.

## Red Step
Unit test: `resendInvite` creates a new token without marking the old one as used — old token still valid.

## Steps
1. Add `resendInvite(userId: string): Promise<ActionResult<void>>` to `src/lib/actions/users.ts`
2. Mark all existing unused `InvitationToken` rows for this user as `usedAt = now()`
3. Generate new token via `createInviteToken(userId)` (exported from T010)
4. Send invite email via `sendEmail` with `InviteEmail` template
5. On email failure: log server-side, return warning without rolling back new token

## Acceptance Probe
After `resendInvite`: old token has `usedAt` set, new token created with fresh 72h expiry, invite email sent. Old token link shows "expired" error. New token link shows activation form.

## Technical Notes
`resendInvite` should only be callable for users with `isActive: false` — check this server-side and return an error if called on an active user.

Reuses `createInviteToken(userId)` exported from T010 and the `InviteEmail` template from T011.

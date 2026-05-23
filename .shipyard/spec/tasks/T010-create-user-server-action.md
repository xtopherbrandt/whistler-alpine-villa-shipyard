---
id: T010
title: "createUser() Server Action"
feature: F002
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T003, T007]
verify_command: null
---

# createUser() Server Action

## What
`createUser()` Server Action that validates uniqueness, creates the User + UserUnit records, generates an InvitationToken, and sends the invite email.

## Red Step
Unit test: `createUser` called with a duplicate email creates a second User row — it must return an error.

## Steps
1. Add `createUser(data: CreateUserInput): Promise<ActionResult<User>>` to `src/lib/actions/users.ts`
2. Validate email uniqueness: if exists, return `{ data: null, error: "An account with this email already exists." }`
3. Create `User { name, email, isAdmin, isDirector, isCaretaker, isActive: false, passwordHash: null }`
4. Create `UserUnit` records for each unit in `data.unitIds` (may be empty array for Caretaker/Admin/Director)
5. Generate token: `crypto.randomBytes(32).toString('hex')`
6. Create `InvitationToken { userId, token, expiresAt: addHours(now, 72) }`
7. Send invite email via `sendEmail` with `InviteEmail` template (T011)
8. On email failure: log server-side, return `{ data: user, error: "Account created but invite email failed to send. Use resend invite from the user list." }`
9. On success: return `{ data: user, error: null }`

## Acceptance Probe
Duplicate email returns error, no rows created. New user creates User + UserUnit + InvitationToken rows. Resend failure creates user+token but returns warning message.

## Technical Notes
"Shareholder" in the UI is not a data flag — it is implied by having unit assignments. A user with `unitIds.length > 0` is a shareholder; no `isShareholder` boolean exists on `User`.

Export `createInviteToken(userId: string): Promise<InvitationToken>` as a separate named export — T017 (resend invite) reuses it.

Caretaker path: `unitIds` may be empty — `createUser()` must handle this branch without error (do not require units).

Use a DB transaction for User + UserUnit + InvitationToken creation so a failure in any step rolls back completely.

`T007` dependency: relies on the `sendEmail` utility established there.
`T003` dependency: relies on `Unit` rows existing so `unitIds` can be validated against the Unit table.

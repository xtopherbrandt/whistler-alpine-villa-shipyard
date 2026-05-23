---
id: T014
title: "User CRUD + Role Server Actions"
feature: F003
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T010]
verify_command: null
---

# User CRUD + Role Server Actions

## What
`updateUser()` Server Action for editing name, email, and role flags on existing user accounts.

## Red Step
Unit test: `updateUser` called with an email already used by another user returns success — it must return an error.

## Steps
1. Add `updateUser(id: string, data: UpdateUserInput): Promise<ActionResult<User>>` to `src/lib/actions/users.ts`
2. Email uniqueness check: if new email exists on a DIFFERENT user, return `{ data: null, error: "That email address is already in use." }`
3. Update `name`, `email`, `isAdmin`, `isDirector`, `isCaretaker` fields
4. Return `{ data: updatedUser, error: null }`

## Acceptance Probe
Duplicate email on different user returns named error. Same email (no change) succeeds. Role flag changes persist. `updatedAt` timestamp updates.

## Technical Notes
Email uniqueness: `WHERE email = ? AND id != ?` — exclude the current user from the uniqueness check.

Role changes (isAdmin, isDirector, isCaretaker) take effect on the user's **next page load**, not immediately. Auth.js JWT caches these values at sign-in time. This is acceptable per spec decision log — role changes are rare, admin-managed operations.

`isActive` is NOT updated by this action — deactivate/reactivate is a separate concern (T015) with different semantics (session invalidation).

`passwordHash` is NOT touched by this action — password changes go through the reset flow.

No `isShareholder` flag — unit assignments are managed by T016 (`assignUnit`/`removeUnit`).

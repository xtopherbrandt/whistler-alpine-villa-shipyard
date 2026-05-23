---
id: T015
title: "Deactivate/Reactivate + Session Invalidation"
feature: F003
kind: feature
sprint: sprint-001
effort: S
status: approved
dependencies: [T014]
verify_command: null
---

# Deactivate/Reactivate + Session Invalidation

## What
`deactivateUser()` and `reactivateUser()` Server Actions. Deactivation immediately deletes all DB sessions so the user loses access on their next request.

## Red Step
Unit test: calling `deactivateUser(userId)` does not delete the user's Session rows — the user's next authenticated request still passes.

## Steps
1. Add to `src/lib/actions/users.ts`:
   ```typescript
   async function deactivateUser(id: string): Promise<ActionResult<void>>
   async function reactivateUser(id: string): Promise<ActionResult<void>>
   ```
2. `deactivateUser`:
   - Self-deactivation guard: compare `id` with `session.user.id` from `auth()`; if match, return `{ data: null, error: "You cannot deactivate your own account." }`
   - Set `User.isActive = false`
   - Delete all `Session` rows WHERE `userId = id` (immediate invalidation)
3. `reactivateUser`: set `User.isActive = true` only

## Acceptance Probe
`deactivateUser` on own account returns named error. `deactivateUser` on another user: `isActive = false` + Session rows deleted. Deactivated user's next request → auth middleware redirects to `/login`. `reactivateUser` sets `isActive = true`; user can log in again.

## Technical Notes
Session invalidation works because Auth.js validates session tokens against the `Session` table on each request. Deleting the rows means the user's existing cookie no longer matches any DB record — they get redirected to `/login`.

The self-deactivation guard runs server-side, not just client-side. The admin UI should also disable the button for the current user (T019), but the server action is the authoritative check.

`reactivateUser` does not need to create new sessions — the user logs in fresh after reactivation.

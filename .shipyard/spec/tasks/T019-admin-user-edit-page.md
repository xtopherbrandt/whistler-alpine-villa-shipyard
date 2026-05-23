---
id: T019
title: "Admin User Edit Page /admin/users/[id]/edit"
feature: F003
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T015, T016, T017, T018]
verify_command: null
---

# Admin User Edit Page /admin/users/[id]/edit

## What
Full edit page for a user account — name/email edit, role toggles, unit assignment, deactivate/reactivate, and resend invite — all wired to their Server Actions.

## Red Step
Submit edit form with duplicate email — unhandled server error instead of inline "That email address is already in use."

## Steps
1. Create `app/admin/users/[id]/edit/page.tsx` — Server Component
2. `const { id } = await params` (Next.js 15 async params)
3. Load user with units and latest InvitationToken
4. Admin guard (redirect if not admin)
5. Render edit form (Client Component for interactivity):
   - Name field, Email field
   - Role checkboxes: Admin, Director, Caretaker
   - "Shareholder" checkbox + unit multi-select (pre-populated with current assignments)
   - Save button → `updateUser()`
   - Deactivate/Reactivate button → `deactivateUser()` / `reactivateUser()` (deactivate disabled if editing own account)
   - "Resend invite" button (only shown when status = Invited) → `resendInvite()`
6. Display all errors inline

## Acceptance Probe
Duplicate email → inline error. Role change persists. Unit assignment add/remove updates UserUnit table. Deactivate invalidates sessions. Self-deactivate button is disabled. Resend invite only visible for Invited users.

## Technical Notes
`await params` required — params is a Promise in Next.js 15 App Router dynamic routes.

Self-deactivation: compare `user.id === session.user.id`. Disable the deactivate button in the UI AND enforce server-side in `deactivateUser()`.

Role-change UI note: add a small note near the role checkboxes: "Role changes take effect on the user's next page load."

Unit assignment: show all 52 units as a checkbox list or multi-select. Pre-check currently assigned units. On save, diff the current vs new assignments and call `assignUnit`/`removeUnit` for the delta. If `removeUnit` returns `{ hasActiveOccupancy: true }`, show a confirmation modal: "Unit N has an active occupancy record. Remove assignment anyway? The occupancy record will not be affected."

Back link → `/admin/users`.

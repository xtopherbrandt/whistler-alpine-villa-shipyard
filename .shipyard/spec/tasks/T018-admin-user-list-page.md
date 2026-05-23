---
id: T018
title: "Admin User List Page /admin/users"
feature: F003
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T014]
verify_command: null
---

# Admin User List Page /admin/users

## What
`/admin/users` Server Component that lists all user accounts with name, email, roles, unit assignments, and status badge.

## Red Step
GET `/admin/users` with a non-admin session returns 200 — should redirect to `/`.

## Steps
1. Create `app/admin/users/page.tsx` — Server Component
2. Admin guard: check `session.user.isAdmin`; redirect to `/` if not admin
3. Fetch all users with: latest InvitationToken, UserUnit → Unit, Session count
4. Derive status per user:
   - `isActive: true` → "Active"
   - `isActive: false` AND unused non-expired token exists → "Invited"
   - `isActive: false` AND no valid token → "Deactivated"
5. Render table: name | email | roles | units | status badge | Edit link
6. "New User" button → `/admin/users/new`

## Acceptance Probe
Admin session → 200, all users listed with correct statuses. Non-admin session → redirect to `/`. Seeded admin shows "Active". Newly invited user shows "Invited".

## Technical Notes
Status derivation for "Invited": `InvitationToken.usedAt === null && InvitationToken.expiresAt > now()`. A user with an expired unused token shows "Deactivated" (or "Invited — expired" — choose one consistent label).

Roles display: show a compact tag list (Admin, Director, Caretaker tags). Units: comma-separated unit numbers.

No client-side state — this is a pure Server Component that re-fetches on navigation. Mutations (deactivate, role change) happen on the edit page.

---
id: T012
title: "Admin New User Form /admin/users/new"
feature: F002
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T009, T010, T011]
verify_command: null
---

# Admin New User Form /admin/users/new

## What
`/admin/users/new` page with form to create a new user account and send the invite email.

## Red Step
Submit form with duplicate email — shows generic error instead of "An account with this email already exists."

## Steps
1. Create `app/admin/users/new/page.tsx` — Server Component loading Unit list for the unit multi-select
2. Create client form component `src/components/admin/NewUserForm.tsx` (needs `'use client'` for controlled checkboxes and useActionState)
3. Fields:
   - Name (text)
   - Email (email)
   - Role checkboxes: Admin, Director, Caretaker
   - "Shareholder" checkbox — when checked, reveals unit multi-select
   - Unit multi-select (populated from all 52 Unit rows, visible only when Shareholder is checked)
4. On submit: call `createUser()` action
5. On success: redirect to `/admin/users` with success notification
6. On error: display `ActionResult.error` inline

## Acceptance Probe
Submit with valid data creates user and redirects to list. Duplicate email shows inline error. Caretaker with no units submits successfully. Multi-role combination (Admin + Director + Caretaker + units) creates user with all flags set.

## Technical Notes
The "Shareholder" checkbox is a UI affordance only — it has no corresponding data field. When checked, it enables the unit multi-select. The backend determines "shareholder" by presence of UserUnit records.

Admin guard: check `session.user.isAdmin` in the Server Component; redirect to `/` if not admin.

Use `useActionState` (React 19) or `useFormState` (React 18 compat) to surface `ActionResult.error` inline without a full page reload.

Unit multi-select: pass all 52 unit IDs as hidden form values when selected. Server action receives `unitIds` as `string[]`.

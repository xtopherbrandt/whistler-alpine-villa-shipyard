---
id: T022
title: "E2E Tests: F003 Admin User Management"
feature: F003
kind: operational
sprint: sprint-001
effort: S
status: approved
dependencies: [T019]
verify_command: "npx playwright test e2e/admin-users.spec.ts"
verify_max_iterations: 3
---

# E2E Tests: F003 Admin User Management

## What
Playwright E2E tests covering all admin user management operations.

## Red Step
Test file does not exist.

## Steps
Create `e2e/admin-users.spec.ts` with tests:
1. Admin user list shows all users with correct statuses
2. Non-admin cannot access `/admin/users` (redirect to `/`)
3. Admin edits user name — change persists in list
4. Admin edits user email to duplicate — inline error
5. Admin assigns unit to shareholder — unit appears in user's list
6. Admin removes unit — UserUnit row deleted
7. Admin deactivates user — user's sessions deleted, user redirected to `/login` on next request
8. Admin cannot deactivate own account — button disabled and server returns error
9. Admin reactivates user — user can log in again
10. Admin resends invite — old token invalid, new invite email sent

## Acceptance Probe
`npx playwright test e2e/admin-users.spec.ts` exits 0 with all tests passing.

## Technical Notes
Session invalidation test (test 7): after deactivating, use Playwright's `page.request` to make an authenticated request with the deactivated user's session cookie and assert redirect.

For test 9 (reactivate + login): actually drive through the login flow after reactivation to confirm access is restored.

For test 10 (resend invite): verify old token `usedAt` is set by checking DB state in test teardown.

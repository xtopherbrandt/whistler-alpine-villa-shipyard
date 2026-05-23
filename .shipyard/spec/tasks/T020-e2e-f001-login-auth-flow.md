---
id: T020
title: "E2E Tests: F001 Login + Auth Flow"
feature: F001
kind: operational
sprint: sprint-001
effort: S
status: approved
dependencies: [T008, T009]
verify_command: "npx playwright test e2e/auth.spec.ts"
verify_max_iterations: 3
---

# E2E Tests: F001 Login + Auth Flow

## What
Playwright E2E tests covering the complete F001 authentication flows.

## Red Step
Test file does not exist.

## Steps
Create `e2e/auth.spec.ts` with tests:
1. Valid admin login redirects to `/admin/users`
2. Valid non-admin login redirects to `/`
3. Wrong password shows "Invalid email or password." inline
4. 5 consecutive failed logins show lockout message
5. Unauthenticated GET `/admin/users` → redirect to `/login`
6. Forgot password with unregistered email shows success message (no indication of non-existence)
7. Forgot password with registered email: (mock email or check DB) token created
8. Valid reset token → set password → redirect to `/login`
9. Expired reset token → error message
10. Sign out clears session; subsequent request redirects to `/login`

## Acceptance Probe
`npx playwright test e2e/auth.spec.ts` exits 0 with all tests passing.

## Technical Notes
Use Playwright's `request` fixture for API-level setup (seed test users, generate tokens) rather than driving the UI for test data setup.

For the rate-limiting test: insert 5 `LoginAttempt` rows directly via the test setup (API route or Prisma in a test helper) rather than clicking through 5 failed logins.

For forgot-password tests: verify token creation by querying the DB in the test rather than waiting for email delivery (Resend not called in test environment).

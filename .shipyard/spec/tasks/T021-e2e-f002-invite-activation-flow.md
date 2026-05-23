---
id: T021
title: "E2E Tests: F002 Invite + Activation Flow"
feature: F002
kind: operational
sprint: sprint-001
effort: S
status: approved
dependencies: [T012, T013]
verify_command: "npx playwright test e2e/invite.spec.ts"
verify_max_iterations: 3
---

# E2E Tests: F002 Invite + Activation Flow

## What
Playwright E2E tests covering the invitation creation and account activation flows.

## Red Step
Test file does not exist.

## Steps
Create `e2e/invite.spec.ts` with tests:
1. Admin creates new shareholder: user appears in list with "Invited" status
2. Admin creates duplicate email: inline error "An account with this email already exists."
3. Admin creates Caretaker with no units: succeeds
4. Admin creates multi-role user (Admin + Director + Caretaker + units): all flags set in DB
5. Valid invite link → set valid password → redirect to `/login` with success message
6. Valid invite link → set 7-char password → validation error shown
7. Expired invite token → spec-exact error message
8. Used invite token → same error as expired

## Acceptance Probe
`npx playwright test e2e/invite.spec.ts` exits 0 with all tests passing.

## Technical Notes
For expired/used token tests: insert tokens with past `expiresAt` or set `usedAt` directly via test setup helper rather than waiting real time.

Verify spec-exact error messages: "This invitation has expired. Please ask your administrator to resend the invite."

Test email sending with a mock — do not require actual Resend delivery for E2E tests.

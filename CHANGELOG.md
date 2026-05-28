# Changelog

## [Sprint 003] — 2026-05-27

### Changed

#### F004 — Trunk-Based Branching Workflow

- Sprint work now lives on short-lived `sprint/NNN` branches, squash-merged to `master` at approval
- Migrated `feat/e005-auth-and-user-management` to master via squash commit (`feat(e005): auth and user management stack (sprint-001 + sprint-002)`)
- Removed 5 stale sprint-002 shipyard worktrees and their local branches
- Pruned stale `feat/e005` remote-tracking ref (branch was already deleted on merge)
- Verified master is releasable: `npm run build` clean, 45 unit tests passing
- Added `.gitignore` entries for `test-results/` and `.claude/settings.json` (machine-local files)
- Shipyard config updated: `main_branch: master`, `branching_strategy: trunk-based`, `merge_style: squash`

## [Sprint 002] — 2026-05-26

### Added

**F003 — Shareholder Role (extends User & Unit Administration)**
- `isShareholder` boolean field in Prisma schema + migration
- Validation rules: Shareholder requires ≥1 unit assignment; Director requires Shareholder; cannot remove Shareholder from a Director
- Removing a Shareholder's last unit auto-removes the Shareholder role
- Shareholder checkbox in admin edit-user form
- Shareholder displayed in user list roles column
- `isShareholder` in Auth.js JWT and session pipeline

### Fixed

- **B001/B002**: Shareholder role was missing from edit form and user list (now surfaced)
- **B003**: Account Actions section only showed Deactivate for Invited users; now shows correct action (Deactivate / Cancel invite / Reactivate) based on account state
- **B004**: Unit assignment checkboxes reverted to stale state after save (added `router.refresh()` on successful units action)

### Security

- Added `requireAdmin()` guard to all 6 admin server actions (was missing on 5 of 6)
- `cancelInvite` now invalidates pending invitation tokens (was inadvertently calling `deactivateUser`)
- `resendInvite` now enforces admin session (was unauthenticated)

## [Sprint 001] — 2026-05-23

### Added

**F001 — Authentication & Password Reset**
- Email + password login with Auth.js v5 Credentials provider and database sessions
- Rate limiting: 5 attempts per email per 15-minute window (`LoginAttempt` table)
- Forgot password flow: token-based reset email via Resend, 1-hour expiry, single-use
- Reset password page with link back to /forgot-password on expired/used token
- Password validation: 8–72 characters (bcryptjs 72-char limit enforced)
- E2E test suite: `e2e/auth.spec.ts`

**F002 — User Invitation & Account Setup**
- Admin creates users; invite email sent automatically on creation
- Invitation tokens: 72-hour expiry, single-use
- Account activation page (`/invite/[token]`): set name + password
- Email failure surfaces as ActionResult error to Admin ("Account created but invite email failed to send. Use Resend invite.")
- E2E test suite: `e2e/invite.spec.ts`

**F003 — Admin User & Unit Management**
- Admin user list with all four roles: Admin, Shareholder, Caretaker, Director
- Edit user profile (name, email, roles) with duplicate-email guard
- Assign/remove unit associations
- Deactivate user (sessions cleared, login blocked); self-deactivate disabled
- Reactivate user
- Resend invite (invalidates old token, issues new one)
- E2E test suite: `e2e/admin-users.spec.ts`

### Infrastructure
- Next.js 15 App Router + TypeScript project scaffold
- Prisma 6 + PostgreSQL schema (52 units, 4-role user model, auth.js adapter tables)
- Vitest 3 unit test suite (27 tests)
- Playwright E2E scaffolding (requires Docker for live runs)
- GitHub Actions CI workflow

### Fixed
- Rate-limit window corrected to match the 15-minute error message
- `forgotPasswordAction` now returns a graceful error if SMTP fails (was unhandled)

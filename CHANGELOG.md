# Changelog

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

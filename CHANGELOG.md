# Changelog

## [Sprint 007] — 2026-06-22

### Fixed

- **B005** `runtime: 'nodejs'` moved from inside `export const config {}` to a top-level `export const runtime` — middleware now reliably runs on Node.js (not Edge) so Prisma role checks work
- **B006** Integration test `afterEach` blocks now delete seeded `Unit` records (9801–9806) in FK order — no more orphaned unit fixtures in the dev database after test runs
- **B007** Middleware redirect to `/login` now appends `?callbackUrl=<encoded-path>`; `loginAction` reads and validates the callback, redirecting the user to their intended destination after login (with `isSafeRelative` guard against open-redirect attacks)
- **B008** `/stays` returning 307 resolved as a side-effect of B005 fix — unauthenticated redirects now correctly reach the Edge-safe middleware

### Added

- **F010 Shareholder & Admin Home** (`src/app/(app)/page.tsx`): role-aware landing page replacing the Next.js boilerplate
  - Shareholders see their upcoming CONFIRMED stays (sorted by check-in, Pacific time), plus "Register a stay" CTA
  - Directors (non-shareholders) see admin navigation with "Manage Users" link
  - Caretaker-only users see "Occupancy schedule coming soon" placeholder until F011
  - Director+shareholder dual-role → shareholder view wins per product spec

### Tests

- 3 new unit tests for `loginAction` callbackUrl handling (safe relative, absolute URL rejected, protocol-relative rejected)
- 4 new E2E tests in `e2e/home.spec.ts` covering all role scenarios
- Middleware test assertion updated to expect `?callbackUrl=` in redirect URL

### Accessibility

- `StayRow` date range separator uses `aria-hidden` + `sr-only "to"` text for screen readers
- `DirectorHome` nav landmark has `aria-label="Administration"`

## [Sprint 006] — 2026-06-20

### Security

- JWT role staleness fix: `refreshStaleToken` in `src/lib/auth/token-refresh.ts` revalidates roles from the database on each JWT callback, with 5-minute throttle to limit DB load — closes the sprint-005 review gap where revoked roles remained active until token expiry
- Middleware role enforcement: `middleware.ts` now checks `req.auth.user.isShareholder` for `/stays/**` routes, blocking authenticated non-shareholders at the edge layer (defense-in-depth on top of page-level guards)
- Admin and reset-password page guards now correctly distinguish unauthenticated users (→ `/login`) from authenticated non-admins (→ `/`)
- `/stays` and `/stays/new` page guards aligned with middleware: authenticated non-shareholders redirect to `/` not `/login`
- Server-side token validation on reset-password page: expired/used tokens show error immediately on load, not only after form submit

### Added

- `toUtcDate(dateStr)` shared utility at `src/lib/utils/dates.ts` — canonical UTC midnight date construction used by all stay and admin-user date fields
- `runtime: 'nodejs'` in `middleware.ts` config — ensures Prisma calls are safe under Node.js runtime, not Edge

### Process

- `.claude/rules/project-components.md` — documents `useEffect`-for-navigation pattern: `router.push()` must live inside `useEffect`, never in the render body
- `.claude/rules/project-dates.md` — documents UTC date parsing rule: use `toUtcDate(dateStr)` for all UTC midnight date constructions; never construct with `new Date(str + 'T00:00:00.000Z')` directly

### Tests

- Integration test (`src/lib/auth/token-refresh.integration.test.ts`) proving JWT callback + `refreshStaleToken` composition: role revocation reflected after DB update, throttle prevents redundant queries
- E2E suites (auth, admin-users, invite) hardened: serial mode, `beforeAll` DB cleanup for shared state, UI-wait before DB assertions

## [Sprint 005] — 2026-06-13

### Added

#### F006 — Check-In Registration

- Stay and Vehicle Prisma models with migration (`Stay`, `Vehicle`, `StayStatus` enum, `@db.Date` date-only fields)
- Server actions: `createStay`, `editStay`, `cancelStay`, `listStays`, `listUserUnits`, `getStay` — all shareholder-gated with unit ownership checks
- Overlap detection via `$transaction(isolationLevel: 'Serializable')` — prevents double-booking per unit; allows same-day turnover
- Guest delegation: optional `guestName` + `guestContact` fields; triggers email notifications to caretakers/directors via Resend on registration
- Email failure is non-blocking — stay is registered, warning returned to client
- Stay registration form (`/stays/new`) — date pickers, stay-type radio, vehicle entry (up to 2)
- Stays list page (`/stays`) — shows all stays with status, type, dates; empty-state message; "Register a stay" link
- Stay edit/cancel form (`/stays/{id}/edit`) — prefilled from DB; unitId immutable after registration; cancelled stays cannot be re-edited
- Admin auto-cancel: removing a unit from a shareholder cancels their future confirmed stays (including same-day check-ins)
- `parseVehicles` FormData utility for indexed vehicle field extraction
- `GuestNotificationEmail` react-email component

### Fixed

- `checkInDate >= today` boundary in auto-cancel: corrected from `new Date()` (full datetime) to UTC midnight of today
- `router.push()` moved from render body into `useEffect` in both form components (React rules compliance)

### Tests

- 6 integration tests across validation, authorization, overlap detection, success paths, and `editStay` edge cases
- 8 E2E tests: registration, guest delegation, overlap block, same-day turnover, edit, cancel, no-unit redirect, empty-state text

## [Sprint 004] — 2026-05-28

### Added

#### F005 — Dependency Vulnerability Management

- GitHub Actions CI workflow (`.github/workflows/ci.yml`) with two jobs: unit tests (`npx vitest run`) and security audit (`npx audit-ci --high --skip-dev`) — triggers on push to `sprint/**` and `master`, and on PRs targeting `master`
- `audit-ci` v7.1.0 installed as dev dependency; `.audit-ci.json` allowlist baseline (`{"high": true}`)
- Dependabot configured for npm ecosystem (`.github/dependabot.yml`) — daily schedule, security updates, max 5 open PRs
- Partially closes F004 Scenario 6: unit tests now run automatically on every sprint branch push

> **Manual step required:** Enable Dependabot alerts + security updates in GitHub repo Settings → Security → Dependabot

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

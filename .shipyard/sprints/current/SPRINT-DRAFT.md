---
id: sprint-001
status: draft
goal: "Build E005 foundation: login, user invitation, and admin user management for all roles"
capacity: 20
features: [F001, F002, F003]
execution_mode: subagent
created: 2026-05-23
---

# Sprint 001 Draft

## Wave Structure

### Wave 1 — Foundation
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T001 | Project Scaffold | M | F001 |

### Wave 2 — Database
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T002 | Prisma Full Schema + Initial Migration | M | F001 |

### Wave 3 — Seed + Auth Config (parallel)
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T003 | Prisma Seed: Units 1-52 + Bootstrap Admin | S | F001 |
| T004 | Auth.js v5 Configuration | M | F001 |

### Wave 4 — Login + Password Reset Entry (parallel)
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T005 | Login Server Action + Rate Limiting | M | F001 |
| T007 | Forgot Password Flow + Resend Setup | M | F001 |

### Wave 5 — UI + Email Infrastructure (parallel)
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T006 | Login Page UI | S | F001 |
| T008 | Password Reset Server Action + Page | M | F001 |
| T010 | createUser() Server Action | M | F002 |
| T011 | Invite Email Template | S | F002 |

### Wave 6 — Middleware + Invite Pages (parallel)
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T009 | Logout + Route Protection Middleware | S | F001 |
| T013 | Invite Activation Page + activateAccount() | M | F002 |
| T014 | User CRUD + Role Server Actions | M | F003 |

### Wave 7 — Admin Forms + F003 Actions (parallel)
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T012 | Admin New User Form /admin/users/new | M | F002 |
| T015 | Deactivate/Reactivate + Session Invalidation | S | F003 |
| T016 | Unit Assignment Server Actions | S | F003 |
| T017 | Resend Invite Server Action | S | F003 |
| T018 | Admin User List Page /admin/users | M | F003 |
| T020 | E2E Tests: F001 Login + Auth Flow | S | F001 |

### Wave 8 — Full Admin UI + F002 E2E (parallel)
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T019 | Admin User Edit Page /admin/users/[id]/edit | M | F003 |
| T021 | E2E Tests: F002 Invite + Activation Flow | S | F002 |

### Wave 9 — F003 E2E
| Task | Title | Effort | Feature |
|------|-------|--------|---------|
| T022 | E2E Tests: F003 Admin User Management | S | F003 |

## Critical Path
T001 → T002 → T004 → T007 → T010 → T014 → T017 → T018 → T019 → T022
(10 tasks, 9 waves long)

## Bottleneck Tasks
- **T002** (Full Schema) — blocks everything downstream
- **T004** (Auth.js) — blocks login and password reset
- **T007** (Resend Setup) — blocks invitation flow
- **T010** (createUser) — blocks all F002 + F003 UI
- **T014** (User CRUD) — blocks all F003 actions
- **T019** (Edit Page) — synthesis of all F003 actions

## Risks
1. **Auth.js v5 beta instability** — pin to `5.0.0-beta.28` in package.json. Breaking changes between betas have burned projects before.
2. **Prisma adapter schema drift** — `@auth/prisma-adapter` requires exact field names on Session/Account/VerificationToken. Use the published schema verbatim.
3. **bcrypt 72-char truncation** — must enforce server-side before every hash/compare, not just in UI.
4. **Resend deliverability in dev** — without verified domain, only delivers to account owner. Mock in unit/integration tests from day one.

## Task Count
22 tasks: 10× M, 12× S, 0× L
Execution mode: subagent (up to 3 parallel agents per wave)

---
id: T003
title: "Prisma Seed: Units 1-52 + Bootstrap Admin"
feature: F001
kind: operational
sprint: sprint-001
effort: S
status: approved
dependencies: [T002]
verify_command: "npx prisma db seed"
verify_max_iterations: 2
---

# Prisma Seed: Units 1-52 + Bootstrap Admin

## What
Seed the 52 unit records required by all features, plus create the first Admin account from env vars (bootstrap for systems with no users).

## Red Step
`SELECT COUNT(*) FROM "Unit"` returns 0 after running `npx prisma db seed`.

## Steps
1. Create `prisma/seed.ts`
2. Upsert 52 Unit rows (id 1–52, no description, `isCompanyHeld: false`)
3. If `SEED_ADMIN_EMAIL` is set in env: upsert Admin user with hashed `SEED_ADMIN_PASSWORD`
4. Add prisma seed config to `package.json`:
   ```json
   "prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
   ```
5. Run `npx prisma db seed` and verify 52 Unit rows exist

## Acceptance Probe
`npx prisma db seed` exits 0. 52 Unit rows in database. If `SEED_ADMIN_EMAIL` is set, one Admin User row exists with `isAdmin: true` and `isActive: true`.

## Technical Notes
Use `upsert` for both Units and the admin user so the seed is idempotent (safe to re-run).

Bootstrap admin password: hash with `bcryptjs.hash(password, 12)` in the seed script. The admin can change it after first login via the reset password flow.

In development, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env.local` to create a test admin. E2E tests can rely on this seeded admin.

Install `ts-node` as a dev dependency for the seed runner: `npm install -D ts-node`.

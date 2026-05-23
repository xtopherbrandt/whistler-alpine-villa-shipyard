---
id: T001
title: "Project Scaffold"
feature: F001
kind: operational
sprint: sprint-001
effort: M
status: done
dependencies: []
verify_command: "npm run build"
verify_max_iterations: 3
---

# Project Scaffold

## What
Initialize the Next.js 15 App Router project with all sprint dependencies, folder conventions, and shared types in place.

## Red Step
`npm run build` fails — project directory is empty or missing required config.

## Steps
1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint`
2. Install sprint dependencies:
   - `npm install next-auth@5.0.0-beta.28 @auth/prisma-adapter`
   - `npm install prisma @prisma/client`
   - `npm install bcryptjs && npm install -D @types/bcryptjs`
   - `npm install resend @react-email/components`
   - `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`
   - `npm install -D @playwright/test && npx playwright install`
3. Create `src/lib/types.ts`:
   ```typescript
   export type ActionResult<T> =
     | { data: T; error: null }
     | { data: null; error: string }
   ```
4. Create folder structure: `src/lib/actions/`, `src/lib/auth/`, `src/lib/email/`
5. Create `src/lib/db.ts` (Prisma singleton):
   ```typescript
   import { PrismaClient } from '@prisma/client'
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
   export const db = globalForPrisma.prisma ?? new PrismaClient()
   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
   ```
6. Create `vitest.config.ts` and `playwright.config.ts`
7. Create `.env.local.example` with all required vars (see Technical Notes)
8. Verify `npm run build` passes

## Acceptance Probe
`npm run build` exits 0. `ActionResult<T>` importable from `@/lib/types`.

## Technical Notes
Pin `next-auth` to `5.0.0-beta.28` exactly in `package.json` — the v5 beta API surface changes between releases.

Required env vars to document in `.env.local.example`:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — 32+ char random string (`openssl rand -base64 32`)
- `RESEND_API_KEY` — from Resend dashboard
- `RESEND_FROM_ADDRESS` — verified sender email for production
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` in dev
- `SEED_ADMIN_EMAIL` — first admin email for bootstrap seed
- `SEED_ADMIN_PASSWORD` — first admin password for bootstrap seed

`playwright.config.ts` should set `webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI }`.

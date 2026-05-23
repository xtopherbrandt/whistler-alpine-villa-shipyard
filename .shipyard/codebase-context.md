---
analyzed: 2026-05-20
project_name: Whistler Alpine Villa
project_type: web-app
tech_stack:
  - Next.js (version TBD — not yet scaffolded)
  - TypeScript
  - React
testing_framework: vitest
e2e_framework: playwright
ci_platform: github-actions
---

# Codebase Context

## Project Structure

The project is a greenfield Next.js + TypeScript web application. No code has been scaffolded yet.

Recommended directory layout (Next.js App Router):
```
whistler-alpine-villa-claude/
├── src/
│   ├── app/              # Next.js App Router pages and layouts
│   ├── components/       # Shared UI components
│   ├── lib/              # Utilities, helpers, server actions
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
├── tests/                # Vitest unit/integration tests
├── e2e/                  # Playwright end-to-end tests
├── .github/
│   └── workflows/        # GitHub Actions CI configuration
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Runtime:** Node.js
- **Styling:** TBD (likely Tailwind CSS — confirm when scaffolding)
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **CI:** GitHub Actions
- **Deployment:** TBD (likely Vercel given Next.js)

## Existing Patterns

None yet — greenfield project. Patterns will be established as the project is scaffolded.

## Existing Tests

None yet.

## Build System

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run start` — production server

## Environment

No `.env` files yet. Expected variables (add as project develops):
- `DATABASE_URL` — if a database is added
- `NEXT_PUBLIC_*` — public client-side environment variables

## Entry Points

- `src/app/layout.tsx` — root layout (App Router)
- `src/app/page.tsx` — home page

## Dependencies

None installed yet. Expected:
- `next`, `react`, `react-dom` — core
- `typescript`, `@types/react`, `@types/node` — TypeScript support
- `vitest`, `@vitejs/plugin-react` — testing
- `@playwright/test` — E2E testing

## Commit Conventions

Conventional Commits with lowercase and scopes. See `.claude/rules/project-commit-format.md`.

Format: `feat(scope): description`

## Existing Functionality

None — brand new project.

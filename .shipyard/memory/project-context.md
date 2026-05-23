---
updated: 2026-05-20
---
# Project Context

## Tech Stack
- Next.js (App Router) — version TBD, to be scaffolded
- TypeScript — strict mode recommended
- React (bundled with Next.js)
- Tailwind CSS — likely, confirm when scaffolding

## Testing
- Framework: Vitest
- Unit test command: `vitest run`
- Integration test command: `vitest run --config vitest.integration.config.ts`
- E2E framework: Playwright
- E2E command: `playwright test`
- Scoped: `vitest run -t`
- Test files: co-located alongside source as `*.test.ts` / `*.test.tsx`
- E2E files: under `e2e/` directory

## Naming Conventions
- Files: `kebab-case.tsx` / `kebab-case.ts`
- Components: `PascalCase` named exports (no default exports)
- Hooks: `useCamelCase`
- Types/interfaces: `PascalCase` (no `I` prefix)
- Booleans: `is`, `has`, `can`, `should` prefix
- Event handlers: `handle` prefix

## Key Terminology
- **Property** — the Whistler Alpine Villa rental property
- **Booking** — a reservation for a date range
- **Availability** — dates when the property is bookable
- **Guest** — a person making or with a booking
- (Add domain terms here as the project is built)

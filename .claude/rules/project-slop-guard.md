---
paths: ["src/**/*"]
---
# AI Slop Guard — Next.js / TypeScript

Rules targeting the specific failure modes agents produce in this stack.

## Server / Client Boundary (most common failure)
- Mark `'use server'` and `'use client'` explicitly — never assume component context
- `getServerSideProps`, `getStaticProps`, and `getInitialProps` do NOT exist in App Router — use `async` page/layout components and `fetch()` with `cache` options instead
- If you import a server-only module in a client component, it will break at runtime — verify before writing

## Import & Type Fabrication
- Every import must resolve to a real file — no speculative module paths
- If a utility doesn't exist, say so and propose creating it; don't write a fabricated import
- Every type used must trace to a real definition in the project or an installed package
- Verify hook and API names against the actual installed version — don't guess from training data

## Scope Discipline
- Implement exactly what was asked — stop at feature scope
- Do not add optional props, loading states, animations, or variants that weren't requested
- Do not refactor surrounding code unless the task explicitly includes it

## Comment Policy
- Comments must explain *why*, never restate *what* the code does
- Do not add block comments summarizing what a function does — the name should do that
- Do not add "added for X feature" or "used by Y" comments — those belong in git history

## Test Integrity
- Test assertions must verify real output, not mock return values
- Do not write tests that only pass because mocks return the expected value
- Don't test that a mock was called — test what the code does with the result

## Stubs & Placeholders
- No `throw new Error('not implemented')` stubs unless gated behind a feature flag
- Incomplete implementations must not compile and pass — make them obviously broken or don't ship them

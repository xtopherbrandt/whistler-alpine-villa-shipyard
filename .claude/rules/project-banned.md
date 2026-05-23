---
paths: ["src/**/*"]
---
# Banned Patterns

| Banned | Use instead |
|--------|-------------|
| `any` type | `unknown` + type narrowing |
| `as unknown as T` | Fix the type or add a runtime check |
| `// TODO` without ticket | Create a Shipyard ticket, link the ID |
| `useEffect` for data fetching | Server Component `async` or React Query |
| `.then()` / `.catch()` chains | `async/await` with try/catch |
| Barrel files (`index.ts` re-exports) | Import from source file directly |
| `getServerSideProps` / `getStaticProps` | App Router `async` page components |
| `export default` for components | Named exports only |
| Hardcoded secrets or URLs | `process.env.VARIABLE` — add to `.env.local` |
| Empty `catch` block | Re-throw or return the error |
| `// eslint-disable` without reason | Fix the issue, or comment why the disable is necessary |

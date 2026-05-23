---
paths: ["src/**/*"]
---
# Error Handling

## Server Actions
Always return a typed result shape — never throw:
```ts
type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }
```

## Rules
- `try/catch` must re-throw or return the error — never silently swallow
- No `console.log` in production paths — use a structured logger (e.g., `src/lib/logger.ts`)
- `console.error` is acceptable during development; strip or replace in production
- User-visible error messages must be human-readable, not stack traces or internal codes
- Expected errors (validation, not-found) are part of the return type; unexpected errors propagate up
- Never catch an error just to make TypeScript happy — fix the type instead

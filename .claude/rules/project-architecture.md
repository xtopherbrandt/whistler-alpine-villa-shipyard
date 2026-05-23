---
paths: ["src/**/*"]
---
# Architecture & Layer Boundaries

## Layer Map
```
src/app/          → Routes, layouts, pages (no business logic)
src/components/   → Shared UI components (no data fetching)
src/lib/          → Business logic, server utilities, data access (server-only)
src/hooks/        → React hooks (client-only state and browser APIs)
src/types/        → TypeScript type definitions
```

## Rules
- `src/app/` contains route handlers and layouts only — extract logic to `src/lib/`
- Server Actions are the only bridge from UI to data; no direct DB calls from components
- Default to Server Components; only add `'use client'` when browser APIs are provably needed
- Push the `'use client'` boundary as deep as possible — leaves of the component tree, not roots
- No cross-feature imports between route segments — features are self-contained
- `src/lib/` is server-only; never import from it in client components (`'use client'` files)

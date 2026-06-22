---
paths: ["src/components/**/*", "src/app/**/*"]
---
# Component & Module Patterns

## Component Structure
```tsx
// 1. Types / interfaces
interface Props {
  ...
}

// 2. Component (named export, not default)
export function ComponentName({ prop }: Props) {
  // 3. Hooks first
  // 4. Derived state / handlers
  // 5. JSX
}
```

## State Coverage
Every component that fetches or receives async data must handle all 4 states:
- Loading — show skeleton or spinner
- Empty — show empty state, not nothing
- Error — show actionable error message
- Data — the happy path

## Rules
- Named exports only — no `export default`
- Props interface defined above the component in the same file
- No inline styles — Tailwind classes only
- Server Components fetch their own data via `async`; don't thread data through layouts unless it's truly shared across routes
- Client Components (`'use client'`) do not fetch data — they receive it as props or use SWR/React Query

## Navigation After Server Actions

Always call `router.push()` inside a `useEffect` that depends on the action state.
Never call it directly in the render body — React forbids side effects during render,
and under Strict Mode a render-body `router.push()` fires twice.

```tsx
useEffect(() => {
  if (state?.data) router.push('/target')
}, [state?.data, router])
```

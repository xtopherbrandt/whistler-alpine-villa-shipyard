# Next.js Expert — Whistler Alpine Villa

Next.js 15 App Router patterns for this project. Do not use Pages Router APIs.

## Project Structure

```
src/
  app/
    layout.tsx          ← root layout (html, body, shared providers)
    page.tsx            ← home page (Server Component)
    (booking)/          ← route group: booking flow
    (property)/         ← route group: property info, gallery
    api/                ← Route Handlers (REST endpoints if needed)
  components/           ← shared UI (no data fetching)
  lib/                  ← server-only: data access, business logic
  hooks/                ← client-only: React hooks
  types/                ← TypeScript types
```

## Server vs Client Components

- Default: Server Component. No `'use client'` directive = server.
- Add `'use client'` only when the component needs: browser APIs, event listeners, `useState`, `useEffect`, or interactive state.
- Push `'use client'` to leaf nodes — interactive widgets, not layouts.
- Never import `src/lib/` (server-only) from a `'use client'` file.

## Page & Layout Patterns

```tsx
// Server Component page — async by default in Next.js 15
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>  // params is a Promise in Next.js 15
}) {
  const { slug } = await params  // always await params
  const property = await getProperty(slug)
  return <PropertyDetail property={property} />
}
```

**Next.js 15 breaking change:** `params` and `searchParams` are Promises — always `await` them.

## Server Actions

```ts
// src/lib/booking/actions.ts
'use server'

import type { ActionResult } from '@/types'

export async function createBooking(
  input: CreateBookingInput
): Promise<ActionResult<Booking>> {
  try {
    const booking = await db.booking.create(input)
    return { data: booking, error: null }
  } catch {
    return { data: null, error: 'Failed to create booking' }
  }
}
```

- Always `'use server'` at top of actions file
- Always return `ActionResult<T>` — never throw
- Input validated before DB operations

## Route File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Route UI — the visible page |
| `layout.tsx` | Shared UI wrapping child routes |
| `loading.tsx` | Suspense fallback while page loads |
| `error.tsx` | Error boundary (`'use client'` required) |
| `not-found.tsx` | 404 UI for `notFound()` calls |

## Data Fetching

```tsx
// Fetch in Server Components — Next.js extends fetch with caching
const data = await fetch('/api/...', { cache: 'force-cache' })     // static
const data = await fetch('/api/...', { cache: 'no-store' })        // dynamic
const data = await fetch('/api/...', { next: { revalidate: 3600 } }) // ISR
```

- Prefer direct DB/service calls in Server Components over internal API routes
- Use Route Handlers (`src/app/api/`) only for external integrations or webhooks

## Key Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
```

## Config File

`next.config.ts` (TypeScript — not `.js` in this project):

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  // config here
}

export default config
```

## Agent Failure Modes

- **`getServerSideProps` / `getStaticProps`** — these don't exist in App Router. Use `async` page components.
- **Forgetting `await params`** — Next.js 15 requires `await params`; skipping it causes a runtime error.
- **`useRouter` for navigation in Server Components** — doesn't exist there. Use `<Link>` or `redirect()`.
- **Importing server lib in client components** — `src/lib/` is server-only; this will break the build.
- **Adding `'use client'` to a layout** — makes the entire subtree client-rendered; avoid unless necessary.

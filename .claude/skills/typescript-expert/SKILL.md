# TypeScript Expert — Whistler Alpine Villa

TypeScript conventions for this Next.js project. Strict mode is the baseline.

## tsconfig.json Expectations

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Use `@/` path alias for all imports — no relative `../../` traversals.

## Core Domain Types

```ts
// src/types/booking.ts

export interface DateRange {
  checkIn: Date
  checkOut: Date
}

export interface GuestCount {
  adults: number
  children: number
}

export interface Booking {
  id: string
  dateRange: DateRange
  guests: GuestCount
  guestName: string
  guestEmail: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: Date
}

export interface AvailabilitySlot {
  date: Date
  available: boolean
  minimumNights?: number
}

export interface Property {
  id: string
  name: string
  description: string
  maxGuests: number
  bedrooms: number
  bathrooms: number
}
```

## ActionResult Pattern

All Server Actions return this shape — never throw:

```ts
// src/types/index.ts
export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }
```

Usage in calling code:
```ts
const result = await createBooking(input)
if (result.error) {
  // handle error — result.data is null here (TypeScript knows this)
}
// result.data is T here
```

## Naming Rules

- No `I` prefix on interfaces: `Booking` not `IBooking`
- No `Type` suffix: `DateRange` not `DateRangeType`
- Discriminated unions for state: `status: 'pending' | 'confirmed' | 'cancelled'`
- Named exports only — no default exports

## Environment Variable Typing

```ts
// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    NEXT_PUBLIC_SITE_URL: string
    // add as project grows
  }
}
```

`NEXT_PUBLIC_*` variables are exposed to the browser; all others are server-only.

## Banned Patterns

| Banned | Use instead |
|--------|-------------|
| `any` | `unknown` + type narrowing |
| `as unknown as T` | Fix the type or add a runtime check |
| `// @ts-ignore` | `// @ts-expect-error` with a reason |
| Non-null assertion `!` | Optional chaining `?.` or a guard |
| `I`-prefixed interfaces | Plain `PascalCase` |

## Agent Failure Modes

- **Fabricating types** — every type must be defined somewhere real; don't invent imports
- **`any` to silence errors** — fix the type; `any` turns off type checking for that value
- **Missing `await` on async operations** — TypeScript often catches this but not always
- **Widening instead of narrowing** — use discriminated unions and type guards, not type assertions
- **Forgetting `noUncheckedIndexedAccess`** — array index access returns `T | undefined`; handle both cases

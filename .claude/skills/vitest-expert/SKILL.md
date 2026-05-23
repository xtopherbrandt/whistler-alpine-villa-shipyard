# Vitest Expert — Whistler Alpine Villa

Vitest setup and testing patterns for this Next.js + TypeScript project.

## Config

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

## Test File Location

Co-located alongside source:
```
src/lib/booking/create-booking.ts
src/lib/booking/create-booking.test.ts   ← unit test here

src/components/booking-form/booking-form.tsx
src/components/booking-form/booking-form.test.tsx
```

E2E tests live separately under `e2e/`.

## Commands

```bash
vitest run                     # run all tests once (CI)
vitest                         # watch mode (development)
vitest run -t "booking"        # run tests matching pattern
vitest run --coverage          # generate coverage report
```

npm scripts to add:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

## Test Naming

```ts
describe('createBooking', () => {
  it('should return the booking when input is valid', async () => { ... })
  it('should return an error when dates overlap an existing booking', async () => { ... })
  it('should return an error when guest count exceeds maximum', async () => { ... })
})
```

Pattern: `it('should [behavior] when [condition]')`

## Testing Server Actions

```ts
import { createBooking } from '@/lib/booking/actions'

it('should return booking data when input is valid', async () => {
  const result = await createBooking({
    checkIn: new Date('2026-07-01'),
    checkOut: new Date('2026-07-07'),
    guests: { adults: 2, children: 0 },
    guestName: 'Jane Smith',
    guestEmail: 'jane@example.com',
  })

  expect(result.error).toBeNull()
  expect(result.data).toMatchObject({ status: 'pending' })
})
```

## Testing React Components

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingForm } from '@/components/booking-form/booking-form'

it('should show error message when check-out is before check-in', async () => {
  render(<BookingForm />)
  // interact via accessible roles/labels, not implementation selectors
  await userEvent.click(screen.getByRole('button', { name: /check availability/i }))
  expect(screen.getByRole('alert')).toHaveTextContent('Check-out must be after check-in')
})
```

## Mock Boundaries

Mock only at external boundaries:
- Network: `vi.mock('node-fetch')` or MSW handlers
- Database: mock the data access layer, not internal functions
- Clock: `vi.useFakeTimers()` for date-dependent logic
- External services: payment gateway, email service

Never mock internal project modules — test the real implementation.

## Coverage Targets

- `src/lib/` (business logic): 85%+ line coverage
- `src/components/`: focus on interaction and state, not rendering snapshots
- Don't write tests just to hit coverage — test meaningful behavior

## Agent Failure Modes

- **Asserting on mock call counts** — test what the function returns, not that it called a mock
- **Testing implementation details** — use accessible queries (`getByRole`, `getByLabelText`), not class names or internal state
- **Mocking internal modules** — only mock external boundaries
- **Missing `await` on async renders** — use `findBy*` queries for async UI updates, not `getBy*`
- **Snapshot tests for dynamic content** — snapshots break constantly; prefer specific assertions

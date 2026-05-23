# Playwright Expert — Whistler Alpine Villa

Playwright E2E testing patterns for this Next.js project.

## Config

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## File Structure

```
e2e/
  booking-flow.spec.ts       ← end-to-end booking journey
  property-gallery.spec.ts   ← gallery and image viewing
  availability-check.spec.ts ← date picker and availability display
  contact.spec.ts            ← contact/enquiry form
```

## Test Naming

```ts
test('guest can check availability for a date range', async ({ page }) => { ... })
test('guest sees error when selected dates are unavailable', async ({ page }) => { ... })
test('guest can complete booking form and receive confirmation', async ({ page }) => { ... })
```

Pattern: `test('[user action] [expected outcome]')`

## Commands

```bash
npx playwright test                    # run all E2E tests
npx playwright test --ui               # interactive UI mode (development)
npx playwright test booking-flow       # run specific file
npx playwright test --reporter=github  # CI output format
npx playwright show-report             # view HTML report after run
```

npm script to add:
```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

## Page Object Pattern

For complex flows, use Page Objects to avoid duplicating selectors:

```ts
// e2e/pages/booking-form.page.ts
import type { Page } from '@playwright/test'

export class BookingFormPage {
  constructor(private page: Page) {}

  async selectCheckIn(date: string) {
    await this.page.getByLabel('Check-in date').fill(date)
  }

  async selectCheckOut(date: string) {
    await this.page.getByLabel('Check-out date').fill(date)
  }

  async submitForm() {
    await this.page.getByRole('button', { name: /check availability/i }).click()
  }

  async getConfirmationMessage() {
    return this.page.getByRole('status').textContent()
  }
}
```

## Selectors — Preferred Order

1. `getByRole` — most resilient to refactoring
2. `getByLabel` — for form fields
3. `getByText` — for visible text content
4. `getByTestId` — last resort, add `data-testid` only when nothing else works
5. Never: CSS selectors, XPath, class names

## Critical Flows to Cover

- **Booking flow** — select dates → check availability → fill guest details → submit
- **Gallery** — open, navigate images, close
- **Availability calendar** — unavailable dates blocked, minimum nights enforced
- **Contact/enquiry form** — fill, submit, confirmation displayed

## CI Integration

GitHub Actions step:
```yaml
- name: Run E2E tests
  run: npx playwright test
  env:
    CI: true
```

Install browsers in CI before running:
```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

## Agent Failure Modes

- **Hard-coded `page.waitForTimeout(2000)`** — use `waitForSelector`, `waitFor`, or `expect(locator).toBeVisible()` instead
- **Flaky selectors** — never use dynamic class names or positional selectors like `:nth-child(3)`
- **Testing against mocked server state** — E2E tests should run against the real app; mock only external third-party services
- **Missing `webServer` config** — without it, tests run against nothing; always configure auto-start
- **Skipping mobile viewports** — the property site is likely mobile-heavy; add a mobile project to `playwright.config.ts`

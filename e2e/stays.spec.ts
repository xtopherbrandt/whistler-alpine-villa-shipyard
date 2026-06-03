import { test, expect } from '@playwright/test'
import { prisma, seedShareholder, loginAsShareholder } from './helpers'

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

test.describe('check-in registration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await seedShareholder()
  })

  test.afterEach(async () => {
    await prisma.stay.deleteMany({ where: { unit: { id: 1 } } })
  })

  test('shareholder stays list page shows heading and register link', async ({ page }) => {
    await loginAsShareholder(page)
    await page.goto('/stays')
    await expect(page.getByRole('heading', { name: /my stays/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /register a stay/i })).toBeVisible()
  })

  test('shareholder registers own stay and it appears in list', async ({ page }) => {
    await loginAsShareholder(page)
    await page.goto('/stays/new')
    await expect(page.getByRole('heading', { name: /register a stay/i })).toBeVisible()

    await page.fill('[name="checkInDate"]', futureDate(7))
    await page.fill('[name="checkOutDate"]', futureDate(14))
    await page.getByLabel(/own stay/i).check()
    await page.getByRole('button', { name: /add vehicle/i }).click()
    await page.fill('[name="vehicle0LicensePlate"]', 'ABC123')
    await page.fill('[name="vehicle0Make"]', 'Toyota')
    await page.fill('[name="vehicle0Model"]', 'Camry')
    await page.getByRole('button', { name: /register stay/i }).click()

    await expect(page).toHaveURL('/stays', { timeout: 15000 })
    await expect(page.getByText('CONFIRMED')).toBeVisible()
  })

  test('guest delegation shows guest fields and creates stay', async ({ page }) => {
    await loginAsShareholder(page)
    await page.goto('/stays/new')

    await page.fill('[name="checkInDate"]', futureDate(20))
    await page.fill('[name="checkOutDate"]', futureDate(27))
    await page.getByLabel(/guest delegation/i).check()
    await expect(page.getByLabel(/guest name/i)).toBeVisible()
    await page.getByLabel(/guest name/i).fill('Jane Doe')
    await page.getByLabel(/guest contact/i).fill('jane@example.com')
    await page.getByRole('button', { name: /register stay/i }).click()

    await expect(page).toHaveURL('/stays', { timeout: 15000 })
    await expect(page.getByText('GUEST')).toBeVisible()
  })

  test('overlapping stay is blocked with error message', async ({ page }) => {
    await loginAsShareholder(page)
    // Seed an existing stay via helpers
    const { user } = await seedShareholder()
    await prisma.stay.create({
      data: {
        userId: user.id,
        unitId: 1,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(30) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(37) + 'T00:00:00.000Z'),
      },
    })

    await page.goto('/stays/new')
    await page.fill('[name="checkInDate"]', futureDate(33))
    await page.fill('[name="checkOutDate"]', futureDate(40))
    await page.getByRole('button', { name: /register stay/i }).click()

    await expect(page.locator('p[role="alert"]')).toContainText(/already has a booking/i)
    await expect(page).toHaveURL('/stays/new')
  })

  test('same-day turnover succeeds', async ({ page }) => {
    await loginAsShareholder(page)
    const { user } = await seedShareholder()
    await prisma.stay.create({
      data: {
        userId: user.id,
        unitId: 1,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(30) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(37) + 'T00:00:00.000Z'),
      },
    })

    await page.goto('/stays/new')
    await page.fill('[name="checkInDate"]', futureDate(37))
    await page.fill('[name="checkOutDate"]', futureDate(44))
    await page.getByRole('button', { name: /register stay/i }).click()

    await expect(page).toHaveURL('/stays', { timeout: 15000 })
  })

  test('shareholder edits their own stay', async ({ page }) => {
    await loginAsShareholder(page)
    const { user } = await seedShareholder()
    const stay = await prisma.stay.create({
      data: {
        userId: user.id,
        unitId: 1,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(50) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(57) + 'T00:00:00.000Z'),
      },
    })

    await page.goto(`/stays/${stay.id}/edit`)
    await expect(page.getByRole('heading', { name: /edit stay/i })).toBeVisible()

    await page.fill('[name="checkOutDate"]', futureDate(60))
    await page.getByRole('button', { name: /save changes/i }).click()

    await expect(page).toHaveURL('/stays', { timeout: 15000 })
  })

  test('shareholder cancels their own stay', async ({ page }) => {
    await loginAsShareholder(page)
    const { user } = await seedShareholder()
    const stay = await prisma.stay.create({
      data: {
        userId: user.id,
        unitId: 1,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(70) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(77) + 'T00:00:00.000Z'),
      },
    })

    await page.goto(`/stays/${stay.id}/edit`)
    await page.getByRole('button', { name: /cancel stay/i }).click()

    await expect(page).toHaveURL('/stays', { timeout: 15000 })
  })

  test('shareholder with no unit assignment is redirected from /stays/new', async ({ page }) => {
    // Seed shareholder WITHOUT unit assignment
    const { hash } = await import('bcryptjs').then(m => ({ hash: m.hash }))
    const passwordHash = await hash('NoUnitPass1!', 4)
    await prisma.user.upsert({
      where: { email: 'nounit@test.local' },
      create: { name: 'No Unit Shareholder', email: 'nounit@test.local', passwordHash, isShareholder: true, isActive: true },
      update: { passwordHash, isShareholder: true, isActive: true },
    })

    await page.goto('/login')
    await page.getByLabel(/email/i).fill('nounit@test.local')
    await page.getByLabel(/password/i).fill('NoUnitPass1!')
    await page.getByRole('button', { name: /sign in/i }).click({ force: true })
    await expect(page).not.toHaveURL('/login', { timeout: 15000 })

    await page.goto('/stays/new')
    await expect(page).toHaveURL('/stays', { timeout: 5000 })
  })
})

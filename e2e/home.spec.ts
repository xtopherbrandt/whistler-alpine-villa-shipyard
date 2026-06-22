import { test, expect } from '@playwright/test'
import { prisma, seedShareholder } from './helpers'
import bcrypt from 'bcryptjs'

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

test.describe('home page - shareholder with upcoming stays', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const { user, unit } = await seedShareholder('-home-stays')
    await prisma.stay.deleteMany({ where: { userId: user.id } })
    await prisma.stay.create({
      data: {
        userId: user.id,
        unitId: unit.id,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(5) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(12) + 'T00:00:00.000Z'),
      },
    })
  })

  test.afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: 'shareholder-home-stays@test.local' } })
    if (user) {
      await prisma.stay.deleteMany({ where: { userId: user.id } })
      await prisma.userUnit.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }
  })

  test('shareholder with upcoming stays sees stay list and register button', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('shareholder-home-stays@test.local')
    await page.getByLabel(/password/i).fill('SharePass1!')
    await page.getByRole('button', { name: /sign in/i }).click({ force: true })
    await expect(page).not.toHaveURL('/login', { timeout: 15000 })

    await page.goto('/')
    await expect(page.getByText('Register a stay')).toBeVisible()
    await expect(page.getByText(/unit/i)).toBeVisible()
  })
})

test.describe('home page - shareholder with no upcoming stays', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const { user } = await seedShareholder('-home-empty')
    await prisma.stay.deleteMany({ where: { userId: user.id } })
  })

  test.afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: 'shareholder-home-empty@test.local' } })
    if (user) {
      await prisma.stay.deleteMany({ where: { userId: user.id } })
      await prisma.userUnit.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }
  })

  test('shareholder with no upcoming stays sees empty state and register button', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('shareholder-home-empty@test.local')
    await page.getByLabel(/password/i).fill('SharePass1!')
    await page.getByRole('button', { name: /sign in/i }).click({ force: true })
    await expect(page).not.toHaveURL('/login', { timeout: 15000 })

    await page.goto('/')
    await expect(page.getByText('No upcoming stays. Planning a visit?')).toBeVisible()
    await expect(page.getByText('Register a stay')).toBeVisible()
  })
})

test.describe('home page - director (non-shareholder) sees admin nav', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash('DirectorPass1!', 4)
    await prisma.user.upsert({
      where: { email: 'director-home@test.local' },
      create: {
        name: 'Test Director Home',
        email: 'director-home@test.local',
        passwordHash,
        isDirector: true,
        isShareholder: false,
        isCaretaker: false,
        isActive: true,
      },
      update: { passwordHash, isDirector: true, isShareholder: false, isCaretaker: false, isActive: true },
    })
  })

  test.afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'director-home@test.local' } })
  })

  test('director sees Manage Users link', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('director-home@test.local')
    await page.getByLabel(/password/i).fill('DirectorPass1!')
    await page.getByRole('button', { name: /sign in/i }).click({ force: true })
    await expect(page).not.toHaveURL('/login', { timeout: 15000 })

    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Manage Users' })).toBeVisible()
  })
})

test.describe('home page - caretaker-only sees placeholder', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash('CaretakerPass1!', 4)
    await prisma.user.upsert({
      where: { email: 'caretaker-home@test.local' },
      create: {
        name: 'Test Caretaker Home',
        email: 'caretaker-home@test.local',
        passwordHash,
        isCaretaker: true,
        isShareholder: false,
        isDirector: false,
        isActive: true,
      },
      update: { passwordHash, isCaretaker: true, isShareholder: false, isDirector: false, isActive: true },
    })
  })

  test.afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'caretaker-home@test.local' } })
  })

  test('caretaker-only user sees occupancy schedule placeholder', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('caretaker-home@test.local')
    await page.getByLabel(/password/i).fill('CaretakerPass1!')
    await page.getByRole('button', { name: /sign in/i }).click({ force: true })
    await expect(page).not.toHaveURL('/login', { timeout: 15000 })

    await page.goto('/')
    await expect(page.getByText('Occupancy schedule coming soon')).toBeVisible()
  })
})

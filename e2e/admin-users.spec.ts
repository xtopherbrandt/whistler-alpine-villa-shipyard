import { test, expect } from '@playwright/test'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma, seedAdmin, seedRegularUser, loginAsAdmin } from './helpers'

test.beforeAll(async () => {
  await seedAdmin()
  await seedRegularUser()
})

test.describe('admin user management', () => {
  test('admin user list shows users with correct statuses', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText('admin@test.local')).toBeVisible()
    await expect(page.getByText('user@test.local')).toBeVisible()
  })

  test('non-admin cannot access /admin/users', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('user@test.local')
    await page.getByLabel(/password/i).fill('UserPass1!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.goto('/admin/users')
    await expect(page).not.toHaveURL('/admin/users')
  })

  test('admin edits user name and change persists in list', async ({ page }) => {
    const user = await seedRegularUser('-edit')
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByLabel(/name/i).fill('Renamed User')
    await page.getByRole('button', { name: /save profile/i }).click()
    await page.goto('/admin/users')
    await expect(page.getByText('Renamed User')).toBeVisible()
    await prisma.user.update({ where: { id: user.id }, data: { name: `Test User-edit` } })
  })

  test('admin edits user email to duplicate shows inline error', async ({ page }) => {
    const user = await seedRegularUser('-dup')
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByLabel(/email/i).fill('admin@test.local')
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByRole('alert')).toContainText(/already in use/i)
  })

  test('admin assigns unit to user and unit appears in assignment', async ({ page }) => {
    const user = await seedRegularUser('-unit')
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    const cb = page.locator('input[type="checkbox"]').first()
    if (!await cb.isChecked()) await cb.check()
    await page.getByRole('button', { name: /save units/i }).click()
    await page.reload()
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked()
  })

  test('admin removes unit assignment', async ({ page }) => {
    const user = await seedRegularUser('-rmunit')
    const unit = await prisma.unit.findFirst({ orderBy: { id: 'asc' } })
    if (unit) await prisma.userUnit.upsert({ where: { userId_unitId: { userId: user.id, unitId: unit.id } }, create: { userId: user.id, unitId: unit.id }, update: {} })
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    const cb = page.locator('input[type="checkbox"]').first()
    if (await cb.isChecked()) await cb.uncheck()
    await page.getByRole('button', { name: /save units/i }).click()
    expect(await prisma.userUnit.count({ where: { userId: user.id } })).toBe(0)
  })

  test('admin deactivates user account', async ({ page }) => {
    const user = await seedRegularUser('-deact')
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByRole('button', { name: /deactivate account/i }).click()
    await page.goto(`/admin/users/${user.id}/edit`)
    await expect(page.getByRole('button', { name: /reactivate account/i })).toBeVisible()
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(dbUser?.isActive).toBe(false)
  })

  test('admin cannot deactivate their own account', async ({ page }) => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@test.local' } })
    if (!admin) return
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${admin.id}/edit`)
    await expect(page.getByRole('button', { name: /deactivate account/i })).toBeDisabled()
  })

  test('admin reactivates user and user can log in', async ({ page }) => {
    const user = await prisma.user.upsert({
      where: { email: 'reactivate@test.local' },
      create: {
        name: 'Reactivate Me',
        email: 'reactivate@test.local',
        passwordHash: await bcrypt.hash('ReactPass1!', 12),
        isActive: false,
      },
      update: { isActive: false },
    })
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByRole('button', { name: /reactivate account/i }).click()
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(dbUser?.isActive).toBe(true)
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('reactivate@test.local')
    await page.getByLabel(/password/i).fill('ReactPass1!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('admin resends invite and old token is invalidated', async ({ page }) => {
    const user = await prisma.user.upsert({
      where: { email: 'reinvite@test.local' },
      create: { name: 'Reinvite User', email: 'reinvite@test.local', isActive: false, passwordHash: null },
      update: { isActive: false, passwordHash: null },
    })
    await prisma.invitationToken.deleteMany({ where: { userId: user.id } })
    const oldToken = crypto.randomBytes(32).toString('hex')
    await prisma.invitationToken.create({
      data: { userId: user.id, token: oldToken, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    })
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByRole('button', { name: /resend invite/i }).click()
    const oldRecord = await prisma.invitationToken.findUnique({ where: { token: oldToken } })
    expect(oldRecord?.usedAt).not.toBeNull()
    const newTokens = await prisma.invitationToken.findMany({ where: { userId: user.id, usedAt: null } })
    expect(newTokens.length).toBe(1)
    const newToken = newTokens[0]
    const expectedExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000)
    // Allow ±60s window to account for test execution time
    expect(newToken.expiresAt.getTime()).toBeGreaterThan(expectedExpiry.getTime() - 60_000)
    expect(newToken.expiresAt.getTime()).toBeLessThan(expectedExpiry.getTime() + 60_000)
  })

  test('enabling Shareholder with no units shows validation error', async ({ page }) => {
    const user = await seedRegularUser('-shareholder-no-units')
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByRole('checkbox', { name: 'Shareholder' }).check()
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByRole('alert')).toContainText('must have at least one unit assignment')
  })

  test('enabling Director without Shareholder shows validation error', async ({ page }) => {
    const user = await seedRegularUser('-director-no-shareholder')
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByRole('checkbox', { name: 'Director' }).check()
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByRole('alert')).toContainText('must also be a Shareholder')
  })

  test('removing Shareholder from a Director shows validation error', async ({ page }) => {
    const unit = await prisma.unit.findFirst({ orderBy: { id: 'asc' } })
    const user = await prisma.user.upsert({
      where: { email: 'director-shareholder@test.local' },
      create: {
        name: 'Director Shareholder',
        email: 'director-shareholder@test.local',
        passwordHash: null,
        isActive: true,
        isDirector: true,
        isShareholder: true,
      },
      update: { isDirector: true, isShareholder: true, isActive: true },
    })
    if (unit) {
      await prisma.userUnit.upsert({
        where: { userId_unitId: { userId: user.id, unitId: unit.id } },
        create: { userId: user.id, unitId: unit.id },
        update: {},
      })
    }
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    await page.getByRole('checkbox', { name: 'Shareholder' }).uncheck()
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByRole('alert')).toContainText('remove Director first')
  })

  test('removing last unit auto-removes Shareholder role', async ({ page }) => {
    const unit = await prisma.unit.findFirst({ orderBy: { id: 'asc' } })
    const user = await prisma.user.upsert({
      where: { email: 'shareholder-unit@test.local' },
      create: { name: 'Shareholder With Unit', email: 'shareholder-unit@test.local', passwordHash: null, isActive: true, isShareholder: true },
      update: { isShareholder: true, isActive: true },
    })
    if (unit) await prisma.userUnit.upsert({ where: { userId_unitId: { userId: user.id, unitId: unit.id } }, create: { userId: user.id, unitId: unit.id }, update: {} })
    await loginAsAdmin(page)
    await page.goto(`/admin/users/${user.id}/edit`)
    const cb = page.locator('input[type="checkbox"]').first()
    if (await cb.isChecked()) await cb.uncheck()
    await page.getByRole('button', { name: /save units/i }).click()
    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Shareholder' })).not.toBeChecked()
  })
})

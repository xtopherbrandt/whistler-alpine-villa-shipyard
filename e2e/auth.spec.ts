import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { seedAdmin, seedRegularUser } from './helpers'

const prisma = new PrismaClient()

test.describe('auth flow', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await seedAdmin()
    await seedRegularUser()
    await prisma.loginAttempt.deleteMany({ where: { email: 'admin@test.local' } })
    await prisma.passwordResetToken.deleteMany()
  })

  test('admin login redirects to /admin/users', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name=email]', 'admin@test.local')
    await page.fill('[name=password]', 'AdminPass1!')
    await page.click('[type=submit]', { force: true })
    await expect(page).toHaveURL('/admin/users')
  })

  test('non-admin login redirects to /', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name=email]', 'user@test.local')
    await page.fill('[name=password]', 'UserPass1!')
    await page.click('[type=submit]', { force: true })
    await expect(page).toHaveURL('/')
  })

  test('wrong password shows inline error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name=email]', 'admin@test.local')
    await page.fill('[name=password]', 'wrongpassword')
    await page.click('[type=submit]', { force: true })
    await expect(page.locator('p[role="alert"]')).toContainText('Invalid email or password')
  })

  test('5 failed logins show lockout message', async ({ page }) => {
    const lockoutUser = await seedRegularUser('-lockout')
    await prisma.loginAttempt.deleteMany({ where: { email: lockoutUser.email } })
    const windowStart = new Date(Date.now() - 5 * 60 * 1000)
    await prisma.loginAttempt.createMany({
      data: Array.from({ length: 5 }, () => ({
        email: lockoutUser.email, success: false, attemptedAt: windowStart,
      })),
    })
    await page.goto('/login')
    await page.fill('[name=email]', lockoutUser.email)
    await page.fill('[name=password]', 'anything')
    await page.click('[type=submit]', { force: true })
    await expect(page.locator('p[role="alert"]')).toContainText('Too many failed attempts')
    await prisma.loginAttempt.deleteMany({ where: { email: lockoutUser.email } })
  })

  test('unauthenticated GET /admin/users redirects to /login', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot password with unregistered email shows success (no leakage)', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.fill('[name=email]', 'nobody@example.com')
    await page.click('[type=submit]')
    await expect(page.getByText(/If that email is registered/)).toBeVisible()
  })

  test('forgot password with registered email creates reset token', async ({ page }) => {
    const admin = await seedAdmin()
    const tokensBefore = await prisma.passwordResetToken.count({ where: { userId: admin.id } })
    await page.goto('/forgot-password')
    await page.fill('[name=email]', admin.email)
    await page.click('[type=submit]')
    await expect(page.locator('p').filter({ hasText: /If that email is registered|Failed to send reset email/ })).toBeVisible()
    const tokensAfter = await prisma.passwordResetToken.count({ where: { userId: admin.id } })
    expect(tokensAfter).toBe(tokensBefore + 1)
  })

  test('expired reset token shows error', async ({ page }) => {
    const admin = await seedAdmin()
    await prisma.passwordResetToken.deleteMany({ where: { userId: admin.id } })
    const expired = await prisma.passwordResetToken.create({
      data: { userId: admin.id, token: 'expiredtoken', expiresAt: new Date(Date.now() - 1000) },
    })
    await page.goto(`/reset-password?token=${expired.token}`)
    await expect(page.getByText(/expired or has already been used/)).toBeVisible()
    await prisma.passwordResetToken.delete({ where: { token: expired.token } })
  })

  test('valid reset token allows password change and redirects to login', async ({ page }) => {
    const admin = await seedAdmin()
    await prisma.passwordResetToken.deleteMany({ where: { userId: admin.id } })
    const token = await prisma.passwordResetToken.create({
      data: { userId: admin.id, token: 'validresettoken', expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    })
    await page.goto(`/reset-password?token=${token.token}`)
    await page.fill('[name=password]', 'NewPassword1!')
    await page.click('[type=submit]')
    await expect(page).toHaveURL(/\/login/)
    await prisma.passwordResetToken.deleteMany({ where: { userId: admin.id } })
  })

  test('sign out clears session; next request redirects to /login', async ({ page }) => {
    await seedAdmin()
    await page.goto('/login')
    await page.fill('[name=email]', 'admin@test.local')
    await page.fill('[name=password]', 'AdminPass1!')
    await page.click('[type=submit]', { force: true })
    await expect(page).toHaveURL('/admin/users')
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login/)
  })
})

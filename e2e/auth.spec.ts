import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedAdmin() {
  const passwordHash = await bcrypt.hash('AdminPass1!', 12)
  return prisma.user.upsert({
    where: { email: 'admin@test.local' },
    create: { name: 'Test Admin', email: 'admin@test.local', passwordHash, isAdmin: true, isActive: true },
    update: { passwordHash, isAdmin: true, isActive: true },
  })
}

async function seedUser() {
  const passwordHash = await bcrypt.hash('UserPass1!', 12)
  return prisma.user.upsert({
    where: { email: 'user@test.local' },
    create: { name: 'Test User', email: 'user@test.local', passwordHash, isAdmin: false, isActive: true },
    update: { passwordHash },
  })
}

test.beforeAll(async () => {
  await seedAdmin()
  await seedUser()
})

test('admin login redirects to /admin/users', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'admin@test.local')
  await page.fill('[name=password]', 'AdminPass1!')
  await page.click('[type=submit]')
  await expect(page).toHaveURL('/admin/users')
})

test('non-admin login redirects to /', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'user@test.local')
  await page.fill('[name=password]', 'UserPass1!')
  await page.click('[type=submit]')
  await expect(page).toHaveURL('/')
})

test('wrong password shows inline error', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'admin@test.local')
  await page.fill('[name=password]', 'wrongpassword')
  await page.click('[type=submit]')
  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
})

test('5 failed logins show lockout message', async ({ page }) => {
  const admin = await seedAdmin()
  const windowStart = new Date(Date.now() - 5 * 60 * 1000)
  await prisma.loginAttempt.createMany({
    data: Array.from({ length: 5 }, () => ({
      email: admin.email, success: false, attemptedAt: windowStart,
    })),
  })
  await page.goto('/login')
  await page.fill('[name=email]', admin.email)
  await page.fill('[name=password]', 'anything')
  await page.click('[type=submit]')
  await expect(page.getByRole('alert')).toContainText('Too many failed attempts')
  await prisma.loginAttempt.deleteMany({ where: { email: admin.email } })
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
  const tokensAfter = await prisma.passwordResetToken.count({ where: { userId: admin.id } })
  expect(tokensAfter).toBe(tokensBefore + 1)
})

test('expired reset token shows error', async ({ page }) => {
  const admin = await seedAdmin()
  const expired = await prisma.passwordResetToken.create({
    data: { userId: admin.id, token: 'expiredtoken', expiresAt: new Date(Date.now() - 1000) },
  })
  await page.goto(`/reset-password?token=${expired.token}`)
  await expect(page.getByText(/expired or has already been used/)).toBeVisible()
  await prisma.passwordResetToken.delete({ where: { token: expired.token } })
})

test('valid reset token allows password change and redirects to login', async ({ page }) => {
  const admin = await seedAdmin()
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
  await page.goto('/login')
  await page.fill('[name=email]', 'admin@test.local')
  await page.fill('[name=password]', 'AdminPass1!')
  await page.click('[type=submit]')
  await expect(page).toHaveURL('/admin/users')
  await page.getByRole('button', { name: /sign out/i }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/login/)
})

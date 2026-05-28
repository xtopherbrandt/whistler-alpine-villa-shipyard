import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function seedInvitedUser() {
  const user = await prisma.user.upsert({
    where: { email: 'invited@test.local' },
    create: { name: 'Invited User', email: 'invited@test.local', isActive: false, passwordHash: null },
    update: { isActive: false, passwordHash: null },
  })
  await prisma.invitationToken.deleteMany({ where: { userId: user.id } })
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
  await prisma.invitationToken.create({ data: { userId: user.id, token, expiresAt } })
  return { user, token }
}

async function seedExpiredInvite() {
  const user = await prisma.user.upsert({
    where: { email: 'expired@test.local' },
    create: { name: 'Expired User', email: 'expired@test.local', isActive: false, passwordHash: null },
    update: { isActive: false, passwordHash: null },
  })
  await prisma.invitationToken.deleteMany({ where: { userId: user.id } })
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() - 1000)
  await prisma.invitationToken.create({ data: { userId: user.id, token, expiresAt } })
  return { user, token }
}

async function seedUsedInvite() {
  const user = await prisma.user.upsert({
    where: { email: 'used@test.local' },
    create: { name: 'Used Token User', email: 'used@test.local', isActive: false, passwordHash: null },
    update: { isActive: false, passwordHash: null },
  })
  await prisma.invitationToken.deleteMany({ where: { userId: user.id } })
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
  await prisma.invitationToken.create({
    data: { userId: user.id, token, expiresAt, usedAt: new Date() },
  })
  return { user, token }
}

test.describe('invite activation flow', () => {
  test('valid invite token shows activation form', async ({ page }) => {
    const { token } = await seedInvitedUser()
    await page.goto(`/invite/${token}`)
    await expect(page.getByRole('heading', { name: /activate/i })).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /activate/i })).toBeVisible()
  })

  test('expired invite shows error message', async ({ page }) => {
    const { token } = await seedExpiredInvite()
    await page.goto(`/invite/${token}`)
    await expect(page.getByText(/expired/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /activate/i })).not.toBeVisible()
  })

  test('already-used token shows error message', async ({ page }) => {
    const { token } = await seedUsedInvite()
    await page.goto(`/invite/${token}`)
    await expect(page.getByText(/expired/i)).toBeVisible()
  })

  test('unknown token shows error message', async ({ page }) => {
    await page.goto('/invite/notarealtoken00000000000000000000000000000000000000000000000000')
    await expect(page.getByText(/expired/i)).toBeVisible()
  })

  test('missing token redirects or shows error', async ({ page }) => {
    await page.goto('/invite/')
    await expect(page).not.toHaveURL('/invite/')
  })

  test('short password shows validation error', async ({ page }) => {
    const { token } = await seedInvitedUser()
    await page.goto(`/invite/${token}`)
    await page.getByLabel(/password/i).fill('short')
    await page.getByRole('button', { name: /activate/i }).click()
    await expect(page.getByText(/at least 8/i)).toBeVisible()
  })

  test('successful activation redirects to login', async ({ page }) => {
    const { token } = await seedInvitedUser()
    await page.goto(`/invite/${token}`)
    await page.getByLabel(/password/i).fill('NewPass1234!')
    await page.getByRole('button', { name: /activate/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('activated user can log in after activation', async ({ page }) => {
    const { token } = await seedInvitedUser()
    await page.goto(`/invite/${token}`)
    await page.getByLabel(/password/i).fill('NewPass1234!')
    await page.getByRole('button', { name: /activate/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.getByLabel(/email/i).fill('invited@test.local')
    await page.getByLabel(/password/i).fill('NewPass1234!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).not.toHaveURL(/\/login/)
  })
})

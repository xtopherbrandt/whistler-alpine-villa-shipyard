import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { expect } from '@playwright/test'

export const prisma = new PrismaClient()

export async function seedAdmin() {
  const passwordHash = await bcrypt.hash('AdminPass1!', 4)
  return prisma.user.upsert({
    where: { email: 'admin@test.local' },
    create: { name: 'Test Admin', email: 'admin@test.local', passwordHash, isAdmin: true, isActive: true },
    update: { passwordHash, isAdmin: true, isActive: true },
  })
}

export async function seedRegularUser(suffix = '') {
  const passwordHash = await bcrypt.hash('UserPass1!', 4)
  return prisma.user.upsert({
    where: { email: `user${suffix}@test.local` },
    create: { name: `Test User${suffix}`, email: `user${suffix}@test.local`, passwordHash, isAdmin: false, isActive: true },
    update: { passwordHash, isAdmin: false, isActive: true },
  })
}

export async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('admin@test.local')
  await page.getByLabel(/password/i).fill('AdminPass1!')
  await page.getByRole('button', { name: /sign in/i }).click({ force: true })
  await expect(page).toHaveURL(/\/admin\/users/, { timeout: 15000 })
}

export async function seedShareholder(suffix = '') {
  const passwordHash = await bcrypt.hash('SharePass1!', 4)
  const unit = await prisma.unit.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })
  const user = await prisma.user.upsert({
    where: { email: `shareholder${suffix}@test.local` },
    create: { name: `Test Shareholder${suffix}`, email: `shareholder${suffix}@test.local`, passwordHash, isShareholder: true, isActive: true },
    update: { passwordHash, isShareholder: true, isActive: true },
  })
  await prisma.userUnit.upsert({
    where: { userId_unitId: { userId: user.id, unitId: unit.id } },
    create: { userId: user.id, unitId: unit.id },
    update: {},
  })
  return { user, unit }
}

export async function loginAsShareholder(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('shareholder@test.local')
  await page.getByLabel(/password/i).fill('SharePass1!')
  await page.getByRole('button', { name: /sign in/i }).click({ force: true })
  await expect(page).not.toHaveURL('/login', { timeout: 15000 })
}

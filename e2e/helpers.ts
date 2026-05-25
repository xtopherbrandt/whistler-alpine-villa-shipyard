import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { expect } from '@playwright/test'

export const prisma = new PrismaClient()

export async function seedAdmin() {
  const passwordHash = await bcrypt.hash('AdminPass1!', 12)
  return prisma.user.upsert({
    where: { email: 'admin@test.local' },
    create: { name: 'Test Admin', email: 'admin@test.local', passwordHash, isAdmin: true, isActive: true },
    update: { passwordHash, isAdmin: true, isActive: true },
  })
}

export async function seedRegularUser(suffix = '') {
  const passwordHash = await bcrypt.hash('UserPass1!', 12)
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
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin\/users/)
}

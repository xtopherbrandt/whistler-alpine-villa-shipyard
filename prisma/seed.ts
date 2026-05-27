import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  // Upsert all 52 units (integer IDs matching strata unit numbers)
  for (let i = 1; i <= 52; i++) {
    await db.unit.upsert({
      where: { id: i },
      update: {},
      create: { id: i, isCompanyHeld: false },
    })
  }
  console.log('✓ Seeded 52 units')

  // Bootstrap admin user from env vars (idempotent)
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await db.user.upsert({
      where: { email: adminEmail },
      update: { isAdmin: true, isActive: true },
      create: {
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        isAdmin: true,
        isActive: true,
      },
    })
    console.log(`✓ Bootstrap admin upserted: ${adminEmail}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

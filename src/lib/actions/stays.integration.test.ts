import { describe, it, expect, afterEach } from 'vitest'
import { db } from '@/lib/db'

// These tests require a live database connection.
// Run with: npx vitest --config vitest.integration.config.ts

describe('Stay model', () => {
  const createdIds: string[] = []

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db.stay.deleteMany({ where: { id: { in: createdIds } } })
      createdIds.length = 0
    }
  })

  it('creates a stay record in the database', async () => {
    // Requires a Unit with id=1 and a User with matching id to exist.
    // In a real integration suite these would be seeded; here we rely on
    // the unit/user created by the seed or a prior migration fixture.
    // The test is intentionally minimal — its purpose is to confirm
    // that PrismaClient gains .stay after the migration is applied.
    const unit = await db.unit.findFirst()
    const user = await db.user.findFirst()

    if (!unit || !user) {
      // Skip gracefully when no seed data exists (CI without seed).
      console.warn('No Unit or User rows found — skipping stay creation test')
      return
    }

    const stay = await db.stay.create({
      data: {
        unitId: unit.id,
        userId: user.id,
        stayType: 'OWN',
        checkInDate: new Date('2026-07-01'),
        checkOutDate: new Date('2026-07-05'),
      },
    })

    createdIds.push(stay.id)
    expect(stay.id).toBeDefined()
    expect(stay.status).toBe('CONFIRMED')
  })
})

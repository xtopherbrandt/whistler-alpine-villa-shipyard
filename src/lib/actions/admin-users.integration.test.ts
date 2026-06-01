import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest'
import { db } from '@/lib/db'

// Mock auth so requireAdmin() passes without a real session
vi.mock('~/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'test-admin-id', isAdmin: true } }),
}))

// These tests require a live database connection.
// Run with: npx vitest run --config vitest.integration.config.ts

describe('updateUserUnits — auto-cancels future stays', () => {
  // Track created records for cleanup
  const createdUserIds: string[] = []
  const createdUnitIds: number[] = []
  const createdStayIds: string[] = []

  afterEach(async () => {
    // Clean up in dependency order
    if (createdStayIds.length > 0) {
      await db.stay.deleteMany({ where: { id: { in: createdStayIds } } })
      createdStayIds.length = 0
    }
    if (createdUserIds.length > 0) {
      await db.userUnit.deleteMany({ where: { userId: { in: createdUserIds } } })
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } })
      createdUserIds.length = 0
    }
    if (createdUnitIds.length > 0) {
      await db.unit.deleteMany({ where: { id: { in: createdUnitIds } } })
      createdUnitIds.length = 0
    }
  })

  it('auto-cancels future stays when a unit is removed from a shareholder', async () => {
    // Import here so the vi.mock above has taken effect
    const { updateUserUnits } = await import('@/lib/actions/admin-users')

    // Set up: create a test unit with an unlikely-to-conflict ID
    const unitId = 9901
    await db.unit.upsert({
      where: { id: unitId },
      create: { id: unitId, description: 'Integration test unit T044' },
      update: {},
    })
    createdUnitIds.push(unitId)

    // Set up: create a shareholder user
    const shareholderUser = await db.user.create({
      data: {
        name: 'T044 Test Shareholder',
        email: `t044-shareholder-${Date.now()}@integration-test.invalid`,
        isShareholder: true,
        isActive: true,
      },
    })
    createdUserIds.push(shareholderUser.id)

    // Set up: assign the unit to the shareholder
    await db.userUnit.create({
      data: { userId: shareholderUser.id, unitId },
    })

    // Set up: create a CONFIRMED stay with checkInDate = tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const checkOut = new Date(tomorrow)
    checkOut.setDate(checkOut.getDate() + 3)

    const stay = await db.stay.create({
      data: {
        userId: shareholderUser.id,
        unitId,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: tomorrow,
        checkOutDate: checkOut,
      },
    })
    createdStayIds.push(stay.id)

    // Act: remove all units from the shareholder
    const result = await updateUserUnits(shareholderUser.id, [])

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ occupancyWarnings: [] })

    // Assert: the future CONFIRMED stay was auto-cancelled
    const updatedStay = await db.stay.findFirst({ where: { id: stay.id } })
    expect(updatedStay?.status).toBe('CANCELLED')
  })

  it('does not cancel past stays when a unit is removed', async () => {
    const { updateUserUnits } = await import('@/lib/actions/admin-users')

    const unitId = 9902
    await db.unit.upsert({
      where: { id: unitId },
      create: { id: unitId, description: 'Integration test unit T044 past' },
      update: {},
    })
    createdUnitIds.push(unitId)

    const shareholderUser = await db.user.create({
      data: {
        name: 'T044 Past Stay Shareholder',
        email: `t044-past-${Date.now()}@integration-test.invalid`,
        isShareholder: true,
        isActive: true,
      },
    })
    createdUserIds.push(shareholderUser.id)

    await db.userUnit.create({
      data: { userId: shareholderUser.id, unitId },
    })

    // A past stay (checkInDate = yesterday)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const checkOut = new Date(yesterday)
    checkOut.setDate(checkOut.getDate() + 3)

    const pastStay = await db.stay.create({
      data: {
        userId: shareholderUser.id,
        unitId,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: yesterday,
        checkOutDate: checkOut,
      },
    })
    createdStayIds.push(pastStay.id)

    // Act: remove all units
    const result = await updateUserUnits(shareholderUser.id, [])
    expect(result.error).toBeNull()

    // Assert: past stay remains CONFIRMED (historical record preserved)
    const updatedStay = await db.stay.findFirst({ where: { id: pastStay.id } })
    expect(updatedStay?.status).toBe('CONFIRMED')
  })
})

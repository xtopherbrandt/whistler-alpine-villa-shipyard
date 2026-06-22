import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/lib/db'
import { createStay, editStay, cancelStay } from '@/lib/actions/stays'
import { auth } from '~/auth'
import { sendEmail } from '@/lib/email/send'

vi.mock('~/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/email/GuestNotificationEmail', () => ({
  GuestNotificationEmail: vi.fn().mockReturnValue(null),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedShareholder() {
  return db.user.upsert({
    where: { email: 'shareholder@test.local' },
    create: {
      name: 'Test Shareholder',
      email: 'shareholder@test.local',
      passwordHash: 'x',
      isShareholder: true,
      isActive: true,
    },
    update: { isShareholder: true, isActive: true },
  })
}

async function seedUnit(id: number) {
  return db.unit.upsert({ where: { id }, create: { id }, update: {} })
}

async function assignUnit(userId: string, unitId: number) {
  return db.userUnit.upsert({
    where: { userId_unitId: { userId, unitId } },
    create: { userId, unitId },
    update: {},
  })
}

function futureDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function mockShareholderSession(userId: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId, isShareholder: true } } as never)
}

// ---------------------------------------------------------------------------
// Unit IDs — each describe block uses its own to avoid cross-suite state
// ---------------------------------------------------------------------------

const UNIT_VALIDATION = 9801
const UNIT_AUTHZ = 9802
const UNIT_OVERLAP = 9803
const UNIT_SUCCESS = 9804
const UNIT_EDIT = 9805
const UNIT_CANCEL = 9806

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createStay — validation', () => {
  let userId: string

  beforeEach(async () => {
    const user = await seedShareholder()
    userId = user.id
    await seedUnit(UNIT_VALIDATION)
    await assignUnit(userId, UNIT_VALIDATION)
    mockShareholderSession(userId)
  })

  afterEach(async () => {
    await db.stay.deleteMany({ where: { unit: { id: UNIT_VALIDATION } } })
    await db.userUnit.deleteMany({ where: { unitId: UNIT_VALIDATION } })
    await db.unit.deleteMany({ where: { id: UNIT_VALIDATION } })
  })

  it('returns error when checkOut <= checkIn (same day)', async () => {
    const day = futureDate(10)
    const result = await createStay({
      unitId: UNIT_VALIDATION,
      checkInDate: day,
      checkOutDate: day,
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toMatch(/after check-in/)
  })

  it('returns error when > 2 vehicles', async () => {
    const result = await createStay({
      unitId: UNIT_VALIDATION,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'OWN',
      vehicles: [
        { licensePlate: 'AAA-111', make: 'Toyota', model: 'Camry' },
        { licensePlate: 'BBB-222', make: 'Honda', model: 'Civic' },
        { licensePlate: 'CCC-333', make: 'Ford', model: 'F150' },
      ],
    })
    expect(result.error).toMatch(/2 vehicles/)
  })

  it('returns error when stayType=GUEST and guestName missing', async () => {
    const result = await createStay({
      unitId: UNIT_VALIDATION,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'GUEST',
      guestContact: 'guest@example.com',
      vehicles: [],
    })
    expect(result.error).toMatch(/Guest name and contact/)
  })

  it('returns error when stayType=GUEST and guestContact missing', async () => {
    const result = await createStay({
      unitId: UNIT_VALIDATION,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'GUEST',
      guestName: 'Jane Doe',
      vehicles: [],
    })
    expect(result.error).toMatch(/Guest name and contact/)
  })

  it('returns error when guestContact exceeds 100 characters', async () => {
    const result = await createStay({
      unitId: UNIT_VALIDATION,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'GUEST',
      guestName: 'Jane Doe',
      guestContact: 'x'.repeat(101),
      vehicles: [],
    })
    expect(result.error).toMatch(/100 characters/)
  })
})

describe('createStay — authorization', () => {
  let userId: string

  beforeEach(async () => {
    const user = await seedShareholder()
    userId = user.id
    await seedUnit(UNIT_AUTHZ)
    // NOTE: do NOT assign the unit — that is what we are testing
  })

  afterEach(async () => {
    await db.stay.deleteMany({ where: { unit: { id: UNIT_AUTHZ } } })
    await db.userUnit.deleteMany({ where: { unitId: UNIT_AUTHZ } })
    await db.unit.deleteMany({ where: { id: UNIT_AUTHZ } })
  })

  it('returns Forbidden when user is not a shareholder (auth returns null)', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const result = await createStay({
      unitId: UNIT_AUTHZ,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('returns Forbidden when unit is not in user assignments', async () => {
    mockShareholderSession(userId)
    const result = await createStay({
      unitId: UNIT_AUTHZ,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })
})

describe('createStay — overlap detection', () => {
  let userId: string

  beforeEach(async () => {
    const user = await seedShareholder()
    userId = user.id
    await seedUnit(UNIT_OVERLAP)
    await assignUnit(userId, UNIT_OVERLAP)
    mockShareholderSession(userId)
  })

  afterEach(async () => {
    await db.stay.deleteMany({ where: { unit: { id: UNIT_OVERLAP } } })
    await db.userUnit.deleteMany({ where: { unitId: UNIT_OVERLAP } })
    await db.unit.deleteMany({ where: { id: UNIT_OVERLAP } })
  })

  it('returns error when new dates overlap existing CONFIRMED stay', async () => {
    // Seed an existing confirmed stay: days 20-25
    await db.stay.create({
      data: {
        unitId: UNIT_OVERLAP,
        userId,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })

    // Attempt to create overlapping stay: days 22-28
    const result = await createStay({
      unitId: UNIT_OVERLAP,
      checkInDate: futureDate(22),
      checkOutDate: futureDate(28),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toMatch(/already has a booking/)
  })

  it('succeeds when new check-in equals existing check-out (same-day turnover)', async () => {
    // Existing stay: days 20-25
    await db.stay.create({
      data: {
        unitId: UNIT_OVERLAP,
        userId,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })

    // New stay starts exactly when old one ends: days 25-30
    const result = await createStay({
      unitId: UNIT_OVERLAP,
      checkInDate: futureDate(25),
      checkOutDate: futureDate(30),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
  })

  it('succeeds when existing stay is CANCELLED (cancelled does not block)', async () => {
    // Seed a CANCELLED stay overlapping the desired dates
    await db.stay.create({
      data: {
        unitId: UNIT_OVERLAP,
        userId,
        stayType: 'OWN',
        status: 'CANCELLED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })

    // Should succeed despite overlapping cancelled stay
    const result = await createStay({
      unitId: UNIT_OVERLAP,
      checkInDate: futureDate(20),
      checkOutDate: futureDate(25),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
  })

  it('succeeds for past (retroactive) dates', async () => {
    // Past dates: check-in 30 days ago, check-out 25 days ago
    const pastCheckIn = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return d.toISOString().slice(0, 10)
    })()
    const pastCheckOut = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 25)
      return d.toISOString().slice(0, 10)
    })()

    const result = await createStay({
      unitId: UNIT_OVERLAP,
      checkInDate: pastCheckIn,
      checkOutDate: pastCheckOut,
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
  })
})

describe('createStay — success', () => {
  let userId: string
  let caretakerId: string

  beforeEach(async () => {
    vi.mocked(sendEmail).mockClear()
    const user = await seedShareholder()
    userId = user.id
    await seedUnit(UNIT_SUCCESS)
    await assignUnit(userId, UNIT_SUCCESS)
    mockShareholderSession(userId)
    // Seed a caretaker so sendGuestNotification has recipients to email
    const caretaker = await db.user.upsert({
      where: { email: 'caretaker@test.local' },
      create: {
        name: 'Test Caretaker',
        email: 'caretaker@test.local',
        passwordHash: 'x',
        isCaretaker: true,
        isActive: true,
      },
      update: { isCaretaker: true, isActive: true },
    })
    caretakerId = caretaker.id
  })

  afterEach(async () => {
    await db.stay.deleteMany({ where: { unit: { id: UNIT_SUCCESS } } })
    await db.userUnit.deleteMany({ where: { unitId: UNIT_SUCCESS } })
    await db.unit.deleteMany({ where: { id: UNIT_SUCCESS } })
    // Reset caretaker to avoid polluting other tests
    await db.user.update({
      where: { id: caretakerId },
      data: { isCaretaker: false, isActive: false },
    })
  })

  it('creates CONFIRMED stay with OWN type and vehicles', async () => {
    const result = await createStay({
      unitId: UNIT_SUCCESS,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'OWN',
      vehicles: [{ licensePlate: 'XYZ-999', make: 'Tesla', model: 'Model 3' }],
    })
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.status).toBe('CONFIRMED')
    expect(result.data?.stayType).toBe('OWN')
    // Verify vehicles were created
    const stay = await db.stay.findUnique({
      where: { id: result.data?.id },
      include: { vehicles: true },
    })
    expect(stay?.vehicles).toHaveLength(1)
    expect(stay?.vehicles[0].licensePlate).toBe('XYZ-999')
  })

  it('calls sendEmail for GUEST stay', async () => {
    const result = await createStay({
      unitId: UNIT_SUCCESS,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'GUEST',
      guestName: 'Alice Guest',
      guestContact: 'alice@example.com',
      vehicles: [],
    })
    expect(result.error).toBeNull()
    expect(vi.mocked(sendEmail)).toHaveBeenCalled()
  })

  it('does NOT call sendEmail for OWN stay', async () => {
    const result = await createStay({
      unitId: UNIT_SUCCESS,
      checkInDate: futureDate(10),
      checkOutDate: futureDate(15),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toBeNull()
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled()
  })

  it('returns warning (not error) when guest notification email fails', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('SMTP down'))
    const result = await createStay({
      unitId: UNIT_SUCCESS,
      checkInDate: futureDate(20),
      checkOutDate: futureDate(27),
      stayType: 'GUEST',
      guestName: 'Bob Guest',
      guestContact: 'bob@example.com',
      vehicles: [],
    })
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    if (result.data) expect(result.warning).toMatch(/notification could not be sent/)
  })
})

describe('editStay', () => {
  let userId: string

  beforeEach(async () => {
    const user = await seedShareholder()
    userId = user.id
    await seedUnit(UNIT_EDIT)
    await assignUnit(userId, UNIT_EDIT)
    mockShareholderSession(userId)
  })

  afterEach(async () => {
    await db.stay.deleteMany({ where: { unit: { id: UNIT_EDIT } } })
    await db.userUnit.deleteMany({ where: { unitId: UNIT_EDIT } })
    await db.unit.deleteMany({ where: { id: UNIT_EDIT } })
  })

  it('returns Forbidden when stay belongs to another user', async () => {
    // Create a stay owned by a different user
    const otherUser = await db.user.upsert({
      where: { email: 'other@test.local' },
      create: {
        name: 'Other User',
        email: 'other@test.local',
        passwordHash: 'x',
        isShareholder: true,
        isActive: true,
      },
      update: { isShareholder: true, isActive: true },
    })

    const otherStay = await db.stay.create({
      data: {
        unitId: UNIT_EDIT,
        userId: otherUser.id,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })

    const result = await editStay(otherStay.id, {
      unitId: UNIT_EDIT,
      checkInDate: futureDate(21),
      checkOutDate: futureDate(26),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('returns Forbidden when attempting to edit a cancelled stay', async () => {
    const stay = await db.stay.create({
      data: {
        unitId: UNIT_EDIT,
        userId,
        stayType: 'OWN',
        status: 'CANCELLED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })
    const result = await editStay(stay.id, {
      unitId: UNIT_EDIT,
      checkInDate: futureDate(21),
      checkOutDate: futureDate(26),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toBe('Forbidden')
  })

  it('returns error when attempting to change unitId', async () => {
    const stay = await db.stay.create({
      data: {
        unitId: UNIT_EDIT,
        userId,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })
    const result = await editStay(stay.id, {
      unitId: UNIT_EDIT + 1,
      checkInDate: futureDate(20),
      checkOutDate: futureDate(25),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toBe('Unit cannot be changed after registration')
  })

  it('succeeds with updated dates (self-exclusion from overlap works)', async () => {
    // Create a stay owned by the current user
    const existing = await db.stay.create({
      data: {
        unitId: UNIT_EDIT,
        userId,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })

    // Edit to new dates that overlap with the original (self-exclusion must prevent false conflict)
    const result = await editStay(existing.id, {
      unitId: UNIT_EDIT,
      checkInDate: futureDate(21),
      checkOutDate: futureDate(27),
      stayType: 'OWN',
      vehicles: [],
    })
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    // Verify the new check-out date was persisted
    const updated = await db.stay.findUnique({ where: { id: existing.id } })
    expect(updated?.checkOutDate).toEqual(new Date(futureDate(27) + 'T00:00:00.000Z'))
  })
})

describe('cancelStay', () => {
  let userId: string

  beforeEach(async () => {
    const user = await seedShareholder()
    userId = user.id
    await seedUnit(UNIT_CANCEL)
    await assignUnit(userId, UNIT_CANCEL)
    mockShareholderSession(userId)
  })

  afterEach(async () => {
    await db.stay.deleteMany({ where: { unit: { id: UNIT_CANCEL } } })
    await db.userUnit.deleteMany({ where: { unitId: UNIT_CANCEL } })
    await db.unit.deleteMany({ where: { id: UNIT_CANCEL } })
  })

  it('returns Forbidden when stay belongs to another user', async () => {
    const otherUser = await db.user.upsert({
      where: { email: 'other@test.local' },
      create: {
        name: 'Other User',
        email: 'other@test.local',
        passwordHash: 'x',
        isShareholder: true,
        isActive: true,
      },
      update: { isShareholder: true, isActive: true },
    })

    const otherStay = await db.stay.create({
      data: {
        unitId: UNIT_CANCEL,
        userId: otherUser.id,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })

    const result = await cancelStay(otherStay.id)
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('sets status to CANCELLED', async () => {
    const stay = await db.stay.create({
      data: {
        unitId: UNIT_CANCEL,
        userId,
        stayType: 'OWN',
        status: 'CONFIRMED',
        checkInDate: new Date(futureDate(20) + 'T00:00:00.000Z'),
        checkOutDate: new Date(futureDate(25) + 'T00:00:00.000Z'),
      },
    })

    const result = await cancelStay(stay.id)
    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('CANCELLED')

    // Verify persisted
    const updated = await db.stay.findUnique({ where: { id: stay.id } })
    expect(updated?.status).toBe('CANCELLED')
  })
})

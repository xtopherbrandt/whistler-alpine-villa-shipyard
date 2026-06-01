import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    stay: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    userUnit: { findFirst: vi.fn(), findMany: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    unit: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { auth } from '~/auth'
import { db } from '@/lib/db'
import { createStay, cancelStay, listStays, listUserUnits } from '@/lib/actions/stays'

const mockAuth = vi.mocked(auth)
const mockStayFindFirst = vi.mocked(db.stay.findFirst)
const mockStayFindUnique = vi.mocked(db.stay.findUnique)
const mockStayUpdate = vi.mocked(db.stay.update)
const mockUserUnitFindFirst = vi.mocked(db.userUnit.findFirst)
const mockTransaction = vi.mocked(db.$transaction)

const shareholderSession = {
  user: { id: 'user-123', isShareholder: true, isAdmin: false },
}

const baseStayInput = {
  unitId: 1,
  checkInDate: '2026-08-01',
  checkOutDate: '2026-08-05',
  stayType: 'OWN' as const,
  vehicles: [],
}

describe('createStay — validation (pre-transaction checks)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(shareholderSession as never)
    mockUserUnitFindFirst.mockResolvedValue({ userId: 'user-123', unitId: 1 } as never)
  })

  it('returns error when check-out is not after check-in (same day)', async () => {
    const result = await createStay({
      ...baseStayInput,
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-01',
    })
    expect(result.error).toMatch(/after check-in/)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns error when check-out is before check-in', async () => {
    const result = await createStay({
      ...baseStayInput,
      checkInDate: '2026-08-05',
      checkOutDate: '2026-08-01',
    })
    expect(result.error).toMatch(/after check-in/)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns error when more than 2 vehicles', async () => {
    const result = await createStay({
      ...baseStayInput,
      vehicles: [
        { licensePlate: 'AAA-111', make: 'Toyota', model: 'Camry' },
        { licensePlate: 'BBB-222', make: 'Honda', model: 'Civic' },
        { licensePlate: 'CCC-333', make: 'Ford', model: 'F150' },
      ],
    })
    expect(result.error).toMatch(/2 vehicles/)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns error when GUEST stay is missing guestName', async () => {
    const result = await createStay({
      ...baseStayInput,
      stayType: 'GUEST',
      guestContact: 'guest@example.com',
    })
    expect(result.error).toMatch(/Guest name and contact/)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns error when GUEST stay is missing guestContact', async () => {
    const result = await createStay({
      ...baseStayInput,
      stayType: 'GUEST',
      guestName: 'Jane Doe',
    })
    expect(result.error).toMatch(/Guest name and contact/)
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})

describe('createStay — auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Forbidden when session is null (unauthenticated)', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await createStay(baseStayInput)
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns Forbidden when user is not a shareholder', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isShareholder: false } } as never)
    const result = await createStay(baseStayInput)
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})

describe('cancelStay — ownership check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(shareholderSession as never)
  })

  it('returns Forbidden when stay belongs to a different user', async () => {
    mockStayFindUnique.mockResolvedValue({ id: 'stay-1', userId: 'other-user' } as never)
    const result = await cancelStay('stay-1')
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockStayUpdate).not.toHaveBeenCalled()
  })

  it('returns Forbidden when stay does not exist', async () => {
    mockStayFindUnique.mockResolvedValue(null as never)
    const result = await cancelStay('nonexistent')
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockStayUpdate).not.toHaveBeenCalled()
  })

  it('updates status to CANCELLED when caller owns the stay', async () => {
    mockStayFindUnique.mockResolvedValue({ id: 'stay-1', userId: 'user-123' } as never)
    mockStayUpdate.mockResolvedValue({ id: 'stay-1', userId: 'user-123', status: 'CANCELLED' } as never)

    const result = await cancelStay('stay-1')
    expect(result.error).toBeNull()
    expect(mockStayUpdate).toHaveBeenCalledWith({
      where: { id: 'stay-1' },
      data: { status: 'CANCELLED' },
    })
  })
})

describe('createStay — overlap handling via $transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(shareholderSession as never)
    mockUserUnitFindFirst.mockResolvedValue({ userId: 'user-123', unitId: 1 } as never)
  })

  it('returns overlap error when transaction throws OVERLAP code', async () => {
    const overlapErr = Object.assign(new Error('OVERLAP'), { code: 'OVERLAP' })
    mockTransaction.mockRejectedValue(overlapErr)

    const result = await createStay(baseStayInput)
    expect(result.error).toMatch(/already has a booking/)
  })

  it('returns serialization retry message on could-not-serialize error', async () => {
    const serializeErr = new Error('could not serialize access due to concurrent update')
    mockTransaction.mockRejectedValue(serializeErr)

    const result = await createStay(baseStayInput)
    expect(result.error).toMatch(/try again/)
  })

  it('returns created stay on success', async () => {
    const fakeStay = { id: 'stay-new', userId: 'user-123', unitId: 1, status: 'CONFIRMED' }
    mockTransaction.mockResolvedValue(fakeStay as never)

    const result = await createStay(baseStayInput)
    expect(result.error).toBeNull()
    expect(result.data).toEqual(fakeStay)
  })
})

describe('listStays — auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Forbidden when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await listStays()
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })
})

describe('listUserUnits — auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Forbidden when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await listUserUnits()
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('returns user units mapped to id and description', async () => {
    mockAuth.mockResolvedValue(shareholderSession as never)
    vi.mocked(db.userUnit.findMany).mockResolvedValue([
      { unit: { id: 1, description: 'Unit A' } },
      { unit: { id: 2, description: 'Unit B' } },
    ] as never)

    const result = await listUserUnits()
    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      { id: 1, description: 'Unit A' },
      { id: 2, description: 'Unit B' },
    ])
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userUnit: {
      count: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import { updateUser, updateUserUnits } from '@/lib/actions/admin-users'

const mockCount = vi.mocked(db.userUnit.count)
const mockFindFirst = vi.mocked(db.user.findFirst)
const mockFindUnique = vi.mocked(db.user.findUnique)
const mockUserUpdate = vi.mocked(db.user.update)
const mockTransaction = vi.mocked(db.$transaction)
const mockFindMany = vi.mocked(db.userUnit.findMany)

const baseInput = {
  name: 'Alice',
  email: 'alice@test.com',
  isAdmin: false,
  isCaretaker: false,
}

describe('updateUser — Shareholder validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindFirst.mockResolvedValue(null)
    mockUserUpdate.mockResolvedValue({} as never)
  })

  it('Rule 1: returns error when isShareholder is true and unit count is 0', async () => {
    mockCount.mockResolvedValue(0)
    mockFindUnique.mockResolvedValue(null)
    const result = await updateUser('user-1', {
      ...baseInput,
      isDirector: false,
      isShareholder: true,
    })
    expect(result.data).toBeNull()
    expect(result.error).toBe('A Shareholder must have at least one unit assignment')
  })

  it('Rule 1 passes: no error when isShareholder is true and unit count > 0', async () => {
    mockCount.mockResolvedValue(2)
    mockFindUnique.mockResolvedValue(null)
    const result = await updateUser('user-1', {
      ...baseInput,
      isDirector: false,
      isShareholder: true,
    })
    expect(result.error).toBeNull()
    expect(mockUserUpdate).toHaveBeenCalledOnce()
  })

  it('Rule 2: returns error when isDirector is true and isShareholder is false', async () => {
    mockFindUnique.mockResolvedValue({ isDirector: false } as never)
    const result = await updateUser('user-1', {
      ...baseInput,
      isDirector: true,
      isShareholder: false,
    })
    expect(result.data).toBeNull()
    expect(result.error).toBe('A Director must also be a Shareholder')
  })

  it('Rule 3: returns error when removing Shareholder from a Director', async () => {
    mockFindUnique.mockResolvedValue({ isDirector: true } as never)
    const result = await updateUser('user-1', {
      ...baseInput,
      isDirector: false,
      isShareholder: false,
    })
    expect(result.data).toBeNull()
    expect(result.error).toBe('Cannot remove Shareholder from a Director — remove Director first')
  })

  it('Rule 3 passes: no error when removing Shareholder from a non-Director', async () => {
    mockFindUnique.mockResolvedValue({ isDirector: false } as never)
    const result = await updateUser('user-1', {
      ...baseInput,
      isDirector: false,
      isShareholder: false,
    })
    expect(result.error).toBeNull()
    expect(mockUserUpdate).toHaveBeenCalledOnce()
  })
})

describe('updateUserUnits — auto-remove isShareholder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(((ops: Promise<unknown>[]) => Promise.all(ops)) as never)
    vi.mocked(db.userUnit.delete).mockResolvedValue({} as never)
    vi.mocked(db.userUnit.createMany).mockResolvedValue({ count: 0 } as never)
    mockUserUpdate.mockResolvedValue({} as never)
  })

  it('calls $transaction with user.update isShareholder:false when all units removed from a Shareholder', async () => {
    mockFindMany.mockResolvedValue([{ unitId: 3 }, { unitId: 7 }] as never)
    mockFindUnique.mockResolvedValue({ isShareholder: true } as never)

    await updateUserUnits('user-1', [])

    expect(mockTransaction).toHaveBeenCalledOnce()
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isShareholder: false } }),
    )
  })

  it('does NOT update isShareholder when units remain after save', async () => {
    mockFindMany.mockResolvedValue([{ unitId: 3 }] as never)

    await updateUserUnits('user-1', [5])

    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    userUnit: {
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { assignUnit, removeUnit } from '@/lib/actions/units'

const mockUpsert = vi.mocked(db.userUnit.upsert)
const mockDelete = vi.mocked(db.userUnit.delete)

describe('assignUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue({} as never)
  })

  it('upserts the UserUnit row — idempotent on duplicate call', async () => {
    await assignUnit('user-1', 5)
    await assignUnit('user-1', 5)
    expect(mockUpsert).toHaveBeenCalledTimes(2)
    const call = mockUpsert.mock.calls[0][0]
    expect(call.where).toEqual({ userId_unitId: { userId: 'user-1', unitId: 5 } })
    expect(call.create).toEqual({ userId: 'user-1', unitId: 5 })
    expect(call.update).toEqual({})
  })

  it('returns success', async () => {
    const result = await assignUnit('user-1', 5)
    expect(result.error).toBeNull()
  })
})

describe('removeUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDelete.mockResolvedValue({} as never)
  })

  it('deletes the UserUnit row', async () => {
    await removeUnit('user-1', 5)
    expect(mockDelete).toHaveBeenCalledWith({
      where: { userId_unitId: { userId: 'user-1', unitId: 5 } },
    })
  })

  it('returns hasActiveOccupancy: false (stub)', async () => {
    const result = await removeUnit('user-1', 5)
    expect(result.data?.hasActiveOccupancy).toBe(false)
    expect(result.error).toBeNull()
  })
})

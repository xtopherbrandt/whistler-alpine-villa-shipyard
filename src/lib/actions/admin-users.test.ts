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
      deleteMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    invitationToken: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from '~/auth'
import { db } from '@/lib/db'
import {
  updateUser,
  updateUserUnits,
  reactivateUser,
  deactivateUser,
  cancelInvite,
  updateProfileFormAction,
  updateUnitsFormAction,
} from '@/lib/actions/admin-users'

const mockAuth = vi.mocked(auth)
const mockCount = vi.mocked(db.userUnit.count)
const mockFindFirst = vi.mocked(db.user.findFirst)
const mockFindUnique = vi.mocked(db.user.findUnique)
const mockUserUpdate = vi.mocked(db.user.update)
const mockTransaction = vi.mocked(db.$transaction)
const mockFindMany = vi.mocked(db.userUnit.findMany)
const mockInvitationTokenUpdateMany = vi.mocked(db.invitationToken.updateMany)

const baseInput = {
  name: 'Alice',
  email: 'alice@test.com',
  isAdmin: false,
  isCaretaker: false,
}

describe('updateUser — Shareholder validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'admin-id', isAdmin: true } } as never)
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
    mockAuth.mockResolvedValue({ user: { id: 'admin-id', isAdmin: true } } as never)
    mockTransaction.mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))
    vi.mocked(db.userUnit.deleteMany).mockResolvedValue({ count: 0 } as never)
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

describe('isAdmin guard — all privileged actions return Forbidden for non-admin callers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // non-admin authenticated session
    mockAuth.mockResolvedValue({ user: { id: 'caller-id', isAdmin: false } } as never)
  })

  it('updateUser returns Forbidden when caller is not admin', async () => {
    const result = await updateUser('user-1', {
      name: 'Alice',
      email: 'alice@test.com',
      isAdmin: false,
      isDirector: false,
      isShareholder: false,
      isCaretaker: false,
    })
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('updateUser returns Forbidden when caller has no session', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await updateUser('user-1', {
      name: 'Alice',
      email: 'alice@test.com',
      isAdmin: false,
      isDirector: false,
      isShareholder: false,
      isCaretaker: false,
    })
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('updateProfileFormAction returns Forbidden when caller is not admin', async () => {
    const fd = new FormData()
    fd.set('name', 'Alice')
    fd.set('email', 'alice@test.com')
    const result = await updateProfileFormAction('user-1', null, fd)
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('updateUserUnits returns Forbidden when caller is not admin', async () => {
    const result = await updateUserUnits('user-1', [1, 2])
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('updateUnitsFormAction returns Forbidden when caller is not admin', async () => {
    const fd = new FormData()
    fd.append('unitIds', '1')
    const result = await updateUnitsFormAction('user-1', null, fd)
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('reactivateUser returns Forbidden when caller is not admin', async () => {
    const result = await reactivateUser('user-1')
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('deactivateUser returns Forbidden when caller is not admin (non-self)', async () => {
    // caller is authenticated but not admin — different user so no self-deactivation conflict
    mockAuth.mockResolvedValue({ user: { id: 'caller-id', isAdmin: false } } as never)
    const result = await deactivateUser('other-user')
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('cancelInvite returns Forbidden when caller is not admin', async () => {
    const result = await cancelInvite('user-1')
    expect(result).toEqual({ data: null, error: 'Forbidden' })
    expect(mockInvitationTokenUpdateMany).not.toHaveBeenCalled()
  })
})

describe('cancelInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'admin-id', isAdmin: true } } as never)
    mockInvitationTokenUpdateMany.mockResolvedValue({ count: 1 } as never)
  })

  it('calls db.invitationToken.updateMany with usedAt: null filter and sets usedAt', async () => {
    await cancelInvite('user-1')
    expect(mockInvitationTokenUpdateMany).toHaveBeenCalledOnce()
    expect(mockInvitationTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    })
  })

  it('returns { data: null, error: null } on success', async () => {
    const result = await cancelInvite('user-1')
    expect(result).toEqual({ data: null, error: null })
  })
})

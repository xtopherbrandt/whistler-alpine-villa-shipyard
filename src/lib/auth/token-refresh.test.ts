import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { refreshStaleToken, STALE_MS } from '@/lib/auth/token-refresh'
import type { JWT } from 'next-auth/jwt'

const mockFindUnique = vi.mocked(db.user.findUnique)

function makeToken(overrides: Partial<JWT> = {}): JWT {
  return {
    id: 'user-1',
    isAdmin: false,
    isDirector: false,
    isShareholder: true,
    isCaretaker: false,
    isActive: true,
    lastChecked: 0,
    ...overrides,
  } as JWT
}

describe('refreshStaleToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not query the DB when the token is younger than the stale threshold', async () => {
    const now = 1_000_000
    const token = makeToken({ lastChecked: now - (STALE_MS - 1000) })

    const result = await refreshStaleToken(token, now)

    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(result).toEqual(token)
  })

  it('should query the DB and refresh role fields when the token is older than the stale threshold and the user is active with changed roles', async () => {
    const now = 1_000_000
    const token = makeToken({
      lastChecked: now - (STALE_MS + 1),
      isShareholder: true,
      isAdmin: false,
    })
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      isAdmin: true,
      isDirector: false,
      isShareholder: false,
      isCaretaker: false,
      isActive: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await refreshStaleToken(token, now)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    expect(result).toEqual({
      ...token,
      isAdmin: true,
      isDirector: false,
      isShareholder: false,
      isCaretaker: false,
      isActive: true,
      lastChecked: now,
    })
  })

  it('should zero all role flags and isActive when the DB user is inactive', async () => {
    const now = 1_000_000
    const token = makeToken({ lastChecked: now - (STALE_MS + 1) })
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      isAdmin: true,
      isDirector: true,
      isShareholder: true,
      isCaretaker: true,
      isActive: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await refreshStaleToken(token, now)

    expect(result).toEqual({
      ...token,
      isAdmin: false,
      isDirector: false,
      isShareholder: false,
      isCaretaker: false,
      isActive: false,
      lastChecked: now,
    })
  })

  it('should zero all role flags and isActive when the DB user no longer exists', async () => {
    const now = 1_000_000
    const token = makeToken({ lastChecked: now - (STALE_MS + 1) })
    mockFindUnique.mockResolvedValue(null)

    const result = await refreshStaleToken(token, now)

    expect(result).toEqual({
      ...token,
      isAdmin: false,
      isDirector: false,
      isShareholder: false,
      isCaretaker: false,
      isActive: false,
      lastChecked: now,
    })
  })
})

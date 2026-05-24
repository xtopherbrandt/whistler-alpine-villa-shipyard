import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}))

import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { createUser } from '@/lib/actions/users'
import type { CreateUserInput } from '@/lib/actions/users'

const mockFindUnique = vi.mocked(db.user.findUnique)
const mockTransaction = vi.mocked(db.$transaction)
const mockSendEmail = vi.mocked(sendEmail)

const input: CreateUserInput = {
  name: 'Bob Smith',
  email: 'bob@test.com',
  unitIds: [5],
  isAdmin: false,
  isDirector: false,
  isCaretaker: false,
}

const mockCreatedUser = {
  id: 'user-123',
  name: 'Bob Smith',
  email: 'bob@test.com',
  isAdmin: false,
  isDirector: false,
  isCaretaker: false,
  isActive: false,
  passwordHash: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeTx(user = mockCreatedUser) {
  return {
    user: { create: vi.fn().mockResolvedValue(user) },
    userUnit: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    invitationToken: { create: vi.fn().mockResolvedValue({}) },
  }
}

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue(undefined)
  })

  it('returns error if email already exists', async () => {
    mockFindUnique.mockResolvedValue(mockCreatedUser as never)
    const result = await createUser(input)
    expect(result.data).toBeNull()
    expect(result.error).toContain('already exists')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('creates user and sends invite email on success', async () => {
    mockFindUnique.mockResolvedValue(null)
    const tx = makeTx()
    mockTransaction.mockImplementation(async (callback) => callback(tx))
    const result = await createUser(input)
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'user-123', email: 'bob@test.com' })
    expect(tx.user.create).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  it('returns success even when invite email fails (logs server-side)', async () => {
    mockFindUnique.mockResolvedValue(null)
    const tx = makeTx()
    mockTransaction.mockImplementation(async (callback) => callback(tx))
    mockSendEmail.mockRejectedValue(new Error('SMTP failure'))
    const result = await createUser(input)
    expect(result.data).toMatchObject({ id: 'user-123' })
    expect(result.error).toBeNull()
  })
})

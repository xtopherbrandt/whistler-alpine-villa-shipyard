import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    invitationToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('~/auth', () => ({
  auth: vi.fn(),
}))


vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-pw') },
}))

import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { redirect } from 'next/navigation'
import { auth } from '~/auth'
import { createUser, activateAccount, resendInvite } from '@/lib/actions/users'
import { updateUser, deactivateUser, reactivateUser } from '@/lib/actions/admin-users'
import type { CreateUserInput } from '@/lib/actions/users'
import type { UpdateUserInput } from '@/lib/actions/admin-users'

const mockFindUnique = vi.mocked(db.user.findUnique)
const mockFindFirst = vi.mocked(db.user.findFirst)
const mockUserUpdate = vi.mocked(db.user.update)
const mockTokenFindUnique = vi.mocked(db.invitationToken.findUnique)
const mockTransaction = vi.mocked(db.$transaction)
const mockSendEmail = vi.mocked(sendEmail)
const mockRedirect = vi.mocked(redirect)
const mockAuth = vi.mocked(auth)

const createInput: CreateUserInput = {
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

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue(undefined)
  })

  it('returns error if email already exists', async () => {
    mockFindUnique.mockResolvedValue(mockCreatedUser as never)
    const result = await createUser(createInput)
    expect(result.data).toBeNull()
    expect(result.error).toContain('already exists')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('creates user and sends invite email on success', async () => {
    mockFindUnique.mockResolvedValue(null)
    const tx = makeTx()
    mockTransaction.mockImplementation(((callback: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => callback(tx)) as never)
    const result = await createUser(createInput)
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'user-123', email: 'bob@test.com' })
    expect(tx.user.create).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  it('returns error when invite email fails', async () => {
    mockFindUnique.mockResolvedValue(null)
    const tx = makeTx()
    mockTransaction.mockImplementation(((callback: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => callback(tx)) as never)
    mockSendEmail.mockRejectedValue(new Error('SMTP failure'))
    const result = await createUser(createInput)
    expect(result.data).toBeNull()
    expect(result.error).toContain('invite email failed to send')
  })
})

describe('activateAccount', () => {
  const now = Date.now()
  const validToken = {
    id: 'inv-1', userId: 'user-1', token: 'tok123',
    expiresAt: new Date(now + 60 * 60 * 1000), usedAt: null, createdAt: new Date(now - 1000),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(((ops: Promise<unknown>[]) => Promise.all(ops)) as never)
    mockUserUpdate.mockResolvedValue({} as never)
    vi.mocked(db.invitationToken.update).mockResolvedValue({} as never)
  })

  it('rejects expired token', async () => {
    mockTokenFindUnique.mockResolvedValue({ ...validToken, expiresAt: new Date(now - 1000) } as never)
    const result = await activateAccount('tok123', null, makeFormData({ password: 'goodpassword' }))
    expect(result?.error).toContain('expired')
  })

  it('activates account on valid token', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken as never)
    await activateAccount('tok123', null, makeFormData({ password: 'goodpassword' }))
    expect(mockTransaction).toHaveBeenCalledOnce()
    expect(mockUserUpdate.mock.calls[0][0].data).toMatchObject({ isActive: true })
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login'))
  })
})

describe('updateUser', () => {
  const updateInput: UpdateUserInput = {
    name: 'Alice Updated', email: 'alice@test.com',
    isAdmin: true, isDirector: false, isShareholder: false, isCaretaker: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'admin-id', isAdmin: true } } as never)
    mockUserUpdate.mockResolvedValue({ ...mockCreatedUser, ...updateInput, id: 'user-1' } as never)
  })

  it('returns error when email is used by a different user', async () => {
    mockFindFirst.mockResolvedValue({ id: 'user-999' } as never)
    const result = await updateUser('user-1', updateInput)
    expect(result.data).toBeNull()
    expect(result.error).toContain('already in use')
  })

  it('allows update when no conflicting email', async () => {
    mockFindFirst.mockResolvedValue(null)
    const result = await updateUser('user-1', updateInput)
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ email: 'alice@test.com' })
  })
})

describe('deactivateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(((ops: Promise<unknown>[]) => Promise.all(ops)) as never)
    mockUserUpdate.mockResolvedValue({} as never)
    vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 1 } as never)
  })

  it('prevents self-deactivation', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'target-id', isAdmin: true } } as never)
    const result = await deactivateUser('target-id')
    expect(result.error).toContain('cannot deactivate your own account')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('deactivates another user and deletes their sessions', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-id', isAdmin: true } } as never)
    const result = await deactivateUser('other-user')
    expect(result.error).toBeNull()
    expect(mockTransaction).toHaveBeenCalledOnce()
    expect(mockUserUpdate.mock.calls[0][0].data).toMatchObject({ isActive: false })
    expect(vi.mocked(db.session.deleteMany).mock.calls[0]?.[0]?.where).toMatchObject({ userId: 'other-user' })
  })
})

describe('resendInvite', () => {
  const inactiveUser = { isActive: false, name: 'Carol', email: 'carol@test.com' }
  const newInviteToken = { id: 'new-tok', userId: 'user-1', token: 'newtok64hex', expiresAt: new Date(), usedAt: null, createdAt: new Date() }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'admin-id', isAdmin: true } } as never)
    mockSendEmail.mockResolvedValue(undefined)
    vi.mocked(db.invitationToken.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(db.invitationToken.create).mockResolvedValue(newInviteToken as never)
  })

  it('returns Forbidden when called by a non-admin user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-id', isAdmin: false } } as never)
    const result = await resendInvite('user-1')
    expect(result.data).toBeNull()
    expect(result.error).toBe('Forbidden')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns error if user is already active', async () => {
    mockFindUnique.mockResolvedValue({ ...inactiveUser, isActive: true } as never)
    const result = await resendInvite('user-1')
    expect(result.error).toContain('already active')
  })

  it('invalidates old tokens and sends new invite', async () => {
    mockFindUnique.mockResolvedValue(inactiveUser as never)
    const result = await resendInvite('user-1')
    expect(result.error).toBeNull()
    expect(vi.mocked(db.invitationToken.updateMany)).toHaveBeenCalledOnce()
    expect(vi.mocked(db.invitationToken.create)).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })
})

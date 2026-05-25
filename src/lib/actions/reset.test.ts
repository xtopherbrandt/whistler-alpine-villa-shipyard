import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-pw') },
}))

import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { redirect } from 'next/navigation'
import { forgotPasswordAction, resetPasswordAction } from '@/lib/actions/reset'

const mockUserFindUnique = vi.mocked(db.user.findUnique)
const mockTokenCreate = vi.mocked(db.passwordResetToken.create)
const mockTokenFindUnique = vi.mocked(db.passwordResetToken.findUnique)
const mockTransaction = vi.mocked(db.$transaction)
const mockSendEmail = vi.mocked(sendEmail)
const mockRedirect = vi.mocked(redirect)

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('forgotPasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTokenCreate.mockResolvedValue({} as never)
    mockSendEmail.mockResolvedValue(undefined)
  })

  it('returns success without calling sendEmail for unregistered email', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const result = await forgotPasswordAction(null, makeFormData({ email: 'nobody@test.com' }))
    expect(result.data).toContain('If that email is registered')
    expect(result.error).toBeNull()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when sendEmail fails for registered email', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', name: 'Alice', email: 'alice@test.com' } as never)
    mockSendEmail.mockRejectedValue(new Error('SMTP failure'))
    const result = await forgotPasswordAction(null, makeFormData({ email: 'alice@test.com' }))
    expect(result.error).toContain('Failed to send reset email')
    expect(result.data).toBeNull()
  })

  it('creates a reset token and calls sendEmail for registered email', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', name: 'Alice', email: 'alice@test.com' } as never)
    const result = await forgotPasswordAction(null, makeFormData({ email: 'alice@test.com' }))
    expect(result.data).toContain('If that email is registered')
    expect(result.error).toBeNull()
    expect(mockTokenCreate).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledOnce()
    const createCall = mockTokenCreate.mock.calls[0][0]
    expect(createCall.data.userId).toBe('user-1')
    expect(createCall.data.token).toHaveLength(64)
  })
})

describe('resetPasswordAction', () => {
  const now = Date.now()
  const validToken = {
    id: 'token-1',
    userId: 'user-1',
    token: 'abc123',
    expiresAt: new Date(now + 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(now - 1000),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(((ops: Promise<unknown>[]) => Promise.all(ops)) as never)
    vi.mocked(db.user.update).mockResolvedValue({} as never)
    vi.mocked(db.passwordResetToken.update).mockResolvedValue({} as never)
  })

  it('rejects expired token', async () => {
    const expired = { ...validToken, expiresAt: new Date(now - 2 * 60 * 60 * 1000) }
    mockTokenFindUnique.mockResolvedValue(expired as never)
    const result = await resetPasswordAction('abc123', null, makeFormData({ password: 'newpassword' }))
    expect(result?.error).toContain('expired or has already been used')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects used token', async () => {
    const used = { ...validToken, usedAt: new Date() }
    mockTokenFindUnique.mockResolvedValue(used as never)
    const result = await resetPasswordAction('abc123', null, makeFormData({ password: 'newpassword' }))
    expect(result?.error).toContain('expired or has already been used')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects password shorter than 8 characters', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken as never)
    const result = await resetPasswordAction('abc123', null, makeFormData({ password: 'short' }))
    expect(result?.error).toContain('at least 8 characters')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects password longer than 72 characters', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken as never)
    const result = await resetPasswordAction('abc123', null, makeFormData({ password: 'a'.repeat(73) }))
    expect(result?.error).toContain('72 characters or fewer')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('updates passwordHash and marks token usedAt on valid token', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken as never)
    await resetPasswordAction('abc123', null, makeFormData({ password: 'validpassword' }))
    expect(mockTransaction).toHaveBeenCalledOnce()
    expect(vi.mocked(db.user.update).mock.calls[0][0].data.passwordHash).toBe('hashed-pw')
    expect(vi.mocked(db.passwordResetToken.update).mock.calls[0][0].data.usedAt).toBeInstanceOf(Date)
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login'))
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}))

import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { forgotPasswordAction } from '@/lib/actions/reset'

const mockFindUnique = vi.mocked(db.user.findUnique)
const mockCreate = vi.mocked(db.passwordResetToken.create)
const mockSendEmail = vi.mocked(sendEmail)

function makeFormData(email: string) {
  const fd = new FormData()
  fd.set('email', email)
  return fd
}

describe('forgotPasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({} as never)
    mockSendEmail.mockResolvedValue(undefined)
  })

  it('returns success message without calling sendEmail for unregistered email', async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await forgotPasswordAction(null, makeFormData('nobody@test.com'))
    expect(result.data).toContain('If that email is registered')
    expect(result.error).toBeNull()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('creates a reset token and calls sendEmail for registered email', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-1', name: 'Alice', email: 'alice@test.com' } as never)
    const result = await forgotPasswordAction(null, makeFormData('alice@test.com'))
    expect(result.data).toContain('If that email is registered')
    expect(result.error).toBeNull()
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledOnce()
    const createCall = mockCreate.mock.calls[0][0]
    expect(createCall.data.userId).toBe('user-1')
    expect(createCall.data.token).toHaveLength(64) // 32 bytes hex
  })
})

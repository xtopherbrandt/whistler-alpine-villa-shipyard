import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    constructor(type: string) {
      super(type)
      this.name = 'AuthError'
    }
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    loginAttempt: {
      count: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('~/auth', () => ({
  signIn: vi.fn(),
}))

import { AuthError } from 'next-auth'
import { db } from '@/lib/db'
import { signIn } from '~/auth'
import { loginAction } from '@/lib/actions/auth'

const mockCount = vi.mocked(db.loginAttempt.count)
const mockCreate = vi.mocked(db.loginAttempt.create)
const mockFindUnique = vi.mocked(db.user.findUnique)
const mockSignIn = vi.mocked(signIn)

function makeFormData(email: string, password: string) {
  const fd = new FormData()
  fd.set('email', email)
  fd.set('password', password)
  return fd
}

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({} as never)
  })

  it('returns lockout error after 5 failed attempts', async () => {
    mockCount.mockResolvedValue(5)
    const result = await loginAction(null, makeFormData('user@test.com', 'pass'))
    expect(result).toEqual({ data: null, error: 'Too many failed attempts. Try again in 15 minutes.' })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('records failed attempt and returns generic error on wrong credentials', async () => {
    mockCount.mockResolvedValue(0)
    mockSignIn.mockRejectedValue(new AuthError('CredentialsSignin'))
    const result = await loginAction(null, makeFormData('user@test.com', 'wrong'))
    expect(result).toEqual({ data: null, error: 'Invalid email or password.' })
    expect(mockCreate).toHaveBeenCalledWith({ data: { email: 'user@test.com', success: false } })
  })

  it('re-throws NEXT_REDIRECT on successful sign-in', async () => {
    mockCount.mockResolvedValue(0)
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    mockSignIn.mockRejectedValue(redirect)
    await expect(loginAction(null, makeFormData('user@test.com', 'correct'))).rejects.toThrow('NEXT_REDIRECT')
  })

  it('redirects admin users to /admin/users', async () => {
    mockCount.mockResolvedValue(0)
    mockFindUnique.mockResolvedValue({ isAdmin: true } as never)
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    mockSignIn.mockRejectedValue(redirect)
    await expect(loginAction(null, makeFormData('admin@test.com', 'pass'))).rejects.toThrow()
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'admin@test.com',
      password: 'pass',
      redirectTo: '/admin/users',
    })
  })

  it('uses callbackUrl from formData when it is a safe relative path', async () => {
    mockCount.mockResolvedValue(0)
    mockFindUnique.mockResolvedValue({ isAdmin: true } as never)
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    mockSignIn.mockRejectedValue(redirect)
    const fd = makeFormData('admin@test.com', 'pass')
    fd.set('callbackUrl', '/stays')
    await expect(loginAction(null, fd)).rejects.toThrow()
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'admin@test.com',
      password: 'pass',
      redirectTo: '/stays',
    })
  })

  it('ignores callbackUrl when it is an absolute URL (open redirect prevention)', async () => {
    mockCount.mockResolvedValue(0)
    mockFindUnique.mockResolvedValue({ isAdmin: true } as never)
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    mockSignIn.mockRejectedValue(redirect)
    const fd = makeFormData('admin@test.com', 'pass')
    fd.set('callbackUrl', 'https://evil.com')
    await expect(loginAction(null, fd)).rejects.toThrow()
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'admin@test.com',
      password: 'pass',
      redirectTo: '/admin/users',
    })
  })

  it('ignores callbackUrl starting with // (protocol-relative open redirect)', async () => {
    mockCount.mockResolvedValue(0)
    mockFindUnique.mockResolvedValue({ isAdmin: true } as never)
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    mockSignIn.mockRejectedValue(redirect)
    const fd = makeFormData('admin@test.com', 'pass')
    fd.set('callbackUrl', '//evil.com')
    await expect(loginAction(null, fd)).rejects.toThrow()
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'admin@test.com',
      password: 'pass',
      redirectTo: '/admin/users',
    })
  })
})

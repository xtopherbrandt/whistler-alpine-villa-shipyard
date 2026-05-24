'use server'

import { AuthError } from 'next-auth'
import { signIn, signOut } from '~/auth'
import { db } from '@/lib/db'
import type { ActionResult } from '@/lib/types'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5

export async function loginAction(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { data: null, error: 'Email and password are required.' }
  }

  // Rate limit: count failed attempts in the last 10 minutes
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
  const recentFailures = await db.loginAttempt.count({
    where: {
      email,
      success: false,
      attemptedAt: { gte: windowStart },
    },
  })

  if (recentFailures >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { data: null, error: 'Too many failed attempts. Try again in 15 minutes.' }
  }

  // Determine redirect target based on role
  const user = await db.user.findUnique({ where: { email }, select: { isAdmin: true } })
  const redirectTo = user?.isAdmin ? '/admin/users' : '/'

  try {
    await signIn('credentials', { email, password, redirectTo })
    // signIn with redirectTo throws NEXT_REDIRECT on success — this line is unreachable
    return { data: undefined, error: null }
  } catch (e) {
    if (e instanceof AuthError) {
      await db.loginAttempt.create({ data: { email, success: false } })
      return { data: null, error: 'Invalid email or password.' }
    }
    // Re-throw NEXT_REDIRECT and any other errors
    throw e
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

'use server'

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { PasswordResetEmail } from '@/lib/email/PasswordResetEmail'
import type { ActionResult } from '@/lib/types'

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

const SUCCESS_MESSAGE = 'If that email is registered, a reset link has been sent.'

export async function forgotPasswordAction(
  _prevState: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const email = formData.get('email') as string
  if (!email) return { data: null, error: 'Email is required.' }

  const user = await db.user.findUnique({ where: { email } })

  // Email-blind: same response whether user exists or not
  if (!user) {
    return { data: SUCCESS_MESSAGE, error: null }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  await sendEmail({
    to: email,
    subject: 'Reset your password — Whistler Alpine Villa',
    react: PasswordResetEmail({ resetUrl, name: user.name }),
  })

  return { data: SUCCESS_MESSAGE, error: null }
}

const TOKEN_INVALID_ERROR = 'This link has expired or has already been used.'

export async function resetPasswordAction(
  token: string,
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const password = formData.get('password') as string

  if (!password || password.length < 8) {
    return { data: null, error: 'Password must be at least 8 characters.' }
  }
  if (password.length > 72) {
    return { data: null, error: 'Password must be 72 characters or fewer.' }
  }

  const record = await db.passwordResetToken.findUnique({ where: { token } })

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return { data: null, error: TOKEN_INVALID_ERROR }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { token: record.token }, data: { usedAt: new Date() } }),
  ])

  redirect('/login?message=Password+updated.+Please+log+in.')
}

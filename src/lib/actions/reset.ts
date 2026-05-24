'use server'

import crypto from 'crypto'
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

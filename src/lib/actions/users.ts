'use server'

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { InviteEmail } from '@/lib/email/InviteEmail'
import type { ActionResult } from '@/lib/types'
import type { InvitationToken, User } from '@prisma/client'

const INVITE_EXPIRY_HOURS = 72

export interface CreateUserInput {
  name: string
  email: string
  unitIds: number[]
  isAdmin: boolean
  isDirector: boolean
  isCaretaker: boolean
}

export async function createInviteToken(userId: string): Promise<InvitationToken> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000)
  return db.invitationToken.create({ data: { userId, token, expiresAt } })
}

export async function createUser(data: CreateUserInput): Promise<ActionResult<User>> {
  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return { data: null, error: 'An account with this email already exists.' }
  }

  // Atomic: User + UserUnit records + InvitationToken
  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        isAdmin: data.isAdmin,
        isDirector: data.isDirector,
        isCaretaker: data.isCaretaker,
        isActive: false,
        passwordHash: null,
      },
    })

    if (data.unitIds.length > 0) {
      await tx.userUnit.createMany({
        data: data.unitIds.map((unitId) => ({ userId: newUser.id, unitId })),
      })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000)
    await tx.invitationToken.create({ data: { userId: newUser.id, token, expiresAt } })

    return { user: newUser, token }
  })

  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${user.token}`

  try {
    await sendEmail({
      to: data.email,
      subject: 'Your invitation to Whistler Alpine Villa',
      react: InviteEmail({ recipientName: data.name, activationUrl }),
    })
  } catch (emailError) {
    console.error('[createUser] invite email failed — user created, invite must be resent:', emailError)
  }

  return { data: user.user, error: null }
}

const INVITE_INVALID_ERROR =
  'This invitation has expired. Please ask your administrator to resend the invite.'

export async function activateAccount(
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

  const record = await db.invitationToken.findUnique({ where: { token } })

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return { data: null, error: INVITE_INVALID_ERROR }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash, isActive: true } }),
    db.invitationToken.update({ where: { token: record.token }, data: { usedAt: new Date() } }),
  ])

  redirect('/login?message=Account+activated.+Please+log+in.')
}

export async function resendInvite(userId: string): Promise<ActionResult<void>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isActive: true, name: true, email: true },
  })

  if (!user) return { data: null, error: 'User not found.' }
  if (user.isActive) return { data: null, error: 'This user is already active.' }

  await db.invitationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } })

  const newToken = await createInviteToken(userId)
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newToken.token}`

  try {
    await sendEmail({
      to: user.email,
      subject: 'Your invitation to Whistler Alpine Villa',
      react: InviteEmail({ recipientName: user.name, activationUrl }),
    })
  } catch (emailError) {
    console.error('[resendInvite] email failed:', emailError)
  }

  return { data: undefined, error: null }
}

export async function createUserFormAction(
  _prevState: ActionResult<User> | null,
  formData: FormData,
): Promise<ActionResult<User>> {
  const unitIds = (formData.getAll('unitIds') as string[]).map(Number).filter((n) => !isNaN(n))
  const result = await createUser({
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    isAdmin: formData.get('isAdmin') === 'on',
    isDirector: formData.get('isDirector') === 'on',
    isCaretaker: formData.get('isCaretaker') === 'on',
    unitIds,
  })
  if (result.error) return result
  redirect('/admin/users')
}

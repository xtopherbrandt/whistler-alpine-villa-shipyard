'use server'

import crypto from 'crypto'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { InviteEmail } from '@/lib/email/InviteEmail'
import type { ActionResult } from '@/lib/types'
import type { User, InvitationToken } from '@prisma/client'

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

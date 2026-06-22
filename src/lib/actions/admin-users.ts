'use server'

import { auth } from '~/auth'
import { db } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import { toUtcDate } from '@/lib/utils/dates'
import type { User } from '@prisma/client'

async function requireAdmin(): Promise<{ data: null; error: string } | null> {
  const session = await auth()
  if (!session?.user?.isAdmin) return { data: null, error: 'Forbidden' }
  return null
}

export interface UpdateUserInput {
  name: string
  email: string
  isAdmin: boolean
  isDirector: boolean
  isShareholder: boolean
  isCaretaker: boolean
}

async function validateShareholderRules(
  id: string,
  data: Pick<UpdateUserInput, 'isShareholder' | 'isDirector'>,
): Promise<{ data: null; error: string } | null> {
  const [unitCount, currentUser] = await Promise.all([
    data.isShareholder ? db.userUnit.count({ where: { userId: id } }) : Promise.resolve(1),
    data.isShareholder === false || data.isDirector
      ? db.user.findUnique({ where: { id } })
      : Promise.resolve(null),
  ])

  if (data.isShareholder && unitCount === 0) {
    return { data: null, error: 'A Shareholder must have at least one unit assignment' }
  }
  if (data.isShareholder === false && currentUser?.isDirector) {
    return { data: null, error: 'Cannot remove Shareholder from a Director — remove Director first' }
  }
  if (data.isDirector && !data.isShareholder) {
    return { data: null, error: 'A Director must also be a Shareholder' }
  }
  return null
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<ActionResult<User>> {
  const guard = await requireAdmin()
  if (guard) return guard

  const conflicting = await db.user.findFirst({
    where: { email: data.email, id: { not: id } },
  })
  if (conflicting) return { data: null, error: 'That email address is already in use.' }

  const validationError = await validateShareholderRules(id, data)
  if (validationError) return validationError

  const updated = await db.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      isAdmin: data.isAdmin,
      isDirector: data.isDirector,
      isShareholder: data.isShareholder,
      isCaretaker: data.isCaretaker,
    },
  })

  return { data: updated, error: null }
}

export async function deactivateUser(id: string): Promise<ActionResult<void>> {
  const session = await auth()
  if (!session?.user?.isAdmin) return { data: null, error: 'Forbidden' }
  if (session.user.id === id) {
    return { data: null, error: 'You cannot deactivate your own account.' }
  }

  await db.$transaction([
    db.user.update({ where: { id }, data: { isActive: false } }),
    db.session.deleteMany({ where: { userId: id } }),
  ])

  return { data: undefined, error: null }
}

export async function cancelInvite(userId: string): Promise<ActionResult<null>> {
  const guard = await requireAdmin()
  if (guard) return guard
  await db.invitationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })
  return { data: null as null, error: null }
}

export async function reactivateUser(id: string): Promise<ActionResult<void>> {
  const guard = await requireAdmin()
  if (guard) return guard

  await db.user.update({ where: { id }, data: { isActive: true } })
  return { data: undefined, error: null }
}

export async function updateProfileFormAction(
  id: string,
  _prevState: ActionResult<User> | null,
  formData: FormData,
): Promise<ActionResult<User>> {
  const guard = await requireAdmin()
  if (guard) return guard

  return updateUser(id, {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    isAdmin: formData.get('isAdmin') === 'on',
    isDirector: formData.get('isDirector') === 'on',
    isShareholder: formData.get('isShareholder') === 'on',
    isCaretaker: formData.get('isCaretaker') === 'on',
  })
}

export async function updateUnitsFormAction(
  userId: string,
  _prevState: ActionResult<{ occupancyWarnings: number[] }> | null,
  formData: FormData,
): Promise<ActionResult<{ occupancyWarnings: number[] }>> {
  const guard = await requireAdmin()
  if (guard) return guard

  const unitIds = (formData.getAll('unitIds') as string[]).map(Number).filter((n) => !isNaN(n))
  return updateUserUnits(userId, unitIds)
}

export async function updateUserUnits(
  userId: string,
  newUnitIds: number[],
): Promise<ActionResult<{ occupancyWarnings: number[] }>> {
  const guard = await requireAdmin()
  if (guard) return guard

  const current = await db.userUnit.findMany({ where: { userId }, select: { unitId: true } })
  const currentIds = current.map((r) => r.unitId)

  const toAdd = newUnitIds.filter((id) => !currentIds.includes(id))
  const toRemove = currentIds.filter((id) => !newUnitIds.includes(id))

  await db.$transaction(async (tx) => {
    if (toAdd.length > 0) {
      await tx.userUnit.createMany({ data: toAdd.map((unitId) => ({ userId, unitId })), skipDuplicates: true })
    }
    if (toRemove.length > 0) {
      await tx.userUnit.deleteMany({ where: { userId, unitId: { in: toRemove } } })
      await tx.stay.updateMany({
        where: {
          userId,
          unitId: { in: toRemove },
          status: 'CONFIRMED',
          checkInDate: { gte: toUtcDate(new Date().toISOString().slice(0, 10)) },
        },
        data: { status: 'CANCELLED' },
      })
    }
    if (newUnitIds.length === 0) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { isShareholder: true } })
      if (user?.isShareholder) await tx.user.update({ where: { id: userId }, data: { isShareholder: false } })
    }
  })

  return { data: { occupancyWarnings: [] }, error: null }
}

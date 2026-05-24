'use server'

import { auth } from '~/auth'
import { db } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import type { User } from '@prisma/client'

export interface UpdateUserInput {
  name: string
  email: string
  isAdmin: boolean
  isDirector: boolean
  isCaretaker: boolean
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<ActionResult<User>> {
  const conflicting = await db.user.findFirst({
    where: { email: data.email, id: { not: id } },
  })
  if (conflicting) {
    return { data: null, error: 'That email address is already in use.' }
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      isAdmin: data.isAdmin,
      isDirector: data.isDirector,
      isCaretaker: data.isCaretaker,
    },
  })

  return { data: updated, error: null }
}

export async function deactivateUser(id: string): Promise<ActionResult<void>> {
  const session = await auth()
  if (session?.user?.id === id) {
    return { data: null, error: 'You cannot deactivate your own account.' }
  }

  await db.$transaction([
    db.user.update({ where: { id }, data: { isActive: false } }),
    db.session.deleteMany({ where: { userId: id } }),
  ])

  return { data: undefined, error: null }
}

export async function reactivateUser(id: string): Promise<ActionResult<void>> {
  await db.user.update({ where: { id }, data: { isActive: true } })
  return { data: undefined, error: null }
}

export async function updateProfileFormAction(
  id: string,
  _prevState: ActionResult<User> | null,
  formData: FormData,
): Promise<ActionResult<User>> {
  return updateUser(id, {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    isAdmin: formData.get('isAdmin') === 'on',
    isDirector: formData.get('isDirector') === 'on',
    isCaretaker: formData.get('isCaretaker') === 'on',
  })
}

export async function updateUnitsFormAction(
  userId: string,
  _prevState: ActionResult<{ occupancyWarnings: number[] }> | null,
  formData: FormData,
): Promise<ActionResult<{ occupancyWarnings: number[] }>> {
  const unitIds = (formData.getAll('unitIds') as string[]).map(Number).filter((n) => !isNaN(n))
  return updateUserUnits(userId, unitIds)
}

export async function updateUserUnits(
  userId: string,
  newUnitIds: number[],
): Promise<ActionResult<{ occupancyWarnings: number[] }>> {
  const current = await db.userUnit.findMany({ where: { userId }, select: { unitId: true } })
  const currentIds = current.map((r) => r.unitId)

  const toAdd = newUnitIds.filter((id) => !currentIds.includes(id))
  const toRemove = currentIds.filter((id) => !newUnitIds.includes(id))

  if (toAdd.length > 0) {
    await db.userUnit.createMany({
      data: toAdd.map((unitId) => ({ userId, unitId })),
      skipDuplicates: true,
    })
  }

  const occupancyWarnings: number[] = []
  for (const unitId of toRemove) {
    await db.userUnit.delete({ where: { userId_unitId: { userId, unitId } } })
    // Stub: hasActiveOccupancy always false until E001 wires real query
    occupancyWarnings.push(...(false ? [unitId] : []))
  }

  return { data: { occupancyWarnings }, error: null }
}

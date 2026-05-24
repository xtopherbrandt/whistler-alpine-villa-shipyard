'use server'

import { db } from '@/lib/db'
import type { ActionResult } from '@/lib/types'

export async function assignUnit(userId: string, unitId: number): Promise<ActionResult<void>> {
  await db.userUnit.upsert({
    where: { userId_unitId: { userId, unitId } },
    create: { userId, unitId },
    update: {},
  })
  return { data: undefined, error: null }
}

export async function removeUnit(
  userId: string,
  unitId: number,
): Promise<ActionResult<{ hasActiveOccupancy: boolean }>> {
  await db.userUnit.delete({ where: { userId_unitId: { userId, unitId } } })
  // hasActiveOccupancy stub: E001 will wire the real occupancy query
  return { data: { hasActiveOccupancy: false }, error: null }
}

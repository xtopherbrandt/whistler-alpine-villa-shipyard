'use server'

import { auth } from '~/auth'
import { db } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import type { Stay, Unit, Vehicle } from '@prisma/client'

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function requireShareholder(): Promise<
  { data: null; error: string } | { userId: string }
> {
  const session = await auth()
  if (!session?.user?.isShareholder) return { data: null, error: 'Forbidden' }
  return { userId: session.user.id }
}

async function requireUnitOwnership(
  userId: string,
  unitId: number,
): Promise<{ data: null; error: string } | null> {
  const membership = await db.userUnit.findFirst({ where: { userId, unitId } })
  if (!membership) return { data: null, error: 'Forbidden' }
  return null
}

interface StayInput {
  unitId: number
  checkInDate: string
  checkOutDate: string
  stayType: 'OWN' | 'GUEST'
  guestName?: string
  guestContact?: string
  vehicles: Array<{ licensePlate: string; make: string; model: string }>
}

function validateStayInput(input: StayInput): string | null {
  if (input.checkOutDate <= input.checkInDate)
    return 'Check-out date must be after check-in date'
  if (input.vehicles.length > 2) return 'A stay can include at most 2 vehicles'
  if (input.stayType === 'GUEST' && (!input.guestName || !input.guestContact))
    return 'Guest name and contact are required for guest delegations'
  if (input.guestContact && input.guestContact.length > 100)
    return 'Guest contact must be 100 characters or fewer'
  return null
}

async function sendGuestNotification(stay: Stay, input: StayInput): Promise<void> {
  const { sendEmail } = await import('@/lib/email/send')
  const { GuestNotificationEmail } = await import('@/lib/email/GuestNotificationEmail')
  const recipients = await db.user.findMany({
    where: { OR: [{ isCaretaker: true }, { isDirector: true }], isActive: true },
  })
  const unit = await db.unit.findUnique({ where: { id: stay.unitId } })
  const sender = await db.user.findUnique({ where: { id: stay.userId } })
  await Promise.all(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `Guest stay registered — ${unit?.description ?? `Unit ${stay.unitId}`}`,
        react: GuestNotificationEmail({
          unitDescription: unit?.description ?? `Unit ${stay.unitId}`,
          guestName: input.guestName!,
          guestContact: input.guestContact!,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          registeredByName: sender?.name ?? 'Unknown',
          vehicles: input.vehicles,
        }),
      }),
    ),
  )
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

export async function createStay(input: StayInput): Promise<ActionResult<Stay>> {
  const authResult = await requireShareholder()
  if ('error' in authResult) return authResult as ActionResult<Stay>
  const { userId } = authResult

  const unitId = Number(input.unitId)
  const forbidden = await requireUnitOwnership(userId, unitId)
  if (forbidden) return forbidden

  const validationError = validateStayInput(input)
  if (validationError) return { data: null, error: validationError }

  let stay: Stay
  try {
    stay = await db.$transaction(
      async (tx) => {
        const conflict = await tx.stay.findFirst({
          where: {
            unitId,
            status: 'CONFIRMED',
            checkInDate: { lt: new Date(input.checkOutDate + 'T00:00:00.000Z') },
            checkOutDate: { gt: new Date(input.checkInDate + 'T00:00:00.000Z') },
          },
        })
        if (conflict) throw Object.assign(new Error('OVERLAP'), { code: 'OVERLAP' })
        return tx.stay.create({
          data: {
            unitId,
            userId,
            stayType: input.stayType,
            checkInDate: new Date(input.checkInDate + 'T00:00:00.000Z'),
            checkOutDate: new Date(input.checkOutDate + 'T00:00:00.000Z'),
            guestName: input.guestName ?? null,
            guestContact: input.guestContact ?? null,
            vehicles: { create: input.vehicles },
          },
          include: { vehicles: true },
        })
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === 'OVERLAP')
      return { data: null, error: 'This unit already has a booking for those dates' }
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('could not serialize'))
      return {
        data: null,
        error: 'Another booking was just registered for those dates. Please try again.',
      }
    throw e
  }

  if (input.stayType === 'GUEST') {
    try {
      await sendGuestNotification(stay, input)
    } catch (e) {
      console.error('Guest notification failed:', e)
      return {
        data: stay,
        error: null,
        warning: 'Stay registered, but the caretaker notification could not be sent.',
      }
    }
  }

  return { data: stay, error: null }
}

export async function editStay(stayId: string, input: StayInput): Promise<ActionResult<Stay>> {
  const authResult = await requireShareholder()
  if ('error' in authResult) return authResult as ActionResult<Stay>
  const { userId } = authResult

  const existing = await db.stay.findUnique({ where: { id: stayId } })
  if (!existing || existing.userId !== userId) return { data: null, error: 'Forbidden' }

  const validationError = validateStayInput(input)
  if (validationError) return { data: null, error: validationError }

  let updated: Stay
  try {
    updated = await db.$transaction(
      async (tx) => {
        const conflict = await tx.stay.findFirst({
          where: {
            unitId: existing.unitId,
            status: 'CONFIRMED',
            id: { not: stayId },
            checkInDate: { lt: new Date(input.checkOutDate + 'T00:00:00.000Z') },
            checkOutDate: { gt: new Date(input.checkInDate + 'T00:00:00.000Z') },
          },
        })
        if (conflict) throw Object.assign(new Error('OVERLAP'), { code: 'OVERLAP' })
        await tx.vehicle.deleteMany({ where: { stayId } })
        return tx.stay.update({
          where: { id: stayId },
          data: {
            checkInDate: new Date(input.checkInDate + 'T00:00:00.000Z'),
            checkOutDate: new Date(input.checkOutDate + 'T00:00:00.000Z'),
            stayType: input.stayType,
            guestName: input.guestName ?? null,
            guestContact: input.guestContact ?? null,
            vehicles: { create: input.vehicles },
          },
          include: { vehicles: true },
        })
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === 'OVERLAP')
      return { data: null, error: 'This unit already has a booking for those dates' }
    throw e
  }

  return { data: updated, error: null }
}

export async function cancelStay(stayId: string): Promise<ActionResult<Stay>> {
  const authResult = await requireShareholder()
  if ('error' in authResult) return authResult as ActionResult<Stay>
  const { userId } = authResult

  const existing = await db.stay.findUnique({ where: { id: stayId } })
  if (!existing || existing.userId !== userId) return { data: null, error: 'Forbidden' }

  const cancelled = await db.stay.update({
    where: { id: stayId },
    data: { status: 'CANCELLED' },
  })
  return { data: cancelled, error: null }
}

export async function listStays(): Promise<
  ActionResult<Array<Stay & { vehicles: Vehicle[]; unit: Unit | null }>>
> {
  const authResult = await requireShareholder()
  if ('error' in authResult) return { data: null, error: 'Forbidden' }
  const { userId } = authResult

  const stays = await db.stay.findMany({
    where: { userId },
    include: { vehicles: true, unit: true },
    orderBy: { checkInDate: 'desc' },
  })
  return { data: stays, error: null }
}

export async function listUserUnits(): Promise<
  ActionResult<Array<{ id: number; description: string | null }>>
> {
  const authResult = await requireShareholder()
  if ('error' in authResult) return { data: null, error: 'Forbidden' }
  const { userId } = authResult

  const userUnits = await db.userUnit.findMany({
    where: { userId },
    include: { unit: true },
  })
  return { data: userUnits.map((uu) => ({ id: uu.unit.id, description: uu.unit.description })), error: null }
}

export async function getStay(
  stayId: string,
): Promise<ActionResult<Stay & { vehicles: Vehicle[]; unit: Unit | null }>> {
  const authResult = await requireShareholder()
  if ('error' in authResult) return { data: null, error: 'Forbidden' }
  const { userId } = authResult

  const stay = await db.stay.findUnique({
    where: { id: stayId },
    include: { vehicles: true, unit: true },
  })
  if (!stay || stay.userId !== userId) return { data: null, error: 'Not found' }
  return { data: stay, error: null }
}

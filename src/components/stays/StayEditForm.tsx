'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { editStay, cancelStay } from '@/lib/actions/stays'
import { parseVehicles } from '@/lib/utils/parse-vehicles'
import { VehicleFields, type VehicleEntry } from './VehicleFields'
import type { Stay, Vehicle, Unit } from '@prisma/client'

interface StayWithRelations extends Stay {
  vehicles: Vehicle[]
  unit: Unit | null
}

interface Props {
  stay: StayWithRelations
  units: Array<{ id: number; description: string }>
}

async function editStayAction(_: unknown, formData: FormData) {
  const stayId = formData.get('stayId') as string
  return editStay(stayId, {
    unitId: Number(formData.get('unitId')),
    checkInDate: formData.get('checkInDate') as string,
    checkOutDate: formData.get('checkOutDate') as string,
    stayType: formData.get('stayType') as 'OWN' | 'GUEST',
    guestName: (formData.get('guestName') as string) || undefined,
    guestContact: (formData.get('guestContact') as string) || undefined,
    vehicles: parseVehicles(formData),
  })
}

async function cancelStayAction(_: unknown, formData: FormData) {
  const stayId = formData.get('stayId') as string
  return cancelStay(stayId)
}

export function StayEditForm({ stay, units }: Props) {
  const router = useRouter()
  const [editState, editAction, isEditing] = useActionState(editStayAction, null)
  const [cancelState, cancelAction, isCancelling] = useActionState(cancelStayAction, null)
  const [stayType, setStayType] = useState<'OWN' | 'GUEST'>(stay.stayType)
  const [vehicles, setVehicles] = useState<VehicleEntry[]>(
    stay.vehicles.map(v => ({ licensePlate: v.licensePlate, make: v.make, model: v.model }))
  )

  useEffect(() => {
    if (editState?.data || cancelState?.data) router.push('/stays')
  }, [editState?.data, cancelState?.data, router])

  function toDateString(d: Date | string): string {
    return d instanceof Date ? d.toISOString().slice(0, 10) : d
  }

  const checkIn = toDateString(stay.checkInDate)
  const checkOut = toDateString(stay.checkOutDate)

  return (
    <div>
      <form action={editAction}>
        <input type="hidden" name="stayId" value={stay.id} />

        <label>
          Unit
          <select name="unitId" defaultValue={stay.unitId} required>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.description}</option>
            ))}
          </select>
        </label>

        <label>
          Check-in date
          <input type="date" name="checkInDate" defaultValue={checkIn} required />
        </label>

        <label>
          Check-out date
          <input type="date" name="checkOutDate" defaultValue={checkOut} required />
        </label>

        <fieldset>
          <legend>Stay type</legend>
          <label>
            <input type="radio" name="stayType" value="OWN" checked={stayType === 'OWN'}
              onChange={() => setStayType('OWN')} />
            Own stay
          </label>
          <label>
            <input type="radio" name="stayType" value="GUEST" checked={stayType === 'GUEST'}
              onChange={() => setStayType('GUEST')} />
            Guest delegation
          </label>
        </fieldset>

        {stayType === 'GUEST' && (
          <div>
            <label>
              Guest name
              <input type="text" name="guestName" defaultValue={stay.guestName ?? ''} required />
            </label>
            <label>
              Guest contact (phone or email)
              <input type="text" name="guestContact" defaultValue={stay.guestContact ?? ''} required maxLength={100} />
            </label>
          </div>
        )}

        <VehicleFields vehicles={vehicles} onChange={setVehicles} />

        {editState?.error && <p role="alert">{editState.error}</p>}
        <button type="submit" disabled={isEditing}>Save Changes</button>
      </form>

      <form action={cancelAction}>
        <input type="hidden" name="stayId" value={stay.id} />
        {cancelState?.error && <p role="alert">{cancelState.error}</p>}
        <button type="submit" disabled={isCancelling}>Cancel Stay</button>
      </form>
    </div>
  )
}

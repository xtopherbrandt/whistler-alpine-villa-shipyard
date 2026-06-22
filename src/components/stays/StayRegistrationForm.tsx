'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createStay } from '@/lib/actions/stays'
import { parseVehicles } from '@/lib/utils/parse-vehicles'
import { VehicleFields, type VehicleEntry } from './VehicleFields'

interface Props {
  units: Array<{ id: number; description: string }>
}

async function createStayAction(_: unknown, formData: FormData) {
  return createStay({
    unitId: Number(formData.get('unitId')),
    checkInDate: formData.get('checkInDate') as string,
    checkOutDate: formData.get('checkOutDate') as string,
    stayType: formData.get('stayType') as 'OWN' | 'GUEST',
    guestName: (formData.get('guestName') as string) || undefined,
    guestContact: (formData.get('guestContact') as string) || undefined,
    vehicles: parseVehicles(formData),
  })
}

export function StayRegistrationForm({ units }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createStayAction, null)
  const [stayType, setStayType] = useState<'OWN' | 'GUEST'>('OWN')
  const [vehicles, setVehicles] = useState<VehicleEntry[]>([])

  useEffect(() => {
    if (state?.data) router.push('/stays')
  }, [state?.data, router])

  return (
    <form action={formAction}>
      <label>
        Unit
        <select name="unitId" required>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.description}</option>
          ))}
        </select>
      </label>

      <label>
        Check-in date
        <input type="date" name="checkInDate" required />
      </label>

      <label>
        Check-out date
        <input type="date" name="checkOutDate" required />
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
            <input type="text" name="guestName" required />
          </label>
          <label>
            Guest contact (phone or email)
            <input type="text" name="guestContact" required maxLength={100} />
          </label>
        </div>
      )}

      <VehicleFields vehicles={vehicles} onChange={setVehicles} />

      {state?.error && <p role="alert">{state.error}</p>}
      {state?.data && state.warning && <p role="status">{state.warning}</p>}

      <button type="submit" disabled={isPending}>Register Stay</button>
    </form>
  )
}

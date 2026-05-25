'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfileFormAction, updateUnitsFormAction, deactivateUser, reactivateUser } from '@/lib/actions/admin-users'
import { resendInvite } from '@/lib/actions/users'
import type { Unit, User } from '@prisma/client'

interface Props {
  user: Pick<User, 'id' | 'name' | 'email' | 'isAdmin' | 'isShareholder' | 'isDirector' | 'isCaretaker' | 'isActive'>
  allUnits: Unit[]
  currentUnitIds: number[]
  isInvited: boolean
  isSelf: boolean
}

export function EditUserForm({ user, allUnits, currentUnitIds, isInvited, isSelf }: Props) {
  const router = useRouter()
  const [selectedUnits, setSelectedUnits] = useState<number[]>(currentUnitIds)
  const updateBound = updateProfileFormAction.bind(null, user.id)
  const deactivateBound = deactivateUser.bind(null, user.id)
  const reactivateBound = reactivateUser.bind(null, user.id)
  const updateUnitsBound = updateUnitsFormAction.bind(null, user.id)
  const resendBound = resendInvite.bind(null, user.id)

  const [profileState, profileAction, profilePending] = useActionState(updateBound, null)
  const [deactivateState, deactivateAction] = useActionState(deactivateBound, null)
  const [, reactivateAction] = useActionState(reactivateBound, null)
  const [unitsState, unitsAction] = useActionState(updateUnitsBound, null)
  const [, resendAction] = useActionState(resendBound, null)

  // Refresh server component after profile save so role checkboxes reflect the new DB state
  useEffect(() => {
    if (profileState?.data) router.refresh()
  }, [profileState, router])

  useEffect(() => {
    if (unitsState?.data) router.refresh()
  }, [unitsState, router])

  // Sync unit selection state when server data refreshes
  useEffect(() => {
    setSelectedUnits(currentUnitIds)
  }, [currentUnitIds])

  return (
    <div className="space-y-8">
      <form action={profileAction} className="space-y-4">
        <h2 className="font-semibold">Profile</h2>
        {profileState?.error && <p className="text-sm text-red-600" role="alert">{profileState.error}</p>}
        <Input label="Name" name="name" defaultValue={user.name} required />
        <Input label="Email" name="email" type="email" defaultValue={user.email} required />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Roles <span className="font-normal text-gray-400">(take effect on next page load)</span>
          </legend>
          <Checkbox name="isAdmin"       label="Admin"       defaultChecked={user.isAdmin} />
          <Checkbox name="isDirector"    label="Director"    defaultChecked={user.isDirector} />
          <Checkbox name="isShareholder" label="Shareholder" defaultChecked={user.isShareholder} />
          <Checkbox name="isCaretaker"   label="Caretaker"   defaultChecked={user.isCaretaker} />
        </fieldset>
        <button type="submit" disabled={profilePending}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50">
          {profilePending ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <form action={unitsAction} className="space-y-3">
        <h2 className="font-semibold">Unit Assignments</h2>
        {unitsState?.error && <p className="text-sm text-red-600">{unitsState.error}</p>}
        <div className="grid grid-cols-6 gap-1 rounded-md border p-3">
          {allUnits.map((unit) => (
            <label key={unit.id} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={selectedUnits.includes(unit.id)}
                onChange={() => setSelectedUnits((p) => p.includes(unit.id) ? p.filter((u) => u !== unit.id) : [...p, unit.id])} />
              {unit.id}
            </label>
          ))}
        </div>
        {selectedUnits.map((id) => <input key={id} type="hidden" name="unitIds" value={id} />)}
        <button type="submit" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Save units</button>
      </form>

      <div className="space-y-3 border-t pt-6">
        <h2 className="font-semibold">Account Actions</h2>
        {deactivateState?.error && <p className="text-sm text-red-600">{deactivateState.error}</p>}
        {user.isActive ? (
          <form action={deactivateAction}>
            <button type="submit" disabled={isSelf}
              title={isSelf ? 'You cannot deactivate your own account' : undefined}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
              Deactivate account
            </button>
          </form>
        ) : isInvited ? (
          <form action={deactivateAction}>
            <button type="submit"
              className="rounded-md border border-orange-300 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50">
              Cancel invite
            </button>
          </form>
        ) : (
          <form action={reactivateAction}>
            <button type="submit" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
              Reactivate account
            </button>
          </form>
        )}
        {isInvited && (
          <form action={resendAction}>
            <button type="submit" className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Resend invite</button>
          </form>
        )}
      </div>
    </div>
  )
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input {...props} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
    </div>
  )
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={defaultChecked} />{label}</label>
}

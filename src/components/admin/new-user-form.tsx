'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { createUserFormAction } from '@/lib/actions/users'
import type { Unit } from '@prisma/client'

interface Props {
  units: Unit[]
}

export function NewUserForm({ units }: Props) {
  const [isShareholder, setIsShareholder] = useState(false)
  const [selectedUnits, setSelectedUnits] = useState<number[]>([])
  const [state, action, pending] = useActionState(createUserFormAction, null)

  function handleUnitToggle(unitId: number) {
    setSelectedUnits((prev) =>
      prev.includes(unitId) ? prev.filter((u) => u !== unitId) : [...prev, unitId],
    )
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <Field label="Name" id="name" name="name" type="text" required />
      <Field label="Email" id="email" name="email" type="email" required />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Roles</legend>
        <Checkbox name="isAdmin" label="Admin" />
        <Checkbox name="isDirector" label="Director" />
        <Checkbox name="isCaretaker" label="Caretaker" />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isShareholder}
            onChange={(e) => {
              setIsShareholder(e.target.checked)
              if (!e.target.checked) setSelectedUnits([])
            }}
          />
          Shareholder
        </label>
      </fieldset>

      {isShareholder && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Units</p>
          <div className="grid grid-cols-6 gap-1 rounded-md border p-3">
            {units.map((unit) => (
              <label key={unit.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={selectedUnits.includes(unit.id)}
                  onChange={() => handleUnitToggle(unit.id)}
                />
                {unit.id}
              </label>
            ))}
          </div>
          {selectedUnits.map((id) => (
            <input key={id} type="hidden" name="unitIds" value={id} />
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create user & send invite'}
      </button>
    </form>
  )
}

function Field({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} {...props} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
    </div>
  )
}

function Checkbox({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} />
      {label}
    </label>
  )
}

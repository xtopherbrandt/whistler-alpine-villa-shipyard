'use client'

import { useActionState } from 'react'
import { activateAccount } from '@/lib/actions/users'

interface Props {
  token: string
}

export function ActivateForm({ token }: Props) {
  const boundAction = activateAccount.bind(null, token)
  const [state, action, pending] = useActionState(boundAction, null)

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Set your password</h1>
          <p className="text-gray-500 text-sm">Choose a password to activate your account.</p>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-400">8–72 characters</p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Activating…' : 'Activate account'}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/lib/actions/auth'

interface Props {
  successMessage?: string
  callbackUrl?: string
}

export function LoginForm({ successMessage, callbackUrl }: Props) {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Whistler Alpine Villa</h1>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <form action={action} className="space-y-4">
          {callbackUrl && (
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
          )}
          {successMessage && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
              {successMessage}
            </p>
          )}

          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <Link href="/forgot-password" className="underline hover:text-gray-900">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}

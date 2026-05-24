import Link from 'next/link'
import { ResetPasswordForm } from './reset-password-form'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 p-6 text-center">
          <h1 className="text-2xl font-bold">Invalid link</h1>
          <p className="text-gray-500 text-sm">
            This reset link is invalid. Please request a new one.
          </p>
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return <ResetPasswordForm token={token} />
}

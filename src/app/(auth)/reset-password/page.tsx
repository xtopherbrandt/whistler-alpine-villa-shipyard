import Link from 'next/link'
import { db } from '@/lib/db'
import { ResetPasswordForm } from './reset-password-form'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return <InvalidLink />
  }

  const record = await db.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return <InvalidLink expired />
  }

  return <ResetPasswordForm token={token} />
}

function InvalidLink({ expired = false }: { expired?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">{expired ? 'Link expired' : 'Invalid link'}</h1>
        <p className="text-gray-500 text-sm">
          {expired
            ? 'This link has expired or has already been used.'
            : 'This reset link is invalid. Please request a new one.'}
        </p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Request a new reset link
        </Link>
      </div>
    </div>
  )
}

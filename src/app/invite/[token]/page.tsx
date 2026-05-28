import { db } from '@/lib/db'
import { ActivateForm } from './activate-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const record = await db.invitationToken.findUnique({ where: { token } })
  const isValid = record && !record.usedAt && record.expiresAt > new Date()

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 p-6 text-center">
          <h1 className="text-2xl font-bold">Invitation expired</h1>
          <p className="text-gray-500 text-sm">
            This invitation has expired. Please ask your administrator to resend the invite.
          </p>
        </div>
      </div>
    )
  }

  return <ActivateForm token={token} />
}

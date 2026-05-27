import { auth } from '~/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { EditUserForm } from '@/components/admin/edit-user-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditUserPage({ params }: Props) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session?.user?.isAdmin) redirect('/')

  const user = await db.user.findUnique({
    where: { id },
    include: {
      units: { select: { unitId: true } },
      invitations: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!user) notFound()

  const allUnits = await db.unit.findMany({ orderBy: { id: 'asc' } })

  const now = new Date()
  const latestInvite = user.invitations[0]
  const isInvited = !user.isActive && !!latestInvite && !latestInvite.usedAt && latestInvite.expiresAt > now
  const isSelf = session.user.id === user.id

  return (
    <div className="p-6 max-w-lg">
      <a href="/admin/users" className="mb-4 block text-sm text-blue-600 hover:underline">
        ← Back to users
      </a>
      <h1 className="mb-6 text-2xl font-bold">Edit {user.name}</h1>
      <EditUserForm
        user={user}
        allUnits={allUnits}
        currentUnitIds={user.units.map((u) => u.unitId)}
        isInvited={isInvited}
        isSelf={isSelf}
      />
    </div>
  )
}

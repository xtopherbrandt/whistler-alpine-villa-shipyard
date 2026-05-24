import { auth } from '~/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'

async function fetchUsers() {
  return db.user.findMany({
    include: {
      units: { select: { unitId: true } },
      invitations: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  })
}

type UserRow = Awaited<ReturnType<typeof fetchUsers>>[number]

function deriveStatus(user: UserRow, now: Date): 'Active' | 'Invited' | 'Deactivated' {
  if (user.isActive) return 'Active'
  const latest = user.invitations[0]
  if (latest && !latest.usedAt && latest.expiresAt > now) return 'Invited'
  return 'Deactivated'
}

const STATUS_CLASSES = {
  Active: 'bg-green-100 text-green-700',
  Invited: 'bg-yellow-100 text-yellow-700',
  Deactivated: 'bg-gray-100 text-gray-600',
} as const

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/')

  const users = await fetchUsers()
  const now = new Date()

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link href="/admin/users/new" className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
          New User
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            {['Name', 'Email', 'Roles', 'Units', 'Status', ''].map((h) => (
              <th key={h} className="pb-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const roles = [
              user.isAdmin && 'Admin',
              user.isDirector && 'Director',
              user.isCaretaker && 'Caretaker',
            ].filter(Boolean).join(', ')
            const units = user.units.map((u) => u.unitId).sort((a, b) => a - b).join(', ')
            const status = deriveStatus(user, now)

            return (
              <tr key={user.id} className="border-b">
                <td className="py-3">{user.name}</td>
                <td className="py-3 text-gray-600">{user.email}</td>
                <td className="py-3 text-gray-500">{roles || '—'}</td>
                <td className="py-3 text-gray-600">{units || '—'}</td>
                <td className="py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
                    {status}
                  </span>
                </td>
                <td className="py-3">
                  <Link href={`/admin/users/${user.id}/edit`} className="text-blue-600 hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import { auth } from '~/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { NewUserForm } from '@/components/admin/new-user-form'

export default async function AdminNewUserPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!session.user?.isAdmin) redirect('/')

  const units = await db.unit.findMany({ orderBy: { id: 'asc' } })

  return (
    <div className="p-6 max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New User</h1>
      <NewUserForm units={units} />
    </div>
  )
}

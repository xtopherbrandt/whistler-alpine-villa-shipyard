import { listStays, listUserUnits } from '@/lib/actions/stays'
import { auth } from '~/auth'
import { redirect } from 'next/navigation'

export default async function StaysPage() {
  const session = await auth()
  if (!session?.user?.isShareholder) redirect('/login')

  const unitsResult = await listUserUnits()
  if (!unitsResult.data || unitsResult.data.length === 0) {
    return (
      <main>
        <h1>My Stays</h1>
        <p>No units are assigned to your account. Contact an administrator to get started.</p>
      </main>
    )
  }

  const result = await listStays()
  const stays = result.data ?? []

  return (
    <main>
      <h1>My Stays</h1>
      <a href="/stays/new">Register a stay</a>
      {stays.length === 0 ? (
        <p>No stays registered yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Unit</th><th>Check-in</th><th>Check-out</th>
              <th>Type</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stays.map((stay) => (
              <tr key={stay.id}>
                <td>{stay.unit?.description ?? `Unit ${stay.unitId}`}</td>
                <td>{stay.checkInDate.toISOString().slice(0, 10)}</td>
                <td>{stay.checkOutDate.toISOString().slice(0, 10)}</td>
                <td>{stay.stayType}</td>
                <td>{stay.status}</td>
                <td>
                  {stay.status === 'CONFIRMED' && (
                    <a href={`/stays/${stay.id}/edit`}>Edit / Cancel</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

import { auth } from '~/auth'
import { redirect } from 'next/navigation'
import { listUserUnits } from '@/lib/actions/stays'
import { StayRegistrationForm } from '@/components/stays/StayRegistrationForm'

export default async function NewStayPage() {
  const session = await auth()
  if (!session?.user?.isShareholder) redirect('/login')

  const unitsResult = await listUserUnits()
  if (!unitsResult.data || unitsResult.data.length === 0) redirect('/stays')
  const units = unitsResult.data.map(u => ({ id: u.id, description: u.description ?? `Unit ${u.id}` }))

  return (
    <main>
      <h1>Register a Stay</h1>
      <StayRegistrationForm units={units} />
    </main>
  )
}

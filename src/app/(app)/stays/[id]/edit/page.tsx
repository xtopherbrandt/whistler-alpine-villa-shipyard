import { auth } from '~/auth'
import { redirect, notFound } from 'next/navigation'
import { getStay, listUserUnits } from '@/lib/actions/stays'
import { StayEditForm } from '@/components/stays/StayEditForm'

interface Props { params: Promise<{ id: string }> }

export default async function EditStayPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.isShareholder) redirect('/login')

  const { id } = await params
  const [stayResult, unitsResult] = await Promise.all([getStay(id), listUserUnits()])

  if (!stayResult.data) notFound()
  if (stayResult.data.status === 'CANCELLED') redirect('/stays')

  const units = (unitsResult.data ?? []).map(u => ({ id: u.id, description: u.description ?? `Unit ${u.id}` }))

  return (
    <main>
      <h1>Edit Stay</h1>
      <StayEditForm stay={stayResult.data} units={units} />
    </main>
  )
}

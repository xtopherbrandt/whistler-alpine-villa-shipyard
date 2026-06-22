import { redirect } from 'next/navigation'
import { auth } from '~/auth'
import { db } from '@/lib/db'
import { toUtcDate } from '@/lib/utils/dates'
import { ShareholderHome } from './home/shareholder-home'
import { DirectorHome } from './home/director-home'
import { CaretakerStub } from './home/caretaker-stub'

export default async function HomePage() {
  const session = await auth()
  if (!session) redirect('/login')
  const user = session.user

  if (user.isShareholder) {
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Vancouver',
    }).format(new Date())
    const stays = await db.stay.findMany({
      where: {
        userId: user.id,
        status: 'CONFIRMED',
        checkOutDate: { gte: toUtcDate(todayStr) },
      },
      include: { unit: true },
      orderBy: { checkInDate: 'asc' },
    })
    return <ShareholderHome stays={stays} />
  }

  if (user.isDirector) {
    return <DirectorHome />
  }

  if (user.isCaretaker) {
    return <CaretakerStub />
  }

  return (
    <div className="p-8 text-center text-gray-500">
      <p>No content available for your account.</p>
    </div>
  )
}

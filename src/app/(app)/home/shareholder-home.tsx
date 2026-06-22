import Link from 'next/link'
import type { Stay, Unit } from '@prisma/client'

type StayWithUnit = Stay & { unit: Unit }

interface Props {
  stays: StayWithUnit[]
}

export function ShareholderHome({ stays }: Props) {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Your upcoming stays</h1>
      {stays.length === 0 ? (
        <p className="text-gray-500 mb-6">No upcoming stays. Planning a visit?</p>
      ) : (
        <ul className="space-y-3 mb-6">
          {stays.map((stay) => (
            <StayRow key={stay.id} stay={stay} />
          ))}
        </ul>
      )}
      <Link
        href="/stays/new"
        className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Register a stay
      </Link>
    </div>
  )
}

function StayRow({ stay }: { stay: StayWithUnit }) {
  return (
    <li className="border rounded-lg p-4">
      <div className="font-medium">Unit {stay.unit.id}</div>
      <div className="text-sm text-gray-600">
        {stay.checkInDate.toISOString().slice(0, 10)}
        <span aria-hidden="true"> → </span>
        <span className="sr-only"> to </span>
        {stay.checkOutDate.toISOString().slice(0, 10)}
      </div>
      <div className="text-sm text-gray-500 capitalize">{stay.stayType.toLowerCase()}</div>
    </li>
  )
}

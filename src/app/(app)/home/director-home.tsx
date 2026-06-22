import Link from 'next/link'

export function DirectorHome() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Administration</h1>
      <nav aria-label="Administration" className="space-y-2">
        <Link
          href="/admin/users"
          className="block rounded-md border px-4 py-3 hover:bg-gray-50"
        >
          Manage Users
        </Link>
      </nav>
    </div>
  )
}

import { logoutAction } from '@/lib/actions/auth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Whistler Alpine Villa</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  )
}

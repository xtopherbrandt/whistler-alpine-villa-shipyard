import { describe, it, expect, vi, beforeAll } from 'vitest'
import { db } from '@/lib/db'
import { refreshStaleToken, STALE_MS } from '@/lib/auth/token-refresh'
import type { JWT } from 'next-auth/jwt'

// NOTE: Unlike stays.integration.test.ts, this file deliberately does NOT
// `vi.mock('~/auth', ...)` to stub out session/role logic. refreshStaleToken
// doesn't even depend on `~/auth` (only on `db`), and the whole point of
// this test is to prove that the real refreshStaleToken (T050) and the real
// middleware role-check logic (T051/T057) compose correctly end-to-end
// against a real test DB. Do not "fix" this by adding that mock back.
//
// The `vi.mock('~/auth', () => ({ auth: (handler) => handler }))` below is
// a *different*, narrower mock: it neutralizes NextAuth's `auth()`
// middleware wrapper (which otherwise makes a real HTTP round-trip to fetch
// a session — see node_modules/next-auth/lib/index.js `handleAuth`) so the
// plain inner callback exported as `middleware.ts`'s default export can be
// invoked directly with a constructed `req.auth`, exactly as the existing
// `middleware.test.ts` does. It does not stub any role/auth decision logic
// under test here.
vi.mock('~/auth', () => ({ auth: (handler: unknown) => handler }))

type MiddlewareFn = (req: unknown, event: unknown) => Response | undefined

let middleware: MiddlewareFn

beforeAll(async () => {
  middleware = (await import('../../../middleware')).default as MiddlewareFn
})

const fakeEvent = {} as never

function makeMiddlewareReq(pathname: string, authSession: unknown) {
  return {
    auth: authSession,
    nextUrl: new URL(`https://example.com${pathname}`),
    url: `https://example.com${pathname}`,
  } as never
}

async function seedShareholder() {
  return db.user.upsert({
    where: { email: 'jwt-middleware-it@test.local' },
    create: {
      name: 'JWT Middleware IT User',
      email: 'jwt-middleware-it@test.local',
      passwordHash: 'x',
      isShareholder: true,
      isAdmin: false,
      isDirector: false,
      isCaretaker: false,
      isActive: true,
    },
    update: {
      isShareholder: true,
      isAdmin: false,
      isDirector: false,
      isCaretaker: false,
      isActive: true,
    },
  })
}

function makeStaleToken(userId: string, overrides: Partial<JWT> = {}): JWT {
  return {
    id: userId,
    isAdmin: false,
    isDirector: false,
    isShareholder: true,
    isCaretaker: false,
    isActive: true,
    lastChecked: Date.now() - (STALE_MS + 1_000),
    ...overrides,
  } as JWT
}

describe('refreshStaleToken + middleware composition (revoked role)', () => {
  it('refreshStaleToken reflects an active shareholder seeded in the real DB', async () => {
    const user = await seedShareholder()
    const staleToken = makeStaleToken(user.id)

    const refreshed = await refreshStaleToken(staleToken)

    expect(refreshed.isActive).toBe(true)
    expect(refreshed.isShareholder).toBe(true)
  })

  it('refreshStaleToken zeroes role flags and isActive once the user is deactivated in the real DB', async () => {
    const user = await seedShareholder()
    await db.user.update({ where: { id: user.id }, data: { isActive: false } })
    const staleToken = makeStaleToken(user.id)

    const refreshed = await refreshStaleToken(staleToken)

    expect(refreshed.isActive).toBe(false)
    expect(refreshed.isAdmin).toBe(false)
    expect(refreshed.isDirector).toBe(false)
    expect(refreshed.isShareholder).toBe(false)
    expect(refreshed.isCaretaker).toBe(false)
  })

  it('middleware redirects a /stays request carrying the deactivated-shape token (revoked role rejected)', async () => {
    const user = await seedShareholder()
    await db.user.update({ where: { id: user.id }, data: { isActive: false } })
    const staleToken = makeStaleToken(user.id)

    const refreshed = await refreshStaleToken(staleToken)
    const req = makeMiddlewareReq('/stays', { user: refreshed })

    const res = middleware(req, fakeEvent)

    expect(res).toBeInstanceOf(Response)
    expect((res as Response).headers.get('location')).toBe('https://example.com/')
  })

  it('middleware passes through a /stays request carrying the original active-shape token', async () => {
    const user = await seedShareholder()
    const staleToken = makeStaleToken(user.id)

    const refreshed = await refreshStaleToken(staleToken)
    const req = makeMiddlewareReq('/stays', { user: refreshed })

    const res = middleware(req, fakeEvent)

    expect(res).toBeUndefined()
  })
})

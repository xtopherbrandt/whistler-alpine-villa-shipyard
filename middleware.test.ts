import { describe, it, expect, vi } from 'vitest'

vi.mock('~/auth', () => ({
  auth: (handler: unknown) => handler,
}))

import middleware from './middleware'

function makeReq(pathname: string, authSession: unknown) {
  return {
    auth: authSession,
    nextUrl: new URL(`https://example.com${pathname}`),
    url: `https://example.com${pathname}`,
  } as never
}

const fakeEvent = {} as never

describe('middleware', () => {
  it('redirects an authenticated non-shareholder requesting /stays to /', () => {
    const req = makeReq('/stays', { user: { isShareholder: false } })

    const res = middleware(req, fakeEvent) as Response

    expect(res).toBeInstanceOf(Response)
    expect(res.headers.get('location')).toBe('https://example.com/')
  })

  it('redirects an authenticated non-shareholder requesting /stays/new to /', () => {
    const req = makeReq('/stays/new', { user: { isShareholder: false } })

    const res = middleware(req, fakeEvent) as Response

    expect(res).toBeInstanceOf(Response)
    expect(res.headers.get('location')).toBe('https://example.com/')
  })

  it('passes through an authenticated shareholder requesting /stays', () => {
    const req = makeReq('/stays', { user: { isShareholder: true } })

    const res = middleware(req, fakeEvent)

    expect(res).toBeUndefined()
  })

  it('redirects an unauthenticated request to /stays to /login with callbackUrl', () => {
    const req = makeReq('/stays', null)

    const res = middleware(req, fakeEvent) as Response

    expect(res).toBeInstanceOf(Response)
    expect(res.headers.get('location')).toBe('https://example.com/login?callbackUrl=%2Fstays')
  })

  it('does not apply the role check to a non-/stays path for a non-shareholder', () => {
    const req = makeReq('/', { user: { isShareholder: false } })

    const res = middleware(req, fakeEvent)

    expect(res).toBeUndefined()
  })
})

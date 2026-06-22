import { auth } from '~/auth'

export const runtime = 'nodejs'

export default auth((req) => {
  if (!req.auth) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
    return Response.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url))
  }
  if (req.nextUrl.pathname.startsWith('/stays') && !req.auth.user.isShareholder) {
    return Response.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon|login|forgot-password|reset-password|invite).*)',
  ],
}

import { db } from '@/lib/db'
import type { JWT } from 'next-auth/jwt'

export const STALE_MS = 5 * 60 * 1000

export async function refreshStaleToken(token: JWT, now: number = Date.now()): Promise<JWT> {
  if (token.lastChecked && now - token.lastChecked < STALE_MS) return token

  const user = await db.user.findUnique({ where: { id: token.id } })
  if (!user || !user.isActive) {
    return {
      ...token,
      isAdmin: false,
      isDirector: false,
      isShareholder: false,
      isCaretaker: false,
      isActive: false,
      lastChecked: now,
    }
  }

  return {
    ...token,
    isAdmin: user.isAdmin,
    isDirector: user.isDirector,
    isShareholder: user.isShareholder,
    isCaretaker: user.isCaretaker,
    isActive: user.isActive,
    lastChecked: now,
  }
}

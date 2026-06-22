import { describe, it, expect } from 'vitest'
import { toUtcDate } from '@/lib/utils/dates'

describe('toUtcDate', () => {
  it('should construct UTC midnight when given a date string', () => {
    expect(toUtcDate('2026-06-15').toISOString()).toBe('2026-06-15T00:00:00.000Z')
  })

  it('should return a Date instance when given a valid date string', () => {
    expect(toUtcDate('2026-01-01')).toBeInstanceOf(Date)
  })

  it('should preserve the calendar date across timezones when given a date string', () => {
    const result = toUtcDate('2026-12-31')
    expect(result.getUTCFullYear()).toBe(2026)
    expect(result.getUTCMonth()).toBe(11)
    expect(result.getUTCDate()).toBe(31)
  })
})

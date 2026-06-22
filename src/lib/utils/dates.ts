export function toUtcDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z')
}

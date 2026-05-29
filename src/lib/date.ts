/**
 * Returns today's date as a YYYY-MM-DD string.
 * This is the single authorised place in the app that reads the real system
 * clock. Store code calls this once at action time and passes the value down.
 */
export function todayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns the YYYY-MM-DD date that is `days` calendar days before `date`. */
export function subtractDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d) - days * 86_400_000
  const dt = new Date(ms)
  return [
    dt.getUTCFullYear(),
    String(dt.getUTCMonth() + 1).padStart(2, '0'),
    String(dt.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

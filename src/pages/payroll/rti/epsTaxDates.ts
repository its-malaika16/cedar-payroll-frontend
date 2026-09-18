/** UK tax month: 6th of one calendar month through the 5th of the next. */

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatIsoDate(value: string) {
  if (!value) return ''
  return parseIsoDate(value).toLocaleDateString('en-GB')
}

function addCalendarMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate())
}

export function currentTaxMonth(today = new Date()) {
  const start =
    today.getDate() >= 6
      ? new Date(today.getFullYear(), today.getMonth(), 6)
      : new Date(today.getFullYear(), today.getMonth() - 1, 6)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 5)
  return { start, end }
}

export type TaxDateOption = { value: string; label: string }

/** Upcoming tax-month starts (6ths) — not past or current. */
export function inactivityStartOptions(today = new Date()): TaxDateOption[] {
  const { start: currentStart } = currentTaxMonth(today)
  const nextStart = addCalendarMonths(currentStart, 1)
  return Array.from({ length: 12 }, (_, i) => {
    const date = addCalendarMonths(nextStart, i)
    return { value: toIsoDate(date), label: date.toLocaleDateString('en-GB') }
  })
}

/** Ends on the 5th, 1–12 tax months after the chosen start. */
export function inactivityEndOptions(startIso: string): TaxDateOption[] {
  if (!startIso) return []
  const start = parseIsoDate(startIso)
  return Array.from({ length: 12 }, (_, i) => {
    const months = i + 1
    const end = new Date(start.getFullYear(), start.getMonth() + months, 5)
    return { value: toIsoDate(end), label: end.toLocaleDateString('en-GB') }
  })
}

/** Past and current tax-month starts (6ths) — not future. */
export function noPaymentStartOptions(today = new Date()): TaxDateOption[] {
  const { start: currentStart } = currentTaxMonth(today)
  return Array.from({ length: 12 }, (_, i) => {
    const date = addCalendarMonths(currentStart, -(11 - i))
    return { value: toIsoDate(date), label: date.toLocaleDateString('en-GB') }
  })
}

/** Ends on the 5th, from one month after start up to the current tax month. */
export function noPaymentEndOptions(startIso: string, today = new Date()): TaxDateOption[] {
  if (!startIso) return []
  const start = parseIsoDate(startIso)
  const { end: currentEnd } = currentTaxMonth(today)
  const options: TaxDateOption[] = []
  for (let months = 1; months <= 12; months += 1) {
    const end = new Date(start.getFullYear(), start.getMonth() + months, 5)
    if (end > currentEnd) break
    options.push({ value: toIsoDate(end), label: end.toLocaleDateString('en-GB') })
  }
  return options
}

export function isFutureIsoDate(value: string, today = new Date()) {
  if (!value) return false
  const date = parseIsoDate(value)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return date > startOfToday
}

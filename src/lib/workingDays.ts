export const DEFAULT_WORKING_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function parseUsualWorkingDays(value?: string | string[] | null) {
  const parts = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value ?? '')
        .split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean)
  if (parts.length === 0) return [...DEFAULT_WORKING_DAYS]
  return parts.map((part) => {
    const match = WEEKDAY_NAMES.find((name) =>
      name.toLowerCase().startsWith(part.toLowerCase().slice(0, 3)),
    )
    return match ?? part
  })
}

export function workingDaysFromEmployee(employee?: {
  employment_details?: Record<string, unknown>[] | Record<string, unknown> | null
} | null) {
  const raw = employee?.employment_details
  const details = Array.isArray(raw) ? raw[0] : raw
  const value =
    details && typeof details === 'object'
      ? (details as { usual_working_days?: unknown }).usual_working_days
      : undefined
  if (Array.isArray(value)) return parseUsualWorkingDays(value.map((item) => String(item)))
  return parseUsualWorkingDays(value == null ? null : String(value))
}

export function isWorkingDay(date: Date, usualWorkingDays?: string[] | null) {
  const days = usualWorkingDays?.length ? usualWorkingDays : DEFAULT_WORKING_DAYS
  const name = WEEKDAY_NAMES[date.getDay()]
  return days.some((day) => day.toLowerCase() === name.toLowerCase())
}

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function countWorkingDays(
  start: string,
  end: string,
  usualWorkingDays?: string[] | null,
  partial = false,
) {
  if (partial) return 0.5
  const from = parseDateKey(start)
  const to = parseDateKey(end)
  if (!from || !to || to < from) return 0
  let count = 0
  const cursor = new Date(from)
  while (cursor.getTime() <= to.getTime()) {
    if (isWorkingDay(cursor, usualWorkingDays)) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

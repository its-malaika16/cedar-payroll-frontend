export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = next.getDay()
  const offset = (weekday - weekStartsOn + 7) % 7
  next.setDate(next.getDate() - offset)
  return next
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

export function weekDays(weekStart: Date, length = 7): Date[] {
  return Array.from({ length }, (_, index) => addDays(weekStart, index))
}

export function daysInPeriod(start: Date, end: Date): Date[] {
  const days: Date[] = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}

export function chunkWeeks(days: Date[], size = 7): Date[][] {
  if (days.length === 0) return []
  const weeks: Date[][] = []
  for (let index = 0; index < days.length; index += size) {
    const week = days.slice(index, index + size)
    while (week.length < size) {
      week.push(addDays(week[week.length - 1]!, 1))
    }
    weeks.push(week)
  }
  return weeks
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const startDay = weekStart.getDate()
  const endDay = end.getDate()
  const endMonth = end.toLocaleDateString('en-GB', { month: 'long' })
  const year = end.getFullYear()
  if (weekStart.getMonth() === end.getMonth()) {
    return `${startDay}–${endDay} ${endMonth} ${year}`
  }
  const startMonth = weekStart.toLocaleDateString('en-GB', { month: 'long' })
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`
}

export function formatDayHeader(date: Date): string {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' })
  const day = date.getDate()
  const month = date.toLocaleDateString('en-GB', { month: 'short' })
  return `${weekday} ${day} ${month}`
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function currentPeriodAnchor(view: 'week' | 'month', on = new Date()): Date {
  if (view === 'week') return startOfWeek(on)
  return new Date(on.getFullYear(), on.getMonth(), 1)
}

export function weeksInMonth(anchor: Date, weekStartsOn = 1): Date[][] {
  const month = anchor.getMonth()
  const year = anchor.getFullYear()
  const last = new Date(year, month + 1, 0)
  let cursor = startOfWeek(new Date(year, month, 1), weekStartsOn)
  const weeks: Date[][] = []

  while (weeks.length < 6) {
    const week = weekDays(cursor)
    if (week.some((day) => day.getMonth() === month)) weeks.push(week)
    cursor = addDays(cursor, 7)
    if (cursor > last && cursor.getMonth() !== month) break
  }

  return weeks
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function sameDay(left: Date, right: Date): boolean {
  return dateKey(left) === dateKey(right)
}

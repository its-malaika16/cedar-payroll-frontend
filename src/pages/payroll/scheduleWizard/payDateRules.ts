import { taxMonthFromDate, taxWeekFromDate, taxYearEndDate, taxYearStartDate, taxYearStartFromDate } from '../../../lib/hmrcTaxCalendar'

export type PayFrequency =
  | 'WEEKLY'
  | 'FORTNIGHTLY'
  | 'FOUR_WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY'

export const FREQUENCY_META: Record<
  PayFrequency,
  { title: string; unit: string; adjective: string }
> = {
  WEEKLY: { title: 'Weekly', unit: 'week', adjective: 'weekly' },
  FORTNIGHTLY: { title: 'Fortnightly', unit: 'fortnight', adjective: 'fortnightly' },
  FOUR_WEEKLY: { title: '4-Weekly', unit: '4-week', adjective: '4-weekly' },
  MONTHLY: { title: 'Monthly', unit: 'month', adjective: 'monthly' },
  QUARTERLY: { title: 'Quarterly', unit: 'quarter', adjective: 'quarterly' },
  YEARLY: { title: 'Yearly', unit: 'year', adjective: 'yearly' },
}

export function periodPayLabel(frequency?: string | null) {
  const key = String(frequency ?? '').toUpperCase()
  const meta = FREQUENCY_META[key as PayFrequency] ?? FREQUENCY_META.WEEKLY
  return `${meta.title} Pay`
}

export const WEEKDAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' },
] as const

export type PayDateRuleKey =
  | 'period_end'
  | 'days_before'
  | 'days_after'
  | 'weekday_on_or_before'
  | 'weekday_on_or_after'
  | 'weekdays_before'
  | 'weekdays_after'
  | `${string}_on_or_before`
  | `${string}_on_or_after`
  | `${string}s_before`
  | `${string}s_after`

export type PayDateRule = {
  key: string
  count: number
  weekday: number
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function formatPreviewDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' })
  const rest = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${weekday}, ${rest}`
}

export function taxYearLabel(taxYear: number): string {
  return `${taxYear}/${String(taxYear + 1).slice(-2)}`
}

function onOrBeforeWeekday(date: Date, weekday: number): Date {
  const delta = (date.getDay() - weekday + 7) % 7
  return addDays(date, -delta)
}

function onOrAfterWeekday(date: Date, weekday: number): Date {
  const delta = (weekday - date.getDay() + 7) % 7
  return addDays(date, delta)
}

function nthWeekdayBefore(date: Date, weekday: number, count: number): Date {
  let cursor = onOrBeforeWeekday(addDays(date, -1), weekday)
  for (let index = 1; index < count; index += 1) cursor = addDays(cursor, -7)
  return cursor
}

function nthWeekdayAfter(date: Date, weekday: number, count: number): Date {
  let cursor = onOrAfterWeekday(addDays(date, 1), weekday)
  for (let index = 1; index < count; index += 1) cursor = addDays(cursor, 7)
  return cursor
}

export function weekdayFromKey(key: string): number | null {
  const match = key.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
  if (!match) return null
  const found = WEEKDAYS.find((day) => day.name.toLowerCase() === match[1].toLowerCase())
  return found ? found.id : null
}

export function applyPayDateRule(periodEnd: Date, rule: PayDateRule): Date {
  const namedWeekday = weekdayFromKey(rule.key)
  const weekday = namedWeekday ?? rule.weekday
  const count = Math.max(1, rule.count || 1)

  if (rule.key === 'period_end' || rule.key.endsWith('_end')) return periodEnd
  if (rule.key === 'days_before') return addDays(periodEnd, -count)
  if (rule.key === 'days_after') return addDays(periodEnd, count)
  if (rule.key === 'weekday_on_or_before' || rule.key.endsWith('_on_or_before')) {
    return onOrBeforeWeekday(periodEnd, weekday)
  }
  if (rule.key === 'weekday_on_or_after' || rule.key.endsWith('_on_or_after')) {
    return onOrAfterWeekday(periodEnd, weekday)
  }
  if (rule.key === 'weekdays_before' || rule.key.endsWith('s_before')) {
    return nthWeekdayBefore(periodEnd, weekday, count)
  }
  if (rule.key === 'weekdays_after' || rule.key.endsWith('s_after')) {
    return nthWeekdayAfter(periodEnd, weekday, count)
  }
  return periodEnd
}

export function payDateNeedsCount(key: string): boolean {
  return (
    key === 'days_before' ||
    key === 'days_after' ||
    key === 'weekdays_before' ||
    key === 'weekdays_after' ||
    /s_before$/.test(key) ||
    /s_after$/.test(key)
  )
}

export function payDateNeedsWeekday(key: string): boolean {
  return (
    key === 'weekday_on_or_before' ||
    key === 'weekday_on_or_after' ||
    key === 'weekdays_before' ||
    key === 'weekdays_after'
  )
}

export function payDateRuleGroups(unit: string) {
  const end = `the ${unit} end date`
  const groups: { label: string; options: { value: string; label: string }[] }[] = [
    {
      label: 'No offset',
      options: [{ value: 'period_end', label: `The ${unit} end date` }],
    },
    {
      label: 'Days before/after',
      options: [
        { value: 'days_before', label: `Day(s) before ${end}` },
        { value: 'days_after', label: `Day(s) after ${end}` },
      ],
    },
    {
      label: 'Weekday',
      options: [
        { value: 'weekday_on_or_before', label: `The week day on or before ${end}` },
        { value: 'weekday_on_or_after', label: `The week day on or after ${end}` },
        { value: 'weekdays_before', label: `Week day(s) before ${end}` },
        { value: 'weekdays_after', label: `Week day(s) after ${end}` },
      ],
    },
  ]

  for (const day of WEEKDAYS) {
    const slug = day.name.toLowerCase()
    groups.push({
      label: day.name,
      options: [
        { value: `${slug}_on_or_before`, label: `The ${day.name} on or before ${end}` },
        { value: `${slug}_on_or_after`, label: `The ${day.name} on or after ${end}` },
        { value: `${slug}s_before`, label: `${day.name}(s) before ${end}` },
        { value: `${slug}s_after`, label: `${day.name}(s) after ${end}` },
      ],
    })
  }

  return groups
}

export type SchedulePeriod = {
  number: number
  start: Date
  end: Date
  payDate: Date
  taxWeek: number | null
  taxMonth: number | null
}

export function isWeeklyFrequency(frequency: PayFrequency) {
  return frequency === 'WEEKLY' || frequency === 'FORTNIGHTLY' || frequency === 'FOUR_WEEKLY'
}

export function hmrcPeriodFromPayDate(payDate: Date, frequency: PayFrequency) {
  const weekly = isWeeklyFrequency(frequency)
  return {
    taxYear: taxYearStartFromDate(payDate),
    taxWeek: weekly ? taxWeekFromDate(payDate) : null,
    taxMonth: weekly ? null : taxMonthFromDate(payDate),
  }
}

export function hmrcPeriodLabel(
  frequency: PayFrequency | string | null | undefined,
  period: Pick<SchedulePeriod, 'number' | 'taxWeek' | 'taxMonth' | 'payDate'>,
) {
  const freq = asPayFrequency(frequency)
  const fromPay = period.payDate
    ? hmrcPeriodFromPayDate(period.payDate, freq)
    : { taxWeek: period.taxWeek, taxMonth: period.taxMonth }
  if (isWeeklyFrequency(freq)) return `Week ${fromPay.taxWeek ?? period.taxWeek ?? period.number}`
  return `Month ${fromPay.taxMonth ?? period.taxMonth ?? period.number}`
}

function calendarPeriodStart(end: Date, months: number): Date {
  const after = addDays(end, 1)
  return new Date(after.getFullYear(), after.getMonth() - months, after.getDate())
}

function nextCalendarEnd(previousEnd: Date, months: number, day: number | 'last'): Date {
  const year = previousEnd.getFullYear()
  const month = previousEnd.getMonth() + months
  const cursor = new Date(year, month, 1)
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const dayNumber = day === 'last' ? last : Math.min(day, last)
  return new Date(cursor.getFullYear(), cursor.getMonth(), dayNumber)
}

export function defaultFirstPeriodEnd(frequency: PayFrequency, from = new Date()): Date {
  const taxYear = taxYearStartFromDate(from)
  const yearStart = taxYearStartDate(taxYear)
  if (frequency === 'WEEKLY') return onOrAfterWeekday(yearStart, 5)
  if (frequency === 'FORTNIGHTLY') return addDays(onOrAfterWeekday(yearStart, 5), 7)
  if (frequency === 'FOUR_WEEKLY') return addDays(onOrAfterWeekday(yearStart, 5), 21)
  if (frequency === 'MONTHLY') return new Date(taxYear, 3, 30)
  if (frequency === 'QUARTERLY') return new Date(taxYear, 5, 30)
  return new Date(taxYear + 1, 2, 31)
}

export function periodLengthDays(frequency: PayFrequency): number {
  if (frequency === 'WEEKLY') return 7
  if (frequency === 'FORTNIGHTLY') return 14
  return 28
}

export function isCalendarFrequency(frequency: PayFrequency): boolean {
  return frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'YEARLY'
}

export function calendarEndFromParts(monthDay: number | 'last', year: number, month: number): Date {
  const last = new Date(year, month + 1, 0).getDate()
  const day = monthDay === 'last' ? last : Math.min(monthDay, last)
  return new Date(year, month, day)
}

export function buildSchedulePreview(options: {
  frequency: PayFrequency
  firstEnd: Date
  rule: PayDateRule
  monthDay?: number | 'last'
}): { taxYear: number; periods: SchedulePeriod[] } {
  const { frequency, firstEnd, rule, monthDay = 'last' } = options
  const taxYear = taxYearStartFromDate(firstEnd)
  const yearEnd = taxYearEndDate(taxYear)
  const periods: SchedulePeriod[] = []

  if (isCalendarFrequency(frequency)) {
    const months = frequency === 'MONTHLY' ? 1 : frequency === 'QUARTERLY' ? 3 : 12
    let end = firstEnd
    let number = 1
    while (number <= 24) {
      if (number > 1 && end > yearEnd) break
      const payDate = applyPayDateRule(end, rule)
      const hmrc = hmrcPeriodFromPayDate(payDate, frequency)
      periods.push({
        number,
        start: calendarPeriodStart(end, months),
        end,
        payDate,
        taxWeek: hmrc.taxWeek,
        taxMonth: hmrc.taxMonth,
      })
      end = nextCalendarEnd(end, months, monthDay)
      number += 1
    }
    return { taxYear, periods }
  }

  const length = periodLengthDays(frequency)
  let end = firstEnd
  let number = 1
  while (number <= 60) {
    if (number > 1 && end > yearEnd) break
    const payDate = applyPayDateRule(end, rule)
    const hmrc = hmrcPeriodFromPayDate(payDate, frequency)
    periods.push({
      number,
      start: addDays(end, 1 - length),
      end,
      payDate,
      taxWeek: hmrc.taxWeek,
      taxMonth: hmrc.taxMonth,
    })
    end = addDays(end, length)
    number += 1
  }
  return { taxYear, periods }
}

export function asPayFrequency(value?: string | null): PayFrequency {
  const frequency = (value ?? '').toUpperCase()
  if (frequency === 'FORTNIGHTLY') return 'FORTNIGHTLY'
  if (frequency === 'FOUR_WEEKLY') return 'FOUR_WEEKLY'
  if (frequency === 'MONTHLY') return 'MONTHLY'
  if (frequency === 'QUARTERLY') return 'QUARTERLY'
  if (frequency === 'YEARLY') return 'YEARLY'
  return 'WEEKLY'
}

export function periodEndFromStart(start: Date, frequency: PayFrequency): Date {
  if (isCalendarFrequency(frequency)) {
    const months = frequency === 'MONTHLY' ? 1 : frequency === 'QUARTERLY' ? 3 : 12
    return addDays(new Date(start.getFullYear(), start.getMonth() + months, start.getDate()), -1)
  }
  return addDays(start, periodLengthDays(frequency) - 1)
}

export function periodsFromSavedSchedule(schedule: {
  pay_frequency?: string | null
  first_period_start_date?: string | null
  first_pay_date?: string | null
}): { taxYear: number; periods: SchedulePeriod[] } {
  const frequency = asPayFrequency(schedule.pay_frequency)
  const firstStart = parseDateKey(String(schedule.first_period_start_date ?? '').slice(0, 10) || dateKey(new Date()))
  const firstEnd = periodEndFromStart(firstStart, frequency)
  const firstPay = schedule.first_pay_date
    ? parseDateKey(String(schedule.first_pay_date).slice(0, 10))
    : firstEnd
  const startUtc = Date.UTC(firstEnd.getFullYear(), firstEnd.getMonth(), firstEnd.getDate())
  const payUtc = Date.UTC(firstPay.getFullYear(), firstPay.getMonth(), firstPay.getDate())
  const offset = Math.round((payUtc - startUtc) / 86_400_000)
  const rule: PayDateRule =
    offset === 0
      ? { key: 'period_end', count: 1, weekday: 5 }
      : offset < 0
        ? { key: 'days_before', count: Math.abs(offset), weekday: 5 }
        : { key: 'days_after', count: offset, weekday: 5 }
  const last = new Date(firstEnd.getFullYear(), firstEnd.getMonth() + 1, 0).getDate()
  return buildSchedulePreview({
    frequency,
    firstEnd,
    rule,
    monthDay: firstEnd.getDate() === last ? 'last' : firstEnd.getDate(),
  })
}

export function currentPeriodIndex(periods: SchedulePeriod[], on = new Date()): number {
  if (periods.length === 0) return 0
  const key = dateKey(on)
  const containing = periods.findIndex(
    (period) => dateKey(period.start) <= key && key <= dateKey(period.end),
  )
  if (containing >= 0) return containing
  const upcoming = periods.findIndex((period) => dateKey(period.start) > key)
  if (upcoming >= 0) return upcoming
  return periods.length - 1
}

export function firstPayDateInvalid(periods: SchedulePeriod[], taxYear: number): boolean {
  const first = periods[0]
  if (!first) return false
  return first.payDate < taxYearStartDate(taxYear)
}

export function monthDayOptions() {
  return [
    { value: 'last', label: 'Last day' },
    ...Array.from({ length: 31 }, (_, index) => ({
      value: String(index + 1),
      label: String(index + 1),
    })),
  ]
}

export function monthYearOptions(from = new Date()) {
  const taxYear = taxYearStartFromDate(from)
  const options = []
  for (let offset = 0; offset < 24; offset += 1) {
    const date = new Date(taxYear, 3 + offset, 1)
    options.push({
      value: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      year: date.getFullYear(),
      month: date.getMonth(),
    })
  }
  return options
}

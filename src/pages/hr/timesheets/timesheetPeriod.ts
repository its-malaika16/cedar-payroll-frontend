import { formatPeriodRange, idOf } from '../../../lib/format'
import type { PayrollSchedule } from '../../../types'
import {
  asPayFrequency,
  currentPeriodIndex,
  periodsFromSavedSchedule,
} from '../../payroll/scheduleWizard/payDateRules'
import { addDays, dateKey, formatWeekRange, parseDateKey, startOfWeek } from '../rota/rotaDates'

export type TimesheetPeriod = {
  from: string
  to: string
  label: string
  start: Date
  end: Date
  periodKey: string
}

export function activePaySchedules(schedules: PayrollSchedule[]) {
  return schedules.filter((schedule) => schedule.is_active !== false)
}

export function pickPaySchedule(schedules: PayrollSchedule[], preferredId?: string | null) {
  const active = activePaySchedules(schedules)
  return (
    active.find((schedule) => idOf(schedule) === preferredId) ??
    active.find((schedule) => asPayFrequency(schedule.pay_frequency) === 'WEEKLY') ??
    active[0]
  )
}

export function scheduleWeekStartDay(schedule?: PayrollSchedule | null): number {
  const frequency = asPayFrequency(schedule?.pay_frequency)
  if (frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'YEARLY') return 1
  const raw = String(schedule?.first_period_start_date ?? '').slice(0, 10)
  if (!raw) return 1
  return parseDateKey(raw).getDay()
}

export function calendarWeekPeriod(anchor = new Date()): TimesheetPeriod {
  const start = startOfWeek(anchor)
  const end = addDays(start, 6)
  return {
    from: dateKey(start),
    to: dateKey(end),
    label: formatWeekRange(start),
    start,
    end,
    periodKey: dateKey(start),
  }
}

export function timesheetPeriodFromSchedule(
  schedule: PayrollSchedule | undefined | null,
  periodKey?: string | null,
  on = new Date(),
): TimesheetPeriod {
  if (!schedule) return calendarWeekPeriod(on)
  const periods = periodsFromSavedSchedule(schedule).periods
  const selected =
    periods.find((period) => String(period.number) === periodKey) ??
    periods[currentPeriodIndex(periods, on)] ??
    periods[0]
  if (!selected) return calendarWeekPeriod(on)
  return {
    from: dateKey(selected.start),
    to: dateKey(selected.end),
    label: formatPeriodRange(selected.start, selected.end),
    start: selected.start,
    end: selected.end,
    periodKey: String(selected.number),
  }
}

export function adjacentTimesheetPeriod(
  schedule: PayrollSchedule | undefined | null,
  from: string,
  to: string,
  direction: number,
): TimesheetPeriod | null {
  if (!schedule) {
    const start = new Date(`${from}T00:00:00`)
    if (Number.isNaN(start.getTime())) return null
    return calendarWeekPeriod(addDays(start, direction * 7))
  }
  const periods = periodsFromSavedSchedule(schedule).periods
  const index = periods.findIndex(
    (period) => dateKey(period.start) === from && dateKey(period.end) === to,
  )
  const current =
    index >= 0 ? index : currentPeriodIndex(periods, new Date(`${from}T00:00:00`))
  const next = periods[current + direction]
  if (!next) return null
  return {
    from: dateKey(next.start),
    to: dateKey(next.end),
    label: formatPeriodRange(next.start, next.end),
    start: next.start,
    end: next.end,
    periodKey: String(next.number),
  }
}

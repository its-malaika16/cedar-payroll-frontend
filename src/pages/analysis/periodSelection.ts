import type { PayrollSchedule } from '../../types'
import { idOf } from '../../lib/format'
import {
  taxMonthFromDate,
  taxWeekEndDate,
  taxYearEndDate,
  taxYearLabel,
  taxYearStartFromDate,
  weeksInTaxYear,
} from '../../lib/hmrcTaxCalendar'
import {
  asPayFrequency,
  FREQUENCY_META,
  periodsFromSavedSchedule,
  type SchedulePeriod,
} from '../payroll/scheduleWizard/payDateRules'
import type { AnalysisReportDraft } from './employeeDetailsState'

export const TAX_PERIOD_OPTIONS = [
  { id: 'tax-weeks', label: 'Tax weeks' },
  { id: 'tax-months', label: 'Tax months' },
  { id: 'tax-year', label: 'Tax year' },
] as const

export type PeriodGrain = 'year' | 'months' | 'weeks'

export type PeriodChoice = {
  value: number
  end: Date
}

export function scheduleOptionValue(scheduleId: string) {
  return `schedule:${scheduleId}`
}

export function scheduleIdFromMode(periodMode: string) {
  return periodMode.startsWith('schedule:') ? periodMode.slice('schedule:'.length) : ''
}

export function isSchedulePeriodMode(periodMode: string) {
  return periodMode.startsWith('schedule:')
}

export function scheduleLabel(schedule: PayrollSchedule, all: PayrollSchedule[] = []) {
  const frequency = FREQUENCY_META[asPayFrequency(schedule.pay_frequency)]
  const name = schedule.schedule_name?.trim()
  const label = `${frequency.title} pay schedule`
  const duplicates = all.filter((item) => item.pay_frequency === schedule.pay_frequency).length > 1
  if (name && duplicates) return `${label} · ${name}`
  return name && name.toLowerCase() !== frequency.title.toLowerCase() ? name : label
}

export function grainFromFrequency(frequency?: string | null): PeriodGrain {
  const value = (frequency ?? '').toUpperCase()
  if (value === 'YEARLY') return 'year'
  if (value === 'MONTHLY' || value === 'QUARTERLY') return 'months'
  return 'weeks'
}

export function periodGrain(draft: AnalysisReportDraft, schedules: PayrollSchedule[] = []): PeriodGrain {
  if (draft.periodMode === 'tax-year') return 'year'
  if (draft.periodMode === 'tax-months') return 'months'
  if (draft.periodMode === 'tax-weeks') return 'weeks'
  const scheduleId = draft.scheduleId || scheduleIdFromMode(draft.periodMode)
  const schedule = schedules.find((item) => idOf(item) === scheduleId)
  return grainFromFrequency(schedule?.pay_frequency)
}

export function taxYearOptions(aroundYear = taxYearStartFromDate(new Date())) {
  return Array.from({ length: 7 }, (_, index) => aroundYear - 4 + index)
}

export function endingDate(date: Date) {
  return date.toLocaleDateString('en-GB')
}

export function endingLongDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function periodBlockHeading(noun: string, number: number, end: Date) {
  return `${noun} ${number} (Ending ${endingLongDate(end)})`
}

export function periodRangeSummaryHeading(noun: string, from: number, to: number) {
  return `${noun} ${from} to ${to} (Summary)`
}

/** Month 1 = April of the tax year, ending on the last calendar day of that month. */
export function taxYearMonthEnd(taxYear: number, month: number) {
  const monthIndex = 3 + (month - 1)
  return new Date(taxYear, monthIndex + 1, 0)
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function periodHasEnded(end: Date, on = new Date()) {
  return startOfDay(end).getTime() <= startOfDay(on).getTime()
}

export function taxYearSequenceNumber(year: number, current = taxYearStartFromDate(new Date())) {
  return Math.max(1, current - year + 1)
}

export function yearFromSequenceNumber(sequence: number, current = taxYearStartFromDate(new Date())) {
  return current - (sequence - 1)
}

export function rangeNoun(grain: PeriodGrain, taxPeriod: boolean, frequency?: string | null) {
  if (taxPeriod) {
    if (grain === 'year') return 'Tax Year'
    if (grain === 'months') return 'Month'
    return 'Tax Week'
  }
  if (frequency) {
    const unit = FREQUENCY_META[asPayFrequency(frequency)].unit
    if (unit === '4-week') return '4-Week Period'
    return unit.charAt(0).toUpperCase() + unit.slice(1)
  }
  if (grain === 'year') return 'Year'
  if (grain === 'months') return 'Month'
  return 'Week'
}

export function periodSelectLabel(prefix: 'From' | 'To', noun: string, number: number, end: Date) {
  return `${prefix} ${noun} ${number} (ending ${endingDate(end)})`
}

function endedChoices(choices: PeriodChoice[]): PeriodChoice[] {
  const ended = choices.filter((choice) => periodHasEnded(choice.end))
  return ended.length > 0 ? ended : choices.slice(0, 1)
}

export function taxPeriodChoices(grain: PeriodGrain, taxYear: number): PeriodChoice[] {
  if (grain === 'year') {
    const current = taxYearStartFromDate(new Date())
    return Array.from({ length: 6 }, (_, index) => {
      const year = current - index
      return { value: year, end: taxYearEndDate(year) }
    })
  }
  if (grain === 'months') {
    return endedChoices(
      Array.from({ length: 12 }, (_, index) => {
        const month = index + 1
        return { value: month, end: taxYearMonthEnd(taxYear, month) }
      }),
    )
  }
  return endedChoices(
    Array.from({ length: weeksInTaxYear(taxYear) }, (_, index) => {
      const week = index + 1
      return { value: week, end: taxWeekEndDate(taxYear, week) }
    }),
  )
}

export function schedulePeriodChoices(schedule: PayrollSchedule | undefined): PeriodChoice[] {
  if (!schedule) return []
  const periods: SchedulePeriod[] = periodsFromSavedSchedule(schedule).periods
  return endedChoices(periods.map((period) => ({ value: period.number, end: period.end })))
}

export function latestPeriodChoice(choices: PeriodChoice[]): PeriodChoice | undefined {
  if (choices.length === 0) return undefined
  return [...choices].sort((left, right) => left.end.getTime() - right.end.getTime()).at(-1)
}

export function rangePatchFromChoice(
  grain: PeriodGrain,
  choice: PeriodChoice,
  which: 'from' | 'to' | 'both' = 'both',
): Partial<AnalysisReportDraft> {
  if (grain === 'year') {
    if (which === 'from') return { fromYear: choice.value }
    if (which === 'to') return { taxYear: choice.value }
    return { fromYear: choice.value, taxYear: choice.value }
  }
  if (grain === 'months') {
    if (which === 'from') return { fromMonth: choice.value }
    if (which === 'to') return { toMonth: choice.value }
    return { fromMonth: choice.value, toMonth: choice.value }
  }
  if (which === 'from') return { fromWeek: choice.value }
  if (which === 'to') return { toWeek: choice.value }
  return { fromWeek: choice.value, toWeek: choice.value }
}

export function selectedPeriodChoices(
  draft: AnalysisReportDraft,
  schedules: PayrollSchedule[],
): { noun: string; choices: PeriodChoice[]; grain: PeriodGrain } {
  const grain = periodGrain(draft, schedules)
  const taxPeriod = draft.periodMode.startsWith('tax-')
  if (taxPeriod) {
    return { noun: rangeNoun(grain, true), choices: taxPeriodChoices(grain, draft.taxYear), grain }
  }
  const scheduleId = draft.scheduleId || scheduleIdFromMode(draft.periodMode)
  const schedule = schedules.find((item) => idOf(item) === scheduleId)
  return {
    noun: rangeNoun(grain, false, schedule?.pay_frequency),
    choices: schedulePeriodChoices(schedule),
    grain,
  }
}

export function selectedRangeValue(draft: AnalysisReportDraft, grain: PeriodGrain, which: 'from' | 'to') {
  if (grain === 'year') return which === 'from' ? (draft.fromYear ?? draft.taxYear) : draft.taxYear
  if (grain === 'months') return which === 'from' ? (draft.fromMonth ?? 1) : (draft.toMonth ?? 1)
  return which === 'from' ? draft.fromWeek : draft.toWeek
}

export function clampedRangeValue(
  draft: AnalysisReportDraft,
  choices: PeriodChoice[],
  grain: PeriodGrain,
  which: 'from' | 'to',
) {
  const raw = selectedRangeValue(draft, grain, which)
  if (choices.some((choice) => choice.value === raw)) return raw
  return latestPeriodChoice(choices)?.value ?? ''
}

export function latestEndedTaxWeek(taxYear: number) {
  return latestPeriodChoice(taxPeriodChoices('weeks', taxYear))?.value ?? 1
}

export function latestEndedTaxMonth(taxYear: number) {
  return latestPeriodChoice(taxPeriodChoices('months', taxYear))?.value ?? 1
}

export function periodHint(draft: AnalysisReportDraft, grain: PeriodGrain) {
  const year = draft.taxYear
  if (grain === 'year') {
    return `${taxYearLabel(year)} ends ${endingDate(taxYearEndDate(year))}`
  }
  if (grain === 'months') {
    const month = Math.max(draft.fromMonth ?? 1, draft.toMonth ?? 1)
    return `Month ${month} ends ${endingDate(taxYearMonthEnd(year, month))}`
  }
  return `Week ${draft.toWeek} ends ${endingDate(taxWeekEndDate(year, draft.toWeek))}`
}

export function reportPeriodHeading(
  draft: AnalysisReportDraft,
  grain: PeriodGrain,
  frequency?: string | null,
) {
  const taxPeriod = draft.periodMode.startsWith('tax-')
  const noun = rangeNoun(grain, taxPeriod, frequency)
  if (grain === 'year') {
    const from = Math.min(draft.fromYear ?? draft.taxYear, draft.taxYear)
    const to = Math.max(draft.fromYear ?? draft.taxYear, draft.taxYear)
    const fromNumber = taxPeriod ? taxYearSequenceNumber(from) : from
    const toNumber = taxPeriod ? taxYearSequenceNumber(to) : to
    if (from === to) return periodBlockHeading(noun, toNumber, taxYearEndDate(to))
    return periodRangeSummaryHeading(noun, fromNumber, toNumber)
  }
  if (grain === 'months') {
    const from = Math.min(draft.fromMonth ?? 1, draft.toMonth ?? 1)
    const to = Math.max(draft.fromMonth ?? 1, draft.toMonth ?? 1)
    if (from === to) return periodBlockHeading(noun, to, taxYearMonthEnd(draft.taxYear, to))
    return periodRangeSummaryHeading(noun, from, to)
  }
  const from = Math.min(draft.fromWeek, draft.toWeek)
  const to = Math.max(draft.fromWeek, draft.toWeek)
  if (from === to) return periodBlockHeading(noun, to, taxWeekEndDate(draft.taxYear, to))
  return periodRangeSummaryHeading(noun, from, to)
}

export function currentTaxMonth(date = new Date()) {
  return taxMonthFromDate(date)
}

import type { Employee, PayrollRecord, PayrollRun } from '../../types'
import { fullName, idOf } from '../../lib/format'
import { taxMonthFromDate, taxWeekEndDate } from '../../lib/hmrcTaxCalendar'
import type { AnalysisReportDraft } from './employeeDetailsState'
import {
  isSchedulePeriodMode,
  selectedRangeValue,
  taxYearSequenceNumber,
  type PeriodChoice,
  type PeriodGrain,
} from './periodSelection'

export function isFinalisedPayrollRun(run?: PayrollRun | null) {
  const status = (run?.status ?? '').toUpperCase()
  if (status === 'LOCKED' || status === 'COMPLETED') return true
  if (Number(run?.finalised_record_count ?? 0) > 0) return true
  return (run?.payroll_records ?? []).some((record) => isFinalisedPayrollRecord(record))
}

export function isFinalisedPayrollRecord(record?: PayrollRecord | null) {
  return (record?.status ?? '').toUpperCase() === 'FINALISED'
}

export function runPeriodNumber(run: PayrollRun, grain: PeriodGrain, taxPeriod: boolean) {
  if (taxPeriod) {
    if (grain === 'year') return taxYearSequenceNumber(Number(run.tax_year_start))
    if (grain === 'months') {
      return Number(
        run.tax_month ?? taxMonthFromDate(taxWeekEndDate(Number(run.tax_year_start), Number(run.tax_week ?? 1))),
      )
    }
    return Number(run.tax_week ?? run.period_number ?? 0)
  }
  return Number(run.period_number ?? 0)
}

export function runPeriodEnd(run: PayrollRun) {
  return new Date(`${String(run.period_end_date).slice(0, 10)}T00:00:00`)
}

export function runMatchesDraftPeriod(
  run: PayrollRun,
  draft: AnalysisReportDraft,
  grain: PeriodGrain,
  scheduleId: string,
  kind?: string,
) {
  const taxPeriod = draft.periodMode.startsWith('tax-')
  const year = Number(run.tax_year_start)
  const period = runPeriodNumber(run, grain, taxPeriod)
  const from = Number(selectedRangeValue(draft, grain, 'from'))
  const to = Number(selectedRangeValue(draft, grain, 'to'))
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const cumulative = kind === 'ytd-summary'

  if (isSchedulePeriodMode(draft.periodMode)) {
    if (scheduleId && String(run.schedule_id) !== scheduleId) return false
    if (year !== draft.taxYear) return false
    if (cumulative) return period >= 1 && period <= hi
    return period >= lo && period <= hi
  }

  if (grain === 'year') {
    const fromYear = Math.min(draft.fromYear ?? draft.taxYear, draft.taxYear)
    const toYear = Math.max(draft.fromYear ?? draft.taxYear, draft.taxYear)
    return year >= fromYear && year <= toYear
  }
  if (year !== draft.taxYear) return false
  if (cumulative) return period >= 1 && period <= hi
  return period >= lo && period <= hi
}

export function finalisedRunsInRange(
  runs: PayrollRun[],
  draft: AnalysisReportDraft,
  grain: PeriodGrain,
  scheduleId: string,
  kind?: string,
) {
  return runs.filter(
    (run) =>
      isFinalisedPayrollRun(run) && runMatchesDraftPeriod(run, draft, grain, scheduleId, kind),
  )
}

function matchingFinalisedRuns(
  runs: PayrollRun[],
  draft: AnalysisReportDraft,
  grain: PeriodGrain,
  scheduleId: string,
) {
  return runs.filter((run) => {
    if (!isFinalisedPayrollRun(run)) return false
    if (isSchedulePeriodMode(draft.periodMode)) {
      if (scheduleId && String(run.schedule_id) !== String(scheduleId)) return false
      return Number(run.tax_year_start) === Number(draft.taxYear)
    }
    if (grain === 'year') return true
    return Number(run.tax_year_start) === Number(draft.taxYear)
  })
}

export function finalisedPeriodChoices(
  choices: PeriodChoice[],
  runs: PayrollRun[],
  draft: AnalysisReportDraft,
  grain: PeriodGrain,
  scheduleId: string,
) {
  const taxPeriod = draft.periodMode.startsWith('tax-')
  const matching = matchingFinalisedRuns(runs, draft, grain, scheduleId)
  const byValue = new Map<number, PeriodChoice>()
  for (const choice of choices) byValue.set(choice.value, choice)
  for (const run of matching) {
    const value = runPeriodNumber(run, grain, taxPeriod)
    if (!Number.isFinite(value) || value <= 0) continue
    if (!byValue.has(value)) byValue.set(value, { value, end: runPeriodEnd(run) })
  }
  const allowed = new Set(matching.map((run) => runPeriodNumber(run, grain, taxPeriod)))
  return [...byValue.values()]
    .filter((choice) => allowed.has(choice.value))
    .sort((left, right) => left.value - right.value)
}

export function employeesFromFinalisedRuns(runs: PayrollRun[], companyId: string): Employee[] {
  const seen = new Set<string>()
  const people: Employee[] = []
  for (const run of runs) {
    for (const record of run.payroll_records ?? []) {
      if (!isFinalisedPayrollRecord(record)) continue
      const nested = record.employees
      const id = nested ? idOf(nested) : String(record.employee_id ?? '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      people.push(
        nested ?? {
          id,
          company_id: companyId,
          first_name: null,
          last_name: null,
        },
      )
    }
  }
  return people.sort((a, b) =>
    fullName(a.first_name, a.last_name).localeCompare(fullName(b.first_name, b.last_name), 'en-GB'),
  )
}

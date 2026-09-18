import { taxYearStartFromDate } from '../../lib/hmrcTaxCalendar'
import type { ReportKind } from './reportCatalog'
import { DEFAULT_FIELD_IDS } from './employeeDetailsFields'
import type { HmrcSchedule } from './hmrcFields'
import { latestEndedTaxMonth, latestEndedTaxWeek } from './periodSelection'

export type AnalysisReportDraft = {
  kind: ReportKind
  reportName: string
  employeeScope: 'all' | 'selected'
  periodMode: string
  taxYear: number
  fromYear: number
  fromWeek: number
  toWeek: number
  fromMonth: number
  toMonth: number
  scheduleId?: string
  selectedEmployeeIds: string[]
  selectedFieldIds: string[]
  schedule?: HmrcSchedule
  selectedPeriodIds: string[]
  savedReportId?: string
}

export type EmployeeDetailsDraft = AnalysisReportDraft

export const PERIOD_MODES = [
  'Report Over Multiple Tax Years',
  'Report Over Current Tax Year',
  'Report Over a Single Tax Week',
]

export const EMPLOYEE_PERIOD_DEFAULT = 'tax-weeks'

function storageKey(kind: ReportKind) {
  return `cedar.analysis.draft.${kind}`
}

export function defaultReportDraft(
  kind: ReportKind,
  reportName: string,
  fieldIds: string[] = DEFAULT_FIELD_IDS,
  periodMode = PERIOD_MODES[0],
): AnalysisReportDraft {
  const today = new Date()
  const year = taxYearStartFromDate(today)
  const week = latestEndedTaxWeek(year)
  const month = latestEndedTaxMonth(year)
  return {
    kind,
    reportName,
    employeeScope: 'all',
    periodMode,
    taxYear: year,
    fromYear: year,
    fromWeek: week,
    toWeek: week,
    fromMonth: month,
    toMonth: month,
    selectedEmployeeIds: [],
    selectedFieldIds: [...fieldIds],
    schedule: 'tax-months',
    selectedPeriodIds: [],
  }
}

export function readReportDraft(
  kind: ReportKind,
  reportName: string,
  fieldIds: string[] = DEFAULT_FIELD_IDS,
  periodMode = PERIOD_MODES[0],
): AnalysisReportDraft {
  try {
    const raw = sessionStorage.getItem(storageKey(kind))
    if (!raw) return defaultReportDraft(kind, reportName, fieldIds, periodMode)
    const parsed = JSON.parse(raw) as AnalysisReportDraft
    const next = {
      ...defaultReportDraft(kind, reportName, fieldIds, periodMode),
      ...parsed,
      kind,
    }
    if (PERIOD_MODES.includes(next.periodMode)) {
      next.periodMode = EMPLOYEE_PERIOD_DEFAULT
    }
    return next
  } catch {
    return defaultReportDraft(kind, reportName, fieldIds, periodMode)
  }
}

export function writeReportDraft(draft: AnalysisReportDraft) {
  sessionStorage.setItem(storageKey(draft.kind), JSON.stringify(draft))
}

export function clearReportDraft(kind: ReportKind) {
  sessionStorage.removeItem(storageKey(kind))
}

export function defaultEmployeeDetailsDraft() {
  return defaultReportDraft('employee-details', 'Employee Details', DEFAULT_FIELD_IDS, EMPLOYEE_PERIOD_DEFAULT)
}

export function readEmployeeDetailsDraft() {
  return readReportDraft('employee-details', 'Employee Details', DEFAULT_FIELD_IDS, EMPLOYEE_PERIOD_DEFAULT)
}

export function writeEmployeeDetailsDraft(draft: AnalysisReportDraft) {
  writeReportDraft({ ...draft, kind: 'employee-details' })
}

export function clearEmployeeDetailsDraft() {
  clearReportDraft('employee-details')
}

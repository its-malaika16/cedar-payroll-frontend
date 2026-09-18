import type { ReportKind } from './reportCatalog'
import {
  FIELD_CATEGORIES,
  REPORT_FIELDS,
  DEFAULT_FIELD_IDS,
} from './employeeDetailsFields'
import { PAYROLL_CATEGORY_GROUPS, PAYROLL_SUMMARY_FIELDS } from './payrollSummaryFields'
import { PENSION_CATEGORY_GROUPS, PENSION_REPORT_FIELDS } from './pensionsFields'
import { YTD_CATEGORY_GROUPS, YTD_REPORT_FIELDS } from './ytdFields'
import {
  HMRC_CATEGORY_GROUPS,
  HMRC_DEFAULT_FIELD_IDS,
  HMRC_PERIOD_MODES,
  HMRC_REPORT_FIELDS,
  P32_DEFAULT_FIELD_IDS,
} from './hmrcFields'
import { NOTES_CATEGORY_GROUPS, NOTES_REPORT_FIELDS } from './notesFields'
import { ADDITIONS_CATEGORY_GROUPS, ADDITIONS_REPORT_FIELDS } from './additionsFields'

export type AnalysisBuilderKind =
  | 'employee-details'
  | 'payroll-summary'
  | 'pensions'
  | 'ytd-summary'
  | 'hmrc-payments'
  | 'p32'
  | 'notes'
  | 'additions'
  | 'deductions'

export const BUILDER_KINDS: AnalysisBuilderKind[] = [
  'employee-details',
  'payroll-summary',
  'pensions',
  'ytd-summary',
  'hmrc-payments',
  'p32',
  'notes',
  'additions',
  'deductions',
]

export function isBuilderKind(kind: string): kind is AnalysisBuilderKind {
  return BUILDER_KINDS.includes(kind as AnalysisBuilderKind)
}

export function usesPayrollRecords(kind: AnalysisBuilderKind) {
  return (
    kind === 'payroll-summary' ||
    kind === 'pensions' ||
    kind === 'ytd-summary' ||
    kind === 'notes' ||
    kind === 'additions' ||
    kind === 'deductions'
  )
}

export function isHmrcKind(kind: AnalysisBuilderKind) {
  return kind === 'hmrc-payments' || kind === 'p32'
}

export type ReportFieldItem = {
  id: string
  label: string
  category: string
}

export type ReportCategoryGroup = {
  label?: string
  categories: { id: string; label: string }[]
}

export type ReportSpec = {
  kind: ReportKind
  title: string
  defaultName: string
  generateCrumb: string
  groups: ReportCategoryGroup[]
  fields: ReportFieldItem[]
  defaultFieldIds: string[]
  defaultCategoryId?: string
  selectHint?: string
  layout?: 'employees' | 'hmrc'
  periodModes?: string[]
  showTotalsRow?: boolean
  periodHeading?: 'week' | 'month'
}

const HINT = 'Choose the employee details you want to include in this report'

export const EMPLOYEE_DETAILS_SPEC: ReportSpec = {
  kind: 'employee-details',
  title: 'Employee Details',
  defaultName: 'Employee Details',
  generateCrumb: 'Generate Employee Details Report',
  groups: [{ categories: FIELD_CATEGORIES }],
  fields: REPORT_FIELDS,
  defaultFieldIds: [...DEFAULT_FIELD_IDS],
}

export const PAYROLL_SUMMARY_SPEC: ReportSpec = {
  kind: 'payroll-summary',
  title: 'Payroll Summary',
  defaultName: 'Payroll Summary',
  generateCrumb: 'Generate Payroll Summary Report',
  groups: PAYROLL_CATEGORY_GROUPS,
  fields: PAYROLL_SUMMARY_FIELDS,
  defaultFieldIds: [...DEFAULT_FIELD_IDS],
}

export const PENSIONS_SPEC: ReportSpec = {
  kind: 'pensions',
  title: 'Pensions',
  defaultName: 'Pensions',
  generateCrumb: 'Generate Pensions Report',
  groups: PENSION_CATEGORY_GROUPS,
  fields: PENSION_REPORT_FIELDS,
  defaultFieldIds: [...DEFAULT_FIELD_IDS],
  defaultCategoryId: 'pensions',
  selectHint: HINT,
}

export const YTD_SPEC: ReportSpec = {
  kind: 'ytd-summary',
  title: 'Year to Date',
  defaultName: 'Year to date',
  generateCrumb: 'Generate Year to Date Report',
  groups: YTD_CATEGORY_GROUPS,
  fields: YTD_REPORT_FIELDS,
  defaultFieldIds: [...DEFAULT_FIELD_IDS],
  defaultCategoryId: 'ytd',
  selectHint: HINT,
}

export const HMRC_SPEC: ReportSpec = {
  kind: 'hmrc-payments',
  title: 'HMRC Payments',
  defaultName: 'HMRC Report 1',
  generateCrumb: 'Generate HMRC Payments Report',
  groups: HMRC_CATEGORY_GROUPS,
  fields: HMRC_REPORT_FIELDS,
  defaultFieldIds: [...HMRC_DEFAULT_FIELD_IDS],
  defaultCategoryId: 'tax',
  selectHint: HINT,
  layout: 'hmrc',
  periodModes: [...HMRC_PERIOD_MODES],
}

export const P32_SPEC: ReportSpec = {
  kind: 'p32',
  title: 'P32',
  defaultName: 'P32',
  generateCrumb: 'Generate P32 Report',
  groups: HMRC_CATEGORY_GROUPS,
  fields: HMRC_REPORT_FIELDS,
  defaultFieldIds: [...P32_DEFAULT_FIELD_IDS],
  defaultCategoryId: 'tax',
  selectHint: HINT,
  layout: 'hmrc',
  periodModes: [...HMRC_PERIOD_MODES],
}

export const NOTES_SPEC: ReportSpec = {
  kind: 'notes',
  title: 'Notes',
  defaultName: 'Notes',
  generateCrumb: 'Generate Notes Report',
  groups: NOTES_CATEGORY_GROUPS,
  fields: NOTES_REPORT_FIELDS,
  defaultFieldIds: [...DEFAULT_FIELD_IDS],
  selectHint: HINT,
  showTotalsRow: true,
  periodHeading: 'month',
}

export const ADDITIONS_SPEC: ReportSpec = {
  kind: 'additions',
  title: 'Additions',
  defaultName: 'Additions',
  generateCrumb: 'Generate Additions Report',
  groups: ADDITIONS_CATEGORY_GROUPS,
  fields: ADDITIONS_REPORT_FIELDS,
  defaultFieldIds: [...DEFAULT_FIELD_IDS],
  defaultCategoryId: 'additions_deductions',
  selectHint: HINT,
  showTotalsRow: true,
  periodHeading: 'month',
}

export const DEDUCTIONS_SPEC: ReportSpec = {
  kind: 'deductions',
  title: 'Deductions',
  defaultName: 'Deductions',
  generateCrumb: 'Generate Deductions Report',
  groups: ADDITIONS_CATEGORY_GROUPS,
  fields: ADDITIONS_REPORT_FIELDS,
  defaultFieldIds: [...DEFAULT_FIELD_IDS],
  defaultCategoryId: 'additions_deductions',
  selectHint: HINT,
  showTotalsRow: true,
  periodHeading: 'month',
}

export function specFor(kind: string | undefined): ReportSpec | undefined {
  if (kind === 'employee-details') return EMPLOYEE_DETAILS_SPEC
  if (kind === 'payroll-summary') return PAYROLL_SUMMARY_SPEC
  if (kind === 'pensions') return PENSIONS_SPEC
  if (kind === 'ytd-summary') return YTD_SPEC
  if (kind === 'hmrc-payments') return HMRC_SPEC
  if (kind === 'p32') return P32_SPEC
  if (kind === 'notes') return NOTES_SPEC
  if (kind === 'additions') return ADDITIONS_SPEC
  if (kind === 'deductions') return DEDUCTIONS_SPEC
  return undefined
}

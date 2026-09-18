import { formatDate, money } from '../../lib/format'
import type { Employee, PayrollRecord, PensionAssessment } from '../../types'
import { employeeFieldValue } from './employeeDetailsValues'

function num(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isNaN(amount) ? 0 : amount
}

function moneyOrDash(value: unknown) {
  if (value == null || value === '') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return '—'
  return money(amount)
}

function percent(value: unknown) {
  if (value == null || value === '') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return '—'
  const display = amount <= 1 ? amount * 100 : amount
  return `${display.toLocaleString('en-GB', { maximumFractionDigits: 2 })}%`
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

const CATEGORY_LABELS: Record<string, string> = {
  eligible_jobholder: 'Eligible jobholder',
  entitled_worker: 'Entitled worker',
  non_eligible: 'Non-eligible',
}

const STATUS_LABELS: Record<string, string> = {
  eligible: 'Eligible',
  enrolled: 'Enrolled',
  switched: 'Switched',
  postponed: 'Postponed',
  exempt: 'Exempt',
  opted_out: 'Opted out',
  ceased: 'Ceased',
  reenrol_due: 'Re-enrolment due',
  not_eligible: 'Not eligible',
}

export function pensionReportFieldValue(
  employee: Employee,
  payroll: PayrollRecord | undefined,
  assessment: PensionAssessment | undefined,
  fieldId: string,
): string {
  const personal = new Set([
    'title', 'name', 'middle_name', 'last_name', 'gender', 'dob', 'nationality', 'passport_number',
  ])
  if (personal.has(fieldId)) return employeeFieldValue(employee, fieldId)

  const details = record(employee.employee_pension_details)
  const enrolment = assessment?.enrolment

  switch (fieldId) {
    case 'pen_ee_gross':
    case 'scheme_qe':
      return moneyOrDash(payroll?.pensionable_gross ?? details.pensionable_pay_override)
    case 'pen_ee':
    case 'scheme_ee':
      return moneyOrDash(payroll?.employee_pension)
    case 'pen_er_before':
      return moneyOrDash(payroll?.employee_before_pension_deductions)
    case 'pen_er_gross':
      return moneyOrDash(payroll?.employer_pensionable_additions ?? payroll?.pensionable_gross)
    case 'pen_er':
    case 'scheme_er':
      return moneyOrDash(payroll?.employer_pension)
    case 'pen_total':
    case 'scheme_total':
      return moneyOrDash(num(payroll?.employee_pension) + num(payroll?.employer_pension))
    case 'ae_status':
      return STATUS_LABELS[assessment?.status ?? ''] || (details.is_enrolled ? 'Enrolled' : '—')
    case 'ae_category':
      return CATEGORY_LABELS[assessment?.category ?? ''] || '—'
    case 'ae_enrolment':
    case 'ae_join':
      return formatDate(String(enrolment?.enrolment_date ?? details.enrolment_date ?? ''))
    case 'ae_opt_out':
      return formatDate(String(enrolment?.opt_out_date ?? details.opt_out_date ?? ''))
    case 'ae_cessation':
      return formatDate(String(enrolment?.cessation_date ?? details.cessation_date ?? ''))
    case 'scheme_ee_pct':
      return percent(enrolment?.employee_rate ?? details.employee_rate)
    case 'scheme_er_pct':
      return percent(enrolment?.employer_rate ?? details.employer_rate)
    case 'pen_ee_avc':
    case 'pen_er_avc':
    case 'ae_opt_in':
    default:
      return '—'
  }
}

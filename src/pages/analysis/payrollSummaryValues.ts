import { formatDate, money } from '../../lib/format'
import type { Employee, PayrollRecord } from '../../types'
import { employeeFieldValue } from './employeeDetailsValues'
import { employerPayTypeFieldValue } from './employerPayTypeFields'

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

function flag(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function overtimeTotal(record: PayrollRecord) {
  return num(record.overtime_1) + num(record.overtime_1_5) + num(record.overtime_2)
}

const LEAVE_DAY_KEYS = [
  'annual',
  'unpaid',
  'sick',
  'maternity',
  'paternity',
  'absent',
  'on_strike',
  'parenting',
  'custom',
] as const

const LEAVE_FIELD_MATCH: Record<string, { keys: string[]; pattern: RegExp }> = {
  leave_annual: { keys: ['annual'], pattern: /annual/i },
  leave_holiday: { keys: [], pattern: /^holiday$/i },
  leave_unpaid: { keys: ['unpaid'], pattern: /unpaid/i },
  leave_sick: { keys: ['sick'], pattern: /sick|ssp/i },
  leave_maternity: { keys: ['maternity'], pattern: /maternity|smp/i },
  leave_paternity: { keys: ['paternity'], pattern: /paternity|spp/i },
  leave_parental: { keys: ['parenting'], pattern: /parental|parenting|shpp/i },
  leave_authorised: { keys: [], pattern: /authorised absence/i },
  leave_unauthorised: { keys: ['absent'], pattern: /unauthorised|absent/i },
  leave_strike: { keys: ['on_strike'], pattern: /strike/i },
  leave_compassionate: { keys: [], pattern: /compassionate/i },
  leave_carer: { keys: [], pattern: /carer/i },
  leave_study: { keys: [], pattern: /study/i },
  leave_other: { keys: ['custom'], pattern: /^other$/i },
}

function leaveTypeDays(record: PayrollRecord | undefined, fieldId: string) {
  const match = LEAVE_FIELD_MATCH[fieldId]
  if (!match || !record) return 0
  const summary = (record.calendar_leave_summary ?? {}) as Record<string, unknown>
  if (match.keys.length > 0) {
    return match.keys.reduce((total, key) => total + num(summary[key]), 0)
  }
  const items = Array.isArray(summary.paid_items) ? summary.paid_items : []
  return items.reduce((total, item) => {
    const type = String((item as { leave_type?: string }).leave_type ?? '')
    if (!match.pattern.test(type)) return total
    return total + num((item as { days?: unknown }).days)
  }, 0)
}

function daysOrDash(value: number) {
  return value > 0 ? String(value) : '—'
}

function mergeLeaveSummaries(records: PayrollRecord[]) {
  const first = (records[0]?.calendar_leave_summary ?? {}) as Record<string, unknown>
  const merged: Record<string, unknown> = { ...first }
  for (const key of LEAVE_DAY_KEYS) {
    merged[key] = records.reduce(
      (total, record) => total + num((record.calendar_leave_summary as Record<string, unknown> | undefined)?.[key]),
      0,
    )
  }
  merged.paid_items = records.flatMap((record) => {
    const items = (record.calendar_leave_summary as { paid_items?: unknown[] } | undefined)?.paid_items
    return Array.isArray(items) ? items : []
  })
  return merged
}

export function mergePayrollRecords(records: PayrollRecord[]): PayrollRecord | undefined {
  if (records.length === 0) return undefined
  if (records.length === 1) return records[0]
  const first = records[0]
  const keys: (keyof PayrollRecord)[] = [
    'basic_pay', 'holiday_pay', 'overtime_1', 'overtime_1_5', 'overtime_2', 'bonus', 'bonus_2',
    'commission', 'night_allowance', 'holiday_adjustment', 'car_allowance', 'service_charges',
    'ssp', 'smp', 'spp', 'sap', 'shpp', 'spbp', 'sncp', 'total_statutory_pay', 'gross_pay',
    'taxable_gross', 'tax', 'nicable_gross', 'employee_nic', 'employer_nic', 'student_loan',
    'postgraduate_loan', 'employee_pension', 'employer_pension', 'salary_sacrifice_pension',
    'net_pay', 'take_home_pay', 'cost_to_employer', 'total_hours', 'wage_per_hour', 'annual_salary',
    'pensionable_gross', 'employer_nic_class1a', 'employee_pensionable_additions',
    'employer_pensionable_additions',
  ]
  const merged: PayrollRecord = { ...first }
  for (const key of keys) {
    merged[key] = records.reduce((total, record) => total + num(record[key]), 0) as never
  }
  merged.pay_lines = records.flatMap((record) => record.pay_lines ?? [])
  merged.deduction_lines = records.flatMap((record) => record.deduction_lines ?? [])
  merged.calendar_leave_summary = mergeLeaveSummaries(records) as PayrollRecord['calendar_leave_summary']
  return merged
}

export function payrollSummaryFieldValue(
  employee: Employee,
  record: PayrollRecord | undefined,
  fieldId: string,
): string {
  const employerValue = employerPayTypeFieldValue(record, fieldId)
  if (employerValue != null) return employerValue
  const personal = new Set([
    'title', 'name', 'middle_name', 'last_name', 'gender', 'dob', 'nationality', 'passport_number',
  ])
  if (personal.has(fieldId)) return employeeFieldValue(employee, fieldId)
  if (!record) return '—'

  switch (fieldId) {
    case 'earn_basic':
    case 'earn_basic_ex_ot':
    case 'earn_std_hourly':
      return moneyOrDash(record.basic_pay)
    case 'earn_salary':
      return moneyOrDash(record.annual_salary)
    case 'earn_daily_rate':
      return moneyOrDash(record.daily_rate)
    case 'earn_hourly_rate':
      return moneyOrDash(record.wage_per_hour)
    case 'earn_std_hours':
    case 'earn_total_hours':
      return record.total_hours == null ? '—' : String(record.total_hours)
    case 'earn_ot_hourly':
    case 'ea_overtime':
      return moneyOrDash(overtimeTotal(record))
    case 'earn_total_hourly':
      return moneyOrDash(num(record.basic_pay) + overtimeTotal(record))
    case 'leave_annual':
    case 'leave_holiday':
    case 'leave_unpaid':
    case 'leave_authorised':
    case 'leave_unauthorised':
    case 'leave_strike':
    case 'leave_compassionate':
    case 'leave_carer':
    case 'leave_study':
    case 'leave_other':
      return daysOrDash(leaveTypeDays(record, fieldId === 'leave_holiday' ? 'leave_annual' : fieldId))
    case 'leave_sick':
    case 'stat_ssp':
    case 'ea_ssp':
      return moneyOrDash(record.ssp)
    case 'leave_maternity':
    case 'stat_smp':
      return moneyOrDash(record.smp)
    case 'leave_paternity':
    case 'stat_spp':
      return moneyOrDash(record.spp)
    case 'leave_parental':
    case 'stat_shpp':
      return moneyOrDash(record.shpp)
    case 'stat_sap':
      return moneyOrDash(record.sap)
    case 'stat_spbp':
      return moneyOrDash(record.spbp)
    case 'stat_sncp':
      return moneyOrDash(record.sncp)
    case 'stat_total':
      return moneyOrDash(record.total_statutory_pay)
    case 'ad_taxable_nic_add':
      return moneyOrDash(record.taxable_nic_additions)
    case 'ad_before_tax_nic_ded':
      return moneyOrDash(record.before_tax_before_nic_deductions)
    case 'ad_gross':
      return moneyOrDash(record.gross_pay)
    case 'ad_taxable_add':
      return moneyOrDash(record.taxable_additions)
    case 'ad_before_tax_ded':
      return moneyOrDash(record.before_tax_deductions)
    case 'ad_taxable_gross':
      return moneyOrDash(record.taxable_gross)
    case 'ad_tax':
      return moneyOrDash(record.tax)
    case 'ad_nic_add':
      return moneyOrDash(record.nic_additions)
    case 'ad_before_nic_ded':
      return moneyOrDash(record.before_nic_deductions)
    case 'ad_lel':
      return moneyOrDash(record.earning_to_lel)
    case 'ad_lel_pt':
      return moneyOrDash(record.earning_lel_to_pt)
    case 'ad_pt_uel':
      return moneyOrDash(record.earning_pt_to_uel)
    case 'ad_above_uel':
      return moneyOrDash(record.earning_above_uel)
    case 'ad_nicable_gross':
      return moneyOrDash(record.nicable_gross)
    case 'ad_ee_nic':
      return moneyOrDash(record.employee_nic)
    case 'ad_er_nic':
      return moneyOrDash(record.employer_nic)
    case 'ad_er_nic_c1a':
      return moneyOrDash(record.employer_nic_class1a)
    case 'ad_sl':
      return moneyOrDash(record.student_loan)
    case 'ad_pgl':
      return moneyOrDash(record.postgraduate_loan)
    case 'ad_sl_pgl':
      return moneyOrDash(num(record.student_loan) + num(record.postgraduate_loan))
    case 'ad_aeo':
      return moneyOrDash(record.attachment_order)
    case 'ad_aeo_ex_admin':
      return moneyOrDash(record.aeo_without_admin)
    case 'ad_ee_pen_add':
      return moneyOrDash(record.employee_pensionable_additions)
    case 'ad_ee_before_pen':
      return moneyOrDash(record.employee_before_pension_deductions)
    case 'ad_er_pen_add':
      return moneyOrDash(record.employer_pensionable_additions)
    case 'tot_net':
      return moneyOrDash(record.net_pay)
    case 'tot_non_tax_nic_add':
      return moneyOrDash(record.non_tax_non_nic_additions)
    case 'tot_after_tax_nic':
      return moneyOrDash(record.after_tax_after_nic_deductions)
    case 'tot_take_home':
      return moneyOrDash(record.take_home_pay)
    case 'tot_cost':
      return moneyOrDash(record.cost_to_employer)
    case 'oth_pay_date':
      return formatDate(record.pay_date as string | undefined)
    case 'oth_tax_week':
      return record.tax_week == null ? '—' : String(record.tax_week)
    case 'oth_tax_month':
      return record.tax_month == null ? '—' : String(record.tax_month)
    case 'oth_ee_notes':
      return record.employee_notes?.trim() || '—'
    case 'oth_er_notes':
      return record.employer_notes?.trim() || '—'
    case 'oth_starter':
      return flag(record.is_starter)
    case 'oth_leaver':
      return flag(record.is_leaver)
    case 'ea_bonus':
      return moneyOrDash(num(record.bonus) + num(record.bonus_2))
    case 'ea_car':
      return moneyOrDash(record.car_allowance)
    case 'ea_commission':
      return moneyOrDash(record.commission)
    case 'ea_holiday_adj':
    case 'ed_holiday_adj':
      return moneyOrDash(record.holiday_adjustment)
    case 'ea_holiday':
      return moneyOrDash(record.holiday_pay)
    case 'ea_night':
      return moneyOrDash(record.night_allowance)
    case 'ea_service':
      return moneyOrDash(record.service_charges)
    case 'ed_salary_sacrifice':
      return moneyOrDash(record.salary_sacrifice_pension)
    default:
      return '—'
  }
}

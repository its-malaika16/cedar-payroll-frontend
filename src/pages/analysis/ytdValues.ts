import { money } from '../../lib/format'
import type { Employee, PayrollRecord } from '../../types'
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

export function ytdFieldValue(employee: Employee, record: PayrollRecord | undefined, fieldId: string): string {
  if (!fieldId.startsWith('ytd_')) return employeeFieldValue(employee, fieldId)
  if (!record) return '—'

  switch (fieldId) {
    case 'ytd_ssp':
      return moneyOrDash(record.ssp)
    case 'ytd_smp':
      return moneyOrDash(record.smp)
    case 'ytd_spp':
      return moneyOrDash(record.spp)
    case 'ytd_sap':
      return moneyOrDash(record.sap)
    case 'ytd_shpp':
      return moneyOrDash(record.shpp)
    case 'ytd_spbp':
      return moneyOrDash(record.spbp)
    case 'ytd_sncp':
      return moneyOrDash(record.sncp)
    case 'ytd_gross':
      return moneyOrDash(record.gross_pay)
    case 'ytd_taxable_gross':
      return moneyOrDash(record.taxable_gross)
    case 'ytd_tax_free': {
      const free = num(record.gross_pay) - num(record.taxable_gross)
      return free > 0 ? money(free) : '—'
    }
    case 'ytd_tax':
      return moneyOrDash(record.tax)
    case 'ytd_nicable':
      return moneyOrDash(record.nicable_gross)
    case 'ytd_ee_nic':
      return moneyOrDash(record.employee_nic)
    case 'ytd_er_nic':
      return moneyOrDash(record.employer_nic)
    case 'ytd_er_nic_c1a':
      return moneyOrDash(record.employer_nic_class1a)
    case 'ytd_sl':
      return moneyOrDash(record.student_loan)
    case 'ytd_pgl':
      return moneyOrDash(record.postgraduate_loan)
    case 'ytd_sl_pgl':
      return moneyOrDash(num(record.student_loan) + num(record.postgraduate_loan))
    case 'ytd_ee_pen_gross':
      return moneyOrDash(record.pensionable_gross)
    case 'ytd_ee_pen':
      return moneyOrDash(record.employee_pension)
    case 'ytd_er_pen_gross':
      return moneyOrDash(record.employer_pensionable_additions ?? record.pensionable_gross)
    case 'ytd_er_pen':
      return moneyOrDash(record.employer_pension)
    case 'ytd_pen_total':
      return moneyOrDash(num(record.employee_pension) + num(record.employer_pension))
    case 'ytd_net':
      return moneyOrDash(record.net_pay)
    case 'ytd_take_home':
      return moneyOrDash(record.take_home_pay)
    case 'ytd_cost':
      return moneyOrDash(record.cost_to_employer)
    case 'ytd_benefits':
    case 'ytd_ee_avc':
    case 'ytd_er_avc':
    default:
      return '—'
  }
}

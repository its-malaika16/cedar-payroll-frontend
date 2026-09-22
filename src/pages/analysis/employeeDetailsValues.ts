import { formatDate, money } from '../../lib/format'
import type { Employee } from '../../types'
import { paymentMethodLabel } from '../employees/employeeOptions'

function first<T>(list: T[] | undefined | null): T | undefined {
  return list?.[0]
}

function text(value: unknown) {
  if (value == null || value === '') return '—'
  const next = String(value).trim()
  return next || '—'
}

function flag(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const normalised = String(value).toLowerCase()
  if (normalised === 'true' || normalised === '1' || normalised === 'yes') return 'Yes'
  if (normalised === 'false' || normalised === '0' || normalised === 'no') return 'No'
  return text(value)
}

function date(value: unknown) {
  if (value == null || value === '') return '—'
  return formatDate(String(value))
}

function amount(value: unknown) {
  if (value == null || value === '') return '—'
  const number = Number(value)
  return Number.isNaN(number) ? text(value) : money(number)
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function employeeFieldValue(employee: Employee, fieldId: string): string {
  const address = record(first(employee.employee_addresses))
  const bank = record(first(employee.bank_details))
  const tax = record(first(employee.employee_tax_details))
  const job = record(first(employee.employment_details))
  const starter = record(first(employee.starters_leavers))

  switch (fieldId) {
    case 'title':
      return text(employee.title)
    case 'name':
      return text(employee.first_name)
    case 'middle_name':
      return text(employee.middle_name)
    case 'last_name':
      return text(employee.last_name)
    case 'gender':
      return text(employee.gender)
    case 'dob':
      return date(employee.dob)
    case 'email':
      return text(employee.email)
    case 'phone':
      return text(employee.phone)
    case 'address_line_1':
      return text(address.address_line_1)
    case 'address_line_2':
      return text(address.address_line_2)
    case 'address_line_3':
      return text(address.address_line_3)
    case 'address_line_4':
      return text(address.address_line_4)
    case 'postcode':
      return text(address.postcode)
    case 'country':
      return text(address.country)
    case 'works_number':
      return text(employee.employee_code)
    case 'ni_number':
      return text(tax.ni_number)
    case 'department':
      return text(job.department)
    case 'tax_code':
      return text(tax.tax_code)
    case 'ni_category':
      return text(tax.ni_category)
    case 'student_loan_start':
      return date(tax.student_loan_start_date)
    case 'student_loan_stop':
      return date(tax.student_loan_stop_date)
    case 'pg_loan_plan':
      return text(tax.postgraduate_loan_plan)
    case 'pg_loan_start':
      return date(tax.postgraduate_loan_start_date)
    case 'pg_loan_stop':
      return date(tax.postgraduate_loan_stop_date)
    case 'min_wage_profile':
      return text(job.min_wage_profile)
    case 'min_hourly_rate':
      return amount(job.basic_rate_per_hour)
    case 'is_director':
      return flag(tax.is_director)
    case 'annual_salary':
      return amount(job.annual_salary)
    case 'payment_method':
      return text(paymentMethodLabel(bank.payment_method == null ? '' : String(bank.payment_method)))
    case 'bank_name':
      return text(bank.bank_name)
    case 'sort_code':
      return text(bank.sort_code)
    case 'account_name':
      return text(bank.account_name)
    case 'account_number':
      return text(bank.account_number)
    case 'bank_reference':
      return text(bank.bank_reference)
    case 'start_date':
      return date(starter.start_date)
    case 'leave_date':
      return date(starter.leave_date)
    case 'previous_taxable_pay':
      return amount(starter.previous_gross_taxable_pay)
    case 'previous_tax':
      return amount(starter.previous_gross_tax)
    case 'tupe_protected':
      return flag(starter.tupe_protected)
    case 'pre_transfer_start':
      return date(starter.pre_transfer_start_date)
    case 'payroll_id':
      return text(tax.payroll_id)
    case 'contracted_hours':
      return text(tax.contracted_hours_per_week ?? job.typical_hours_per_week)
    case 'workplace_postcode':
      return text(tax.workplace_postcode)
    case 'irregular_payment':
      return flag(tax.irregular_payment_pattern)
    case 'non_individual':
      return flag(tax.payments_to_body)
    case 'trivial_commutation':
      return flag(tax.trivial_commutation)
    case 'flexibly_accessing':
    case 'flex_drawdown_taxable':
    case 'flex_drawdown_nontaxable':
      return flag(tax.flexible_drawdown)
    default:
      return '—'
  }
}

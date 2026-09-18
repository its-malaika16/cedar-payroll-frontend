import { formatNiNumber, formatPayslipPeriod, formatTaxCodeWithBasis, fullName } from '../../lib/format'
import type { Company, Employee, PayrollPayLine, PayrollRecord, PayrollRun } from '../../types'

export type PayslipLine = {
  description: string
  hours?: number | null
  rate?: number | null
  amount: number
}

export type PayslipViewModel = {
  companyName: string
  payeReference: string
  employeeName: string
  department: string
  address: string
  taxCode: string
  niNumber: string
  payPeriod: string
  netPay: number
  earnings: PayslipLine[]
  totalEarnings: number
  deductions: PayslipLine[]
  totalDeductions: number
  ytd: {
    taxablePay: number
    taxPaid: number
    employeeNi: number
    employerNi: number
    pension: number
  }
  period: {
    taxableGross: number
    taxPaid: number
    employeeNi: number
    employerNi: number
    netPay: number
  }
  year: number
}

function amount(value: unknown) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0
}

function firstRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? {}
  return (value as Record<string, unknown>) ?? {}
}

function hoursFromAmount(value: number, rate: number) {
  if (value <= 0 || rate <= 0) return null
  return amount(value / rate)
}

function payLineAmount(line: PayrollPayLine) {
  if (line.kind === 'daily') return amount((line.qty ?? 0) * (line.rate ?? 0))
  return amount(line.amount)
}

function payLineLabel(line: PayrollPayLine) {
  if (line.label) return line.label
  if (line.kind === 'monthly') return 'Period Pay'
  if (line.kind === 'benefit') return 'Payrolled benefit'
  if (line.kind === 'daily') return 'Daily Pay'
  return 'Addition'
}

function formatAddress(employee?: Employee) {
  const address = firstRecord(employee?.employee_addresses)
  const lines = [
    address.address_line_1,
    address.address_line_2,
    address.address_line_3,
    address.address_line_4,
    address.postcode,
  ]
    .map((line) => String(line ?? '').trim())
    .filter(Boolean)
  if (lines.length > 0) return lines.join(', ')
  return String(address.address ?? '').trim()
}

export function buildPayslipViewModel(
  record: PayrollRecord,
  run: PayrollRun | undefined,
  employee: Employee | undefined,
  company?: { office_number?: string | null; company_name?: string | null } | Company | null,
): PayslipViewModel {
  const hourlyRate = amount(record.wage_per_hour)
  const extraPay = record.pay_lines ?? []
  const extraLabels = new Set(extraPay.map((line) => payLineLabel(line).trim().toLowerCase()))
  const earnings: PayslipLine[] = []

  const pushEarning = (
    description: string,
    value: unknown,
    hours?: number | null,
    rate?: number | null,
  ) => {
    const n = amount(value)
    if (n === 0) return
    earnings.push({
      description,
      hours: hours && hours > 0 ? hours : null,
      rate: rate && rate > 0 ? rate : null,
      amount: n,
    })
  }

  pushEarning('Basic Salary', record.basic_pay, amount(record.total_hours), hourlyRate)
  for (const line of extraPay) {
    const n = payLineAmount(line)
    if (n === 0) continue
    earnings.push({
      description: payLineLabel(line),
      hours: line.qty && line.qty > 0 ? line.qty : null,
      rate: line.rate && line.rate > 0 ? line.rate : null,
      amount: n,
    })
  }

  const named: Array<[string, unknown, number | null, number | null]> = [
    ['Holiday Pay', record.holiday_pay, hoursFromAmount(amount(record.holiday_pay), hourlyRate), hourlyRate],
    ['Overtime', record.overtime_1, null, null],
    ['Overtime 1.5', record.overtime_1_5, null, null],
    ['Overtime 2', record.overtime_2, null, null],
    ['Bonus', record.bonus, null, null],
    ['Additional Bonus', record.bonus_2, null, null],
    ['Commission', record.commission, null, null],
    ['Night Allowance', record.night_allowance, null, null],
    ['Holiday Adjustment', record.holiday_adjustment, null, null],
    ['Car Allowance', record.car_allowance, null, null],
    ['Service Charges', record.service_charges, null, null],
    ['Statutory Sick Pay', record.ssp, null, null],
    ['Statutory Maternity Pay', record.smp, null, null],
    ['Statutory Paternity Pay', record.spp, null, null],
    ['Statutory Adoption Pay', record.sap, null, null],
    ['Statutory Shared Parental Pay', record.shpp, null, null],
    ['Statutory Parental Bereavement Pay', record.spbp, null, null],
    ['Statutory Neonatal Care Pay', record.sncp, null, null],
    ['Other additions', record.non_tax_non_nic_additions, null, null],
  ]
  for (const [label, value, hours, rate] of named) {
    if (extraLabels.has(label.toLowerCase())) continue
    pushEarning(label, value, hours, rate)
  }

  const extraDeductions = record.deduction_lines ?? []
  const deductions: PayslipLine[] = []
  const pushDeduction = (description: string, value: unknown) => {
    const n = amount(value)
    if (n === 0) return
    deductions.push({ description, amount: n })
  }
  pushDeduction('Income Tax', record.tax)
  pushDeduction('National Insurance', record.employee_nic)
  pushDeduction('Pension', record.employee_pension)
  pushDeduction('Student Loan', record.student_loan)
  pushDeduction('Postgraduate Loan', record.postgraduate_loan)
  pushDeduction('Attachment Order', record.attachment_order)
  pushDeduction('Attachment of earnings', record.aeo_without_admin)
  if (extraDeductions.length > 0) {
    for (const line of extraDeductions) {
      if (amount(line.amount) === 0) continue
      deductions.push({ description: line.label, amount: amount(line.amount) })
    }
  } else {
    pushDeduction('Other deductions', record.after_tax_after_nic_deductions)
  }

  const employment = firstRecord(employee?.employment_details)
  const tax = firstRecord(employee?.employee_tax_details)
  const netPay = amount(record.take_home_pay)
  const ytd = record.year_to_date
  const totalEarnings = amount(earnings.reduce((sum, line) => sum + line.amount, 0))
  const totalDeductions = amount(deductions.reduce((sum, line) => sum + line.amount, 0))
  const payDate = run?.pay_date ?? record.pay_date
  const companyName =
    String(company?.trading_name ?? '').trim() || String(company?.company_name ?? '').trim()

  return {
    companyName,
    payeReference: String(company?.paye_reference ?? '').trim(),
    employeeName: fullName(employee?.first_name ?? record.employees?.first_name, employee?.last_name ?? record.employees?.last_name),
    department: String(employment.department ?? '').trim() || '—',
    address: formatAddress(employee) || '—',
    taxCode: formatTaxCodeWithBasis(
      record.tax_code ?? (tax.tax_code as string | undefined),
      record.week1month1 ?? tax.week1month1,
      run?.pay_frequency,
    ),
    niNumber: formatNiNumber(String(tax.ni_number ?? '')),
    payPeriod: formatPayslipPeriod(run?.period_start_date, run?.period_end_date, run?.pay_frequency),
    netPay,
    earnings,
    totalEarnings,
    deductions,
    totalDeductions,
    ytd: {
      taxablePay: amount(ytd?.taxable_gross),
      taxPaid: amount(ytd?.tax),
      employeeNi: amount(ytd?.employee_nic),
      employerNi: amount(ytd?.employer_nic),
      pension: amount(ytd?.employee_pension),
    },
    period: {
      taxableGross: amount(record.taxable_gross),
      taxPaid: amount(record.tax),
      employeeNi: amount(record.employee_nic),
      employerNi: amount(record.employer_nic),
      netPay,
    },
    year: payDate ? new Date(payDate).getUTCFullYear() : new Date().getFullYear(),
  }
}

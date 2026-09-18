import type { PayrollRecord } from '../../types'
import { periodPayLabel } from './scheduleWizard/payDateRules'

export const PAY_BENEFIT_ITEMS = [
  { id: 'hourly', label: 'Hourly Pay' },
  { id: 'daily', label: 'Daily Pay' },
  { id: 'period', label: 'Weekly Pay' },
  { id: 'monthly', label: 'Monthly Pay' },
  { id: 'benefit', label: 'Payrolled expense/benefit..', divideBefore: true },
  { id: 'copy', label: 'Copy payments from another pay period..', divideBefore: true },
] as const

export function payBenefitItems(frequency?: string | null) {
  const periodLabel = periodPayLabel(frequency)
  return PAY_BENEFIT_ITEMS.filter((item) => {
    if (item.id === 'monthly' && periodLabel === 'Monthly Pay') return false
    return true
  }).map((item) => (item.id === 'period' ? { ...item, label: periodLabel } : item))
}

export type PayBenefitId = (typeof PAY_BENEFIT_ITEMS)[number]['id']

export const ADDITION_ITEMS: {
  label: string
  field?: keyof PayrollRecord
}[] = [
  { label: 'Additional pay', field: 'bonus_2' },
  { label: 'Bonus', field: 'bonus' },
  { label: 'Car Allowance', field: 'car_allowance' },
  { label: 'Commission', field: 'commission' },
  { label: 'Dividend' },
  { label: 'Expense reimbursement' },
  { label: 'Holiday Adjustment', field: 'holiday_adjustment' },
  { label: 'Holiday pay', field: 'holiday_pay' },
  { label: 'Loan' },
  { label: 'Lottery' },
  { label: 'Night Allowance', field: 'night_allowance' },
  { label: 'Nights out' },
  { label: 'Notional pay' },
  { label: 'Overtime', field: 'overtime_1' },
  { label: 'Service Charge', field: 'service_charges' },
  { label: 'SSP' },
  { label: 'Termination Award' },
  { label: 'Toll Fee' },
  { label: 'Trial' },
]

function moneyAmount(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const TAXABLE_ADDITION_FIELDS: (keyof PayrollRecord)[] = [
  ...ADDITION_ITEMS.flatMap((item) =>
    item.field && item.field !== 'night_allowance' ? [item.field] : [],
  ),
  'overtime_1_5',
  'overtime_2',
]

const MAPPED_ADDITION_FIELD_BY_LABEL = new Map(
  ADDITION_ITEMS.filter((item) => item.field && item.field !== 'night_allowance').map(
    (item) => [item.label, item.field!],
  ),
)

/** Sum of addition-menu amounts shown as Taxable / NIC-able additions. Night allowance is excluded. */
export function taxableAdditionsFromRecord(record: PayrollRecord | null | undefined) {
  if (!record) return 0

  const fromFields = TAXABLE_ADDITION_FIELDS.reduce(
    (sum, field) => sum + moneyAmount(record[field]),
    0,
  )

  const fromLines = (record.pay_lines ?? []).reduce((sum, line) => {
    if (line.kind !== 'addition') return sum
    const mappedField = line.label ? MAPPED_ADDITION_FIELD_BY_LABEL.get(line.label) : undefined
    if (mappedField && moneyAmount(record[mappedField]) !== 0) return sum
    return sum + moneyAmount(line.amount)
  }, 0)

  return roundMoney(fromFields + fromLines)
}

export function contractualPayFromRecord(record: PayrollRecord | null | undefined) {
  if (!record) return 0
  return roundMoney(
    moneyAmount(record.gross_pay ?? record.basic_pay) - taxableAdditionsFromRecord(record),
  )
}

export const DEDUCTION_ITEMS = [
  'Advance',
  'Electricity',
  'Fines',
  'Holiday Adj',
  'Lottery',
  'MK Healthcare',
  'Payroll giving',
  'Salary sacrifice',
  'Staff Loan',
] as const

const BEFORE_NIC_DEDUCTION_LABELS = new Set([
  'salary sacrifice',
  'holiday adj',
  'holiday adjustment',
])
const BEFORE_TAX_DEDUCTION_LABELS = new Set(['payroll giving'])

function deductionLabelKey(label: string) {
  return label.trim().toLowerCase().replace(/\.+$/, '')
}

export function allowableDeductionsFromRecord(record: PayrollRecord | null | undefined) {
  const lines = record?.deduction_lines ?? []
  if (lines.length > 0) {
    let beforeTax = 0
    let beforeNic = 0
    for (const line of lines) {
      const amount = moneyAmount(line.amount)
      const key = deductionLabelKey(line.label ?? '')
      if (BEFORE_NIC_DEDUCTION_LABELS.has(key)) beforeNic += amount
      else if (BEFORE_TAX_DEDUCTION_LABELS.has(key)) beforeTax += amount
    }
    return {
      taxAllowable: roundMoney(beforeTax + beforeNic),
      nicAllowable: roundMoney(beforeNic),
      pensionAllowable: roundMoney(beforeNic),
    }
  }
  const beforeTax = moneyAmount(record?.before_tax_deductions)
  const beforeNic = moneyAmount(record?.before_tax_before_nic_deductions)
  return {
    taxAllowable: roundMoney(beforeTax + beforeNic),
    nicAllowable: roundMoney(beforeNic + moneyAmount(record?.before_nic_deductions)),
    pensionAllowable: roundMoney(beforeNic),
  }
}

/** Full pensionable earnings this period (not qualifying earnings after the LEL). */
export function pensionableGrossForPayslip(record: PayrollRecord | null | undefined) {
  if (!record) return 0
  return roundMoney(
    moneyAmount(record.gross_pay) +
      moneyAmount(record.night_allowance) -
      allowableDeductionsFromRecord(record).pensionAllowable,
  )
}

/**
 * Net pay after tax and NI, before relief-at-source pension.
 * Derived from take-home so draft and previously stored records both match.
 */
export function payslipNetPay(record: PayrollRecord | null | undefined) {
  if (!record) return 0
  return roundMoney(
    moneyAmount(record.take_home_pay) -
      moneyAmount(record.night_allowance) -
      moneyAmount(record.non_tax_non_nic_additions) +
      moneyAmount(record.after_tax_after_nic_deductions) +
      moneyAmount(record.employee_pension),
  )
}

export function payslipNetPayToDate(ytd: PayrollRecord['year_to_date']) {
  if (!ytd) return 0
  return roundMoney(
    moneyAmount(ytd.take_home_pay) -
      moneyAmount(ytd.night_allowance) +
      moneyAmount(ytd.employee_pension),
  )
}

export const DEDUCTION_LINKS = [
  'Automatic enrolment...',
  'Attachment orders...',
  'Saving schemes...',
] as const

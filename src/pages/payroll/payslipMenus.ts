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

type AdditionTreatment = {
  paid: number
  taxable: number
  nicable: number
  employeePension: number
  employerPension: number
  netPay: number
}

function mappedFieldCoveredByLine(record: PayrollRecord, field: keyof PayrollRecord) {
  return (record.pay_lines ?? []).some((line) => {
    if (line.kind !== 'addition' || !line.label) return false
    return MAPPED_ADDITION_FIELD_BY_LABEL.get(line.label) === field
  })
}

/** Addition amounts split by the tax / NIC / pension options on the pay type. */
export function additionTreatmentFromRecord(record: PayrollRecord | null | undefined): AdditionTreatment {
  const empty: AdditionTreatment = {
    paid: 0,
    taxable: 0,
    nicable: 0,
    employeePension: 0,
    employerPension: 0,
    netPay: 0,
  }
  if (!record) return empty

  const fromFields = TAXABLE_ADDITION_FIELDS.reduce((sum, field) => {
    if (mappedFieldCoveredByLine(record, field)) return sum
    return sum + moneyAmount(record[field])
  }, 0)

  const treatment: AdditionTreatment = {
    paid: fromFields,
    taxable: fromFields,
    nicable: fromFields,
    // Overtime, bonus, holiday pay and the other mapped earnings are pensionable.
    // A pay line for the same label can turn pension off.
    employeePension: fromFields,
    employerPension: fromFields,
    netPay: 0,
  }

  for (const line of record.pay_lines ?? []) {
    if (line.kind !== 'addition') continue
    const mappedField = line.label ? MAPPED_ADDITION_FIELD_BY_LABEL.get(line.label) : undefined
    if (mappedField && moneyAmount(record[mappedField]) !== 0) continue
    const amount = moneyAmount(line.amount)
    const tax = line.tax !== false
    const nics = line.nics !== false
    const notional = line.notional === true
    if (!notional) treatment.paid = roundMoney(treatment.paid + amount)
    if (tax) treatment.taxable = roundMoney(treatment.taxable + amount)
    if (nics) treatment.nicable = roundMoney(treatment.nicable + amount)
    if (line.employeePension === true) {
      treatment.employeePension = roundMoney(treatment.employeePension + amount)
    }
    if (line.employerPension === true) {
      treatment.employerPension = roundMoney(treatment.employerPension + amount)
    }
    if (!notional && !tax && !nics) {
      treatment.netPay = roundMoney(treatment.netPay + amount)
    }
  }

  return treatment
}

/** Sum of addition-menu amounts shown as Taxable additions. Night allowance is excluded. */
export function taxableAdditionsFromRecord(record: PayrollRecord | null | undefined) {
  return additionTreatmentFromRecord(record).taxable
}

export function nicableAdditionsFromRecord(record: PayrollRecord | null | undefined) {
  return additionTreatmentFromRecord(record).nicable
}

export function pensionableAdditionsFromRecord(record: PayrollRecord | null | undefined) {
  const treatment = additionTreatmentFromRecord(record)
  return roundMoney(Math.max(treatment.employeePension, treatment.employerPension))
}

export function contractualPayFromRecord(record: PayrollRecord | null | undefined) {
  if (!record) return 0
  return roundMoney(
    moneyAmount(record.gross_pay ?? record.basic_pay) - additionTreatmentFromRecord(record).paid,
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

export const DEFAULT_ADDITION_LABELS = ADDITION_ITEMS.map((item) => item.label)
export const DEFAULT_DEDUCTION_LABELS = [...DEDUCTION_ITEMS]

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
    let nicOnly = 0
    let pension = 0
    for (const line of lines) {
      const amount = moneyAmount(line.amount)
      const hasFlags =
        typeof line.tax === 'boolean' ||
        typeof line.nics === 'boolean' ||
        typeof line.employeePension === 'boolean' ||
        typeof line.employerPension === 'boolean'
      if (hasFlags) {
        const tax = line.tax === true
        const nics = line.nics === true
        if (nics && tax) beforeNic += amount
        else if (nics) nicOnly += amount
        else if (tax) beforeTax += amount
        if (line.employeePension === true) pension += amount
        continue
      }
      const key = deductionLabelKey(line.label ?? '')
      if (BEFORE_NIC_DEDUCTION_LABELS.has(key)) {
        beforeNic += amount
        pension += amount
      } else if (BEFORE_TAX_DEDUCTION_LABELS.has(key)) beforeTax += amount
    }
    return {
      taxAllowable: roundMoney(beforeTax + beforeNic),
      nicAllowable: roundMoney(beforeNic + nicOnly),
      pensionAllowable: roundMoney(pension),
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
  const treatment = additionTreatmentFromRecord(record)
  const pensionableAdditions =
    treatment.employeePension > 0 ? treatment.employeePension : treatment.employerPension
  return roundMoney(
    moneyAmount(record.gross_pay) -
      treatment.paid +
      pensionableAdditions +
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
      moneyAmount(record.non_tax_non_nic_additions) -
      additionTreatmentFromRecord(record).netPay +
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

export const DEDUCTION_LINKS = ['Automatic enrolment...'] as const

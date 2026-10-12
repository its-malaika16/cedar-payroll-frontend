import { ADDITION_ITEMS, DEDUCTION_ITEMS } from './payslipMenus'
import type { PayrollDeductionLine, PayrollPayLine, PayrollRecord } from '../../types'

export type PayrollImportKind =
  | 'mix'
  | 'weekly'
  | 'daily'
  | 'hourly'
  | 'additions'
  | 'deductions'
  | 'notes'

export type PayrollCsvGroup = 'Employee' | 'Payments' | 'Additions' | 'Deductions' | 'Notes'

export type PayrollCsvField = {
  id: string
  label: string
  group: PayrollCsvGroup
  aliases: string[]
  kinds: PayrollImportKind[]
  dtoField?: string
  lineKind?: 'addition' | 'deduction'
}

const PAYMENT_FIELDS: PayrollCsvField[] = [
  {
    id: 'total_hours',
    label: 'Total hours',
    group: 'Payments',
    aliases: ['hours', 'total hours', 'hours worked', 'hrs', 'hour'],
    kinds: ['mix', 'hourly'],
    dtoField: 'total_hours',
  },
  {
    id: 'wage_per_hour',
    label: 'Wage per hour',
    group: 'Payments',
    aliases: ['hourly rate', 'wage per hour', 'rate', 'hour rate', 'pay rate'],
    kinds: ['mix', 'hourly'],
    dtoField: 'wage_per_hour',
  },
  {
    id: 'daily_qty',
    label: 'Daily pay days',
    group: 'Payments',
    aliases: ['days', 'daily days', 'day qty', 'units', 'daily qty'],
    kinds: ['mix', 'daily'],
  },
  {
    id: 'daily_rate',
    label: 'Daily rate',
    group: 'Payments',
    aliases: ['daily rate', 'day rate', 'rate per day'],
    kinds: ['mix', 'daily'],
  },
  {
    id: 'period_pay',
    label: 'Period / weekly / monthly pay',
    group: 'Payments',
    aliases: [
      'weekly pay',
      'weekly payments',
      'period pay',
      'monthly pay',
      'basic pay',
      'salary this period',
      'contractual pay',
    ],
    kinds: ['mix', 'weekly'],
  },
  {
    id: 'unpaid_leave_deduction',
    label: 'Unpaid leave deduction',
    group: 'Payments',
    aliases: ['unpaid leave', 'leave deduction', 'unpaid absence'],
    kinds: ['mix', 'hourly', 'weekly', 'daily'],
    dtoField: 'unpaid_leave_deduction',
  },
]

function additionAliases(label: string, field?: string) {
  const aliases = [label.toLowerCase()]
  if (field) aliases.push(field.replace(/_/g, ' '))
  if (label === 'Additional pay') aliases.push('additional', 'extra pay', 'addition')
  if (label === 'Overtime') aliases.push('overtime', 'ot', 'overtime 1')
  if (label === 'Holiday pay') aliases.push('holiday', 'hol pay')
  return aliases
}

const ADDITION_FIELDS: PayrollCsvField[] = [
  ...ADDITION_ITEMS.filter((item) => item.field).map((item) => ({
    id: `add_${item.field}`,
    label: item.label,
    group: 'Additions' as const,
    aliases: additionAliases(item.label, item.field),
    kinds: ['mix', 'additions'] as PayrollImportKind[],
    dtoField: item.field,
    lineKind: 'addition' as const,
  })),
  ...ADDITION_ITEMS.filter((item) => !item.field).map((item) => ({
    id: `add_line_${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    label: item.label,
    group: 'Additions' as const,
    aliases: additionAliases(item.label),
    kinds: ['mix', 'additions'] as PayrollImportKind[],
    lineKind: 'addition' as const,
  })),
  {
    id: 'add_overtime_1_5',
    label: 'Overtime (1.5x)',
    group: 'Additions',
    aliases: ['overtime 1.5', 'ot 1.5', 'time and a half'],
    kinds: ['mix', 'additions'],
    dtoField: 'overtime_1_5',
  },
  {
    id: 'add_overtime_2',
    label: 'Overtime (2x)',
    group: 'Additions',
    aliases: ['overtime 2', 'ot 2', 'double time'],
    kinds: ['mix', 'additions'],
    dtoField: 'overtime_2',
  },
]

const DEDUCTION_FIELDS: PayrollCsvField[] = DEDUCTION_ITEMS.map((label) => ({
  id: `ded_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  label,
  group: 'Deductions' as const,
  aliases: [label.toLowerCase(), `${label.toLowerCase()} deduction`],
  kinds: ['mix', 'deductions'] as PayrollImportKind[],
  lineKind: 'deduction' as const,
}))

export const PAYROLL_CSV_FIELDS: PayrollCsvField[] = [
  {
    id: 'employee_code',
    label: 'Works number',
    group: 'Employee',
    aliases: [
      'works number',
      'employee code',
      'employee_code',
      'staff number',
      'payroll number',
      'emp code',
      'clock number',
    ],
    kinds: ['mix', 'weekly', 'daily', 'hourly', 'additions', 'deductions', 'notes'],
  },
  {
    id: 'first_name',
    label: 'First name',
    group: 'Employee',
    aliases: ['first name', 'firstname', 'forename', 'given name'],
    kinds: ['mix', 'weekly', 'daily', 'hourly', 'additions', 'deductions', 'notes'],
  },
  {
    id: 'last_name',
    label: 'Last name',
    group: 'Employee',
    aliases: ['last name', 'lastname', 'surname', 'family name'],
    kinds: ['mix', 'weekly', 'daily', 'hourly', 'additions', 'deductions', 'notes'],
  },
  {
    id: 'email',
    label: 'Email',
    group: 'Employee',
    aliases: ['email', 'email address', 'work email'],
    kinds: ['mix', 'weekly', 'daily', 'hourly', 'additions', 'deductions', 'notes'],
  },
  ...PAYMENT_FIELDS,
  ...ADDITION_FIELDS,
  ...DEDUCTION_FIELDS,
  {
    id: 'employee_notes',
    label: 'Employee notes',
    group: 'Notes',
    aliases: ['employee notes', 'notes', 'payslip notes', 'note'],
    kinds: ['mix', 'notes'],
    dtoField: 'employee_notes',
  },
  {
    id: 'employer_notes',
    label: 'Employer notes',
    group: 'Notes',
    aliases: ['employer notes', 'internal notes', 'payroll notes'],
    kinds: ['mix', 'notes'],
    dtoField: 'employer_notes',
  },
]

export const PAYROLL_CSV_GROUPS: PayrollCsvGroup[] = [
  'Employee',
  'Payments',
  'Additions',
  'Deductions',
  'Notes',
]

export function fieldsForKind(kind: PayrollImportKind) {
  return PAYROLL_CSV_FIELDS.filter((field) => field.kinds.includes(kind))
}

export const IMPORT_KIND_LABEL: Record<PayrollImportKind, string> = {
  mix: 'mix of payments, additions and deductions',
  weekly: 'weekly / period payments',
  daily: 'daily payments',
  hourly: 'hourly payments',
  additions: 'additions',
  deductions: 'deductions',
  notes: 'notes',
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function hasIdentityMapping(mapping: Record<string, string>) {
  const used = new Set(Object.values(mapping).filter(Boolean))
  return (
    used.has('employee_code') ||
    used.has('email') ||
    (used.has('first_name') && used.has('last_name'))
  )
}

function key(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function matchPayrollRecord(
  records: PayrollRecord[],
  identity: { code: string; email: string; first: string; last: string },
) {
  const code = key(identity.code)
  const email = key(identity.email)
  const name = key(`${identity.first} ${identity.last}`)
  const first = key(identity.first)

  if (code) {
    const matches = records.filter((record) => key(record.employees?.employee_code) === code)
    return matches.length === 1 ? matches[0] : null
  }
  if (email) {
    const matches = records.filter((record) => key(record.employees?.email) === email)
    return matches.length === 1 ? matches[0] : null
  }
  if (name) {
    const matches = records.filter(
      (record) => key(`${record.employees?.first_name ?? ''} ${record.employees?.last_name ?? ''}`) === name,
    )
    if (matches.length === 1) return matches[0]
  }
  if (first && !identity.last) {
    const matches = records.filter((record) => key(record.employees?.first_name) === first)
    return matches.length === 1 ? matches[0] : null
  }
  return null
}

export function mergePayLines(
  existing: PayrollPayLine[] | null | undefined,
  imported: {
    daily?: { qty: number; rate: number }
    periodAmount?: number
    periodLabel?: string
    extraAdditions: { label: string; amount: number }[]
  },
): PayrollPayLine[] {
  let lines = (existing ?? []).map((line) => ({ ...line }))
  if (imported.daily) {
    const amount = roundMoney(imported.daily.qty * imported.daily.rate)
    const current = lines.find((line) => line.kind === 'daily')
    if (current) {
      current.qty = imported.daily.qty
      current.rate = imported.daily.rate
      current.amount = amount
    } else {
      lines.push({
        id: 'daily-import',
        kind: 'daily',
        qty: imported.daily.qty,
        rate: imported.daily.rate,
        amount,
      })
    }
  }
  if (imported.periodAmount != null) {
    const current = lines.find((line) => line.kind === 'monthly')
    if (current) {
      current.amount = imported.periodAmount
      if (imported.periodLabel) current.label = current.label || imported.periodLabel
    } else {
      lines.push({
        id: 'monthly-import',
        kind: 'monthly',
        amount: imported.periodAmount,
        label: imported.periodLabel,
      })
    }
  }
  for (const addition of imported.extraAdditions) {
    const labelKey = key(addition.label)
    const current = lines.find((line) => line.kind === 'addition' && key(line.label) === labelKey)
    if (current) current.amount = addition.amount
    else {
      lines.push({
        id: `addition-${addition.label}`,
        kind: 'addition',
        label: addition.label,
        amount: addition.amount,
      })
    }
  }
  return lines
}

export function mergeDeductionLines(
  existing: PayrollDeductionLine[] | null | undefined,
  imported: { label: string; amount: number }[],
): PayrollDeductionLine[] {
  const lines = (existing ?? []).map((line) => ({ ...line }))
  for (const item of imported) {
    const labelKey = key(item.label)
    const current = lines.find((line) => key(line.label) === labelKey)
    if (current) current.amount = item.amount
    else lines.push({ label: item.label, amount: item.amount })
  }
  return lines
}

export function isRecordLocked(record: PayrollRecord) {
  const status = String(record.status ?? '').toUpperCase()
  return status === 'FINALISED' || status === 'LOCKED' || Boolean(record.finalised_at)
}

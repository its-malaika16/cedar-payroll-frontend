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
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type PayrollIdentity = { code: string; email: string; first: string; last: string }

type NamedPerson = {
  employee_code?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  extra_emails?: { address?: string }[] | null
}

function only<T>(items: T[]) {
  return items.length === 1 ? items[0] : null
}

function personEmails(person: NamedPerson | null | undefined) {
  return [person?.email, ...(person?.extra_emails ?? []).map((item) => item.address)]
    .map(key)
    .filter(Boolean)
}

function namesMatch(person: NamedPerson | null | undefined, first: string, last: string) {
  const csvFirst = key(first)
  const csvLast = key(last)
  if (!csvFirst && !csvLast) return false
  const personFirst = key(person?.first_name)
  const personLast = key(person?.last_name)
  if (csvFirst && csvLast) {
    if (personFirst === csvFirst && personLast === csvLast) return true
    const csv = `${csvFirst} ${csvLast}`
    const personName = `${personFirst} ${personLast}`.trim()
    if (personName === csv) return true
    const csvParts = csv.split(' ')
    const personParts = personName.split(' ').filter(Boolean)
    return (
      personParts.length >= 2 &&
      csvParts.length >= 2 &&
      personParts[0] === csvParts[0] &&
      personParts[personParts.length - 1] === csvParts[csvParts.length - 1]
    )
  }
  return false
}

export function matchNamedPerson<T extends NamedPerson>(
  people: T[],
  identity: PayrollIdentity,
) {
  const code = key(identity.code)
  const email = key(identity.email)
  const first = identity.first
  const last = identity.last

  if (code) {
    const hit = only(people.filter((person) => key(person.employee_code) === code))
    if (hit) return hit
  }
  if (email) {
    const hit = only(people.filter((person) => personEmails(person).includes(email)))
    if (hit) return hit
  }
  if (key(first) && key(last)) {
    const hit = only(people.filter((person) => namesMatch(person, first, last)))
    if (hit) return hit
  }
  if (key(first) && !key(last)) {
    const hit = only(people.filter((person) => key(person.first_name) === key(first)))
    if (hit) return hit
  }
  return null
}

export function matchPayrollRecord(
  records: PayrollRecord[],
  identity: PayrollIdentity,
) {
  const people = records
    .map((record) => record.employees)
    .filter((person): person is NonNullable<PayrollRecord['employees']> => Boolean(person))
  const person = matchNamedPerson(people, identity)
  if (!person) return null
  return (
    records.find((record) => String(record.employees?.id ?? '') === String(person.id ?? '')) ?? null
  )
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

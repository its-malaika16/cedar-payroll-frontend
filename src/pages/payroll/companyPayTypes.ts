import type { EmployerDefaults } from '../../types'
import { emptyPayTypeDraft, type PayTypeDraft } from './payTypes'
import { DEFAULT_ADDITION_LABELS, DEFAULT_DEDUCTION_LABELS } from './payslipMenus'

export type CompanyPayTypeEntry = {
  name: string
  amount?: string
  calculationMethod?: string
  repetition?: string
  tax?: boolean
  nics?: boolean
  employeePension?: boolean
  employerPension?: boolean
  notional?: boolean
  minWage?: boolean
  custom?: boolean
}

export type CompanyPayTypes = {
  additions: CompanyPayTypeEntry[]
  deductions: CompanyPayTypeEntry[]
}

function payTypeNameKey(name: string) {
  return name.trim().toLowerCase()
}

function asBoolean(value: unknown) {
  return value === true ? true : value === false ? false : undefined
}

export function parsePayTypeEntry(value: unknown): CompanyPayTypeEntry | null {
  if (typeof value === 'string') {
    const name = value.trim()
    return name ? { name: name.slice(0, 80) } : null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const name = String(raw.name ?? '').trim()
  if (!name) return null
  const amount = raw.amount == null ? undefined : String(raw.amount)
  return {
    name: name.slice(0, 80),
    ...(amount ? { amount } : {}),
    ...(typeof raw.calculationMethod === 'string' ? { calculationMethod: raw.calculationMethod } : {}),
    ...(typeof raw.repetition === 'string' ? { repetition: raw.repetition } : {}),
    ...(asBoolean(raw.tax) !== undefined ? { tax: asBoolean(raw.tax) } : {}),
    ...(asBoolean(raw.nics) !== undefined ? { nics: asBoolean(raw.nics) } : {}),
    ...(asBoolean(raw.employeePension) !== undefined
      ? { employeePension: asBoolean(raw.employeePension) }
      : {}),
    ...(asBoolean(raw.employerPension) !== undefined
      ? { employerPension: asBoolean(raw.employerPension) }
      : {}),
    ...(asBoolean(raw.notional) !== undefined ? { notional: asBoolean(raw.notional) } : {}),
    ...(asBoolean(raw.minWage) !== undefined ? { minWage: asBoolean(raw.minWage) } : {}),
    ...(raw.custom === true ? { custom: true } : {}),
  }
}

function uniqueEntries(value: unknown, fallback: CompanyPayTypeEntry[]) {
  if (!Array.isArray(value)) return fallback
  const seen = new Set<string>()
  const items: CompanyPayTypeEntry[] = []
  for (const item of value) {
    const entry = parsePayTypeEntry(item)
    if (!entry) continue
    const key = payTypeNameKey(entry.name)
    if (seen.has(key)) continue
    seen.add(key)
    items.push(entry)
  }
  return items
}

export function defaultCompanyPayTypes(): CompanyPayTypes {
  return {
    additions: DEFAULT_ADDITION_LABELS.map((name) => ({ name })),
    deductions: DEFAULT_DEDUCTION_LABELS.map((name) => ({ name })),
  }
}

export function resolveCompanyPayTypes(defaults?: EmployerDefaults | null): CompanyPayTypes {
  const stored = defaults?.pay_types
  if (!stored || typeof stored !== 'object') return defaultCompanyPayTypes()
  return {
    additions: uniqueEntries(stored.additions, []),
    deductions: uniqueEntries(stored.deductions, []),
  }
}

export function hasPayType(list: CompanyPayTypeEntry[], name: string) {
  const key = payTypeNameKey(name)
  return list.some((item) => payTypeNameKey(item.name) === key)
}

export function isCustomCompanyPayType(entry: CompanyPayTypeEntry) {
  return (
    entry.custom === true ||
    Boolean(entry.calculationMethod) ||
    Boolean(entry.repetition) ||
    typeof entry.tax === 'boolean' ||
    typeof entry.nics === 'boolean' ||
    typeof entry.employeePension === 'boolean' ||
    typeof entry.employerPension === 'boolean' ||
    typeof entry.notional === 'boolean' ||
    typeof entry.minWage === 'boolean'
  )
}

export function entryFromDraft(draft: PayTypeDraft): CompanyPayTypeEntry {
  return {
    name: draft.name.trim().slice(0, 80),
    amount: draft.amount.trim() || '0.00',
    calculationMethod: draft.calculationMethod,
    repetition: draft.repetition,
    tax: draft.tax,
    nics: draft.nics,
    employeePension: draft.employeePension,
    employerPension: draft.employerPension,
    notional: draft.notional,
    minWage: draft.minWage,
    custom: true,
  }
}

export function draftFromEntry(entry: CompanyPayTypeEntry): PayTypeDraft {
  const empty = emptyPayTypeDraft()
  return {
    ...empty,
    name: entry.name,
    amount: entry.amount ?? empty.amount,
    calculationMethod: entry.calculationMethod ?? empty.calculationMethod,
    repetition: entry.repetition ?? empty.repetition,
    tax: entry.tax ?? empty.tax,
    nics: entry.nics ?? empty.nics,
    employeePension: entry.employeePension ?? empty.employeePension,
    employerPension: entry.employerPension ?? empty.employerPension,
    notional: entry.notional ?? empty.notional,
    minWage: entry.minWage ?? empty.minWage,
    reuse: 'remember',
  }
}

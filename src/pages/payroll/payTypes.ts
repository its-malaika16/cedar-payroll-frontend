export type PayTypeKind = 'addition' | 'deduction'
export type PayTypeReuse = 'one-off' | 'remember'

export type PayTypeFlags = {
  tax: boolean
  nics: boolean
  employeePension: boolean
  employerPension: boolean
  notional: boolean
  minWage: boolean
}

export type PayTypeDraft = PayTypeFlags & {
  name: string
  amount: string
  calculationMethod: string
  repetition: string
  reuse: PayTypeReuse
}

export type CustomAdditionLine = PayTypeFlags & {
  name: string
  amount: string
  calculationMethod?: string
  repetition?: string
}

export type CustomDeductionLine = CustomAdditionLine

export function isCustomDeductionLine(line: {
  tax?: boolean
  nics?: boolean
  employeePension?: boolean
  employerPension?: boolean
  calculationMethod?: string
  repetition?: string
}) {
  return (
    line.calculationMethod != null ||
    line.repetition != null ||
    typeof line.tax === 'boolean' ||
    typeof line.nics === 'boolean' ||
    typeof line.employeePension === 'boolean' ||
    typeof line.employerPension === 'boolean'
  )
}

export function isRepeatingRepetition(repetition?: string) {
  return String(repetition ?? '')
    .toLowerCase()
    .includes('repeat each period')
}

export function flagsFromDraft(draft: PayTypeFlags): PayTypeFlags {
  return {
    tax: draft.tax,
    nics: draft.nics,
    employeePension: draft.employeePension,
    employerPension: draft.employerPension,
    notional: draft.notional,
    minWage: draft.minWage,
  }
}

export function deductionFlagsFromDraft(draft: PayTypeFlags) {
  return {
    tax: draft.tax,
    nics: draft.nics,
    employeePension: draft.employeePension,
    employerPension: draft.employerPension,
  }
}

export function flagsFromPayLine(line: {
  tax?: boolean
  nics?: boolean
  employeePension?: boolean
  employerPension?: boolean
  notional?: boolean
  minWage?: boolean
}): PayTypeFlags {
  return {
    tax: line.tax !== false,
    nics: line.nics !== false,
    employeePension: line.employeePension !== false,
    employerPension: line.employerPension !== false,
    notional: line.notional === true,
    minWage: line.minWage !== false,
  }
}

export type SavedPayType = PayTypeDraft & {
  id: string
  kind: PayTypeKind
}

export const CALCULATION_METHODS = [
  'Basic amount',
  '% of basic pay',
  '% of gross pay',
  '% of net pay',
  'Termination Award',
  'Sporting Testimonial Payment',
] as const

export const REPETITION_OPTIONS = [
  'Include in this period only',
  'Repeat each period until removed',
] as const

export function isPercentageMethod(method: string) {
  return method.startsWith('% of ')
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function resolvePayTypeAmount(
  draft: PayTypeDraft,
  record?: {
    basic_pay?: string | number | null
    gross_pay?: string | number | null
    net_pay?: string | number | null
    take_home_pay?: string | number | null
  } | null,
) {
  const entered = Number(draft.amount)
  const value = Number.isFinite(entered) ? entered : 0
  if (draft.calculationMethod === '% of basic pay') {
    return roundMoney((Number(record?.basic_pay ?? 0) * value) / 100).toFixed(2)
  }
  if (draft.calculationMethod === '% of gross pay') {
    return roundMoney((Number(record?.gross_pay ?? 0) * value) / 100).toFixed(2)
  }
  if (draft.calculationMethod === '% of net pay') {
    return roundMoney((Number(record?.net_pay ?? record?.take_home_pay ?? 0) * value) / 100).toFixed(2)
  }
  return (draft.amount.trim() || '0.00')
}

export function emptyPayTypeDraft(): PayTypeDraft {
  return {
    name: '',
    amount: '0.00',
    calculationMethod: 'Basic amount',
    repetition: 'Include in this period only',
    tax: true,
    nics: true,
    employeePension: false,
    employerPension: false,
    minWage: true,
    notional: false,
    reuse: 'one-off',
  }
}

function storageKey(companyId: string) {
  return `cedar.pay_types.${companyId}`
}

export function loadSavedPayTypes(companyId: string): SavedPayType[] {
  try {
    const raw = localStorage.getItem(storageKey(companyId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedPayType[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function rememberPayType(companyId: string, kind: PayTypeKind, draft: PayTypeDraft) {
  const current = loadSavedPayTypes(companyId)
  const next: SavedPayType = {
    ...draft,
    id: `${kind}-${Date.now()}`,
    kind,
  }
  const merged = [...current.filter((item) => !(item.kind === kind && item.name === draft.name)), next]
  localStorage.setItem(storageKey(companyId), JSON.stringify(merged))
  return merged
}

export type PayTypeKind = 'addition' | 'deduction'
export type PayTypeReuse = 'one-off' | 'remember'

export type PayTypeDraft = {
  name: string
  amount: string
  calculationMethod: string
  repetition: string
  tax: boolean
  nics: boolean
  employeePension: boolean
  employerPension: boolean
  minWage: boolean
  notional: boolean
  reuse: PayTypeReuse
}

export type SavedPayType = PayTypeDraft & {
  id: string
  kind: PayTypeKind
}

export const CALCULATION_METHODS = [
  'Basic amount',
  'Percentage of pay',
  'Based on hours worked',
] as const

export const REPETITION_OPTIONS = [
  'Include in this period only',
  'Every pay period',
  'Until employee leaves',
] as const

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

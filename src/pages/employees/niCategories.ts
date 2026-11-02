export const NI_CATEGORIES = [
  { value: 'A', label: 'A — Standard (over 21)' },
  { value: 'B', label: 'B — Married women and widows reduced rate' },
  { value: 'C', label: 'C — Over State Pension age' },
  { value: 'D', label: 'D — Investment Zone deferment' },
  { value: 'E', label: 'E — Investment Zone reduced rate' },
  { value: 'F', label: 'F — Freeport' },
  { value: 'H', label: 'H — Apprentice under 25' },
  { value: 'I', label: 'I — Freeport reduced rate' },
  { value: 'J', label: 'J — Deferment' },
  { value: 'K', label: 'K — Investment Zone over State Pension age' },
  { value: 'L', label: 'L — Freeport deferment' },
  { value: 'M', label: 'M — Under 21' },
  { value: 'N', label: 'N — Investment Zone' },
  { value: 'S', label: 'S — Freeport over State Pension age' },
  { value: 'V', label: 'V — Veteran' },
  { value: 'X', label: 'X — Not liable (including under 16)' },
  { value: 'Z', label: 'Z — Under 21 deferment' },
] as const

export type NiCategoryLetter = (typeof NI_CATEGORIES)[number]['value']

export const MID_YEAR_NI_LETTERS = NI_CATEGORIES.map((item) => item.value)

export function isNiCategoryLetter(value: string): value is NiCategoryLetter {
  return NI_CATEGORIES.some((item) => item.value === value)
}

export function recommendedNiCategory(age: number): NiCategoryLetter {
  if (age < 16) return 'X'
  if (age < 21) return 'M'
  if (age >= 66) return 'C'
  return 'A'
}

export function allowedNiCategories(age: number): NiCategoryLetter[] {
  if (age < 16) return ['X']
  if (age >= 66) return ['C', 'K', 'S', 'X']
  const working: NiCategoryLetter[] = ['B', 'D', 'E', 'F', 'I', 'L', 'N', 'V', 'X']
  if (age < 21) return ['M', 'Z', 'H', ...working]
  if (age < 25) return ['A', 'J', 'H', ...working]
  return ['A', 'J', ...working]
}

export function isAllowedNiCategory(letter: string, age: number): boolean {
  return allowedNiCategories(age).includes(letter.trim().toUpperCase() as NiCategoryLetter)
}

export function niCategoryLabel(value: string) {
  return NI_CATEGORIES.find((item) => item.value === value)?.label ?? value
}

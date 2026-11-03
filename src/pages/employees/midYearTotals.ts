export type MidYearNiRowDraft = {
  category: string
  gross_earnings: string
  earnings_to_lel: string
  lel_to_pt: string
  pt_to_uel: string
  st_to_ust: string
  total_nics: string
  employee_nics: string
}

export type MidYearTotalsDraft = {
  gross_pay: string
  taxable_benefits: string
  ssp: string
  smp: string
  spp: string
  sap: string
  shpp: string
  spbp: string
  spbp_nire: string
  sncp: string
  taxable_pay: string
  tax: string
  student_loan: string
  postgraduate_loan: string
  ni_rows: MidYearNiRowDraft[]
  employee_pensionable_pay: string
  employee_pension: string
  employee_avc: string
  employer_pensionable_pay: string
  employer_pension: string
  employer_avc: string
  net_pay: string
  take_home_pay: string
  cost_to_employer: string
}

export { MID_YEAR_NI_LETTERS } from './niCategories'

function parseMoney(value: unknown) {
  if (value == null || value === '') return 0
  const amount = Number(String(value).replace(/[£,\s]/g, ''))
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

function moneyText(value: unknown) {
  const amount = parseMoney(value)
  return amount === 0 ? '' : amount.toFixed(2)
}

export function emptyNiRow(category = 'A'): MidYearNiRowDraft {
  return {
    category: category || 'A',
    gross_earnings: '',
    earnings_to_lel: '',
    lel_to_pt: '',
    pt_to_uel: '',
    st_to_ust: '',
    total_nics: '',
    employee_nics: '',
  }
}

export function emptyMidYearDraft(niCategory = 'A'): MidYearTotalsDraft {
  return {
    gross_pay: '',
    taxable_benefits: '',
    ssp: '',
    smp: '',
    spp: '',
    sap: '',
    shpp: '',
    spbp: '',
    spbp_nire: '',
    sncp: '',
    taxable_pay: '',
    tax: '',
    student_loan: '',
    postgraduate_loan: '',
    ni_rows: [emptyNiRow(niCategory)],
    employee_pensionable_pay: '',
    employee_pension: '',
    employee_avc: '',
    employer_pensionable_pay: '',
    employer_pension: '',
    employer_avc: '',
    net_pay: '',
    take_home_pay: '',
    cost_to_employer: '',
  }
}

export function draftFromMidYear(value: unknown, niCategory = 'A'): MidYearTotalsDraft {
  const base = emptyMidYearDraft(niCategory)
  if (!value || typeof value !== 'object') return base
  const source = value as Record<string, unknown>
  const textKeys: Array<keyof Omit<MidYearTotalsDraft, 'ni_rows'>> = [
    'gross_pay',
    'taxable_benefits',
    'ssp',
    'smp',
    'spp',
    'sap',
    'shpp',
    'spbp',
    'spbp_nire',
    'sncp',
    'taxable_pay',
    'tax',
    'student_loan',
    'postgraduate_loan',
    'employee_pensionable_pay',
    'employee_pension',
    'employee_avc',
    'employer_pensionable_pay',
    'employer_pension',
    'employer_avc',
    'net_pay',
    'take_home_pay',
    'cost_to_employer',
  ]
  for (const key of textKeys) {
    if (source[key] != null && source[key] !== '') {
      base[key] = moneyText(source[key])
    }
  }
  if (Array.isArray(source.ni_rows) && source.ni_rows.length) {
    base.ni_rows = source.ni_rows.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>
      return {
          category: String(item.category ?? niCategory ?? 'A'),
        gross_earnings: moneyText(item.gross_earnings),
        earnings_to_lel: moneyText(item.earnings_to_lel),
        lel_to_pt: moneyText(item.lel_to_pt),
        pt_to_uel: moneyText(item.pt_to_uel),
        st_to_ust: moneyText(item.st_to_ust),
        total_nics: moneyText(item.total_nics),
        employee_nics: moneyText(item.employee_nics),
      }
    })
  }
  return base
}

function amount(value: string) {
  return parseMoney(value)
}

export function employerNicsFromAmounts(totalNics: number, employeeNics: number) {
  return Math.max(0, Math.round((totalNics - employeeNics) * 100) / 100)
}

export function employerNicsFromRow(row: MidYearNiRowDraft) {
  return employerNicsFromAmounts(amount(row.total_nics), amount(row.employee_nics))
}

export function derivedMidYearCost(draft: MidYearTotalsDraft) {
  const employerNics = draft.ni_rows.reduce((sum, row) => sum + employerNicsFromRow(row), 0)
  return (
    Math.round(
      (amount(draft.gross_pay) +
        amount(draft.taxable_benefits) +
        employerNics +
        amount(draft.employer_pension) +
        amount(draft.employer_avc)) *
        100,
    ) / 100
  )
}

export function moneyDisplay(value: number) {
  return value === 0 ? '' : value.toFixed(2)
}

export function midYearPayload(draft: MidYearTotalsDraft) {
  const niRows = draft.ni_rows.map((row) => ({
    category: row.category,
    gross_earnings: amount(row.gross_earnings),
    earnings_to_lel: amount(row.earnings_to_lel),
    lel_to_pt: amount(row.lel_to_pt),
    pt_to_uel: amount(row.pt_to_uel),
    st_to_ust: amount(row.st_to_ust),
    total_nics: amount(row.total_nics),
    employee_nics: amount(row.employee_nics),
  }))
  const employeeNics = niRows.reduce((sum, row) => sum + row.employee_nics, 0)
  const cash = amount(draft.gross_pay) + amount(draft.taxable_benefits)
  const taxablePay = amount(draft.taxable_pay) || cash
  const netPay =
    amount(draft.net_pay) ||
    Math.round(
      (cash -
        amount(draft.tax) -
        employeeNics -
        amount(draft.student_loan) -
        amount(draft.postgraduate_loan) -
        amount(draft.employee_pension) -
        amount(draft.employee_avc)) *
        100,
    ) / 100
  const cost = derivedMidYearCost(draft)
  return {
    gross_pay: amount(draft.gross_pay),
    taxable_benefits: amount(draft.taxable_benefits),
    ssp: amount(draft.ssp),
    smp: amount(draft.smp),
    spp: amount(draft.spp),
    sap: amount(draft.sap),
    shpp: amount(draft.shpp),
    spbp: amount(draft.spbp),
    spbp_nire: amount(draft.spbp_nire),
    sncp: amount(draft.sncp),
    taxable_pay: taxablePay,
    tax: amount(draft.tax),
    student_loan: amount(draft.student_loan),
    postgraduate_loan: amount(draft.postgraduate_loan),
    ni_rows: niRows,
    employee_pensionable_pay: amount(draft.employee_pensionable_pay),
    employee_pension: amount(draft.employee_pension),
    employee_avc: amount(draft.employee_avc),
    employer_pensionable_pay: amount(draft.employer_pensionable_pay),
    employer_pension: amount(draft.employer_pension),
    employer_avc: amount(draft.employer_avc),
    net_pay: netPay,
    take_home_pay: amount(draft.take_home_pay) || netPay,
    cost_to_employer: cost,
  }
}

export function isContinuePartway(company?: {
  payroll_start_mode?: string | null
  employer_defaults?: { payroll_start_mode?: string | null } | null
} | null) {
  const mode =
    company?.employer_defaults?.payroll_start_mode || company?.payroll_start_mode || ''
  return mode === 'CONTINUE_PARTWAY'
}

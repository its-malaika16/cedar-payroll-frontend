import { isNiCategoryLetter } from './niCategories'
import { emptyMidYearDraft, type MidYearTotalsDraft } from './midYearTotals'

export type MidYearCsvGroup = 'Employee' | 'Pay' | 'Tax' | 'Loans' | 'National Insurance' | 'Pensions' | 'Net pay'

export type MidYearCsvField = {
  id: string
  label: string
  required?: boolean
  group: MidYearCsvGroup
  aliases: string[]
}

export const MID_YEAR_CSV_GROUPS: MidYearCsvGroup[] = [
  'Employee',
  'Pay',
  'Tax',
  'Loans',
  'National Insurance',
  'Pensions',
  'Net pay',
]

export const MID_YEAR_CSV_FIELDS: MidYearCsvField[] = [
  { id: 'first_name', label: 'First name', required: true, group: 'Employee', aliases: ['first name', 'firstname', 'forename', 'given name'] },
  { id: 'last_name', label: 'Last name', required: true, group: 'Employee', aliases: ['last name', 'lastname', 'surname', 'family name'] },
  { id: 'gross_pay', label: 'Gross pay to date', group: 'Pay', aliases: ['gross pay to date', 'gross pay including statutory pay', 'gross pay'] },
  { id: 'taxable_benefits', label: 'Taxable benefits to date', group: 'Pay', aliases: ['taxable benefits to date', 'taxable benefits', 'payrolled benefits'] },
  { id: 'ssp', label: 'Statutory Sick Pay to date', group: 'Pay', aliases: ['statutory sick pay to date', 'statutory sick pay', 'ssp'] },
  { id: 'smp', label: 'Statutory Maternity Pay to date', group: 'Pay', aliases: ['statutory maternity pay to date', 'statutory maternity pay', 'smp'] },
  { id: 'spp', label: 'Statutory Paternity Pay to date', group: 'Pay', aliases: ['statutory paternity pay to date', 'statutory paternity pay', 'spp'] },
  { id: 'sap', label: 'Statutory Adoption Pay to date', group: 'Pay', aliases: ['statutory adoption pay to date', 'statutory adoption pay', 'sap'] },
  { id: 'shpp', label: 'Statutory Shared Parental Pay to date', group: 'Pay', aliases: ['statutory shared parental pay to date', 'shared parental pay', 'shpp'] },
  { id: 'spbp', label: 'Statutory Parental Bereavement Pay to date', group: 'Pay', aliases: ['statutory parental bereavement pay to date', 'parental bereavement pay', 'spbp'] },
  { id: 'spbp_nire', label: 'Statutory Parental Bereavement Pay (NIRe) to date', group: 'Pay', aliases: ['statutory parental bereavement pay nire', 'bereavement pay nire', 'spbp nire'] },
  { id: 'sncp', label: 'Statutory Neonatal Care Pay to date', group: 'Pay', aliases: ['statutory neonatal care pay to date', 'neonatal care pay', 'sncp'] },
  { id: 'taxable_pay', label: 'Taxable pay to date', group: 'Tax', aliases: ['taxable pay to date', 'taxable pay'] },
  { id: 'tax', label: 'Tax to date', group: 'Tax', aliases: ['tax to date', 'tax paid to date', 'paye to date'] },
  { id: 'student_loan', label: 'Student loan deductions to date', group: 'Loans', aliases: ['student loan deductions to date', 'student loan to date', 'student loan'] },
  { id: 'postgraduate_loan', label: 'Postgraduate loan deductions to date', group: 'Loans', aliases: ['postgraduate loan deductions to date', 'postgraduate loan to date', 'postgraduate loan'] },
  { id: 'ni_category', label: 'NI category', group: 'National Insurance', aliases: ['ni category', 'nic category', 'national insurance category'] },
  { id: 'ni_gross_earnings', label: 'NI gross earnings', group: 'National Insurance', aliases: ['ni gross earnings', 'gross earnings for ni', 'nicable pay', 'nics gross'] },
  { id: 'ni_earnings_to_lel', label: 'Earnings to LEL', group: 'National Insurance', aliases: ['earnings to lel', 'earnings at lel', 'to lel'] },
  { id: 'ni_lel_to_pt', label: 'Earnings from LEL to PT', group: 'National Insurance', aliases: ['earnings from lel to pt', 'lel to pt'] },
  { id: 'ni_pt_to_uel', label: 'Earnings from PT to UEL', group: 'National Insurance', aliases: ['earnings from pt to uel', 'pt to uel'] },
  { id: 'ni_st_to_ust', label: 'Earnings from ST to UST', group: 'National Insurance', aliases: ['earnings from st to ust', 'st to ust', 'st to aust', 'st to fust', 'st to vust'] },
  { id: 'ni_employee_nics', label: 'Employee NICs', group: 'National Insurance', aliases: ['employee nics', 'employee nic', 'ee nics', 'employee national insurance'] },
  { id: 'ni_employer_nics', label: 'Employer NICs', group: 'National Insurance', aliases: ['employer nics', 'employer nic', 'er nics', 'employer national insurance'] },
  { id: 'ni_total_nics', label: 'Total NICs', group: 'National Insurance', aliases: ['total nics', 'total nic'] },
  { id: 'employee_pensionable_pay', label: "Employee's pensionable pay to date", group: 'Pensions', aliases: ['employee pensionable pay', 'employees pensionable pay', 'ee pensionable pay'] },
  { id: 'employee_pension', label: "Employee's pension to date", group: 'Pensions', aliases: ['employee pension to date', 'employees pension to date', 'employee pension', 'ee pension'] },
  { id: 'employee_avc', label: "Employee's additional voluntary pension to date", group: 'Pensions', aliases: ['employee additional voluntary pension', 'employee avc', 'ee avc'] },
  { id: 'employer_pensionable_pay', label: "Employer's pensionable pay to date", group: 'Pensions', aliases: ['employer pensionable pay', 'employers pensionable pay', 'er pensionable pay'] },
  { id: 'employer_pension', label: "Employer's pension to date", group: 'Pensions', aliases: ['employer pension to date', 'employers pension to date', 'employer pension', 'er pension'] },
  { id: 'employer_avc', label: "Employer's additional voluntary pension to date", group: 'Pensions', aliases: ['employer additional voluntary pension', 'employer avc', 'er avc'] },
  { id: 'net_pay', label: 'Net pay to date', group: 'Net pay', aliases: ['net pay to date', 'net pay'] },
  { id: 'take_home_pay', label: 'Take-home pay to date', group: 'Net pay', aliases: ['take home pay to date', 'take-home pay to date', 'take home pay'] },
]

const MONEY_KEYS = [
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
] as const

export function personNameKey(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function moneyText(raw: string) {
  const text = raw.trim()
  if (!text) return ''
  const amount = Number(text.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return null
  return amount.toFixed(2)
}

export function midYearDraftFromCsv(
  value: (fieldId: string) => string,
  fallbackCategory = 'A',
) {
  const categoryText = value('ni_category').trim().toUpperCase()
  const letter = categoryText.match(/\b([A-Z])\b/)?.[1] ?? categoryText.slice(0, 1)
  if (categoryText && !isNiCategoryLetter(letter)) {
    return { error: `NI category “${categoryText}” is not a valid category` }
  }
  const category = isNiCategoryLetter(letter) ? letter : fallbackCategory || 'A'
  const draft = emptyMidYearDraft(category)
  for (const key of MONEY_KEYS) {
    const next = moneyText(value(key))
    if (next == null) return { error: `“${MID_YEAR_CSV_FIELDS.find((field) => field.id === key)?.label ?? key}” is not a number` }
    if (next) draft[key] = next
  }
  const niMoney = (fieldId: string) => moneyText(value(fieldId))
  const niValues = {
    gross_earnings: niMoney('ni_gross_earnings'),
    earnings_to_lel: niMoney('ni_earnings_to_lel'),
    lel_to_pt: niMoney('ni_lel_to_pt'),
    pt_to_uel: niMoney('ni_pt_to_uel'),
    st_to_ust: niMoney('ni_st_to_ust'),
    employee_nics: niMoney('ni_employee_nics'),
    employer_nics: niMoney('ni_employer_nics'),
    total_nics: niMoney('ni_total_nics'),
  }
  if (Object.values(niValues).some((item) => item == null)) {
    return { error: 'A National Insurance amount is not a number' }
  }
  const employer =
    niValues.employer_nics ||
    (niValues.total_nics && niValues.employee_nics
      ? (Math.max(0, Number(niValues.total_nics) - Number(niValues.employee_nics))).toFixed(2)
      : '')
  draft.ni_rows = [
    {
      category,
      gross_earnings: niValues.gross_earnings || '',
      earnings_to_lel: niValues.earnings_to_lel || '',
      lel_to_pt: niValues.lel_to_pt || '',
      pt_to_uel: niValues.pt_to_uel || '',
      st_to_ust: niValues.st_to_ust || '',
      employee_nics: niValues.employee_nics || '',
      employer_nics: employer === '0.00' ? '' : employer,
    },
  ]
  return { draft: draft as MidYearTotalsDraft }
}

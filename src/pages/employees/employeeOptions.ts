export const EMPLOYEE_TABS = [
  'Personal',
  'Employment',
  'Starter/Leaver',
  'Payment',
  'Tax, NICs, RTI',
  'Mid Year Totals',
  'Compliance',
] as const

export type EmployeeTab = (typeof EMPLOYEE_TABS)[number]

export const TITLE_OPTIONS = ['Mr', 'Mrs', 'Miss', 'Ms', 'Mx', 'Dr'] as const

export const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const

export const CONTACT_TYPE_OPTIONS = ['Work', 'Home', 'Personal', 'Mobile'] as const

export const COUNTRY_OPTIONS = [
  'United Kingdom',
  'Ireland',
  'Isle of Man',
  'Jersey',
  'Guernsey',
] as const

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const LEAVE_CALCULATION_METHODS = [
  'Set number of annual leave days',
  'Accrued by number of working days',
  'Accrued by number of hours worked (set hours per day, excluding overtime)',
  'Accrued by number of hours worked (set hours per day, including overtime)',
  'Accrued by number of hours worked (irregular hours, excluding overtime)',
  'Accrued by number of hours worked (irregular hours, including overtime)',
  'No entitlement',
] as const

export const MIN_WAGE_PROFILES = [
  'National Minimum/Living Wage',
  'National Minimum Wage (Apprentice)',
  'UK Living Wage',
  'London Living Wage',
  'Not entitled to a minimum wage',
] as const

/** BrightPay / HMRC: the profile only sets the hourly rate we check against. It does not change PAYE, NI or net pay. */
export const MIN_WAGE_PROFILE_HELP: Record<(typeof MIN_WAGE_PROFILES)[number], string> = {
  'National Minimum/Living Wage':
    'Legal GOV.UK rates by age on the pay date. From 1 April 2026: £12.71 (21 and over, National Living Wage), £10.85 (18–20), £8.00 (16–17). Payroll warns if the hourly rate is below that band. PAYE and NI are unchanged.',
  'National Minimum Wage (Apprentice)':
    'Checks against the apprentice National Minimum Wage (£8.00 from 1 April 2026). HMRC: under 19, or 19 and over in the first year of the apprenticeship. After that first year, change this to National Minimum/Living Wage — the software does not switch automatically. PAYE and NI are unchanged.',
  'UK Living Wage':
    'Voluntary Living Wage Foundation UK rate for age 18 and over (£14.10 from 15 October 2026). Under 18s are still checked against the legal National Minimum Wage. Payroll warns if hourly pay is below that rate. This is not a legal minimum and does not change PAYE or NI.',
  'London Living Wage':
    'Voluntary Living Wage Foundation London rate for age 18 and over (£15.45 from 15 October 2026), for workplaces in Greater London. Under 18s are still checked against the legal National Minimum Wage. Payroll warns if hourly pay is below that rate. PAYE and NI are unchanged.',
  'Not entitled to a minimum wage':
    'No minimum wage check on payroll. Use this where HMRC says the worker is not entitled (for example below school leaving age, or some family members). PAYE and NI are still calculated as normal.',
}

export function minWageProfileHelp(profile: string) {
  if ((MIN_WAGE_PROFILES as readonly string[]).includes(profile)) {
    return MIN_WAGE_PROFILE_HELP[profile as (typeof MIN_WAGE_PROFILES)[number]]
  }
  return MIN_WAGE_PROFILE_HELP['National Minimum/Living Wage']
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const LEAVE_YEAR_STARTS = MONTH_NAMES.flatMap((month, monthIndex) => {
  const days = new Date(2024, monthIndex + 1, 0).getDate()
  return Array.from({ length: days }, (_, day) => `${day + 1} ${month}`)
})

export const NEW_PAY_SCHEDULES = [
  { value: 'weekly', label: 'Requires new weekly pay schedule' },
  { value: 'fortnightly', label: 'Requires new fortnightly pay schedule' },
  { value: '4-weekly', label: 'Requires new 4-weekly pay schedule' },
  { value: 'monthly', label: 'Requires new monthly pay schedule' },
  { value: 'quarterly', label: 'Requires new quarterly pay schedule' },
  { value: 'yearly', label: 'Requires new yearly pay schedule' },
] as const

export const PAYMENT_METHODS = [
  { value: 'CREDIT_TRANSFER', label: 'Credit transfer' },
  { value: 'FASTER_PAYMENTS', label: 'Faster Payments' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CASH', label: 'Cash' },
] as const

export function paymentMethodLabel(value?: string | null) {
  return PAYMENT_METHODS.find((item) => item.value === value)?.label ?? String(value ?? '').trim()
}

export const PAY_BASIS_OPTIONS = [
  { value: 'ANNUAL', label: 'Based on a rate/annual salary' },
  { value: 'DAILY', label: 'Based on a daily rate' },
  { value: 'HOURLY', label: 'Based on an hourly rate' },
] as const

export const STARTER_DECLARATIONS = [
  { value: 'A', label: "(A) This is the employee's first employment since 6th April" },
  { value: 'B', label: "(B) This is the employee's only employment" },
  { value: 'C', label: '(C) The employee has another employment (or pension)' },
  { value: 'NONE', label: 'The employee has no P45 or starter declaration' },
] as const

export { NI_CATEGORIES, MID_YEAR_NI_LETTERS, niCategoryLabel } from './niCategories'

export const CONTRACTED_HOURS_OPTIONS = [
  { value: 'LT16', label: 'Less than 16 hours' },
  { value: '16_24', label: '16 hours or more, but less than 24 hours' },
  { value: '24_30', label: '24 hours or more, but less than 30 hours' },
  { value: '30_PLUS', label: '30 hours or more' },
  { value: 'OTHER', label: 'Other' },
] as const

export const DEFAULT_CONTRACTED_HOURS = '30_PLUS'

export const SCHEDULE_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  FOUR_WEEKLY: '4-weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Annually',
}

const FPS_EXTRA_PAY_FREQUENCIES = [
  { value: 'YEARLY', label: 'Annually' },
  { value: 'ONE_OFF', label: 'One-off' },
  { value: 'IRREGULAR', label: 'Irregular' },
] as const

export const REPORTED_PAY_FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'FOUR_WEEKLY', label: '4-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  ...FPS_EXTRA_PAY_FREQUENCIES,
] as const

export const DEFAULT_REPORTED_PAY_FREQUENCY = 'WEEKLY'

const FPS_OVERRIDE_FREQUENCIES = new Set(['YEARLY', 'ONE_OFF', 'IRREGULAR'])

export function normalizeReportedPayFrequency(stored?: string | null) {
  const value = String(stored ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (!value) return ''
  if (REPORTED_PAY_FREQUENCIES.some((item) => item.value === value)) return value
  if (value === 'FORTNIGHT' || value === 'TWO_WEEKLY' || value === 'BIWEEKLY') return 'FORTNIGHTLY'
  if (value === 'FOURWEEKLY' || value === '4_WEEKLY') return 'FOUR_WEEKLY'
  if (value === 'ANNUAL' || value === 'ANNUALLY') return 'YEARLY'
  if (value === 'ONEOFF') return 'ONE_OFF'
  return ''
}

/** BrightPay: schedule frequency first, then Annually / One-off / Irregular. */
export function reportedPayFrequencyOptions(scheduleFrequency?: string | null) {
  const schedule =
    normalizeReportedPayFrequency(scheduleFrequency) || DEFAULT_REPORTED_PAY_FREQUENCY
  const scheduleLabel = SCHEDULE_FREQUENCY_LABELS[schedule] ?? scheduleFrequencyLabel(schedule)
  const extras = FPS_EXTRA_PAY_FREQUENCIES.filter((item) => item.value !== schedule)
  return [{ value: schedule, label: scheduleLabel }, ...extras]
}

function scheduleFrequencyLabel(value: string) {
  if (value === 'WEEKLY') return 'Weekly'
  if (value === 'FORTNIGHTLY') return 'Fortnightly'
  if (value === 'FOUR_WEEKLY') return '4-weekly'
  if (value === 'MONTHLY') return 'Monthly'
  if (value === 'QUARTERLY') return 'Quarterly'
  if (value === 'YEARLY') return 'Annually'
  return 'Weekly'
}

export function reportedFrequencyFromNewSchedule(request?: string | null) {
  const value = String(request ?? '').trim().toLowerCase()
  if (value === 'weekly') return 'WEEKLY'
  if (value === 'fortnightly') return 'FORTNIGHTLY'
  if (value === '4-weekly' || value === '4weekly') return 'FOUR_WEEKLY'
  if (value === 'monthly') return 'MONTHLY'
  if (value === 'quarterly') return 'QUARTERLY'
  if (value === 'yearly') return 'YEARLY'
  return normalizeReportedPayFrequency(request) || ''
}

export function keepReportedFrequencyOverride(value?: string | null) {
  return FPS_OVERRIDE_FREQUENCIES.has(normalizeReportedPayFrequency(value))
}

export const PAYROLL_ID_CHANGE_OPTIONS = [
  { value: 'AUTO', label: 'Detect automatically' },
  {
    value: 'FORCE',
    label: "Force include 'Change of Payroll ID' indicator on next FPS",
  },
] as const

export const STUDENT_LOAN_PLANS = [
  { value: 'NONE', label: 'Not applicable (do not deduct Student Loan repayments)' },
  { value: 'PLAN_1', label: 'Deduct Plan 1 Student Loan Repayments' },
  { value: 'PLAN_2', label: 'Deduct Plan 2 Student Loan Repayments' },
  { value: 'PLAN_4', label: 'Deduct Plan 4 Student Loan Repayments' },
  { value: 'PLAN_5', label: 'Deduct Plan 5 Student Loan Repayments' },
] as const

export const POSTGRADUATE_LOAN_PLANS = [
  {
    value: 'NONE',
    label: 'Not applicable (do not deduct Postgraduate Loan repayments)',
  },
  { value: 'PGL', label: 'Deduct Postgraduate Loan repayments' },
] as const

export const EMPLOYEE_TABS = [
  'Personal',
  'Employment',
  'Starter/Leaver',
  'Payment',
  'Tax, NICs, RTI',
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

export const NI_CATEGORIES = [
  { value: 'A', label: 'A (over 21)' },
  { value: 'C', label: 'C' },
  { value: 'M', label: 'M (over 16 and under 21)' },
  { value: 'X', label: 'X (under 16)' },
] as const

export const CONTRACTED_HOURS_OPTIONS = [
  { value: 'LT16', label: 'Less than 16 hours' },
  { value: '16_24', label: '16 hours or more, but less than 24 hours' },
  { value: '24_30', label: '24 hours or more, but less than 30 hours' },
  { value: '30_PLUS', label: '30 hours or more' },
  { value: 'OTHER', label: 'Other' },
] as const

export const DEFAULT_CONTRACTED_HOURS = '30_PLUS'

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

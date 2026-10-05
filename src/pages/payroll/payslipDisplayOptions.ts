export const PAYSLIP_DISPLAY_OPTION_KEYS = [
  'periodEndDate',
  'periodNumber',
  'taxWeekEndDate',
  'taxWeekNumber',
  'taxMonthEndDate',
  'taxMonthNumber',
  'employerLogo',
  'employerAddress',
  'employeeMiddleName',
  'employeeDob',
  'employeeGender',
  'employeeAddress',
  'employeeWorksNumber',
  'employeeDepartment',
  'employeeDirector',
  'employeeNiTable',
  'employeeStudentLoanPlan',
  'employeeStartDate',
  'employeeLeaveDate',
  'annualLeaveTaken',
  'annualLeaveRemaining',
  'annualLeaveBooked',
  'notionalPay',
  'benefitDescriptions',
  'employerNi',
  'employerNiYtd',
  'employerPension',
  'employerPensionYtd',
  'statutoryPayYtd',
  'netPay',
  'paymentDate',
  'notes',
] as const

export type PayslipDisplayOptionKey = (typeof PAYSLIP_DISPLAY_OPTION_KEYS)[number]
export type PayslipDisplayOptions = Record<PayslipDisplayOptionKey, boolean>

export const DEFAULT_PAYSLIP_DISPLAY_OPTIONS: PayslipDisplayOptions = {
  periodEndDate: true,
  periodNumber: false,
  taxWeekEndDate: false,
  taxWeekNumber: false,
  taxMonthEndDate: false,
  taxMonthNumber: false,
  employerLogo: false,
  employerAddress: false,
  employeeMiddleName: false,
  employeeDob: false,
  employeeGender: false,
  employeeAddress: false,
  employeeWorksNumber: true,
  employeeDepartment: false,
  employeeDirector: true,
  employeeNiTable: true,
  employeeStudentLoanPlan: true,
  employeeStartDate: false,
  employeeLeaveDate: false,
  annualLeaveTaken: false,
  annualLeaveRemaining: false,
  annualLeaveBooked: false,
  notionalPay: false,
  benefitDescriptions: false,
  employerNi: false,
  employerNiYtd: false,
  employerPension: false,
  employerPensionYtd: false,
  statutoryPayYtd: true,
  netPay: true,
  paymentDate: false,
  notes: false,
}

export const PAYSLIP_DISPLAY_OPTION_GROUPS: {
  title: string
  items: { key: PayslipDisplayOptionKey; label: string }[]
}[] = [
  {
    title: 'Pay Period',
    items: [
      { key: 'periodEndDate', label: 'Show employer pay period end date' },
      { key: 'periodNumber', label: 'Show employer pay period number' },
      { key: 'taxWeekEndDate', label: 'Show tax week end date' },
      { key: 'taxWeekNumber', label: 'Show tax week number' },
      { key: 'taxMonthEndDate', label: 'Show tax month end date' },
      { key: 'taxMonthNumber', label: 'Show tax month number' },
    ],
  },
  {
    title: 'Employer Details',
    items: [
      { key: 'employerLogo', label: 'Show employer logo (if provided)' },
      { key: 'employerAddress', label: 'Show employer address' },
    ],
  },
  {
    title: 'Employee Details',
    items: [
      { key: 'employeeMiddleName', label: 'Show employee middle name' },
      { key: 'employeeDob', label: 'Show employee date of birth' },
      { key: 'employeeGender', label: 'Show employee gender' },
      { key: 'employeeAddress', label: 'Show employee address' },
      { key: 'employeeWorksNumber', label: 'Show employee works number' },
      { key: 'employeeDepartment', label: 'Show employee department' },
      { key: 'employeeDirector', label: 'Show if employee is a director' },
      { key: 'employeeNiTable', label: 'Show employee National Insurance table' },
      { key: 'employeeStudentLoanPlan', label: 'Show employee Student Loan plan' },
      { key: 'employeeStartDate', label: 'Show employee start date' },
      { key: 'employeeLeaveDate', label: 'Show employee leave date' },
      { key: 'annualLeaveTaken', label: 'Show annual leave taken' },
      { key: 'annualLeaveRemaining', label: 'Show annual leave remaining' },
      { key: 'annualLeaveBooked', label: 'Show annual leave booked' },
    ],
  },
  {
    title: 'Amounts',
    items: [
      { key: 'notionalPay', label: 'Show notional pay' },
      { key: 'benefitDescriptions', label: 'Show benefit descriptions' },
      { key: 'employerNi', label: 'Show employer NI contributions' },
      { key: 'employerNiYtd', label: 'Show employer NI contributions (YTD)' },
      { key: 'employerPension', label: 'Show employer pension contributions' },
      { key: 'employerPensionYtd', label: 'Show employer pension contributions (YTD)' },
      { key: 'statutoryPayYtd', label: 'Show statutory pay (YTD)' },
      { key: 'netPay', label: 'Show net pay' },
    ],
  },
  {
    title: 'Payment',
    items: [
      { key: 'paymentDate', label: 'Show payment date' },
      { key: 'notes', label: 'Show notes' },
    ],
  },
]

export function parsePayslipDisplayOptions(value: unknown): PayslipDisplayOptions {
  const raw =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const next = { ...DEFAULT_PAYSLIP_DISPLAY_OPTIONS }
  for (const key of PAYSLIP_DISPLAY_OPTION_KEYS) {
    if (typeof raw[key] === 'boolean') next[key] = raw[key]
  }
  return next
}

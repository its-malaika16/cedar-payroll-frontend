export type RtiSubmissionType = 'FPS' | 'EPS' | 'ADDITIONAL_FPS'

export type RtiStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FAILED'

export type RtiEmployer = {
  company_name: string
  paye_reference: string | null
  accounts_office_reference: string | null
  address?: string | null
  postcode?: string | null
}

export type FpsEmployee = {
  sequence: number
  employee_id: string
  employee_code?: string | null
  payroll_id?: string | null
  first_name?: string | null
  last_name?: string | null
  full_name: string
  ni_number: string | null
  gender: string | null
  dob: string | null
  address_line_1: string | null
  address_line_2: string | null
  postcode: string | null
  start_date: string | null
  leave_date: string | null
  is_starter: boolean
  is_leaver: boolean
  late_reporting_reason?: string | null
  payment: {
    pay_frequency: string | null
    pay_date: string | null
    periods_covered: number
    hmrc_month?: number | null
    contracted_hours_per_week: string | null
    tax_code: string | null
    ni_category: string | null
    taxable_pay: number
    tax: number
    employer_nic: number
    employee_nic: number
    net_pay: number
  }
  year_to_date: {
    taxable_pay: number
    tax: number
    employee_pension: number
  }
  ni_values: {
    table: string | null
    gross_earnings: number
    at_lel: number
    lel_to_pt: number
    pt_to_uel: number
    employer_nics: number
    employee_nics: number
  }
}

export type FpsPayload = {
  kind: 'FPS'
  final_submission_for_year: boolean
  late_submission?: {
    required?: boolean
    reason?: string | null
  }
  employer: RtiEmployer
  period: {
    payroll_run_id: string
    schedule_id?: string
    schedule_name?: string | null
    tax_year_start: number
    tax_year_end: number
    pay_frequency: string
    period_number: number
    period_end_date: string
    pay_date: string
  }
  employee_count: number
  employees: FpsEmployee[]
}

type EpsDeclaration<T> = { included: boolean } & Partial<T>

export type EpsPayload = {
  kind: 'EPS'
  tax_year_start: number
  tax_year_end: number
  transaction_id?: string | null
  employer: RtiEmployer
  declarations: {
    recoverable_amounts: EpsDeclaration<{ tax_period: string | null }>
    employment_allowance: EpsDeclaration<{ eligible: boolean }>
    inactivity: EpsDeclaration<{ start_date: string | null; end_date: string | null }>
    no_payment: EpsDeclaration<{ start_date: string | null; end_date: string | null }>
    final_submission: EpsDeclaration<{
      scheme_ceased: boolean
      scheme_ceased_date: string | null
    }>
  }
}

export type AdditionalFpsRow = {
  sequence: number
  employee_id: string
  full_name: string
  employee_code?: string | null
  payroll_id?: string | null
  ni_number: string | null
  tax_code: string | null
  most_recent_period_number: number | null
  pay_frequency: string | null
  pay_date: string | null
  late_reporting_reason: string | null
  year_to_date: {
    taxable_pay: number
    tax: number
    employee_nics: number
    employer_nics: number
  }
}

export type AdditionalFpsPayload = {
  kind: 'ADDITIONAL_FPS'
  tax_year_start: number
  tax_year_end: number
  employer: RtiEmployer
  period?: FpsPayload['period'] | null
  employee_count: number
  employees: FpsEmployee[]
}

export type RtiPayload = FpsPayload | EpsPayload | AdditionalFpsPayload

export type RtiSubmission = {
  id: string
  submission_type: RtiSubmissionType
  status: RtiStatus
  payload: RtiPayload | null
  hmrc_submission_id: string | null
  response_message: string | null
  submitted_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
  payroll_runs?: {
    id: string
    period_number: number
    pay_frequency: string
    pay_date: string
    tax_year_start: number
    tax_year_end: number
    status: string
  } | null
  submitter?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

export type AdditionalFpsCandidate = {
  employee_id: string
  employee_code: string | null
  full_name: string
  payroll_id: string | null
  most_recent_period_number: number | null
  pay_frequency: string | null
  pay_date: string | null
}

// =====================================================
// Static option lists
// =====================================================

export const SUBMISSION_TYPE_LABELS: Record<RtiSubmissionType, string> = {
  FPS: 'Full Payment Submission',
  EPS: 'Employer Payment Summary',
  ADDITIONAL_FPS: 'Additional FPS',
}

export const SUBMISSION_TYPE_SHORT: Record<RtiSubmissionType, string> = {
  FPS: 'FPS',
  EPS: 'EPS',
  ADDITIONAL_FPS: 'Additional FPS',
}

export const EPS_TAX_PERIOD_OPTIONS = [
  { value: 'Q1', label: 'Quarter 1 (Ending 5 July)' },
  { value: 'Q2', label: 'Quarter 2 (Ending 5 October)' },
  { value: 'Q3', label: 'Quarter 3 (Ending 5 January)' },
  { value: 'Q4', label: 'Quarter 4 (Ending 5 April)' },
]

export const EMPLOYMENT_ALLOWANCE_OPTIONS = [
  { value: 'true', label: 'Employer is eligible for Employment Allowance' },
  { value: 'false', label: 'Employer is not eligible for Employment Allowance' },
]

export const LATE_REPORTING_REASONS = [
  'No reason provided',
  'I have a reasonable excuse',
  'This is a correction to an earlier submission',
  'I am paying an employee based on their work on the day (for example, harvest workers paid based on how much they pick)',
  'I am paying an employee an expense or benefit where National Insurance contributions are due, but not Income Tax, through payroll',
  'I am an overseas employer paying an expat employee, or I pay them through a third party',
  'I am paying in shares at less than market value',
  'I am making any other non-cash payment (for example, vouchers or credit tokens) to an employee',
]

// =====================================================
// Display helpers
// =====================================================

export function statusText(status: RtiStatus): string {
  switch (status) {
    case 'ACCEPTED':
      return 'Accepted by HMRC'
    case 'SUBMITTED':
      return 'Sent to HMRC'
    case 'REJECTED':
      return 'Rejected by HMRC'
    case 'FAILED':
      return 'Submission failed'
    case 'GENERATED':
      return 'Ready to submit'
    default:
      return 'Draft'
  }
}

export function isRtiEditable(status: RtiStatus) {
  return status === 'DRAFT' || status === 'GENERATED'
}

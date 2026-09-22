export type ApiSuccess<T> = {
  success: boolean
  message: string
  data: T
}

export type User = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email: string
  phone?: string | null
  user_type?: string | null
  is_active?: boolean
  is_registered?: boolean
  is_super_admin?: boolean
  last_login?: string | null
}

export type CompanyMembership = {
  company_id: string
  company_name: string
  role_id?: string
  role_name?: string
  is_owner?: boolean
  modules: string[]
  permissions: string[]
}

export type EmployeeAccess = {
  company_id: string
  company_name: string
  employee_id: string
  employee_code?: string | null
  first_name?: string | null
  last_name?: string | null
  modules: string[]
}

export type EmployeePortalDashboard = {
  first_name?: string | null
  last_name?: string | null
  latest_take_home: number
  latest_pay_date?: string | null
  latest_period_end?: string | null
  latest_pay_frequency?: string | null
  latest_run_id?: string | null
  latest_record_id?: string | null
  breakdown: {
    additions: number
    deductions: number
    tax: number
    employee_nic: number
    employee_pension: number
    take_home: number
  }
  leave: {
    days_remaining: number
    days_entitled: number
  }
  next_payroll: {
    pay_date: string
    status: string
    tax_week?: number | null
    pay_frequency?: string | null
  } | null
  tax_year: number
  monthly_pay: Array<{ month: number; amount: number }>
  next_shift: {
    shift_date: string
    start_time: string
    end_time: string
    role_name?: string | null
    location?: string | null
  } | null
}

export type BureauAccess = {
  bureau_id: string
  bureau_name: string
  role_name?: string
  permissions: string[]
  companies: {
    company_id: string
    company_name: string
    modules: string[]
  }[]
}

export type BureauTeamMember = {
  id: string
  user_id: string
  name: string
  first_name?: string | null
  last_name?: string | null
  email: string
  is_active?: boolean
  last_login?: string | null
  created_at?: string | null
}

export type AuthPayload = {
  user: User
  access_token: string
  memberships?: CompanyMembership[]
  company_access?: CompanyMembership[]
  employee_access?: EmployeeAccess[]
  bureau_access?: BureauAccess[]
}

export type EmployerDefaults = {
  typical_pay_frequency?: string
  leave_year_starts?: string
  leave_calculation_method?: string
  leave_entitlement_days?: number
  leave_entitlement_weeks?: number
  carry_over_leave?: boolean
  working_days?: string[]
  min_wage_profile?: string
  flag_below_min_wage?: boolean
  auto_works_numbers?: boolean
  withhold_tax_refunds_when_zero?: boolean
  do_not_pay_ssp?: boolean
  opt_out_credit_check?: boolean
  rti_gateway_preference?: 'NONE' | 'PAYE'
  rti_contact?: {
    title?: string
    first_name?: string
    middle_name?: string
    last_name?: string
    email?: string
    phone?: string
    fax?: string
  }
}

export type Company = {
  id: string
  company_name: string
  trading_name?: string | null
  office_number?: string | null
  paye_reference?: string | null
  accounts_office_reference?: string | null
  pension_provider?: string | null
  pension_employer_id?: string | null
  address?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  address_line_3?: string | null
  address_line_4?: string | null
  postcode?: string | null
  country?: string | null
  sector?: string | null
  logo_path?: string | null
  company_registration_number?: string | null
  sa_utr?: string | null
  corporation_tax_reference?: string | null
  bacs_sun?: string | null
  small_employers_relief?: boolean | null
  expenses_benefits_method?: string | null
  employer_defaults?: EmployerDefaults | null
  latitude?: string | number | null
  longitude?: string | number | null
  attendance_radius_meters?: number
  company_modules?: { id: string; module: string; is_active: boolean }[]
  user_roles?: CompanyUserRole[]
  is_active?: boolean
  status?: string | null
  owner_name?: string | null
  created_at?: string | null
  updated_at?: string | null
  _count?: {
    employees?: number
    user_roles?: number
    payroll_runs?: number
    payroll_schedules?: number
  }
}

export type CompanyUserRole = {
  id: string
  is_owner?: boolean
  is_active?: boolean
  users?: User
  roles?: { id: string; role_name: string; description?: string | null }
}

export type Employee = {
  id: string
  company_id: string
  employee_code?: string | null
  title?: string | null
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  dob?: string | null
  gender?: string | null
  email?: string | null
  email_type?: string | null
  extra_emails?: { type?: string; address?: string }[] | null
  phone?: string | null
  phone_type?: string | null
  extra_phones?: { type?: string; number?: string }[] | null
  photo_url?: string | null
  portal_access?: boolean
  employee_addresses?: {
    id: string
    address?: string | null
    address_line_1?: string | null
    address_line_2?: string | null
    address_line_3?: string | null
    address_line_4?: string | null
    postcode?: string | null
    country?: string | null
  }[]
  bank_details?: {
    id: string
    payment_method?: string | null
    bank_name?: string | null
    account_name?: string | null
    account_number?: string | null
    sort_code?: string | null
    bank_reference?: string | null
  }[]
  employee_tax_details?: Record<string, unknown>[]
  employment_details?: Record<string, unknown>[]
  starters_leavers?: Record<string, unknown>[]
  employee_pension_details?: Record<string, unknown> | null
}

export type PayrollSchedule = {
  id: string
  schedule_name: string
  pay_frequency: string
  first_period_start_date: string
  first_pay_date: string
  is_active: boolean
}

export type PayrollRun = {
  id: string
  schedule_id: string
  company_id: string
  file_name?: string | null
  pay_frequency: string
  tax_year_start: number
  tax_year_end: number
  period_number: number
  period_start_date: string
  period_end_date: string
  pay_date: string
  tax_week?: number | null
  tax_month?: number | null
  status: string
  pension_status?: string | null
  pension_paid_at?: string | null
  payroll_schedules?: PayrollSchedule
  payroll_records?: PayrollRecord[]
  _count?: { payroll_records?: number }
}

export type PayrollPensionEmployee = {
  record_id: string
  name: string
  employee_pension: number
  employer_pension: number
  total: number
}

export type PayrollPension = {
  payroll_run_id: string
  status: string
  paid_at?: string | null
  finalised: boolean
  employee_pension: number
  employer_pension: number
  total_payable: number
  employees?: PayrollPensionEmployee[]
}

export type PayrollPayLine = {
  id: string
  kind: 'daily' | 'monthly' | 'benefit' | 'addition'
  label?: string
  qty?: number
  rate?: number
  amount?: number
}

export type PayrollDeductionLine = {
  label: string
  amount: number
}

export type PayrollRecord = {
  id: string
  payroll_run_id: string
  employee_id: string
  pay_basis: string
  annual_salary?: string | number | null
  wage_per_hour?: string | number | null
  total_hours?: string | number | null
  basic_pay?: string | number | null
  holiday_pay?: string | number | null
  overtime_1?: string | number | null
  overtime_1_5?: string | number | null
  overtime_2?: string | number | null
  bonus?: string | number | null
  bonus_2?: string | number | null
  commission?: string | number | null
  night_allowance?: string | number | null
  holiday_adjustment?: string | number | null
  car_allowance?: string | number | null
  service_charges?: string | number | null
  ssp?: string | number | null
  smp?: string | number | null
  spp?: string | number | null
  sap?: string | number | null
  shpp?: string | number | null
  spbp?: string | number | null
  sncp?: string | number | null
  total_statutory_pay?: string | number | null
  gross_pay?: string | number | null
  taxable_gross?: string | number | null
  tax?: string | number | null
  nicable_gross?: string | number | null
  employee_nic?: string | number | null
  employer_nic?: string | number | null
  student_loan?: string | number | null
  postgraduate_loan?: string | number | null
  employee_pension?: string | number | null
  employer_pension?: string | number | null
  salary_sacrifice_pension?: string | number | null
  pensionable_gross?: string | number | null
  net_pay?: string | number | null
  take_home_pay?: string | number | null
  cost_to_employer?: string | number | null
  employee_notes?: string | null
  employer_notes?: string | null
  is_starter?: boolean | null
  is_leaver?: boolean | null
  pay_date?: string | null
  tax_week?: number | null
  tax_month?: number | null
  tax_code?: string | null
  week1month1?: boolean | null
  ni_category?: string | null
  taxable_nic_additions?: string | number | null
  before_tax_before_nic_deductions?: string | number | null
  taxable_additions?: string | number | null
  before_tax_deductions?: string | number | null
  nic_additions?: string | number | null
  before_nic_deductions?: string | number | null
  earning_to_lel?: string | number | null
  earning_lel_to_pt?: string | number | null
  earning_pt_to_uel?: string | number | null
  earning_above_uel?: string | number | null
  employer_nic_class1a?: string | number | null
  attachment_order?: string | number | null
  aeo_without_admin?: string | number | null
  employee_pensionable_additions?: string | number | null
  employee_before_pension_deductions?: string | number | null
  employer_pensionable_additions?: string | number | null
  non_tax_non_nic_additions?: string | number | null
  after_tax_after_nic_deductions?: string | number | null
  daily_rate?: string | number | null
  unpaid_leave_deduction?: string | number | null
  calendar_leave_summary?: CalendarLeaveSummary | null
  pay_lines?: PayrollPayLine[] | null
  deduction_lines?: PayrollDeductionLine[] | null
  status?: string | null
  finalised_at?: string | null
  employees?: Employee
  payroll_runs?: PayrollRun
  payslips?: { id: string; file_name?: string | null; is_published?: boolean } | null
  year_to_date?: PayrollYearToDate | null
}

export type PayrollYearToDate = {
  gross_pay?: string | number | null
  pensionable_gross?: string | number | null
  employee_pension?: string | number | null
  employer_pension?: string | number | null
  taxable_gross?: string | number | null
  tax?: string | number | null
  nicable_gross?: string | number | null
  employee_nic?: string | number | null
  employer_nic?: string | number | null
  night_allowance?: string | number | null
  holiday_pay?: string | number | null
  student_loan?: string | number | null
  postgraduate_loan?: string | number | null
  ssp?: string | number | null
  smp?: string | number | null
  spp?: string | number | null
  total_statutory_pay?: string | number | null
  net_pay?: string | number | null
  take_home_pay?: string | number | null
  cost_to_employer?: string | number | null
  this_employment?: PayrollYearToDate | null
  previous_employment?: {
    taxable_gross?: string | number | null
    tax?: string | number | null
  } | null
  combined?: PayrollYearToDate | null
}

export type CalendarLeaveSummary = {
  parenting?: number
  non_working?: number
  working?: number
  annual?: number
  unpaid?: number
  sick?: number
  maternity?: number
  paternity?: number
  absent?: number
  on_strike?: number
  custom?: number
  unpaid_days?: number
  daily_rate?: number
  awe?: number
  tax_year?: string
  sick_pay?: number
  maternity_pay?: number
  paternity_pay?: number
  total_deduction?: number
  manual?: boolean
  amounts?: {
    unpaid?: number
    absent?: number
    on_strike?: number
    custom?: number
    sick?: number
    annual?: number
    parenting?: number
    maternity?: number
    paternity?: number
  }
}

export type CalendarDay = {
  id: string
  date: string
  day_type: string
  custom_label?: string | null
  notes?: string | null
  employee_id?: string
}

export type CalendarPayImpact = {
  from: string
  to: string
  daily_rate: number
  awe?: number
  tax_year?: string
  ssp_daily: number
  ssp_weekly: number
  smp_daily?: number
  smp_weekly_higher?: number
  smp_weekly_standard?: number
  spp_daily?: number
  spp_weekly?: number
  lel_weekly?: number
  units: Record<string, number>
  effects: Record<string, { kind: 'paid' | 'deduct' | 'ssp' | 'smp' | 'spp' | 'none'; label: string }>
  days: Record<string, number>
  amounts: Record<string, number>
  total_deduction: number
  sick_pay: number
  maternity_pay?: number
  paternity_pay?: number
  qualifies_smp?: boolean
  qualifies_spp?: boolean
  smp_reason?: string
  spp_reason?: string
  basic_pay_after_leave: number
}

export type StatutoryLeaveBalance = {
  weekly_rate?: number
  daily_rate?: number
  higher_weekly?: number
  standard_weekly?: number
  max_weeks?: number
  days_used?: number
  weeks_used?: number
  days_remaining?: number
  weeks_remaining?: number
  qualifies?: boolean
  reason?: string
}

export type CalendarEntitlement = {
  employee_id: string
  as_of: string
  leave_year_start: string
  leave_year_end: string
  days_entitled: number
  days_used: number
  days_remaining: number
  usual_working_days: string
  awe?: number
  tax_year?: string
  ssp?: StatutoryLeaveBalance
  smp?: StatutoryLeaveBalance
  spp?: StatutoryLeaveBalance
}

export type PensionAssessment = {
  employee: {
    id: string
    first_name?: string | null
    last_name?: string | null
    name: string
    gender?: string | null
    email?: string | null
  }
  pronouns: {
    subject: string
    object: string
    possessive: string
  }
  period_label: string
  period_end: string
  default_enrolment_date: string
  tax_month: number
  category: 'eligible_jobholder' | 'entitled_worker' | 'non_eligible'
  eligible: boolean
  reasons: {
    worker: boolean
    age: boolean
    earnings: boolean
    uk: boolean
  }
  annual_earnings: number
  age: number | null
  state_pension_age: number
  status:
    | 'eligible'
    | 'enrolled'
    | 'switched'
    | 'postponed'
    | 'exempt'
    | 'opted_out'
    | 'ceased'
    | 'reenrol_due'
    | 'not_eligible'
  needs_reenrolment: boolean
  enrolment: {
    is_enrolled: boolean
    is_exempt: boolean
    managed_externally?: boolean
    provider_name?: string | null
    scheme_reference?: string | null
    group_name?: string | null
    tax_method?: string | null
    employee_rate: number
    employer_rate: number
    enrolment_date?: string | null
    postponement_end_date?: string | null
    opt_out_date?: string | null
    opt_out_reference?: string | null
    cessation_date?: string | null
  } | null
  company_scheme: {
    provider_name: string
    employer_id?: string | null
    group_name: string
    label: string
  }
  criteria: {
    worker: string
    age: string
    earnings: string
    uk: string
    contributions: string
    opt_out: string
  }
}

export type Role = {
  id: string
  role_name: string
  description?: string | null
}

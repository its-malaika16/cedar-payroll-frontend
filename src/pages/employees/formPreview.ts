export type FormPreview = {
  eligible?: boolean
  form?: string
  message?: string
  detail?: string
  tax_year?: { start: number; end: number; name: string; end_date?: string }
  employer?: {
    name?: string | null
    paye_reference?: string | null
    address?: string | null
    postcode?: string | null
  }
  employee?: {
    id?: string
    title?: string | null
    first_name?: string | null
    last_name?: string | null
    display_name?: string
    ni_number?: string | null
    payroll_id?: string | null
    employee_code?: string | null
    dob?: string | null
    gender?: string | null
    start_date?: string | null
    leave_date?: string | null
    works_number?: string | null
    department?: string | null
    address?: string | null
    is_director?: boolean
    email?: string | null
  }
  p11?: {
    periods: P11Period[]
    totals: Record<string, number>
  }
  p45?: {
    leaving_date?: string | null
    student_loan?: boolean
    tax_code?: string | null
    last_week_number?: number | null
    total_pay_to_date?: number
    total_tax_to_date?: number
    deceased?: boolean
  }
  p60?: Record<string, number | string | null>
  p11d?: { has_benefits?: boolean; benefits?: BenefitEntry[] }
  pbik?: { has_benefits?: boolean; benefits?: BenefitEntry[] }
}

export type BenefitEntry = {
  id?: string
  type_id?: string
  code?: string
  title?: string
  values?: Record<string, unknown>
}

export type P11Period = {
  period_number: number
  pay_frequency?: string
  ni_category?: string | null
  earning_to_lel?: number
  earning_lel_to_pt?: number
  earning_pt_to_uel?: number
  employee_nic?: number
  employer_nic?: number
  student_loan?: number
  postgraduate_loan?: number
  ssp?: number
  smp?: number
  spp?: number
  sap?: number
  shpp?: number
  spbp?: number
  sncp?: number
  tax_code?: string | null
  pay_including_statutory?: number
  total_pay_to_date?: number
  total_free_pay_to_date?: number
  total_taxable_pay_to_date?: number
  total_tax_due_to_date?: number
  tax_deducted?: number
}

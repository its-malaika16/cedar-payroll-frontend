export type FieldCategoryId =
  | 'personal'
  | 'contact'
  | 'emergency'
  | 'employment'
  | 'payment'
  | 'starter'
  | 'fps'

export type ReportField = {
  id: string
  label: string
  category: FieldCategoryId
}

export const FIELD_CATEGORIES: { id: FieldCategoryId; label: string }[] = [
  { id: 'personal', label: 'Personal Information' },
  { id: 'contact', label: 'Contact' },
  { id: 'emergency', label: 'Emergency Contact Details' },
  { id: 'employment', label: 'Employment Details' },
  { id: 'payment', label: 'Payment Details' },
  { id: 'starter', label: 'Starter/Leaver' },
  { id: 'fps', label: 'FPS Details' },
]

export const REPORT_FIELDS: ReportField[] = [
  { id: 'title', label: 'Title', category: 'personal' },
  { id: 'name', label: 'Name', category: 'personal' },
  { id: 'middle_name', label: 'Middle Name', category: 'personal' },
  { id: 'last_name', label: 'Last Name', category: 'personal' },
  { id: 'gender', label: 'Gender', category: 'personal' },
  { id: 'dob', label: 'Date of Birth', category: 'personal' },
  { id: 'nationality', label: 'Nationality', category: 'personal' },
  { id: 'passport_number', label: 'Passport Number', category: 'personal' },

  { id: 'address_line_1', label: 'Address line 1', category: 'contact' },
  { id: 'address_line_2', label: 'Address line 2', category: 'contact' },
  { id: 'address_line_3', label: 'Address line 3', category: 'contact' },
  { id: 'address_line_4', label: 'Address line 4', category: 'contact' },
  { id: 'postcode', label: 'Postcode', category: 'contact' },
  { id: 'country', label: 'Country', category: 'contact' },
  { id: 'email', label: 'Email Address', category: 'contact' },
  { id: 'phone', label: 'Phone Number', category: 'contact' },

  { id: 'emergency_name', label: 'Emergency Contact Name', category: 'emergency' },
  { id: 'emergency_relationship', label: 'Emergency Contact Relationship', category: 'emergency' },
  { id: 'emergency_phone', label: 'Emergency Contact Phone Number', category: 'emergency' },
  { id: 'emergency_address', label: 'Emergency Contact Address', category: 'emergency' },
  { id: 'emergency_notes', label: 'Emergency Contact Notes', category: 'emergency' },

  { id: 'works_number', label: 'Works Number', category: 'employment' },
  { id: 'ni_number', label: 'National Insurance Number', category: 'employment' },
  { id: 'department', label: 'Department', category: 'employment' },
  { id: 'tax_code', label: 'Tax Code', category: 'employment' },
  { id: 'ni_category', label: 'National Insurance Table', category: 'employment' },
  { id: 'student_loan_start', label: 'Student Loan start date', category: 'employment' },
  { id: 'student_loan_stop', label: 'Student Loan stop date', category: 'employment' },
  { id: 'pg_loan_plan', label: 'Postgraduate Loan deduction plan', category: 'employment' },
  { id: 'pg_loan_start', label: 'Postgraduate Loan start date', category: 'employment' },
  { id: 'pg_loan_stop', label: 'Postgraduate Loan stop date', category: 'employment' },
  { id: 'min_wage_profile', label: 'Minimum wage Profile', category: 'employment' },
  { id: 'min_hourly_rate', label: 'Minimum required hourly rate', category: 'employment' },
  { id: 'is_director', label: 'Is a director', category: 'employment' },
  { id: 'director_start', label: 'Directorship start date', category: 'employment' },
  { id: 'director_end', label: 'Directorship end date', category: 'employment' },
  { id: 'off_payroll', label: 'Is an off-payroll worker', category: 'employment' },
  { id: 'annual_salary', label: 'Annual salary', category: 'employment' },

  { id: 'payment_method', label: 'Payment method', category: 'payment' },
  { id: 'bank_name', label: 'Payment bank name', category: 'payment' },
  { id: 'bank_branch', label: 'Payment bank branch', category: 'payment' },
  { id: 'sort_code', label: 'Payment bank sort code', category: 'payment' },
  { id: 'account_name', label: 'Payment bank account name', category: 'payment' },
  { id: 'account_number', label: 'Payment bank account number', category: 'payment' },
  { id: 'bank_reference', label: 'Payment bank reference', category: 'payment' },

  { id: 'start_date', label: 'Start date', category: 'starter' },
  { id: 'leave_date', label: 'Leave date', category: 'starter' },
  { id: 'previous_taxable_pay', label: 'Taxable pay in previous employment', category: 'starter' },
  { id: 'previous_tax', label: 'Tax in previous employment', category: 'starter' },
  { id: 'tupe_protected', label: 'Is protected under TUPE', category: 'starter' },
  { id: 'pre_transfer_start', label: 'Pre-transfer start date', category: 'starter' },

  { id: 'payroll_id', label: 'Payroll ID', category: 'fps' },
  { id: 'contracted_hours', label: 'Contracted hours per week', category: 'fps' },
  { id: 'workplace_postcode', label: 'Workplace postcode', category: 'fps' },
  { id: 'irregular_payment', label: 'Is irregular payment pattern', category: 'fps' },
  { id: 'non_individual', label: 'Is non-individual', category: 'fps' },
  { id: 'trivial_commutation', label: 'Trivial commutation lump sums', category: 'fps' },
  { id: 'small_pot_personal', label: 'Small pot lump sum payments from personal pension schemes', category: 'fps' },
  { id: 'small_pot_occupational', label: 'Small pot lump sum payments from occupational pension schemes', category: 'fps' },
  { id: 'flexibly_accessing', label: 'Payment includes flexibly accessing pension rights', category: 'fps' },
  { id: 'pension_death_benefit', label: 'Payment includes pension death benefit', category: 'fps' },
  { id: 'serious_ill_health', label: 'Payment includes serious ill-health lump sum', category: 'fps' },
  { id: 'commencement_excess', label: 'Payment includes pension commencement excess lump sum', category: 'fps' },
  { id: 'stand_alone_lump_sum', label: 'Payment includes stand-alone lump sum', category: 'fps' },
  { id: 'flex_drawdown_taxable', label: 'Flexible drawdown taxable payment', category: 'fps' },
  { id: 'flex_drawdown_nontaxable', label: 'Flexible drawdown non-taxable payment', category: 'fps' },
]

export const DEFAULT_FIELD_IDS = ['title', 'name']

export function fieldById(id: string) {
  return REPORT_FIELDS.find((field) => field.id === id)
}

export function fieldsInCategory(category: FieldCategoryId) {
  return REPORT_FIELDS.filter((field) => field.category === category)
}

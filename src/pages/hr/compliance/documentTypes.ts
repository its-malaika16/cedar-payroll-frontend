export type ComplianceDocumentType = {
  key: string
  label: string
  requiresExpiry: boolean
  employerOnly: boolean
}

export const SHARED_COMPLIANCE_TYPES: ComplianceDocumentType[] = [
  { key: 'RIGHT_TO_WORK', label: 'Right to work', requiresExpiry: true, employerOnly: false },
  { key: 'PASSPORT', label: 'Passport', requiresExpiry: true, employerOnly: false },
  {
    key: 'VISA',
    label: 'Visa / immigration document',
    requiresExpiry: true,
    employerOnly: false,
  },
  { key: 'PREVIOUS_P45', label: 'Previous P45', requiresExpiry: false, employerOnly: false },
  { key: 'STARTER_FORM', label: 'Starter Form', requiresExpiry: false, employerOnly: false },
  {
    key: 'CHANGE_OF_TAX_CODE',
    label: 'Change of Tax Code',
    requiresExpiry: false,
    employerOnly: false,
  },
  { key: 'PROOF_OF_ADDRESS', label: 'Proof of Address', requiresExpiry: false, employerOnly: false },
  { key: 'BANK_STATEMENT', label: 'Bank Statement', requiresExpiry: false, employerOnly: false },
  { key: 'BANK_DETAILS', label: 'Bank Details', requiresExpiry: false, employerOnly: false },
  {
    key: 'NATIONAL_INSURANCE',
    label: 'National insurance',
    requiresExpiry: false,
    employerOnly: false,
  },
  { key: 'DBS', label: 'DBS', requiresExpiry: false, employerOnly: false },
  {
    key: 'STUDENT_LOAN',
    label: 'Student / PG loan information',
    requiresExpiry: false,
    employerOnly: false,
  },
  {
    key: 'QUALIFICATION',
    label: 'Professional qualification / certification',
    requiresExpiry: true,
    employerOnly: false,
  },
  { key: 'DRIVING_LICENCE', label: 'Driving licence', requiresExpiry: true, employerOnly: false },
]

export const EMPLOYER_COMPLIANCE_TYPES: ComplianceDocumentType[] = [
  {
    key: 'EMPLOYMENT_CONTRACT',
    label: 'Employment contract',
    requiresExpiry: false,
    employerOnly: true,
  },
  {
    key: 'HOLIDAY_POLICY',
    label: 'Holiday entitlement / policy',
    requiresExpiry: false,
    employerOnly: true,
  },
  { key: 'COMPANY_POLICIES', label: 'Company policies', requiresExpiry: false, employerOnly: true },
  {
    key: 'SALARY_LETTER',
    label: 'Salary / compensation letter',
    requiresExpiry: false,
    employerOnly: true,
  },
]

export const ALL_COMPLIANCE_TYPES = [...SHARED_COMPLIANCE_TYPES, ...EMPLOYER_COMPLIANCE_TYPES]

function byLabel(a: ComplianceDocumentType, b: ComplianceDocumentType) {
  return a.label.localeCompare(b.label, 'en-GB', { sensitivity: 'base' })
}

export function typesFor(_role: 'employee' | 'employer') {
  return [...ALL_COMPLIANCE_TYPES].sort(byLabel)
}

export type ComplianceFile = {
  id: string
  document_type: string
  title: string
  file_name: string
  expiry_date?: string | null
  visible_to_employee: boolean
  uploaded_by_kind?: string | null
  employer_only: boolean
  requires_expiry: boolean
  status?: string
  uploaded_at?: string | null
  expiry_state?: 'none' | 'ok' | 'soon' | 'expired'
  download_path: string
  can_change_visibility?: boolean
  can_delete?: boolean
}

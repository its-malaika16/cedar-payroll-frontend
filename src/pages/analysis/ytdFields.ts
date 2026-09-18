import { FIELD_CATEGORIES, REPORT_FIELDS } from './employeeDetailsFields'

export const YTD_FIELDS: { id: string; label: string; category: string }[] = [
  { id: 'ytd_benefits', label: 'Taxable benefits to date', category: 'ytd' },
  { id: 'ytd_ssp', label: 'Statutory Sick Pay to date', category: 'ytd' },
  { id: 'ytd_smp', label: 'Statutory Maternity Pay to date', category: 'ytd' },
  { id: 'ytd_spp', label: 'Statutory Paternity Pay to date', category: 'ytd' },
  { id: 'ytd_sap', label: 'Statutory Adoption Pay to date', category: 'ytd' },
  { id: 'ytd_shpp', label: 'Statutory Shared Parental Pay to date', category: 'ytd' },
  { id: 'ytd_spbp', label: 'Statutory Parental Bereavement Pay to date', category: 'ytd' },
  { id: 'ytd_sncp', label: 'Statutory Neonatal Care Pay to date', category: 'ytd' },
  { id: 'ytd_gross', label: 'Gross pay to date', category: 'ytd' },
  { id: 'ytd_taxable_gross', label: 'Taxable gross to date', category: 'ytd' },
  { id: 'ytd_tax_free', label: 'Tax-free pay to date', category: 'ytd' },
  { id: 'ytd_tax', label: 'Tax to date', category: 'ytd' },
  { id: 'ytd_nicable', label: 'NIC-able gross to date', category: 'ytd' },
  { id: 'ytd_ee_nic', label: 'Employee NICs to date', category: 'ytd' },
  { id: 'ytd_er_nic', label: 'Employer NICs to date', category: 'ytd' },
  { id: 'ytd_er_nic_c1a', label: 'Employer NICs (Class 1A) to date', category: 'ytd' },
  { id: 'ytd_sl', label: 'Student Loan deductions to date', category: 'ytd' },
  { id: 'ytd_pgl', label: 'Postgraduate Loan deductions to date', category: 'ytd' },
  { id: 'ytd_sl_pgl', label: 'Student + Postgrad Loan deductions to date', category: 'ytd' },
  { id: 'ytd_ee_pen_gross', label: 'Employee pensionable gross to date', category: 'ytd' },
  { id: 'ytd_ee_pen', label: 'Employee pension to date', category: 'ytd' },
  { id: 'ytd_ee_avc', label: 'Employee AVCs to date', category: 'ytd' },
  { id: 'ytd_er_pen_gross', label: 'Employer pensionable gross to date', category: 'ytd' },
  { id: 'ytd_er_pen', label: 'Employer pension to date', category: 'ytd' },
  { id: 'ytd_er_avc', label: 'Employer AVCs to date', category: 'ytd' },
  { id: 'ytd_pen_total', label: 'Employee + employer pension to date', category: 'ytd' },
  { id: 'ytd_net', label: 'Net pay to date', category: 'ytd' },
  { id: 'ytd_take_home', label: 'Take-home pay to date', category: 'ytd' },
  { id: 'ytd_cost', label: 'Cost to employer to date', category: 'ytd' },
]

export const YTD_CATEGORY_GROUPS = [
  { label: 'Employee', categories: FIELD_CATEGORIES },
  { label: 'Year to date', categories: [{ id: 'ytd', label: 'Year to Date' }] },
]

export const YTD_REPORT_FIELDS = [...REPORT_FIELDS, ...YTD_FIELDS]

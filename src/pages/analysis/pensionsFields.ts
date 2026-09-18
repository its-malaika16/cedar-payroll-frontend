export type PensionCategoryId = 'personal' | 'pensions' | 'scheme'

export type PensionField = {
  id: string
  label: string
  category: PensionCategoryId
}

export const PENSION_CATEGORY_GROUPS: { label: string; categories: { id: PensionCategoryId; label: string }[] }[] = [
  {
    label: 'Employee',
    categories: [{ id: 'personal', label: 'Personal Information' }],
  },
  {
    label: 'Period',
    categories: [{ id: 'pensions', label: 'Pensions' }],
  },
  {
    label: 'Employer Items',
    categories: [{ id: 'scheme', label: 'Pension Scheme Deductions' }],
  },
]

export const PENSION_REPORT_FIELDS: PensionField[] = [
  { id: 'title', label: 'Title', category: 'personal' },
  { id: 'name', label: 'Name', category: 'personal' },
  { id: 'middle_name', label: 'Middle Name', category: 'personal' },
  { id: 'last_name', label: 'Last Name', category: 'personal' },
  { id: 'gender', label: 'Gender', category: 'personal' },
  { id: 'dob', label: 'Date of Birth', category: 'personal' },
  { id: 'nationality', label: 'Nationality', category: 'personal' },
  { id: 'passport_number', label: 'Passport Number', category: 'personal' },

  { id: 'pen_ee_gross', label: 'Employee pensionable gross', category: 'pensions' },
  { id: 'pen_ee', label: 'Employee pension', category: 'pensions' },
  { id: 'pen_ee_avc', label: 'Employee AVCs', category: 'pensions' },
  { id: 'pen_er_before', label: 'Employer before pension deductions', category: 'pensions' },
  { id: 'pen_er_gross', label: 'Employer pensionable gross', category: 'pensions' },
  { id: 'pen_er', label: 'Employer pension', category: 'pensions' },
  { id: 'pen_er_avc', label: 'Employer AVCs', category: 'pensions' },
  { id: 'pen_total', label: 'Employee + employer pension', category: 'pensions' },
  { id: 'ae_status', label: 'AE status', category: 'pensions' },
  { id: 'ae_category', label: 'AE worker category', category: 'pensions' },
  { id: 'ae_enrolment', label: 'AE enrolment date', category: 'pensions' },
  { id: 'ae_opt_in', label: 'AE opt-in date', category: 'pensions' },
  { id: 'ae_join', label: 'AE join date', category: 'pensions' },
  { id: 'ae_opt_out', label: 'AE opt-out date', category: 'pensions' },
  { id: 'ae_cessation', label: 'AE cessation date', category: 'pensions' },

  { id: 'scheme_ee', label: 'Group/Company Name (NEST) - Employee Contribution', category: 'scheme' },
  { id: 'scheme_ee_pct', label: 'Group/Company Name (NEST) - Employee Contribution %', category: 'scheme' },
  { id: 'scheme_er', label: 'Group/Company Name (NEST) - Employer Contribution', category: 'scheme' },
  { id: 'scheme_er_pct', label: 'Group/Company Name (NEST) - Employer Contribution %', category: 'scheme' },
  { id: 'scheme_qe', label: 'Group/Company Name (NEST) - Qualifying Earnings', category: 'scheme' },
  { id: 'scheme_total', label: 'Group/Company Name (NEST) - Total Contribution', category: 'scheme' },
]

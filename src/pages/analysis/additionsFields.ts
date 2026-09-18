import { FIELD_CATEGORIES, REPORT_FIELDS } from './employeeDetailsFields'
import { PAYROLL_SUMMARY_FIELDS } from './payrollSummaryFields'

export const ADDITIONS_CATEGORY_GROUPS = [
  { label: 'Employee', categories: FIELD_CATEGORIES },
  {
    label: 'Period',
    categories: [
      { id: 'additions_deductions', label: 'Additions and Deductions' },
      { id: 'totals', label: 'Totals' },
    ],
  },
]

export const ADDITIONS_REPORT_FIELDS = [
  ...REPORT_FIELDS,
  ...PAYROLL_SUMMARY_FIELDS.filter(
    (field) => field.category === 'additions_deductions' || field.category === 'totals',
  ),
]

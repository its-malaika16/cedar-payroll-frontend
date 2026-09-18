import { FIELD_CATEGORIES, REPORT_FIELDS } from './employeeDetailsFields'
import { PAYROLL_SUMMARY_FIELDS } from './payrollSummaryFields'

export const NOTES_CATEGORY_GROUPS = [
  { label: 'Employee', categories: FIELD_CATEGORIES },
  {
    label: 'Period',
    categories: [
      { id: 'totals', label: 'Totals' },
      { id: 'other', label: 'Other' },
    ],
  },
]

export const NOTES_REPORT_FIELDS = [
  ...REPORT_FIELDS,
  ...PAYROLL_SUMMARY_FIELDS.filter((field) => field.category === 'totals' || field.category === 'other'),
]

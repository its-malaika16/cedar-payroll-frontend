export type PayrollCategoryId =
  | 'personal'
  | 'earnings'
  | 'benefits'
  | 'statutory'
  | 'additions_deductions'
  | 'totals'
  | 'other'
  | 'employer_additions'
  | 'employer_deductions'

export type PayrollField = {
  id: string
  label: string
  category: PayrollCategoryId
}

export const PAYROLL_CATEGORY_GROUPS: { label: string; categories: { id: PayrollCategoryId; label: string }[] }[] = [
  {
    label: 'Employee',
    categories: [{ id: 'personal', label: 'Personal Information' }],
  },
  {
    label: 'Period',
    categories: [
      { id: 'earnings', label: 'Earnings' },
      { id: 'benefits', label: 'Payrolled Benefits' },
      { id: 'statutory', label: 'Statutory Pay' },
      { id: 'additions_deductions', label: 'Additions and Deductions' },
      { id: 'totals', label: 'Totals' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    label: 'Employer items',
    categories: [
      { id: 'employer_additions', label: 'Additions' },
      { id: 'employer_deductions', label: 'Deductions' },
    ],
  },
]

export const PAYROLL_SUMMARY_FIELDS: PayrollField[] = [
  { id: 'title', label: 'Title', category: 'personal' },
  { id: 'name', label: 'Name', category: 'personal' },
  { id: 'middle_name', label: 'Middle Name', category: 'personal' },
  { id: 'last_name', label: 'Last Name', category: 'personal' },
  { id: 'gender', label: 'Gender', category: 'personal' },
  { id: 'dob', label: 'Date of Birth', category: 'personal' },
  { id: 'nationality', label: 'Nationality', category: 'personal' },
  { id: 'passport_number', label: 'Passport Number', category: 'personal' },

  { id: 'earn_basic', label: 'Total basic pay', category: 'earnings' },
  { id: 'earn_basic_ex_ot', label: 'Total basic pay (excluding overtime)', category: 'earnings' },
  { id: 'earn_salary', label: 'Total salary-based earnings', category: 'earnings' },
  { id: 'earn_daily_rate', label: 'Daily rate', category: 'earnings' },
  { id: 'earn_std_days', label: 'Standard days worked', category: 'earnings' },
  { id: 'earn_std_daily', label: 'Standard daily earnings', category: 'earnings' },
  { id: 'earn_ot_days', label: 'Overtime days worked', category: 'earnings' },
  { id: 'earn_ot_daily', label: 'Overtime daily earnings', category: 'earnings' },
  { id: 'earn_total_days', label: 'Total days worked', category: 'earnings' },
  { id: 'earn_total_daily', label: 'Total daily earnings', category: 'earnings' },
  { id: 'earn_hourly_rate', label: 'Hourly Rate', category: 'earnings' },
  { id: 'earn_std_hours', label: 'Standard hours worked', category: 'earnings' },
  { id: 'earn_std_hourly', label: 'Standard hourly earnings', category: 'earnings' },
  { id: 'earn_ot_hours', label: 'Overtime hours worked', category: 'earnings' },
  { id: 'earn_ot_hourly', label: 'Overtime hourly earnings', category: 'earnings' },
  { id: 'earn_total_hours', label: 'Total hours worked', category: 'earnings' },
  { id: 'earn_total_hourly', label: 'Total hourly earnings', category: 'earnings' },

  { id: 'ben_all', label: 'Taxable benefits - All', category: 'benefits' },
  { id: 'ben_assets_transferred', label: 'Taxable benefits - Assets transferred', category: 'benefits' },
  { id: 'ben_payments_behalf', label: 'Taxable benefits - Payments made on behalf of employee', category: 'benefits' },
  { id: 'ben_notional_tax', label: 'Taxable benefits - Tax on notional payments', category: 'benefits' },
  { id: 'ben_vouchers', label: 'Taxable benefits - Vouchers and credit cards', category: 'benefits' },
  { id: 'ben_mileage', label: 'Taxable benefits - Mileage allowance and passenger payments', category: 'benefits' },
  { id: 'ben_car_fuel', label: 'Taxable benefits - Car and fuel', category: 'benefits' },
  { id: 'ben_van_fuel', label: 'Taxable benefits - Vans and fuel', category: 'benefits' },
  { id: 'ben_medical', label: 'Taxable benefits - Private medical treatment or insurance', category: 'benefits' },
  { id: 'ben_reloc_qual', label: 'Taxable benefits - Qualifying relocation expenses', category: 'benefits' },
  { id: 'ben_services', label: 'Taxable benefits - Services supplied', category: 'benefits' },
  { id: 'ben_assets_disposal', label: 'Taxable benefits - Assets placed at the employee\'s disposal', category: 'benefits' },
  { id: 'ben_other_c1a', label: 'Taxable benefits - Other items (Class 1A)', category: 'benefits' },
  { id: 'ben_other_non_c1a', label: 'Taxable benefits - Other items (Non-Class 1A)', category: 'benefits' },
  { id: 'ben_tax_not_deducted', label: 'Taxable benefits - Tax paid but not deducted from director\'s remuneration', category: 'benefits' },
  { id: 'ben_travel', label: 'Taxable benefits - Travelling and subsistence payments', category: 'benefits' },
  { id: 'ben_entertainment', label: 'Taxable benefits - Entertainment', category: 'benefits' },
  { id: 'ben_telephone', label: 'Taxable benefits - Payments for use of home telephone', category: 'benefits' },
  { id: 'ben_reloc_nonqual', label: 'Taxable benefits - Non-qualifying relocation expenses', category: 'benefits' },
  { id: 'ben_other_expenses', label: 'Taxable benefits - Other expenses', category: 'benefits' },

  { id: 'stat_ssp', label: 'Statutory Sick Pay', category: 'statutory' },
  { id: 'stat_smp', label: 'Statutory Maternity Pay', category: 'statutory' },
  { id: 'stat_spp', label: 'Statutory Paternity Pay', category: 'statutory' },
  { id: 'stat_sap', label: 'Statutory Adoption Pay', category: 'statutory' },
  { id: 'stat_shpp', label: 'Statutory Shared Parental Pay', category: 'statutory' },
  { id: 'stat_spbp', label: 'Statutory Parental Bereavement Pay', category: 'statutory' },
  { id: 'stat_sncp', label: 'Statutory Neonatal Care Pay', category: 'statutory' },
  { id: 'stat_total', label: 'Total Statutory Pay', category: 'statutory' },

  { id: 'ad_taxable_nic_add', label: 'Taxable + NIC-able additions', category: 'additions_deductions' },
  { id: 'ad_before_tax_nic_ded', label: 'Before-tax + before-NIC deductions', category: 'additions_deductions' },
  { id: 'ad_gross', label: 'Gross pay', category: 'additions_deductions' },
  { id: 'ad_taxable_add', label: 'Taxable additions', category: 'additions_deductions' },
  { id: 'ad_before_tax_ded', label: 'Before-tax deductions', category: 'additions_deductions' },
  { id: 'ad_taxable_gross', label: 'Taxable gross', category: 'additions_deductions' },
  { id: 'ad_tax', label: 'Tax', category: 'additions_deductions' },
  { id: 'ad_nic_add', label: 'NIC-able additions', category: 'additions_deductions' },
  { id: 'ad_before_nic_ded', label: 'Before-NIC deductions', category: 'additions_deductions' },
  { id: 'ad_lel', label: 'Earnings to LEL', category: 'additions_deductions' },
  { id: 'ad_lel_pt', label: 'Earnings from LEL to PT', category: 'additions_deductions' },
  { id: 'ad_pt_uel', label: 'Earnings from PT to UEL/UST', category: 'additions_deductions' },
  { id: 'ad_above_uel', label: 'Earnings from UEL/UST', category: 'additions_deductions' },
  { id: 'ad_nicable_gross', label: 'NIC-able gross', category: 'additions_deductions' },
  { id: 'ad_ee_nic', label: 'Employee NICs', category: 'additions_deductions' },
  { id: 'ad_er_nic', label: 'Employer NICs', category: 'additions_deductions' },
  { id: 'ad_er_nic_c1a', label: 'Employer NICs (Class 1A)', category: 'additions_deductions' },
  { id: 'ad_sl', label: 'Student Loan deduction', category: 'additions_deductions' },
  { id: 'ad_pgl', label: 'Postgraduate Loan deduction', category: 'additions_deductions' },
  { id: 'ad_sl_pgl', label: 'Student + Postgrad Loan deduction', category: 'additions_deductions' },
  { id: 'ad_aeo', label: 'Total Attachment Order deductions', category: 'additions_deductions' },
  { id: 'ad_aeo_ex_admin', label: 'Total Attachment Order deductions (excluding admin charge)', category: 'additions_deductions' },
  { id: 'ad_ee_pen_add', label: 'Employee pensionable additions', category: 'additions_deductions' },
  { id: 'ad_ee_before_pen', label: 'Employee before pension deductions', category: 'additions_deductions' },
  { id: 'ad_er_pen_add', label: 'Employer pensionable additions', category: 'additions_deductions' },

  { id: 'tot_net', label: 'Net pay', category: 'totals' },
  { id: 'tot_non_tax_nic_add', label: 'Non-taxable + non-NIC-able additions', category: 'totals' },
  { id: 'tot_after_tax_nic', label: 'After-tax + after-NIC deductions', category: 'totals' },
  { id: 'tot_take_home', label: 'Take-home pay', category: 'totals' },
  { id: 'tot_cost', label: 'Cost to employer', category: 'totals' },

  { id: 'oth_pay_date', label: 'Pay date', category: 'other' },
  { id: 'oth_tax_week', label: 'Tax week number', category: 'other' },
  { id: 'oth_tax_month', label: 'Tax month number', category: 'other' },
  { id: 'oth_ee_notes', label: 'Employee notes', category: 'other' },
  { id: 'oth_er_notes', label: 'Employer notes', category: 'other' },
  { id: 'oth_starter', label: 'Is a starter', category: 'other' },
  { id: 'oth_leaver', label: 'Is a leaver', category: 'other' },

  { id: 'ea_additional_pay', label: 'Additional pay - Amount', category: 'employer_additions' },
  { id: 'ea_bonus', label: 'Bonus - Amount', category: 'employer_additions' },
  { id: 'ea_car', label: 'Car Allowance - Amount', category: 'employer_additions' },
  { id: 'ea_commission', label: 'Commission - Amount', category: 'employer_additions' },
  { id: 'ea_ssp_correction', label: 'Correction Of SSP - Amount', category: 'employer_additions' },
  { id: 'ea_dividend', label: 'Dividend - Amount', category: 'employer_additions' },
  { id: 'ea_expense', label: 'Expense reimbursement - Amount', category: 'employer_additions' },
  { id: 'ea_holiday_adj', label: 'Holiday Adjustment - Amount', category: 'employer_additions' },
  { id: 'ea_holiday', label: 'Holiday pay - Amount', category: 'employer_additions' },
  { id: 'ea_loan', label: 'Loan - Amount', category: 'employer_additions' },
  { id: 'ea_lottery', label: 'Lottery - Amount', category: 'employer_additions' },
  { id: 'ea_night', label: 'Night Allowance - Amount', category: 'employer_additions' },
  { id: 'ea_nights_out', label: 'Nights out - Amount', category: 'employer_additions' },
  { id: 'ea_notional', label: 'Notional pay - Amount', category: 'employer_additions' },
  { id: 'ea_overtime', label: 'Overtime - Amount', category: 'employer_additions' },
  { id: 'ea_service', label: 'Service Charge - Amount', category: 'employer_additions' },
  { id: 'ea_ssp', label: 'SSP - Amount', category: 'employer_additions' },
  { id: 'ea_termination', label: 'Termination Award - Amount', category: 'employer_additions' },
  { id: 'ea_toll', label: 'Toll Fee - Amount', category: 'employer_additions' },
  { id: 'ea_trial', label: 'Trial - Amount', category: 'employer_additions' },

  { id: 'ed_advance', label: 'Advance - Amount', category: 'employer_deductions' },
  { id: 'ed_electricity', label: 'Electricity - Amount', category: 'employer_deductions' },
  { id: 'ed_fines', label: 'Fines - Amount', category: 'employer_deductions' },
  { id: 'ed_holiday_adj', label: 'Holiday Adj - Amount', category: 'employer_deductions' },
  { id: 'ed_lottery', label: 'Lottery - Amount', category: 'employer_deductions' },
  { id: 'ed_mk_healthcare', label: 'MK Healthcare - Amount', category: 'employer_deductions' },
  { id: 'ed_payroll_giving', label: 'Payroll giving - Amount', category: 'employer_deductions' },
  { id: 'ed_salary_sacrifice', label: 'Salary sacrifice - Amount', category: 'employer_deductions' },
  { id: 'ed_staff_loan', label: 'Staff Loan - Amount', category: 'employer_deductions' },
]

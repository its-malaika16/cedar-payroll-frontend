export const HMRC_PERIOD_MODES = [
  'Report Over Multiple Tax Years',
  'Report in Current Tax Year Only',
]

export const HMRC_SCHEDULES = [
  { id: 'tax-months' as const, label: 'Tax Months' },
  { id: 'tax-year' as const, label: 'Tax Year' },
]

export type HmrcSchedule = (typeof HMRC_SCHEDULES)[number]['id']

export const HMRC_CATEGORY_GROUPS = [
  {
    label: 'Period',
    categories: [
      { id: 'tax', label: 'Tax' },
      { id: 'nic', label: 'National Insurance Contributions' },
      { id: 'payment', label: 'Payment' },
    ],
  },
  {
    label: 'Year to date',
    categories: [{ id: 'hmrc_ytd', label: 'Year to Date' }],
  },
]

export const HMRC_REPORT_FIELDS: { id: string; label: string; category: string }[] = [
  { id: 'tax_period_ending', label: 'Tax period ending', category: 'tax' },
  { id: 'tax_month_number', label: 'Tax month number', category: 'tax' },
  { id: 'gross_tax', label: 'Gross tax', category: 'tax' },
  { id: 'tax_refund', label: 'Tax refund received', category: 'tax' },
  { id: 'gross_cis', label: 'Gross CIS deductions', category: 'tax' },
  { id: 'cis_suffered', label: 'CIS deductions suffered', category: 'tax' },
  { id: 'student_loan', label: 'Student loan', category: 'tax' },
  { id: 'pgl', label: 'Postgraduate loan', category: 'tax' },
  { id: 'sl_pgl', label: 'Student + Postgrad loan', category: 'tax' },
  { id: 'net_tax', label: 'Net tax', category: 'tax' },

  { id: 'ee_nic', label: 'Employee NICs', category: 'nic' },
  { id: 'er_nic', label: 'Employer NICs', category: 'nic' },
  { id: 'gross_nic', label: 'Gross NICs', category: 'nic' },
  { id: 'smp_rec', label: 'SMP recovered', category: 'nic' },
  { id: 'nic_comp_smp', label: 'NIC compensation on SMP', category: 'nic' },
  { id: 'spp_rec', label: 'SPP recovered', category: 'nic' },
  { id: 'nic_comp_spp', label: 'NIC compensation on SPP', category: 'nic' },
  { id: 'sap_rec', label: 'SAP recovered', category: 'nic' },
  { id: 'nic_comp_sap', label: 'NIC compensation on SAP', category: 'nic' },
  { id: 'shpp_rec', label: 'ShPP recovered', category: 'nic' },
  { id: 'nic_comp_shpp', label: 'NIC compensation on ShPP', category: 'nic' },
  { id: 'spbp_rec', label: 'SPBP recovered', category: 'nic' },
  { id: 'nic_comp_spbp', label: 'NIC compensation on SPBP', category: 'nic' },
  { id: 'sncp_rec', label: 'SNCP recovered', category: 'nic' },
  { id: 'nic_comp_sncp', label: 'NIC compensation on SNCP', category: 'nic' },
  { id: 'statutory_aid', label: 'Statutory pay aid received', category: 'nic' },
  { id: 'emp_allowance', label: 'Employment allowance claim', category: 'nic' },
  { id: 'app_levy', label: 'Apprenticeship Levy', category: 'nic' },
  { id: 'nic_deductions', label: 'Total deductions from NICs', category: 'nic' },
  { id: 'net_nics', label: 'Net NICs', category: 'nic' },

  { id: 'shortfall', label: 'Shortfall from previous periods', category: 'payment' },
  { id: 'manual_adj', label: 'Manual adjustment', category: 'payment' },
  { id: 'net_adj', label: 'Net adjustment', category: 'payment' },
  { id: 'amount_due', label: 'Amount due', category: 'payment' },
  { id: 'amount_paid', label: 'Amount paid', category: 'payment' },
  { id: 'balance', label: 'Balance', category: 'payment' },
  { id: 'payment_date', label: 'Payment date', category: 'payment' },

  { id: 'ytd_gross_tax', label: 'Gross tax to date', category: 'hmrc_ytd' },
  { id: 'ytd_tax_refund', label: 'Tax refund received to date', category: 'hmrc_ytd' },
  { id: 'ytd_gross_cis', label: 'Gross CIS deductions to date', category: 'hmrc_ytd' },
  { id: 'ytd_cis_suffered', label: 'CIS deductions suffered to date', category: 'hmrc_ytd' },
  { id: 'ytd_sl', label: 'Student loan to date', category: 'hmrc_ytd' },
  { id: 'ytd_pgl', label: 'Postgraduate loan to date', category: 'hmrc_ytd' },
  { id: 'ytd_sl_pgl', label: 'Student + Postgrad loan to date', category: 'hmrc_ytd' },
  { id: 'ytd_net_tax', label: 'Net tax to date', category: 'hmrc_ytd' },
  { id: 'ytd_ee_nic', label: 'Employee NICs to date', category: 'hmrc_ytd' },
  { id: 'ytd_er_nic', label: 'Employer NICs to date', category: 'hmrc_ytd' },
  { id: 'ytd_gross_nic', label: 'Gross NICs to date', category: 'hmrc_ytd' },
  { id: 'ytd_smp_rec', label: 'SMP recovered to date', category: 'hmrc_ytd' },
  { id: 'ytd_nic_comp_smp', label: 'NIC compensation on SMP to date', category: 'hmrc_ytd' },
  { id: 'ytd_spp_rec', label: 'SPP recovered to date', category: 'hmrc_ytd' },
  { id: 'ytd_nic_comp_spp', label: 'NIC compensation on SPP to date', category: 'hmrc_ytd' },
  { id: 'ytd_sap_rec', label: 'SAP recovered to date', category: 'hmrc_ytd' },
  { id: 'ytd_nic_comp_sap', label: 'NIC compensation on SAP to date', category: 'hmrc_ytd' },
  { id: 'ytd_shpp_rec', label: 'ShPP recovered to date', category: 'hmrc_ytd' },
  { id: 'ytd_nic_comp_shpp', label: 'NIC compensation on ShPP to date', category: 'hmrc_ytd' },
  { id: 'ytd_spbp_rec', label: 'SPBP recovered to date', category: 'hmrc_ytd' },
  { id: 'ytd_nic_comp_spbp', label: 'NIC compensation on SPBP to date', category: 'hmrc_ytd' },
  { id: 'ytd_sncp_rec', label: 'SNCP recovered to date', category: 'hmrc_ytd' },
  { id: 'ytd_nic_comp_sncp', label: 'NIC compensation on SNCP to date', category: 'hmrc_ytd' },
  { id: 'ytd_statutory_aid', label: 'Statutory pay aid received to date', category: 'hmrc_ytd' },
  { id: 'ytd_emp_allowance', label: 'Employment allowance claim to date', category: 'hmrc_ytd' },
  { id: 'ytd_app_levy', label: 'Apprenticeship Levy to date', category: 'hmrc_ytd' },
  { id: 'ytd_net_nics', label: 'Net NICs to date', category: 'hmrc_ytd' },
  { id: 'ytd_amount_paid', label: 'Amount paid to date', category: 'hmrc_ytd' },
]

export const HMRC_DEFAULT_FIELD_IDS = [
  'tax_period_ending',
  'net_tax',
  'net_nics',
  'shortfall',
  'amount_due',
  'amount_paid',
  'balance',
]

export const P32_DEFAULT_FIELD_IDS = [
  'tax_period_ending',
  'gross_tax',
  'tax_refund',
  'cis_suffered',
  'student_loan',
  'pgl',
  'net_tax',
]

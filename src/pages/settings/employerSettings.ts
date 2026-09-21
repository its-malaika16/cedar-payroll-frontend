import type { Company, EmployerDefaults } from '../../types'

export const SETTINGS_TABS = [
  'Basic Details',
  'PAYE Registration',
  'Typical Employee',
  'RTI',
  'Bureau Team',
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]

export const PAY_FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'FOUR_WEEKLY', label: '4-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const

export const EMPLOYER_COUNTRIES = [
  'England',
  'Scotland',
  'Wales',
  'Northern Ireland',
  'United Kingdom',
] as const

export const EXPENSES_BENEFITS_METHODS = [
  'P11D (after year end)',
  'Payrolling of benefits',
  'Not applicable',
] as const

export type EmployerForm = {
  company_name: string
  trading_name: string
  office_number: string
  address_line_1: string
  address_line_2: string
  address_line_3: string
  address_line_4: string
  postcode: string
  country: string
  pension_provider: string
  pension_employer_id: string
  paye_office: string
  paye_reference: string
  accounts_office_reference: string
  company_registration_number: string
  sa_utr: string
  corporation_tax_reference: string
  bacs_sun: string
  small_employers_relief: boolean
  expenses_benefits_method: string
  typical_pay_frequency: string
  leave_year_starts: string
  leave_calculation_method: string
  leave_entitlement_days: string
  leave_entitlement_weeks: string
  carry_over_leave: boolean
  working_days: string[]
  min_wage_profile: string
  flag_below_min_wage: boolean
  auto_works_numbers: boolean
  withhold_tax_refunds_when_zero: boolean
  do_not_pay_ssp: boolean
  opt_out_credit_check: boolean
  rti_gateway_preference: 'NONE' | 'PAYE'
  rti_title: string
  rti_first_name: string
  rti_middle_name: string
  rti_last_name: string
  rti_email: string
  rti_phone: string
  rti_fax: string
  latitude: string
  longitude: string
  attendance_radius_meters: string
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function emptyEmployerDefaults(): Required<
  Omit<EmployerDefaults, 'rti_contact'>
> & { rti_contact: NonNullable<EmployerDefaults['rti_contact']> } {
  return {
    typical_pay_frequency: 'MONTHLY',
    leave_year_starts: '6 April',
    leave_calculation_method: 'Set number of annual leave days',
    leave_entitlement_days: 28,
    leave_entitlement_weeks: 5.6,
    carry_over_leave: false,
    working_days: [...WEEKDAYS],
    min_wage_profile: 'National Minimum/Living Wage',
    flag_below_min_wage: false,
    auto_works_numbers: false,
    withhold_tax_refunds_when_zero: true,
    do_not_pay_ssp: false,
    opt_out_credit_check: false,
    rti_gateway_preference: 'NONE',
    rti_contact: {
      title: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      fax: '',
    },
  }
}

export function splitPaye(value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return { office: '', reference: '' }
  const slash = raw.indexOf('/')
  if (slash < 0) return { office: '', reference: raw }
  return {
    office: raw.slice(0, slash).trim(),
    reference: raw.slice(slash + 1).trim(),
  }
}

export function joinPaye(office: string, reference: string) {
  const left = office.trim()
  const right = reference.trim()
  if (!left && !right) return ''
  if (!left) return right
  if (!right) return left
  return `${left}/${right}`
}

function str(value: unknown) {
  return value == null ? '' : String(value)
}

export function formFromCompany(company: Company): EmployerForm {
  const defaults = {
    ...emptyEmployerDefaults(),
    ...company.employer_defaults,
    rti_contact: {
      ...emptyEmployerDefaults().rti_contact,
      ...company.employer_defaults?.rti_contact,
    },
  }
  const paye = splitPaye(company.paye_reference)
  const workingDays =
    defaults.working_days?.length > 0 ? defaults.working_days : [...WEEKDAYS]
  return {
    company_name: company.company_name ?? '',
    trading_name: str(company.trading_name),
    office_number: str(company.office_number),
    address_line_1: str(company.address_line_1),
    address_line_2: str(company.address_line_2),
    address_line_3: str(company.address_line_3),
    address_line_4: str(company.address_line_4),
    postcode: str(company.postcode),
    country: str(company.country) || 'England',
    pension_provider: str(company.pension_provider),
    pension_employer_id: str(company.pension_employer_id),
    paye_office: paye.office,
    paye_reference: paye.reference,
    accounts_office_reference: str(company.accounts_office_reference),
    company_registration_number: str(company.company_registration_number),
    sa_utr: str(company.sa_utr),
    corporation_tax_reference: str(company.corporation_tax_reference),
    bacs_sun: str(company.bacs_sun),
    small_employers_relief: Boolean(company.small_employers_relief),
    expenses_benefits_method: str(company.expenses_benefits_method) || EXPENSES_BENEFITS_METHODS[0],
    typical_pay_frequency: defaults.typical_pay_frequency || 'MONTHLY',
    leave_year_starts: defaults.leave_year_starts || '6 April',
    leave_calculation_method:
      defaults.leave_calculation_method || 'Set number of annual leave days',
    leave_entitlement_days: String(defaults.leave_entitlement_days ?? 28),
    leave_entitlement_weeks: String(defaults.leave_entitlement_weeks ?? 5.6),
    carry_over_leave: Boolean(defaults.carry_over_leave),
    working_days: workingDays,
    min_wage_profile: defaults.min_wage_profile || 'National Minimum/Living Wage',
    flag_below_min_wage: Boolean(defaults.flag_below_min_wage),
    auto_works_numbers: Boolean(defaults.auto_works_numbers),
    withhold_tax_refunds_when_zero: defaults.withhold_tax_refunds_when_zero !== false,
    do_not_pay_ssp: Boolean(defaults.do_not_pay_ssp),
    opt_out_credit_check: Boolean(defaults.opt_out_credit_check),
    rti_gateway_preference: defaults.rti_gateway_preference === 'PAYE' ? 'PAYE' : 'NONE',
    rti_title: str(defaults.rti_contact.title),
    rti_first_name: str(defaults.rti_contact.first_name),
    rti_middle_name: str(defaults.rti_contact.middle_name),
    rti_last_name: str(defaults.rti_contact.last_name),
    rti_email: str(defaults.rti_contact.email),
    rti_phone: str(defaults.rti_contact.phone),
    rti_fax: str(defaults.rti_contact.fax),
    latitude: str(company.latitude),
    longitude: str(company.longitude),
    attendance_radius_meters: String(company.attendance_radius_meters || 3000),
  }
}

function amount(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function payloadFromForm(form: EmployerForm) {
  return {
    company_name: form.company_name.trim(),
    trading_name: form.trading_name.trim() || null,
    office_number: form.office_number.trim() || null,
    address_line_1: form.address_line_1.trim() || null,
    address_line_2: form.address_line_2.trim() || null,
    address_line_3: form.address_line_3.trim() || null,
    address_line_4: form.address_line_4.trim() || null,
    postcode: form.postcode.trim() || null,
    country: form.country.trim() || null,
    pension_provider: form.pension_provider.trim() || null,
    pension_employer_id: form.pension_employer_id.trim() || null,
    paye_reference: joinPaye(form.paye_office, form.paye_reference) || null,
    accounts_office_reference: form.accounts_office_reference.trim() || null,
    company_registration_number: form.company_registration_number.trim() || null,
    sa_utr: form.sa_utr.trim() || null,
    corporation_tax_reference: form.corporation_tax_reference.trim() || null,
    bacs_sun: form.bacs_sun.trim() || null,
    small_employers_relief: form.small_employers_relief,
    expenses_benefits_method: form.expenses_benefits_method.trim() || null,
    latitude: form.latitude.trim() ? Number(form.latitude) : null,
    longitude: form.longitude.trim() ? Number(form.longitude) : null,
    attendance_radius_meters: amount(form.attendance_radius_meters, 3000),
    employer_defaults: {
      typical_pay_frequency: form.typical_pay_frequency,
      leave_year_starts: form.leave_year_starts,
      leave_calculation_method: form.leave_calculation_method,
      leave_entitlement_days: amount(form.leave_entitlement_days, 28),
      leave_entitlement_weeks: amount(form.leave_entitlement_weeks, 5.6),
      carry_over_leave: form.carry_over_leave,
      working_days: form.working_days,
      min_wage_profile: form.min_wage_profile,
      flag_below_min_wage: form.flag_below_min_wage,
      auto_works_numbers: form.auto_works_numbers,
      withhold_tax_refunds_when_zero: form.withhold_tax_refunds_when_zero,
      do_not_pay_ssp: form.do_not_pay_ssp,
      opt_out_credit_check: form.opt_out_credit_check,
      rti_gateway_preference: form.rti_gateway_preference,
      rti_contact: {
        title: form.rti_title.trim(),
        first_name: form.rti_first_name.trim(),
        middle_name: form.rti_middle_name.trim(),
        last_name: form.rti_last_name.trim(),
        email: form.rti_email.trim(),
        phone: form.rti_phone.trim(),
        fax: form.rti_fax.trim(),
      },
    },
  }
}

export function workingDayCount(days: string[]) {
  const count = days.filter((day) => day !== 'Saturday' && day !== 'Sunday').length
  return count > 0 ? count : 5
}

export function formatLeaveAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

export function weeksFromDays(days: string, workingDays: string[]) {
  const parsed = Number(days)
  if (days.trim() === '' || Number.isNaN(parsed)) return ''
  return formatLeaveAmount(parsed / workingDayCount(workingDays))
}

export function daysFromWeeks(weeks: string, workingDays: string[]) {
  const parsed = Number(weeks)
  if (weeks.trim() === '' || Number.isNaN(parsed)) return ''
  return formatLeaveAmount(parsed * workingDayCount(workingDays))
}

export function defaultPayScheduleValue(
  frequency: string | undefined,
  schedules: { id: string; pay_frequency: string; is_active?: boolean }[],
) {
  const value = (frequency ?? 'MONTHLY').toUpperCase()
  const match =
    schedules.find((item) => item.pay_frequency === value && item.is_active !== false) ??
    schedules.find((item) => item.pay_frequency === value)
  if (match) return `id:${match.id}`
  if (value === 'WEEKLY') return 'new:weekly'
  if (value === 'FORTNIGHTLY') return 'new:fortnightly'
  if (value === 'FOUR_WEEKLY') return 'new:4-weekly'
  if (value === 'QUARTERLY') return 'new:quarterly'
  if (value === 'YEARLY') return 'new:yearly'
  return 'new:monthly'
}

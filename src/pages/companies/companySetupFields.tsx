import type { ReactNode } from 'react'
import { Field, Input, Select } from '../../components/ui'
import {
  LEAVE_CALCULATION_METHODS,
  LEAVE_YEAR_STARTS,
  WEEKDAYS,
} from '../employees/employeeOptions'
import {
  daysFromWeeks,
  EMPLOYER_COUNTRIES,
  EXPENSES_BENEFITS_METHODS,
  PAY_FREQUENCY_OPTIONS,
  weeksFromDays,
} from '../settings/employerSettings'

export const TYPICAL_PAY_BASIS_OPTIONS = [
  { value: 'ANNUAL', label: 'Based on a period rate / annual salary' },
  { value: 'DAILY', label: 'Based on a daily rate' },
  { value: 'HOURLY', label: 'Based on an hourly rate' },
] as const

export const TYPICAL_PAY_METHOD_OPTIONS = [
  { value: 'CREDIT_TRANSFER', label: 'Credit transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
] as const

export const PAYROLL_START_MODES = ['BEGINNING', 'START_PARTWAY', 'CONTINUE_PARTWAY'] as const
export type PayrollStartMode = (typeof PAYROLL_START_MODES)[number]

export function currentTaxYearLabel(date = new Date()) {
  const year =
    date.getMonth() > 3 || (date.getMonth() === 3 && date.getDate() >= 6)
      ? date.getFullYear()
      : date.getFullYear() - 1
  return `${year}/${String(year + 1).slice(-2)}`
}

export function payrollStartOptions(taxYear = currentTaxYearLabel()) {
  return [
    {
      value: 'BEGINNING' as const,
      title: 'Start at beginning of the tax year',
      hint: `Select this option if you are running payroll from the beginning of the ${taxYear} tax year.`,
    },
    {
      value: 'START_PARTWAY' as const,
      title: 'Start partway in the tax year',
      hint: `Select this option if you are starting payroll partway in the ${taxYear} tax year, with no previous payroll records in the ${taxYear} tax year.`,
    },
    {
      value: 'CONTINUE_PARTWAY' as const,
      title: 'Continue partway in the tax year',
      hint: `Select this option if you already have payroll records for the ${taxYear} tax year up to this point, and wish to continue where you have left off.`,
    },
  ]
}

export type CompanyPayrollSetupValues = {
  payroll_start_mode: PayrollStartMode | string
  address_line_1: string
  address_line_2: string
  address_line_3: string
  address_line_4: string
  postcode: string
  country: string
  paye_office: string
  paye_reference: string
  accounts_office_reference: string
  expenses_benefits_method: string
  small_employers_relief: boolean
  typical_pay_frequency: string
  typical_pay_basis: string
  typical_pay_method: string
  leave_year_starts: string
  leave_calculation_method: string
  leave_entitlement_days: string
  leave_entitlement_weeks: string
  carry_over_leave: boolean
  working_days: string[]
}

export function emptyCompanyPayrollSetup(): CompanyPayrollSetupValues {
  return {
    payroll_start_mode: 'BEGINNING',
    address_line_1: '',
    address_line_2: '',
    address_line_3: '',
    address_line_4: '',
    postcode: '',
    country: 'England',
    paye_office: '',
    paye_reference: '',
    accounts_office_reference: '',
    expenses_benefits_method: EXPENSES_BENEFITS_METHODS[0],
    small_employers_relief: false,
    typical_pay_frequency: 'MONTHLY',
    typical_pay_basis: 'ANNUAL',
    typical_pay_method: 'CREDIT_TRANSFER',
    leave_year_starts: '6 April',
    leave_calculation_method: 'Set number of annual leave days',
    leave_entitlement_days: '28',
    leave_entitlement_weeks: '5.6',
    carry_over_leave: true,
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  }
}

export function employerDefaultsFromSetup(values: CompanyPayrollSetupValues) {
  return {
    payroll_start_mode: values.payroll_start_mode || 'BEGINNING',
    typical_pay_frequency: values.typical_pay_frequency || 'MONTHLY',
    typical_pay_basis: values.typical_pay_basis || 'ANNUAL',
    typical_pay_method: values.typical_pay_method || 'CREDIT_TRANSFER',
    leave_year_starts: values.leave_year_starts || '6 April',
    leave_calculation_method: values.leave_calculation_method,
    leave_entitlement_days: Number(values.leave_entitlement_days) || 28,
    leave_entitlement_weeks: Number(values.leave_entitlement_weeks) || 5.6,
    carry_over_leave: values.carry_over_leave,
    working_days: values.working_days,
  }
}

export function typicalEmployeeFromDefaults(defaults?: {
  typical_pay_frequency?: string | null
  typical_pay_basis?: string | null
  typical_pay_method?: string | null
  leave_year_starts?: string | null
  leave_calculation_method?: string | null
  leave_entitlement_days?: number | string | null
  leave_entitlement_weeks?: number | string | null
  carry_over_leave?: boolean | null
  working_days?: string[] | null
}): Partial<CompanyPayrollSetupValues> {
  const empty = emptyCompanyPayrollSetup()
  return {
    typical_pay_frequency: defaults?.typical_pay_frequency || empty.typical_pay_frequency,
    typical_pay_basis: defaults?.typical_pay_basis || empty.typical_pay_basis,
    typical_pay_method: defaults?.typical_pay_method || empty.typical_pay_method,
    leave_year_starts: defaults?.leave_year_starts || empty.leave_year_starts,
    leave_calculation_method: defaults?.leave_calculation_method || empty.leave_calculation_method,
    leave_entitlement_days:
      defaults?.leave_entitlement_days != null
        ? String(defaults.leave_entitlement_days)
        : empty.leave_entitlement_days,
    leave_entitlement_weeks:
      defaults?.leave_entitlement_weeks != null
        ? String(defaults.leave_entitlement_weeks)
        : empty.leave_entitlement_weeks,
    carry_over_leave:
      defaults?.carry_over_leave == null ? empty.carry_over_leave : Boolean(defaults.carry_over_leave),
    working_days:
      defaults?.working_days && defaults.working_days.length > 0
        ? defaults.working_days
        : empty.working_days,
  }
}

type SetupProps = {
  values: CompanyPayrollSetupValues
  companyName?: string
  disabled?: boolean
  onChange: (next: Partial<CompanyPayrollSetupValues>) => void
}

function companyLabel(name?: string) {
  return name?.trim() || 'this company'
}

export function PayrollStartFields({ values, companyName, disabled, onChange }: SetupProps) {
  const taxYear = currentTaxYearLabel()
  const subject = companyLabel(companyName)
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2 text-sm font-medium text-navy">
        How should payroll for {subject} be handled in the {taxYear} tax year?
      </legend>
      {payrollStartOptions(taxYear).map((option) => {
        const checked = values.payroll_start_mode === option.value
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-[12px] border px-3.5 py-2.5 ${
              checked ? 'border-navy bg-white' : 'border-[#eceae6] bg-white'
            } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <input
              type="radio"
              name="payroll_start_mode"
              className="mt-1 accent-navy"
              checked={checked}
              disabled={disabled}
              onChange={() => onChange({ payroll_start_mode: option.value })}
            />
            <span>
              <span className="block text-sm font-semibold text-navy">{option.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">{option.hint}</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

export function RegisteredAddressFields({ values, companyName, disabled, onChange }: SetupProps) {
  const subject = companyLabel(companyName)
  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium text-navy">Enter the full registered address of {subject}.</p>
      <div>
        <span className="mb-2 block text-sm font-medium text-navy">Address</span>
        <div className="grid gap-2">
          <Input
            variant="outline"
            placeholder="Address Line 1"
            value={values.address_line_1}
            disabled={disabled}
            onChange={(event) => onChange({ address_line_1: event.target.value })}
          />
          <Input
            variant="outline"
            placeholder="Address Line 2"
            value={values.address_line_2}
            disabled={disabled}
            onChange={(event) => onChange({ address_line_2: event.target.value })}
          />
          <Input
            variant="outline"
            placeholder="Address Line 3"
            value={values.address_line_3}
            disabled={disabled}
            onChange={(event) => onChange({ address_line_3: event.target.value })}
          />
          <Input
            variant="outline"
            placeholder="Address Line 4"
            value={values.address_line_4}
            disabled={disabled}
            onChange={(event) => onChange({ address_line_4: event.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Postcode">
          <Input
            variant="outline"
            value={values.postcode}
            disabled={disabled}
            autoComplete="postal-code"
            onChange={(event) => onChange({ postcode: event.target.value })}
          />
        </Field>
        <Field label="Country">
          <Select
            variant="outline"
            value={values.country}
            disabled={disabled}
            onChange={(event) => onChange({ country: event.target.value })}
          >
            {EMPLOYER_COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  )
}

export function PayeRegistrationFields({ values, companyName, disabled, onChange }: SetupProps) {
  const subject = companyLabel(companyName)
  const expensesLabels: Record<string, string> = {
    'P11D (after year end)': 'P11D (after year end)',
    'Payrolling of benefits': 'PAYE (payrolling of benefits)',
    'Not applicable': 'Not applicable',
  }
  return (
    <div className="grid gap-4">
      <p className="text-sm font-medium text-navy">Enter the PAYE registration details for {subject}.</p>
      <Field label="Company PAYE reference">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <Input
            variant="outline"
            placeholder="Office number"
            value={values.paye_office}
            disabled={disabled}
            onChange={(event) => onChange({ paye_office: event.target.value })}
          />
          <span className="text-muted">/</span>
          <Input
            variant="outline"
            placeholder="Reference number"
            value={values.paye_reference}
            disabled={disabled}
            onChange={(event) => onChange({ paye_reference: event.target.value })}
          />
        </div>
      </Field>
      <Field label="Accounts office reference">
        <Input
          variant="outline"
          value={values.accounts_office_reference}
          disabled={disabled}
          onChange={(event) => onChange({ accounts_office_reference: event.target.value })}
        />
      </Field>
      <Field label="Expenses & benefits tax accounting method">
        <Select
          variant="outline"
          value={values.expenses_benefits_method}
          disabled={disabled}
          onChange={(event) => onChange({ expenses_benefits_method: event.target.value })}
        >
          {EXPENSES_BENEFITS_METHODS.map((method) => (
            <option key={method} value={method}>
              {expensesLabels[method] || method}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-start gap-2 text-sm text-navy">
        <input
          type="checkbox"
          className="mt-0.5 size-3.5 shrink-0 accent-navy"
          checked={values.small_employers_relief}
          disabled={disabled}
          onChange={(event) => onChange({ small_employers_relief: event.target.checked })}
        />
        <span>
          Company qualifies for <span className="font-semibold">Small Employers&apos; Relief</span>
        </span>
      </label>
    </div>
  )
}

export function CompanyPayrollSetupFields(props: SetupProps) {
  return (
    <div className="grid gap-8">
      <PayrollStartFields {...props} />
      <RegisteredAddressFields {...props} />
      <PayeRegistrationFields {...props} />
    </div>
  )
}

const compactInputClass =
  '!w-[5.25rem] !min-w-[5.25rem] !max-w-[5.25rem] shrink-0 px-2 text-center'

function SetupRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5 md:grid-cols-[minmax(11rem,16rem)_minmax(0,1fr)] md:items-center">
      <span className="text-sm italic leading-5 text-navy/80">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function TypicalEmployeeFields({
  values,
  companyName,
  disabled,
  showIntro = true,
  onChange,
}: {
  values: CompanyPayrollSetupValues
  companyName?: string
  disabled?: boolean
  showIntro?: boolean
  onChange: (next: Partial<CompanyPayrollSetupValues>) => void
}) {
  const subject = companyName?.trim() || 'this company'
  const showLeaveAmounts = values.leave_calculation_method !== 'No entitlement'

  function toggleDay(day: string) {
    const working_days = values.working_days.includes(day)
      ? values.working_days.filter((item) => item !== day)
      : [...values.working_days, day]
    const next = { working_days }
    if (showLeaveAmounts && values.leave_entitlement_days) {
      return onChange({
        ...next,
        leave_entitlement_weeks: weeksFromDays(values.leave_entitlement_days, working_days),
      })
    }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {showIntro ? (
        <p className="text-sm font-medium text-navy">
          Enter the default settings to be used when adding a new employee to {subject}.
        </p>
      ) : null}
      <div className="grid gap-3">
        <SetupRow label="Typical pay frequency">
          <Select
            variant="outline"
            value={values.typical_pay_frequency}
            disabled={disabled}
            onChange={(event) => onChange({ typical_pay_frequency: event.target.value })}
          >
            {PAY_FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </SetupRow>
        <SetupRow label="Typical pay basis">
          <Select
            variant="outline"
            value={values.typical_pay_basis}
            disabled={disabled}
            onChange={(event) => onChange({ typical_pay_basis: event.target.value })}
          >
            {TYPICAL_PAY_BASIS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </SetupRow>
        <SetupRow label="Typical pay method">
          <Select
            variant="outline"
            value={values.typical_pay_method}
            disabled={disabled}
            onChange={(event) => onChange({ typical_pay_method: event.target.value })}
          >
            {TYPICAL_PAY_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </SetupRow>
        <SetupRow label="Typical annual leave year starts">
          <Select
            variant="outline"
            value={values.leave_year_starts}
            disabled={disabled}
            onChange={(event) => onChange({ leave_year_starts: event.target.value })}
          >
            {LEAVE_YEAR_STARTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </SetupRow>
        <SetupRow label="Typical annual leave calculation">
          <Select
            variant="outline"
            value={values.leave_calculation_method}
            disabled={disabled}
            onChange={(event) => onChange({ leave_calculation_method: event.target.value })}
          >
            {LEAVE_CALCULATION_METHODS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </SetupRow>
        {showLeaveAmounts ? (
          <SetupRow label="Typical annual leave entitlement">
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
              <Input
                variant="outline"
                className={compactInputClass}
                value={values.leave_entitlement_days}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    leave_entitlement_days: event.target.value,
                    leave_entitlement_weeks: weeksFromDays(event.target.value, values.working_days),
                  })
                }
              />
              <span className="shrink-0 text-sm text-muted">days</span>
              <span className="shrink-0 text-muted">↔</span>
              <Input
                variant="outline"
                className={compactInputClass}
                value={values.leave_entitlement_weeks}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    leave_entitlement_weeks: event.target.value,
                    leave_entitlement_days: daysFromWeeks(event.target.value, values.working_days),
                  })
                }
              />
              <span className="shrink-0 text-sm text-muted">weeks</span>
            </div>
          </SetupRow>
        ) : null}
        <SetupRow label="Typical annual leave carry-over">
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              className="size-3.5 shrink-0 accent-navy"
              checked={values.carry_over_leave}
              disabled={disabled}
              onChange={(event) => onChange({ carry_over_leave: event.target.checked })}
            />
            Carry over annual leave from previous year
          </label>
        </SetupRow>
        <SetupRow label="Typical working days">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {WEEKDAYS.map((day) => (
              <label key={day} className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  className="size-3.5 accent-navy"
                  checked={values.working_days.includes(day)}
                  disabled={disabled}
                  onChange={() => toggleDay(day)}
                />
                {day}
              </label>
            ))}
          </div>
        </SetupRow>
      </div>
    </div>
  )
}

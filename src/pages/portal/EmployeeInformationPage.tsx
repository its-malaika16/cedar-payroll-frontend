import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  CalendarDays,
  CircleUser,
  Clock3,
  FileText,
  GraduationCap,
  Info,
  Landmark,
  Mail,
  MapPin,
  Shield,
  User,
  Users,
} from 'lucide-react'
import { employeesApi } from '../../api'
import { assetUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { formatDate, formatNiNumber, fullName, toDateInput } from '../../lib/format'
import { isFormDirty } from '../../lib/formDirty'
import type { Employee, EmployeePortalDashboard } from '../../types'
import {
  COUNTRY_OPTIONS,
  GENDER_OPTIONS,
  PAY_BASIS_OPTIONS,
  POSTGRADUATE_LOAN_PLANS,
  STARTER_DECLARATIONS,
  STUDENT_LOAN_PLANS,
  TITLE_OPTIONS,
} from '../employees/employeeOptions'
import { FREQUENCY_META, asPayFrequency } from '../payroll/scheduleWizard/payDateRules'

const TABS = ['Personal', 'Employment', 'Starter/Leaver', 'Payment', 'Tax, NICs, RTI'] as const
type Tab = (typeof TABS)[number]

function firstRecord<T>(value: T[] | T | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? {}
  if (value && typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function str(value: unknown) {
  return value == null ? '' : String(value)
}

const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function visibleWorksNumber(code?: string | null) {
  return (code ?? '').trim()
}

function ageFromDob(dob: string) {
  if (!dob) return ''
  const date = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  const month = now.getMonth() - date.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < date.getDate())) years -= 1
  return years >= 0 ? String(years) : ''
}

function pickContact(
  primaryType: string | null | undefined,
  primary: string | null | undefined,
  extras: Array<{ type?: string; address?: string; number?: string }> | null | undefined,
  wanted: string,
  key: 'address' | 'number',
) {
  if ((primaryType || (key === 'address' ? 'Work' : 'Mobile')).toLowerCase() === wanted.toLowerCase()) {
    return primary ?? ''
  }
  const match = (extras ?? []).find((item) => (item.type ?? '').toLowerCase() === wanted.toLowerCase())
  return (key === 'address' ? match?.address : match?.number) ?? ''
}

function labelOf(options: readonly { value: string; label: string }[], value: unknown) {
  const key = String(value ?? '')
  return options.find((item) => item.value === key)?.label ?? key
}

function Box({
  title,
  icon,
  children,
  className = '',
}: {
  title: string
  icon: ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[16px] border border-[#e6e4df] bg-white p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2 text-navy">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  readOnly,
  prefix,
  suffix,
  hideLabel,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  type?: string
  readOnly?: boolean
  prefix?: string
  suffix?: string
  hideLabel?: boolean
}) {
  return (
    <label className="block">
      {hideLabel ? null : <span className="mb-1.5 block text-xs font-medium text-navy">{label}</span>}
      <span
        className={`flex h-10 items-center rounded-[8px] border px-3 ${
          readOnly ? 'border-[#e4e2dc] bg-[#f4f3ef]' : 'border-[#e4e2dc] bg-white'
        }`}
      >
        {prefix ? <span className="mr-1 text-xs text-muted">{prefix}</span> : null}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder={type === 'date' && !value ? 'dd/mm/yyyy' : undefined}
          onChange={(event) => onChange?.(event.target.value)}
          className={`h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#b0b6be] ${
            readOnly ? 'cursor-default text-[#5c6770]' : 'text-navy'
          }`}
        />
        {type === 'date' ? <CalendarDays size={14} className="ml-2 shrink-0 text-[#8a93a0]" /> : null}
        {suffix ? (
          <span className="ml-2 shrink-0 rounded-[6px] bg-[#f3f2ef] px-2 py-1 text-[11px] font-medium text-muted">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  readOnly,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange?: (value: string) => void
  readOnly?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-navy">{label}</span>
      <select
        value={value}
        disabled={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={`h-10 w-full rounded-[8px] border border-[#e4e2dc] px-3 text-xs outline-none ${
          readOnly ? 'cursor-default bg-[#f4f3ef] text-[#5c6770]' : 'bg-white text-navy'
        }`}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function ContactAdmin() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#d5e3f4] bg-[#f4f8fd] px-5 py-4">
      <div className="flex items-start gap-3 text-sm text-navy">
        <span className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-[#e4eef9] text-navy">
          <Info size={15} />
        </span>
        <div>
          <p className="font-semibold">Need to update your details</p>
          <p className="text-xs text-[#607080]">Contact the company admin to request changes to your details</p>
        </div>
      </div>
      <Link
        to="/portal/help/chat"
        className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d9d9d9] bg-white px-4 text-xs font-semibold text-navy"
      >
        <Mail size={14} />
        Contact Us
      </Link>
    </div>
  )
}

export function EmployeeInformationPage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [tab, setTab] = useState<Tab>('Personal')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [personalReady, setPersonalReady] = useState(false)
  const query = useQuery({
    queryKey: ['my-employee', companyId, employeeId],
    queryFn: () => employeesApi.me(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const dashboardQuery = useQuery({
    queryKey: ['employee-dashboard', companyId, employeeId],
    queryFn: () => employeesApi.portalDashboard(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const employee = (query.data?.data as Employee | undefined) ?? null
  const dashboard = dashboardQuery.data?.data as EmployeePortalDashboard | undefined
  const address = firstRecord(employee?.employee_addresses)
  const employment = asRecord(employee?.employment_details)
  const starter = asRecord(employee?.starters_leavers)
  const tax = asRecord(employee?.employee_tax_details)

  const [draft, setDraft] = useState({
    title: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    dob: '',
    phone_mobile: '',
    phone_home: '',
    address_line_1: '',
    address_line_2: '',
    address_line_3: '',
    address_line_4: '',
    postcode: '',
    country: 'United Kingdom',
  })

  function draftFromEmployee(record: Employee) {
    return {
      title: record.title ?? '',
      first_name: record.first_name ?? '',
      middle_name: record.middle_name ?? '',
      last_name: record.last_name ?? '',
      gender: record.gender ?? '',
      dob: toDateInput(record.dob),
      phone_mobile: pickContact(record.phone_type, record.phone, record.extra_phones, 'Mobile', 'number'),
      phone_home: pickContact(record.phone_type, record.phone, record.extra_phones, 'Home', 'number'),
      address_line_1: address?.address_line_1 ?? '',
      address_line_2: address?.address_line_2 ?? '',
      address_line_3: address?.address_line_3 ?? '',
      address_line_4: address?.address_line_4 ?? '',
      postcode: address?.postcode ?? '',
      country: address?.country ?? 'United Kingdom',
    }
  }

  useEffect(() => {
    if (!employee) return
    setDraft(draftFromEmployee(employee))
    setPersonalReady(true)
  }, [employee, address])

  const workEmail = employee
    ? pickContact(employee.email_type, employee.email, employee.extra_emails, 'Work', 'address') ||
      employee.email ||
      ''
    : ''
  const personalEmail = employee
    ? pickContact(employee.email_type, employee.email, employee.extra_emails, 'Personal', 'address')
    : ''
  const storedWorkingDays = str(employment.usual_working_days)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const workingDays = storedWorkingDays.length ? storedWorkingDays : DEFAULT_WORKING_DAYS
  const leaveYearStarts = str(employment.leave_year_starts) || '6 April'
  const leaveMethod =
    str(employment.leave_calculation_method) || 'Set number of annual leave days'
  const leaveDays = str(employment.annual_leave_entitlement) || '28'
  const leaveWeeks = str(employment.leave_entitlement_weeks) || '5.6'
  const minWageProfile = str(employment.min_wage_profile) || 'National Minimum/Living Wage'
  const scheduleName = str(employment.pay_schedule_name) || str(employment.pay_schedule_request)
  const payBasis = labelOf([...PAY_BASIS_OPTIONS], employment.pay_basis_type)
  const starterLabel = labelOf([...STARTER_DECLARATIONS], starter.starter_declaration)
  const leaveDate = str(starter.leave_date)
  const isActive = !leaveDate || new Date(leaveDate) > new Date()
  const name = fullName(employee?.first_name, employee?.last_name) || 'Employee'
  const age = useMemo(() => ageFromDob(draft.dob), [draft.dob])

  async function savePersonal() {
    if (!companyId || !employeeId) return
    try {
      setError(null)
      setMessage(null)
      setSaving(true)
      await employeesApi.updateMyPersonal(companyId, employeeId, {
        title: draft.title || undefined,
        first_name: draft.first_name,
        middle_name: draft.middle_name || undefined,
        last_name: draft.last_name,
        gender: draft.gender || undefined,
        dob: draft.dob || undefined,
        phone: draft.phone_mobile || draft.phone_home || undefined,
        phone_type: draft.phone_mobile ? 'Mobile' : draft.phone_home ? 'Home' : 'Mobile',
        extra_phones:
          draft.phone_mobile && draft.phone_home ? [{ type: 'Home', number: draft.phone_home }] : [],
        address: {
          address_line_1: draft.address_line_1,
          address_line_2: draft.address_line_2,
          address_line_3: draft.address_line_3,
          address_line_4: draft.address_line_4,
          postcode: draft.postcode,
          country: draft.country,
        },
      })
      setMessage('Personal details saved')
      await query.refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save personal details')
    } finally {
      setSaving(false)
    }
  }

  if (query.isLoading) return <Loading />
  if (!employee) {
    return <p className="text-sm text-muted">Your employee record is not linked yet.</p>
  }

  const nextPay = dashboard?.next_payroll
  const frequency = nextPay?.pay_frequency
    ? FREQUENCY_META[asPayFrequency(nextPay.pay_frequency)]?.title
    : employment.pay_frequency
      ? FREQUENCY_META[asPayFrequency(String(employment.pay_frequency))]?.title
      : ''

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        My Profile
      </p>
      <h1 className="mt-2 text-[32px] font-semibold text-navy">My Profile</h1>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[16px] border border-[#e6e4df] bg-white px-6 py-8 text-center">
          {employee.photo_url ? (
            <img
              src={assetUrl(employee.photo_url)}
              alt=""
              className="mx-auto size-[92px] rounded-full object-cover"
            />
          ) : (
            <span className="mx-auto flex size-[92px] items-center justify-center rounded-full bg-navy text-white">
              <User size={46} strokeWidth={1.6} />
            </span>
          )}
          <p className="mt-4 text-base font-semibold text-navy">{name === '—' ? 'Employee Name' : name}</p>
          <p
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isActive ? 'bg-[#e7f8ee] text-[#1b8a4a]' : 'bg-[#fdecee] text-brand'
            }`}
          >
            <span className={`size-1.5 rounded-full ${isActive ? 'bg-[#22c55e]' : 'bg-brand'}`} />
            {isActive ? 'Active' : 'Leaver'}
          </p>
          <div className="my-6 border-t border-[#eceae6]" />
          <dl className="space-y-5 text-left text-xs text-navy">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
                <CalendarDays size={16} />
              </span>
              <div>
                <dt className="text-muted">Start Date</dt>
                <dd className="mt-0.5 font-semibold">
                  {starter.start_date ? formatDate(String(starter.start_date)) : '—'}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
                <FileText size={16} />
              </span>
              <div>
                <dt className="text-muted">Tax Code</dt>
                <dd className="mt-0.5 font-semibold">{str(tax.tax_code) || '—'}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
                <Landmark size={16} />
              </span>
              <div>
                <dt className="text-muted">NI number</dt>
                <dd className="mt-0.5 font-semibold">
                  {formatNiNumber(tax.ni_number ? String(tax.ni_number) : null)}
                </dd>
              </div>
            </div>
          </dl>
        </aside>

        <div>
          <div className="flex gap-6 overflow-x-auto rounded-[16px] border border-[#e6e4df] bg-white px-5 text-sm font-medium text-muted">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(item)
                  setError(null)
                  setMessage(null)
                }}
                className={`shrink-0 border-b-2 py-4 ${
                  tab === item ? 'border-navy text-navy' : 'border-transparent hover:text-navy'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          {message ? (
            <div className="mt-4">
              <Alert tone="success">{message}</Alert>
            </div>
          ) : null}

          {tab === 'Personal' ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-5 xl:grid-cols-2">
                <Box title="Personal Information" icon={<CircleUser size={16} />}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      label="Title"
                      value={draft.title}
                      options={TITLE_OPTIONS}
                      onChange={(value) => setDraft({ ...draft, title: value })}
                    />
                    <TextField
                      label="First Name"
                      value={draft.first_name}
                      onChange={(value) => setDraft({ ...draft, first_name: value })}
                    />
                    <TextField
                      label="Middle Name"
                      value={draft.middle_name}
                      onChange={(value) => setDraft({ ...draft, middle_name: value })}
                    />
                    <TextField
                      label="Last Name"
                      value={draft.last_name}
                      onChange={(value) => setDraft({ ...draft, last_name: value })}
                    />
                    <TextField
                      label="Date of Birth"
                      type="date"
                      value={draft.dob}
                      onChange={(value) => setDraft({ ...draft, dob: value })}
                    />
                    <TextField label="Age" value={age} readOnly />
                    <SelectField
                      label="Gender"
                      value={draft.gender}
                      options={GENDER_OPTIONS}
                      onChange={(value) => setDraft({ ...draft, gender: value })}
                    />
                  </div>
                </Box>
                <Box title="Contact Details" icon={<Mail size={16} />}>
                  <div className="grid gap-4">
                    <TextField label="Work Email Address" value={workEmail} readOnly />
                    <TextField label="Personal Email Address" value={personalEmail} readOnly />
                    <TextField
                      label="Phone (Mobile)"
                      value={draft.phone_mobile}
                      onChange={(value) => setDraft({ ...draft, phone_mobile: value })}
                    />
                    <TextField
                      label="Phone (Home)"
                      value={draft.phone_home}
                      onChange={(value) => setDraft({ ...draft, phone_home: value })}
                    />
                  </div>
                </Box>
              </div>
              <Box title="Address Details" icon={<MapPin size={16} />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Address Line 1"
                    value={draft.address_line_1}
                    onChange={(value) => setDraft({ ...draft, address_line_1: value })}
                  />
                  <TextField
                    label="Address Line 2"
                    value={draft.address_line_2}
                    onChange={(value) => setDraft({ ...draft, address_line_2: value })}
                  />
                  <TextField
                    label="Address Line 3"
                    value={draft.address_line_3}
                    onChange={(value) => setDraft({ ...draft, address_line_3: value })}
                  />
                  <TextField
                    label="Address Line 4"
                    value={draft.address_line_4}
                    onChange={(value) => setDraft({ ...draft, address_line_4: value })}
                  />
                  <TextField
                    label="Postcode"
                    value={draft.postcode}
                    onChange={(value) => setDraft({ ...draft, postcode: value })}
                  />
                  <SelectField
                    label="Country"
                    value={draft.country}
                    options={COUNTRY_OPTIONS}
                    onChange={(value) => setDraft({ ...draft, country: value })}
                  />
                </div>
              </Box>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 min-w-[105px] rounded-[8px] border-[#d9d9d9] text-xs"
                  onClick={() => {
                    setDraft(draftFromEmployee(employee))
                    setError(null)
                    setMessage(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-10 min-w-[105px] rounded-[8px] text-xs"
                  disabled={saving || !personalReady || !isFormDirty(draft, draftFromEmployee(employee))}
                  onClick={() => void savePersonal()}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          ) : null}

          {tab === 'Employment' ? (
            <div className="mt-5 space-y-5">
              <div className="grid items-start gap-5 xl:grid-cols-2">
                <div className="space-y-5">
                  <Box title="Identification" icon={<CircleUser size={16} />}>
                    <TextField label="Works Number" value={visibleWorksNumber(employee.employee_code)} readOnly />
                  </Box>
                  <Box title="Department(s)" icon={<Users size={16} />}>
                    <TextField label="Department" value={str(employment.department)} readOnly />
                  </Box>
                  <Box title="Minimum Wage" icon={<span className="text-base font-semibold">£</span>}>
                    <div className="grid gap-4">
                      <TextField label="Minimum wage profile" value={minWageProfile} readOnly />
                      <TextField
                        label="Typical hours worked per week"
                        value={str(employment.typical_hours_per_week)}
                        readOnly
                      />
                    </div>
                  </Box>
                </div>
                <div className="space-y-5">
                  <Box title="Annual Leave" icon={<CalendarDays size={16} />}>
                    <div className="grid gap-4">
                      <TextField label="Leave year starts" value={leaveYearStarts} readOnly />
                      <TextField
                        label="Annual Leave Calculation Method"
                        value={leaveMethod}
                        readOnly
                      />
                      <div>
                        <span className="mb-1.5 block text-xs font-medium text-navy">Annual Leave Entitlement</span>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <TextField
                              label="Days"
                              hideLabel
                              value={leaveDays}
                              suffix="Days"
                              readOnly
                            />
                          </div>
                          <ArrowLeftRight size={16} className="shrink-0 text-muted" />
                          <div className="min-w-0 flex-1">
                            <TextField
                              label="Weeks"
                              hideLabel
                              value={leaveWeeks}
                              suffix="Weeks"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Box>
                  <Box title="Usual Working Days" icon={<Clock3 size={16} />}>
                    <div className="grid grid-cols-2 gap-y-3">
                      {['Monday', 'Friday', 'Tuesday', 'Saturday', 'Wednesday', 'Sunday', 'Thursday'].map((day) => (
                        <label key={day} className="flex items-center gap-2 text-xs text-navy">
                          <input
                            type="checkbox"
                            className="size-3.5 accent-[#9aa3ad]"
                            checked={workingDays.includes(day)}
                            readOnly
                            disabled
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </Box>
                </div>
              </div>
              <ContactAdmin />
            </div>
          ) : null}

          {tab === 'Starter/Leaver' ? (
            <div className="mt-5 space-y-5">
              <Box title="Starter Details" icon={<CircleUser size={16} />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Start Date"
                    value={starter.start_date ? toDateInput(String(starter.start_date)) : ''}
                    type="date"
                    readOnly
                  />
                  <TextField
                    label="Payment Schedule"
                    value={scheduleName}
                    readOnly
                  />
                  <TextField label="How is pay worked out?" value={payBasis} readOnly />
                  <TextField label="Starter declaration" value={starterLabel} readOnly />
                  <label className="sm:col-span-2 flex items-center gap-2 text-xs text-navy">
                    <input type="checkbox" className="size-3.5 accent-[#9aa3ad]" checked={Boolean(starter.overseas_secondment)} readOnly disabled />
                    Tick if employee continues to be employed by an overseas employer (who has sent this individual to work for you)
                  </label>
                </div>
                <div className="mt-5">
                  <p className="mb-3 text-sm font-semibold text-navy">Previous Employment</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Gross taxable pay"
                      value={str(starter.previous_gross_taxable_pay)}
                      prefix="£"
                      readOnly
                    />
                    <TextField
                      label="Gross tax"
                      value={str(starter.previous_gross_tax)}
                      prefix="£"
                      readOnly
                    />
                  </div>
                </div>
              </Box>
              <div className="grid gap-5 xl:grid-cols-2">
                <Box title="TUPE" icon={<Shield size={16} />}>
                  <label className="flex items-center gap-2 text-xs text-navy">
                    <input type="checkbox" className="size-3.5 accent-[#9aa3ad]" checked={Boolean(starter.tupe_protected)} readOnly disabled />
                    Employee is protected under the Transfer of Undertakings (Protection of Employment) Regulations
                  </label>
                  <div className="mt-4">
                    <TextField
                      label="Pre-transfer Start Date"
                      type="date"
                      value={starter.pre_transfer_start_date ? toDateInput(String(starter.pre_transfer_start_date)) : ''}
                      readOnly
                    />
                  </div>
                </Box>
                <Box title="Leaver Details" icon={<CalendarDays size={16} />}>
                  <TextField
                    label="Leave Date"
                    type="date"
                    value={leaveDate ? toDateInput(leaveDate) : ''}
                    readOnly
                  />
                </Box>
              </div>
              <ContactAdmin />
            </div>
          ) : null}

          {tab === 'Payment' ? (
            <div className="mt-5 space-y-5">
              <Box title="Payment Schedule" icon={<span className="text-lg font-semibold">£</span>}>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="grid gap-4">
                    <TextField
                      label="Payment Schedule"
                      value={scheduleName}
                      readOnly
                    />
                    <TextField label="How is pay worked out?" value={payBasis} readOnly />
                    <TextField
                      label="Period Rate"
                      value={str(employment.period_rate)}
                      prefix="£"
                      readOnly
                    />
                    <TextField
                      label="Annual salary"
                      value={str(employment.annual_salary)}
                      prefix="£"
                      readOnly
                    />
                  </div>
                  <div className="rounded-[16px] border border-[#d5e3f4] bg-[#f7fafd] px-5 py-6 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-navy text-white">
                      <CalendarDays size={20} />
                    </span>
                    <p className="mt-3 text-xs text-muted">Next Pay Date</p>
                    <p className="mt-1 text-xl font-semibold text-navy">
                      {nextPay?.pay_date
                        ? new Date(nextPay.pay_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })
                        : 'Not set'}
                    </p>
                    <p className="mt-2 text-xs text-[#607080]">
                      {frequency ? `${frequency} Schedule` : 'Schedule'}
                      {nextPay?.tax_week ? ` (Week ${nextPay.tax_week})` : ''}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e7f8ee] px-3 py-1 text-xs font-semibold text-[#1b8a4a]">
                      <span className="size-1.5 rounded-full bg-[#22c55e]" />
                      {nextPay ? 'Scheduled' : 'Not scheduled'}
                    </p>
                  </div>
                </div>
              </Box>
              <div className="grid gap-5 xl:grid-cols-2">
                <Box title="Hourly Rates" icon={<Clock3 size={16} />}>
                  <TextField
                    label="Standard hourly rate"
                    value={str(employment.basic_rate_per_hour)}
                    prefix="£"
                    suffix="per hour"
                    readOnly
                  />
                </Box>
                <Box title="Daily Rates" icon={<CalendarDays size={16} />}>
                  <TextField
                    label="Standard daily rate"
                    value={str(employment.daily_rate)}
                    prefix="£"
                    suffix="per day"
                    readOnly
                  />
                </Box>
              </div>
              <ContactAdmin />
            </div>
          ) : null}

          {tab === 'Tax, NICs, RTI' ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-5 xl:grid-cols-2">
                <Box title="Tax" icon={<FileText size={16} />}>
                  <TextField label="Tax Code" value={str(tax.tax_code)} readOnly />
                  <p className="mt-3 text-[11px] leading-4 text-[#607080]">
                    If this person already has finalised payslips this tax year, the new code applies from the next
                    unfinalised period. Tax already paid on earlier payslips is kept and used in the cumulative
                    calculation.
                  </p>
                  <label className="mt-4 flex items-center gap-2 text-xs text-navy">
                    <input type="checkbox" className="size-3.5 accent-[#9aa3ad]" checked={Boolean(tax.week1month1)} readOnly disabled />
                    Week 1 / Month 1 basis
                  </label>
                </Box>
                <Box title="National Insurance" icon={<Shield size={16} />}>
                  <TextField
                    label="National Insurance Number"
                    value={formatNiNumber(tax.ni_number ? String(tax.ni_number) : null)}
                    readOnly
                  />
                  <div className="mt-4">
                    <TextField label="Category" value={str(tax.ni_category)} readOnly />
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-xs text-navy">
                    <input type="checkbox" className="size-3.5 accent-[#9aa3ad]" checked={Boolean(tax.is_director)} readOnly disabled />
                    Employee is/was a director during the tax year
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-xs text-navy">
                    <input type="checkbox" className="size-3.5 accent-[#9aa3ad]" checked={Boolean(tax.secondary_nics_not_due)} readOnly disabled />
                    Secondary Class 1 NICs are not due for this employee
                  </label>
                </Box>
              </div>
              <Box title="Student & Postgraduate Loan" icon={<GraduationCap size={16} />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Student loan plan"
                    value={labelOf([...STUDENT_LOAN_PLANS], tax.student_loan_plan)}
                    readOnly
                  />
                  <TextField
                    label="Postgraduate loan plan"
                    value={labelOf([...POSTGRADUATE_LOAN_PLANS], tax.postgraduate_loan_plan)}
                    readOnly
                  />
                  <TextField
                    label="Start Date"
                    type="date"
                    value={tax.student_loan_start_date ? toDateInput(String(tax.student_loan_start_date)) : ''}
                    readOnly
                  />
                  <TextField
                    label="Start Date"
                    type="date"
                    value={tax.postgraduate_loan_start_date ? toDateInput(String(tax.postgraduate_loan_start_date)) : ''}
                    readOnly
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={tax.student_loan_stop_date ? toDateInput(String(tax.student_loan_stop_date)) : ''}
                    readOnly
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={tax.postgraduate_loan_stop_date ? toDateInput(String(tax.postgraduate_loan_stop_date)) : ''}
                    readOnly
                  />
                </div>
              </Box>
              <ContactAdmin />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

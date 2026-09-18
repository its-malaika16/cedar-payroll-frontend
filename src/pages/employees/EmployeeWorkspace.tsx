import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Camera,
  ChevronDown,
  Clock,
  FileText,
  GraduationCap,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  Users,
} from 'lucide-react'
import { companiesApi, employeesApi, lookupsApi, payrollApi } from '../../api'
import { assetUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { formatDate, idOf, toDateInput } from '../../lib/format'
import type { Company, Employee, PayrollSchedule } from '../../types'
import { defaultPayScheduleValue } from '../settings/employerSettings'
import {
  CONTACT_TYPE_OPTIONS,
  CONTRACTED_HOURS_OPTIONS,
  COUNTRY_OPTIONS,
  DEFAULT_CONTRACTED_HOURS,
  EMPLOYEE_TABS,
  GENDER_OPTIONS,
  LEAVE_CALCULATION_METHODS,
  LEAVE_YEAR_STARTS,
  MIN_WAGE_PROFILES,
  NEW_PAY_SCHEDULES,
  NI_CATEGORIES,
  PAY_BASIS_OPTIONS,
  PAYROLL_ID_CHANGE_OPTIONS,
  POSTGRADUATE_LOAN_PLANS,
  STARTER_DECLARATIONS,
  STUDENT_LOAN_PLANS,
  TITLE_OPTIONS,
  type EmployeeTab,
} from './employeeOptions'

type Contact = { type: string; value: string }

type Draft = {
  title: string
  first_name: string
  middle_name: string
  last_name: string
  gender: string
  dob: string
  emails: Contact[]
  phones: Contact[]
  address_line_1: string
  address_line_2: string
  address_line_3: string
  address_line_4: string
  postcode: string
  country: string
  photo_url: string
  works_number: string
  departments: string[]
  working_days: string[]
  min_wage_profile: string
  typical_hours_per_week: string
  leave_year_starts: string
  leave_calculation_method: string
  annual_leave_days: string
  annual_leave_weeks: string
  carry_over_leave: boolean
  carry_over_days: string
  additional_leave: boolean
  additional_leave_days: string
  start_date: string
  starter_declaration: string
  previous_gross_taxable_pay: string
  previous_gross_tax: string
  overseas_secondment: boolean
  tupe_protected: boolean
  pre_transfer_start_date: string
  leave_date: string
  pay_schedule: string
  pay_basis_type: string
  period_rate: string
  annual_salary: string
  hourly_rate: string
  extra_hourly_rates: string[]
  daily_rate: string
  extra_daily_rates: string[]
  tax_code: string
  week1month1: boolean
  ni_number: string
  ni_category: string
  is_director: boolean
  secondary_nics_not_due: boolean
  student_loan_plan: string
  student_loan_start_date: string
  student_loan_stop_date: string
  postgraduate_loan_plan: string
  postgraduate_loan_start_date: string
  postgraduate_loan_stop_date: string
  payroll_id: string
  workplace_postcode: string
  payroll_id_change: string
  contracted_hours_per_week: string
  irregular_payment_pattern: boolean
  exclude_from_fps_if_zero: boolean
  payments_to_body: boolean
  trivial_commutation: boolean
  flexible_drawdown: boolean
  portal_access: boolean
}

const emptyDraft = (company?: Company | null, schedules: PayrollSchedule[] = []): Draft => {
  const defaults = company?.employer_defaults
  const workingDays =
    defaults?.working_days && defaults.working_days.length > 0
      ? defaults.working_days
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const country = String(company?.country ?? '')
  return {
  title: 'Mr',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: 'Male',
  dob: '',
  emails: [{ type: 'Work', value: '' }],
  phones: [{ type: 'Mobile', value: '' }],
  address_line_1: '',
  address_line_2: '',
  address_line_3: '',
  address_line_4: '',
  postcode: '',
  country: (COUNTRY_OPTIONS as readonly string[]).includes(country) ? country : 'United Kingdom',
  photo_url: '',
  works_number: '',
  departments: [],
  working_days: workingDays,
  min_wage_profile: defaults?.min_wage_profile || 'National Minimum/Living Wage',
  typical_hours_per_week: '',
  leave_year_starts: defaults?.leave_year_starts || '6 April',
  leave_calculation_method:
    defaults?.leave_calculation_method || 'Set number of annual leave days',
  annual_leave_days: String(defaults?.leave_entitlement_days ?? 28),
  annual_leave_weeks: String(defaults?.leave_entitlement_weeks ?? 5.6),
  carry_over_leave: Boolean(defaults?.carry_over_leave),
  carry_over_days: '0',
  additional_leave: false,
  additional_leave_days: '0',
  start_date: '',
  starter_declaration: '',
  previous_gross_taxable_pay: '0.00',
  previous_gross_tax: '0.00',
  overseas_secondment: false,
  tupe_protected: false,
  pre_transfer_start_date: '',
  leave_date: '',
  pay_schedule: defaultPayScheduleValue(defaults?.typical_pay_frequency, schedules),
  pay_basis_type: 'ANNUAL',
  period_rate: '',
  annual_salary: '',
  hourly_rate: '0.00',
  extra_hourly_rates: [],
  daily_rate: '0.00',
  extra_daily_rates: [],
  tax_code: '',
  week1month1: false,
  ni_number: '',
  ni_category: 'A',
  is_director: false,
  secondary_nics_not_due: false,
  student_loan_plan: 'NONE',
  student_loan_start_date: '',
  student_loan_stop_date: '',
  postgraduate_loan_plan: 'NONE',
  postgraduate_loan_start_date: '',
  postgraduate_loan_stop_date: '',
  payroll_id: '',
  workplace_postcode: String(company?.postcode ?? ''),
  payroll_id_change: 'AUTO',
  contracted_hours_per_week: DEFAULT_CONTRACTED_HOURS,
  irregular_payment_pattern: false,
  exclude_from_fps_if_zero: false,
  payments_to_body: false,
  trivial_commutation: false,
  flexible_drawdown: false,
  portal_access: false,
  }
}

export function EmployeeWorkspace() {
  const { employeeId } = useParams()
  const isNew = !employeeId
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const [tab, setTab] = useState<EmployeeTab>('Personal')

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested && (EMPLOYEE_TABS as readonly string[]).includes(requested)) {
      setTab(requested as EmployeeTab)
    }
  }, [searchParams, employeeId])

  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [docTitle, setDocTitle] = useState('Right to work')
  const [docType, setDocType] = useState('pdf')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [postcodeError, setPostcodeError] = useState<string | null>(null)
  const [postcodeChecking, setPostcodeChecking] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const postcodeRequest = useRef(0)

  const employeeQuery = useQuery({
    queryKey: ['employee', companyId, employeeId],
    queryFn: () => employeesApi.get(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const companyQuery = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companiesApi.get(companyId!),
    enabled: Boolean(companyId) && isNew,
  })
  const documentsQuery = useQuery({
    queryKey: ['employee-docs', companyId, employeeId],
    queryFn: () => employeesApi.documents(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })

  const employee = employeeQuery.data?.data as Employee | undefined
  const schedules = (schedulesQuery.data?.data ?? []) as PayrollSchedule[]
  const company = companyQuery.data?.data as Company | undefined
  const documents = (documentsQuery.data?.data as Record<string, unknown>[] | undefined) ?? []
  const assignedScheduleId = str(asRecord(employee?.employment_details).pay_schedule_id)

  useEffect(() => {
    if (isNew) {
      setDraft(emptyDraft(company, schedules))
      if (!searchParams.get('tab')) setTab('Personal')
      return
    }
    if (employee) {
      setDraft(draftFromEmployee(employee, schedules))
    }
  }, [employeeId, employeeQuery.dataUpdatedAt, isNew, companyQuery.dataUpdatedAt, schedulesQuery.dataUpdatedAt])

  const age = ageFromDob(draft.dob)
  const recommendedNi = recommendedNiCategory(draft.dob)
  const niNumberError =
    draft.ni_number.trim() && !isValidNiNumber(draft.ni_number)
      ? 'Enter a valid National Insurance number'
      : null
  const niCategoryError = !draft.dob
    ? 'Save the employee date of birth before setting an NI category'
    : recommendedNi && draft.ni_category !== recommendedNi
      ? `This category does not match the employee's age (${age}). Use ${niCategoryLabel(recommendedNi)}.`
      : null
  const photoPreview = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile)
    return assetUrl(draft.photo_url)
  }, [photoFile, draft.photo_url])

  const locked = isNew && tab !== 'Personal'

  useEffect(() => {
    const value = draft.postcode.trim()
    if (!value) {
      setPostcodeError(null)
      setPostcodeChecking(false)
      return
    }

    const requestId = ++postcodeRequest.current
    setPostcodeChecking(true)
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupsApi.validatePostcode(value, draft.country)
        if (requestId !== postcodeRequest.current) return
        if (!result.data.valid) {
          setPostcodeError('Enter a valid postcode')
          return
        }
        setPostcodeError(null)
        if (result.data.formatted && result.data.formatted !== value) {
          setDraft((current) => ({ ...current, postcode: result.data.formatted }))
        }
      } catch {
        if (requestId !== postcodeRequest.current) return
        setPostcodeError('Enter a valid postcode')
      } finally {
        if (requestId === postcodeRequest.current) setPostcodeChecking(false)
      }
    }, 450)

    return () => {
      window.clearTimeout(timer)
    }
  }, [draft.postcode, draft.country])

  const employeeName = `${draft.first_name} ${draft.last_name}`.trim() || 'this employee'

  useEffect(() => {
    if (!confirmingDelete) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) setConfirmingDelete(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmingDelete, saving])

  async function deleteEmployee() {
    if (!companyId || !employeeId) return
    try {
      setSaving(true)
      setError(null)
      await employeesApi.remove(companyId, employeeId)
      await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId] })
      navigate('/employees')
    } catch (err) {
      setConfirmingDelete(false)
      setError(err instanceof Error ? err.message : 'Could not delete this employee')
    } finally {
      setSaving(false)
    }
  }

  async function saveCurrentTab() {
    if (!companyId) throw new Error('Select a company first')
    if (locked) throw new Error('Save personal details before completing other tabs')

    if (tab === 'Personal') {
      const primaryEmail = draft.emails[0]
      const extraEmails = draft.emails.slice(1).filter((row) => row.value.trim())
      const primaryPhone = draft.phones[0]
      const extraPhones = draft.phones.slice(1).filter((row) => row.value.trim())
      if (!draft.first_name.trim() || !draft.last_name.trim() || !draft.dob || !primaryEmail?.value.trim()) {
        throw new Error('First name, last name, date of birth and email are required')
      }
      const invalidEmail = draft.emails.find(
        (row, index) => (index === 0 || row.value.trim()) && !isValidEmail(row.value),
      )
      if (invalidEmail) {
        throw new Error('Enter a valid email address')
      }
      let postcode = draft.postcode.trim()
      if (postcode) {
        const postcodeResult = await lookupsApi.validatePostcode(postcode, draft.country)
        if (!postcodeResult.data.valid) {
          setPostcodeError('Enter a valid postcode')
          throw new Error('Enter a valid postcode')
        }
        postcode = postcodeResult.data.formatted || postcode
        if (postcode !== draft.postcode) {
          setDraft((current) => ({ ...current, postcode }))
        }
      }
      const personalBody = {
        title: draft.title,
        first_name: draft.first_name,
        middle_name: draft.middle_name || undefined,
        last_name: draft.last_name,
        gender: draft.gender,
        dob: draft.dob,
        email: primaryEmail?.value ?? '',
        email_type: primaryEmail?.type ?? 'Work',
        extra_emails: extraEmails.map((row) => ({ type: row.type, address: row.value })),
        phone: primaryPhone?.value || undefined,
        phone_type: primaryPhone?.type ?? 'Mobile',
        extra_phones: extraPhones.map((row) => ({ type: row.type, number: row.value })),
        portal_access: draft.portal_access,
      }

      let savedId = employeeId
      if (isNew) {
        const created = await employeesApi.create(companyId, personalBody)
        savedId = idOf(created.data)
      } else {
        await employeesApi.update(companyId, employeeId, personalBody)
      }

      await employeesApi.updateAddress(companyId, savedId!, {
        address_line_1: draft.address_line_1,
        address_line_2: draft.address_line_2,
        address_line_3: draft.address_line_3,
        address_line_4: draft.address_line_4,
        postcode,
        country: draft.country,
      })

      if (photoFile) {
        const form = new FormData()
        form.append('file', photoFile)
        form.append('title', 'Employee photo')
        form.append('file_type', 'image')
        const uploaded = (await employeesApi.uploadDocument(companyId, savedId!, form)) as {
          data?: { file_path?: string }
        }
        const filePath = String(uploaded.data?.file_path ?? '')
        if (filePath) {
          await employeesApi.update(companyId, savedId!, { photo_url: filePath })
        }
        setPhotoFile(null)
      }

      await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
      if (isNew) {
        navigate(`/employees/${savedId}`)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['employee', companyId, employeeId] })
      return
    }

    if (!employeeId) throw new Error('Save personal details first')

    if (tab === 'Employment') {
      await employeesApi.update(companyId, employeeId, {
        employee_code: draft.works_number || undefined,
      })
      await employeesApi.updateEmployment(companyId, employeeId, {
        department: draft.departments.map((item) => item.trim()).filter(Boolean).join(', '),
        usual_working_days: draft.working_days.join(','),
        min_wage_profile: draft.min_wage_profile,
        typical_hours_per_week: toNumber(draft.typical_hours_per_week),
        leave_year_starts: draft.leave_year_starts,
        leave_calculation_method: draft.leave_calculation_method,
        annual_leave_entitlement: toNumber(draft.annual_leave_days),
        leave_entitlement_weeks: toNumber(draft.annual_leave_weeks),
        carry_over_leave: draft.carry_over_leave,
        carry_over_days: draft.carry_over_leave ? toNumber(draft.carry_over_days) : 0,
        additional_leave: draft.additional_leave,
        additional_leave_days: draft.additional_leave ? toNumber(draft.additional_leave_days) : 0,
      })
    }

    if (tab === 'Starter/Leaver') {
      const schedule = assignedScheduleId
        ? { id: assignedScheduleId, request: null as string | null }
        : parsePaySchedule(draft.pay_schedule)
      await employeesApi.updateStarterLeaver(companyId, employeeId, {
        start_date: draft.start_date || null,
        starter_declaration: draft.starter_declaration || null,
        previous_gross_taxable_pay: showsPreviousEmployment(draft.starter_declaration)
          ? toNumber(draft.previous_gross_taxable_pay)
          : null,
        previous_gross_tax: showsPreviousEmployment(draft.starter_declaration)
          ? toNumber(draft.previous_gross_tax)
          : null,
        overseas_secondment: draft.overseas_secondment,
        tupe_protected: draft.tupe_protected,
        pre_transfer_start_date: draft.pre_transfer_start_date || null,
        leave_date: draft.leave_date || null,
      })
      await employeesApi.updateEmployment(companyId, employeeId, {
        pay_schedule_id: schedule.id,
        pay_schedule_request: schedule.request,
        pay_basis_type: draft.pay_basis_type,
      })
    }

    if (tab === 'Payment') {
      const schedule = assignedScheduleId
        ? { id: assignedScheduleId, request: null as string | null }
        : parsePaySchedule(draft.pay_schedule)
      await employeesApi.updateEmployment(companyId, employeeId, {
        pay_schedule_id: schedule.id,
        pay_schedule_request: schedule.request,
        pay_basis_type: draft.pay_basis_type,
        period_rate: toNumber(draft.period_rate),
        annual_salary: toNumber(draft.annual_salary),
        basic_rate_per_hour: toNumber(draft.hourly_rate),
        daily_rate: toNumber(draft.daily_rate),
        extra_hourly_rates: draft.extra_hourly_rates
          .map((value) => Number(value))
          .filter((value) => !Number.isNaN(value)),
        extra_daily_rates: draft.extra_daily_rates
          .map((value) => Number(value))
          .filter((value) => !Number.isNaN(value)),
      })
    }

    if (tab === 'Tax, NICs, RTI') {
      if (niNumberError) {
        throw new Error(niNumberError)
      }
      if (niCategoryError) {
        throw new Error(niCategoryError)
      }
      const compactNiNumber = draft.ni_number.trim()
        ? draft.ni_number.replace(/\s+/g, '').toUpperCase()
        : undefined
      await employeesApi.updateTax(companyId, employeeId, {
        tax_code: draft.tax_code || undefined,
        week1month1: draft.week1month1,
        ni_number: compactNiNumber,
        ni_category: draft.ni_category || undefined,
        is_director: draft.is_director,
        secondary_nics_not_due: draft.secondary_nics_not_due,
        student_loan_plan: draft.student_loan_plan,
        student_loan_start_date:
          draft.student_loan_plan === 'NONE' ? null : draft.student_loan_start_date || null,
        student_loan_stop_date:
          draft.student_loan_plan === 'NONE' ? null : draft.student_loan_stop_date || null,
        postgraduate_loan_plan: draft.postgraduate_loan_plan,
        postgraduate_loan_start_date:
          draft.postgraduate_loan_plan === 'NONE'
            ? null
            : draft.postgraduate_loan_start_date || null,
        postgraduate_loan_stop_date:
          draft.postgraduate_loan_plan === 'NONE'
            ? null
            : draft.postgraduate_loan_stop_date || null,
        payroll_id: draft.payroll_id || undefined,
        workplace_postcode: draft.workplace_postcode || undefined,
        payroll_id_change: draft.payroll_id_change,
        contracted_hours_per_week:
          draft.contracted_hours_per_week || DEFAULT_CONTRACTED_HOURS,
        irregular_payment_pattern: draft.irregular_payment_pattern,
        exclude_from_fps_if_zero: draft.exclude_from_fps_if_zero,
        payments_to_body: draft.payments_to_body,
        trivial_commutation: draft.trivial_commutation,
        flexible_drawdown: draft.flexible_drawdown,
      })
    }

    await queryClient.invalidateQueries({ queryKey: ['employee', companyId, employeeId] })
    await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
    await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
    await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId] })
    await queryClient.invalidateQueries({ queryKey: ['payroll-record', companyId] })
  }

  async function uploadComplianceDocument() {
    if (!companyId || !employeeId || !docFile) return
    const form = new FormData()
    form.append('file', docFile)
    form.append('title', docTitle)
    form.append('file_type', docType)
    await employeesApi.uploadDocument(companyId, employeeId, form)
    setDocFile(null)
    await queryClient.invalidateQueries({ queryKey: ['employee-docs', companyId, employeeId] })
  }

  if (!isNew && employeeQuery.isLoading) return <Loading />

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-4 overflow-x-auto rounded-[10px] border border-[#d9d9d9] bg-white">
        <div className="flex min-w-max gap-8 px-6 pt-4">
          {EMPLOYEE_TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`relative pb-4 text-base font-medium ${
                tab === item ? 'text-navy' : 'text-muted'
              }`}
            >
              {item}
              {tab === item ? (
                <span className="absolute right-0 bottom-0 left-0 h-[5px] rounded-t bg-navy" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {message ? (
        <div className="mb-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}
      {locked ? (
        <div className="mb-4">
          <Alert tone="info">Save personal details first to unlock the remaining tabs.</Alert>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 pb-4">
        {tab === 'Personal' ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(260px,0.9fr)]">
            <Section title="Personal Information" icon={<User size={16} />} className="xl:col-span-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
                <Field label="Title">
                  <Select value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}>
                    {TITLE_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="First Name">
                  <Input
                    placeholder="First Name"
                    value={draft.first_name}
                    onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
                  />
                </Field>
                <Field label="Middle Name" hint="(Optional)">
                  <Input
                    placeholder="Middle Name"
                    value={draft.middle_name}
                    onChange={(e) => setDraft({ ...draft, middle_name: e.target.value })}
                  />
                </Field>
                <Field label="Last Name">
                  <Input
                    placeholder="Last Name"
                    value={draft.last_name}
                    onChange={(e) => setDraft({ ...draft, last_name: e.target.value })}
                  />
                </Field>
                <Field label="Gender">
                  <Select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>
                    <option value="">Select</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date of Birth">
                  <Input type="date" value={draft.dob} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
                </Field>
                <Field label="Age">
                  <Input value={age} readOnly className="bg-[#f8f7f4]" />
                </Field>
              </div>
            </Section>

            <div className="flex flex-col gap-4">
              <Section title="Email Address" icon={<Mail size={16} />}>
                {draft.emails.map((row, index) => {
                  const showFormatError = Boolean(row.value.trim()) && !isValidEmail(row.value)
                  return (
                    <ContactRow
                      key={`email-${index}`}
                      type={row.type}
                      value={row.value}
                      inputType="email"
                      placeholder="Enter Email Address"
                      error={showFormatError ? 'Enter a valid email address' : undefined}
                      onTypeChange={(value) => setDraft({ ...draft, emails: updateRow(draft.emails, index, { type: value }) })}
                      onValueChange={(value) => setDraft({ ...draft, emails: updateRow(draft.emails, index, { value }) })}
                    />
                  )
                })}
                <AddLink onClick={() => setDraft({ ...draft, emails: [...draft.emails, { type: 'Home', value: '' }] })}>
                  + Add Email Address
                </AddLink>
              </Section>

              <Section title="Phone Number" icon={<Phone size={16} />}>
                {draft.phones.map((row, index) => (
                  <ContactRow
                    key={`phone-${index}`}
                    type={row.type}
                    value={row.value}
                    placeholder="Enter Phone Number"
                    onTypeChange={(value) => setDraft({ ...draft, phones: updateRow(draft.phones, index, { type: value }) })}
                    onValueChange={(value) => setDraft({ ...draft, phones: updateRow(draft.phones, index, { value }) })}
                  />
                ))}
                <AddLink onClick={() => setDraft({ ...draft, phones: [...draft.phones, { type: 'Work', value: '' }] })}>
                  + Add Phone Number
                </AddLink>
              </Section>
            </div>

            <Section title="Address" icon={<MapPin size={16} />} className="xl:row-span-1">
              <div className="space-y-2.5">
                <Input
                  placeholder="Address Line 1"
                  value={draft.address_line_1}
                  onChange={(e) => setDraft({ ...draft, address_line_1: e.target.value })}
                />
                <Input
                  placeholder="Address Line 2"
                  value={draft.address_line_2}
                  onChange={(e) => setDraft({ ...draft, address_line_2: e.target.value })}
                />
                <Input
                  placeholder="Address Line 3"
                  value={draft.address_line_3}
                  onChange={(e) => setDraft({ ...draft, address_line_3: e.target.value })}
                />
                <Input
                  placeholder="Address Line 4"
                  value={draft.address_line_4}
                  onChange={(e) => setDraft({ ...draft, address_line_4: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Postcode">
                    <Input
                      placeholder="--"
                      value={draft.postcode}
                      className={postcodeError ? 'border-brand' : ''}
                      aria-invalid={Boolean(postcodeError)}
                      onChange={(e) => setDraft({ ...draft, postcode: e.target.value })}
                    />
                    {postcodeError ? (
                      <p className="mt-1 text-[11px] font-medium text-brand">{postcodeError}</p>
                    ) : postcodeChecking ? (
                      <p className="mt-1 text-[11px] text-muted">Checking postcode…</p>
                    ) : null}
                  </Field>
                  <Field label="Country">
                    <Select value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })}>
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </Section>

            <Section title="Photo" icon={<Camera size={16} />} className="xl:col-span-2">
              <label className="flex min-h-[76px] cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-dashed border-[#d9d9d9] px-4 py-3">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
                    <Camera size={22} />
                  </span>
                )}
                <span className="text-base font-medium text-navy">Upload photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </Section>
          </div>
        ) : null}

        {tab === 'Employment' ? (
          <div className="grid items-stretch gap-4 xl:grid-cols-2">
            <section className="flex h-full flex-col rounded-[10px] border border-[#d9d9d9] bg-white p-5">
              <CardHead icon={<User size={16} />} title="Identification" />
              <div className="max-w-[346px]">
                <Field label="Works Number">
                  <Input
                    placeholder="--"
                    value={draft.works_number}
                    onChange={(e) => setDraft({ ...draft, works_number: e.target.value })}
                  />
                </Field>
              </div>

              <div className="my-5 border-t border-[#d9d9d9]" />

              <CardHead icon={<Users size={16} />} title="Department(s)" />
              {draft.departments.map((department, index) => (
                <div key={`dept-${index}`} className="mb-3 max-w-[346px]">
                  <Input
                    value={department}
                    placeholder="Department name"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        departments: draft.departments.map((item, itemIndex) =>
                          itemIndex === index ? e.target.value : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <AddLink onClick={() => setDraft({ ...draft, departments: [...draft.departments, ''] })}>
                + Add department association
              </AddLink>

              <div className="my-5 border-t border-[#d9d9d9]" />

              <CardHead icon={<Clock size={16} />} title="Usual Working Days" />
              <div className="grid max-w-[280px] grid-flow-col grid-rows-4 gap-x-10 gap-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  (day) => (
                    <CheckRow
                      key={day}
                      label={day}
                      checked={draft.working_days.includes(day)}
                      onChange={(checked) => {
                        const working_days = checked
                          ? [...draft.working_days, day]
                          : draft.working_days.filter((item) => item !== day)
                        setDraft({
                          ...draft,
                          working_days,
                          annual_leave_weeks: draft.annual_leave_days
                            ? weeksFromDays(draft.annual_leave_days, working_days)
                            : draft.annual_leave_weeks,
                        })
                      }}
                    />
                  ),
                )}
              </div>
            </section>

            <Section title="Annual Leave" icon={<CalendarDays size={16} />} className="h-full">
              <div className="space-y-4">
                <div className="max-w-[351px] space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-navy">Leave year starts</p>
                    <OptionSelect
                      value={draft.leave_year_starts}
                      options={LEAVE_YEAR_STARTS}
                      onChange={(value) => setDraft({ ...draft, leave_year_starts: value })}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-navy">Annual Leave Calculation Method</p>
                    <OptionSelect
                      value={draft.leave_calculation_method}
                      options={LEAVE_CALCULATION_METHODS}
                      onChange={(value) => setDraft({ ...draft, leave_calculation_method: value })}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-navy">Annual Leave Entitlement</p>
                    <div className="flex gap-3">
                      <UnitInput
                        value={draft.annual_leave_days}
                        unit="days"
                        placeholder="--"
                        onChange={(value) =>
                          setDraft({
                            ...draft,
                            annual_leave_days: value,
                            annual_leave_weeks: weeksFromDays(value, draft.working_days),
                          })
                        }
                      />
                      <UnitInput
                        value={draft.annual_leave_weeks}
                        unit="weeks"
                        placeholder="--"
                        className="w-[171px]"
                        onChange={(value) =>
                          setDraft({
                            ...draft,
                            annual_leave_weeks: value,
                            annual_leave_days: daysFromWeeks(value, draft.working_days),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckRow
                    className="min-w-0 flex-1"
                    label="Carry on annual leave days from year ending"
                    checked={draft.carry_over_leave}
                    onChange={(checked) =>
                      setDraft({
                        ...draft,
                        carry_over_leave: checked,
                        carry_over_days: checked ? draft.carry_over_days || '0' : '0',
                      })
                    }
                  />
                  <UnitInput
                    compact
                    disabled={!draft.carry_over_leave}
                    value={draft.carry_over_leave ? draft.carry_over_days : '0'}
                    unit="days"
                    onChange={(value) => setDraft({ ...draft, carry_over_days: value })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <CheckRow
                    className="min-w-0 flex-1"
                    label="Include additional annual leave days:"
                    checked={draft.additional_leave}
                    onChange={(checked) =>
                      setDraft({
                        ...draft,
                        additional_leave: checked,
                        additional_leave_days: checked ? draft.additional_leave_days || '0' : '0',
                      })
                    }
                  />
                  <UnitInput
                    compact
                    disabled={!draft.additional_leave}
                    value={draft.additional_leave ? draft.additional_leave_days : '0'}
                    unit="days"
                    onChange={(value) => setDraft({ ...draft, additional_leave_days: value })}
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Minimum Wage"
              icon={<span className="text-lg font-semibold">£</span>}
              className="xl:col-span-2"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="max-w-[369px]">
                  <p className="mb-1.5 text-xs font-medium text-navy">Minimum wage profile</p>
                  <OptionSelect
                    value={draft.min_wage_profile}
                    options={MIN_WAGE_PROFILES}
                    onChange={(value) => setDraft({ ...draft, min_wage_profile: value })}
                  />
                </div>
                <div className="max-w-[384px]">
                  <Field label="Typical hours worked per week">
                    <Input
                      type="number"
                      value={draft.typical_hours_per_week}
                      onChange={(e) => setDraft({ ...draft, typical_hours_per_week: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </Section>
          </div>
        ) : null}

        {tab === 'Starter/Leaver' ? (
          <div className="grid gap-4">
            <Section title="Starter Details" icon={<User size={16} />}>
              <div className="max-w-[346px]">
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-5 grid max-w-[760px] grid-cols-1 items-start gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-navy">Payment Schedule</p>
                  <OptionSelect
                    value={draft.pay_schedule}
                    groups={payScheduleGroups(schedules)}
                    disabled={Boolean(assignedScheduleId)}
                    onChange={(value) => setDraft({ ...draft, pay_schedule: value })}
                  />
                  {assignedScheduleId ? (
                    <p className="mt-1.5 text-[11px] text-muted">
                      An employee can only be on one schedule.{' '}
                      <Link to="/payroll/switch-schedule" className="font-medium text-navy underline">
                        Switch Employee(s) Payment Schedule
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-navy">How is pay worked out?</p>
                    <OptionSelect
                      value={draft.pay_basis_type}
                      options={PAY_BASIS_OPTIONS}
                      onChange={(value) => setDraft({ ...draft, pay_basis_type: value })}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-navy">Starter declaration</p>
                    <OptionSelect
                      value={draft.starter_declaration}
                      options={STARTER_DECLARATIONS}
                      placeholder="Select"
                      onChange={(value) => setDraft({ ...draft, starter_declaration: value })}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <CheckRow
                  label="Tick if employee continues to be employed by an overseas employer (who has sent this individual to work for you)."
                  checked={draft.overseas_secondment}
                  onChange={(checked) => setDraft({ ...draft, overseas_secondment: checked })}
                />
              </div>
              {showsPreviousEmployment(draft.starter_declaration) ? (
                <div className="mt-6">
                  <p className="mb-4 text-base font-semibold text-navy">Previous Employment</p>
                  <div className="grid max-w-[720px] grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Gross taxable pay">
                      <CurrencyInput
                        value={draft.previous_gross_taxable_pay}
                        onChange={(value) =>
                          setDraft({ ...draft, previous_gross_taxable_pay: value })
                        }
                      />
                    </Field>
                    <Field label="Gross tax">
                      <CurrencyInput
                        value={draft.previous_gross_tax}
                        onChange={(value) => setDraft({ ...draft, previous_gross_tax: value })}
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
            </Section>

            <div className="grid items-stretch gap-4 xl:grid-cols-2">
              <Section title="TUPE" icon={<Shield size={16} />} className="h-full">
                <CheckRow
                  label="Employee is protected under the Transfer of Undertakings (Protection of Employment) Regulations"
                  checked={draft.tupe_protected}
                  onChange={(checked) => setDraft({ ...draft, tupe_protected: checked })}
                />
                <div className="mt-5 max-w-[346px]">
                  <Field label="Pre-transfer Start Date">
                    <Input
                      type="date"
                      value={draft.pre_transfer_start_date}
                      onChange={(e) => setDraft({ ...draft, pre_transfer_start_date: e.target.value })}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Leaver Details" icon={<LogOut size={16} />} className="h-full">
                <div className="max-w-[346px]">
                  <Field label="Leave Date">
                    <Input
                      type="date"
                      value={draft.leave_date}
                      onChange={(e) => setDraft({ ...draft, leave_date: e.target.value })}
                    />
                  </Field>
                </div>
              </Section>
            </div>
          </div>
        ) : null}

        {tab === 'Payment' ? (
          <div className="grid gap-4">
            <Section title="Payment Schedule" icon={<span className="text-lg font-semibold">£</span>}>
              <div className="grid max-w-[760px] grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-navy">Payment Schedule</p>
                  <OptionSelect
                    value={draft.pay_schedule}
                    groups={payScheduleGroups(schedules)}
                    disabled={Boolean(assignedScheduleId)}
                    onChange={(value) => setDraft({ ...draft, pay_schedule: value })}
                  />
                  {assignedScheduleId ? (
                    <p className="mt-1.5 text-[11px] text-muted">
                      An employee can only be on one schedule.{' '}
                      <Link to="/payroll/switch-schedule" className="font-medium text-navy underline">
                        Switch Employee(s) Payment Schedule
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-navy">How is pay worked out?</p>
                  <OptionSelect
                    value={draft.pay_basis_type}
                    options={PAY_BASIS_OPTIONS}
                    onChange={(value) => setDraft({ ...draft, pay_basis_type: value })}
                  />
                </div>
                <Field label="Period rate">
                  <CurrencyInput
                    value={draft.period_rate}
                    onChange={(value) => setDraft({ ...draft, period_rate: value })}
                  />
                </Field>
                <Field label="Annual salary">
                  <CurrencyInput
                    value={draft.annual_salary}
                    onChange={(value) => setDraft({ ...draft, annual_salary: value })}
                  />
                </Field>
              </div>
            </Section>

            <section className="grid overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white xl:grid-cols-2">
              <div className="p-5">
                <CardHead icon={<Clock size={16} />} title="Hourly Rates" />
                <div className="max-w-[320px]">
                  <Field label="Standard hourly rate">
                    <CurrencyInput
                      suffix="per hour"
                      value={draft.hourly_rate}
                      onChange={(value) => setDraft({ ...draft, hourly_rate: value })}
                    />
                  </Field>
                </div>
                {draft.extra_hourly_rates.map((rate, index) => (
                  <div key={`hourly-${index}`} className="mt-3 max-w-[320px]">
                    <CurrencyInput
                      suffix="per hour"
                      value={rate}
                      onChange={(value) =>
                        setDraft({
                          ...draft,
                          extra_hourly_rates: draft.extra_hourly_rates.map((item, itemIndex) =>
                            itemIndex === index ? value : item,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <div className="mt-4">
                  <AddLink
                    onClick={() =>
                      setDraft({ ...draft, extra_hourly_rates: [...draft.extra_hourly_rates, '0.00'] })
                    }
                  >
                    + Add hourly rate
                  </AddLink>
                </div>
              </div>

              <div className="border-t border-[#d9d9d9] p-5 xl:border-t-0 xl:border-l">
                <CardHead icon={<CalendarDays size={16} />} title="Daily Rates" />
                <div className="max-w-[320px]">
                  <Field label="Standard daily rate">
                    <CurrencyInput
                      suffix="per day"
                      value={draft.daily_rate}
                      onChange={(value) => setDraft({ ...draft, daily_rate: value })}
                    />
                  </Field>
                </div>
                {draft.extra_daily_rates.map((rate, index) => (
                  <div key={`daily-${index}`} className="mt-3 max-w-[320px]">
                    <CurrencyInput
                      suffix="per day"
                      value={rate}
                      onChange={(value) =>
                        setDraft({
                          ...draft,
                          extra_daily_rates: draft.extra_daily_rates.map((item, itemIndex) =>
                            itemIndex === index ? value : item,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <div className="mt-4">
                  <AddLink
                    onClick={() =>
                      setDraft({ ...draft, extra_daily_rates: [...draft.extra_daily_rates, '0.00'] })
                    }
                  >
                    + Add daily rate
                  </AddLink>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'Tax, NICs, RTI' ? (
          <div className="grid gap-4">
            <section className="relative z-10 grid overflow-visible rounded-[10px] border border-[#d9d9d9] bg-white xl:grid-cols-2">
              <div className="p-5">
                <CardHead icon={<FileText size={16} />} title="TAX" />
                <div className="max-w-[280px]">
                  <Field label="Tax code">
                    <Input
                      value={draft.tax_code}
                      onChange={(e) => setDraft({ ...draft, tax_code: e.target.value })}
                    />
                  </Field>
                </div>
                <p className="mt-2 max-w-[460px] text-[11px] leading-4 text-[#607080]">
                  If this person already has finalised payslips this tax year, the new code applies from the next unfinalised period. Tax already paid on earlier payslips is kept and used in the cumulative calculation.
                </p>
                <div className="mt-4">
                  <CheckRow
                    label="Week 1 / Month 1 basis"
                    checked={draft.week1month1}
                    onChange={(checked) => setDraft({ ...draft, week1month1: checked })}
                  />
                </div>
              </div>

              <div className="border-t border-[#d9d9d9] p-5 xl:border-t-0 xl:border-l">
                <CardHead icon={<Shield size={16} />} title="National Insurance" />
                <div className="max-w-[280px]">
                  <Field label="National Insurance Number">
                    <Input
                      value={draft.ni_number}
                      aria-invalid={Boolean(niNumberError)}
                      className={niNumberError ? 'border-brand' : ''}
                      onChange={(e) => setDraft({ ...draft, ni_number: e.target.value })}
                    />
                    {niNumberError ? (
                      <p className="mt-1 text-[11px] font-medium text-brand">{niNumberError}</p>
                    ) : null}
                  </Field>
                </div>
                <div className="relative z-20 mt-4 max-w-[280px]">
                  <p className="mb-1.5 text-xs font-medium text-navy">Category</p>
                  <OptionSelect
                    value={draft.ni_category}
                    options={NI_CATEGORIES}
                    onChange={(value) => setDraft({ ...draft, ni_category: value })}
                  />
                  {niCategoryError ? (
                    <p className="mt-1 text-[11px] font-medium text-brand">{niCategoryError}</p>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  <CheckRow
                    label="Employee is/was a director during the tax year"
                    checked={draft.is_director}
                    onChange={(checked) => setDraft({ ...draft, is_director: checked })}
                  />
                  <CheckRow
                    label="Secondary Class 1 NICs are not due for this employee"
                    checked={draft.secondary_nics_not_due}
                    onChange={(checked) => setDraft({ ...draft, secondary_nics_not_due: checked })}
                  />
                </div>
              </div>
            </section>

            <Section title="Student & Postgraduate Loan" icon={<GraduationCap size={16} />}>
              <div className="max-w-[760px] space-y-5">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-navy">Student loan plan</p>
                  <OptionSelect
                    value={draft.student_loan_plan}
                    options={STUDENT_LOAN_PLANS}
                    onChange={(value) =>
                      setDraft({
                        ...draft,
                        student_loan_plan: value,
                        ...(value === 'NONE'
                          ? { student_loan_start_date: '', student_loan_stop_date: '' }
                          : {}),
                      })
                    }
                  />
                </div>
                {draft.student_loan_plan !== 'NONE' ? (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <Field label="Student loan start date">
                      <Input
                        type="date"
                        value={draft.student_loan_start_date}
                        onChange={(e) =>
                          setDraft({ ...draft, student_loan_start_date: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Student loan stop date">
                      <Input
                        type="date"
                        value={draft.student_loan_stop_date}
                        onChange={(e) =>
                          setDraft({ ...draft, student_loan_stop_date: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                ) : null}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-navy">Postgraduate loan plan</p>
                  <OptionSelect
                    value={draft.postgraduate_loan_plan}
                    options={POSTGRADUATE_LOAN_PLANS}
                    onChange={(value) =>
                      setDraft({
                        ...draft,
                        postgraduate_loan_plan: value,
                        ...(value === 'NONE'
                          ? { postgraduate_loan_start_date: '', postgraduate_loan_stop_date: '' }
                          : {}),
                      })
                    }
                  />
                </div>
                {draft.postgraduate_loan_plan !== 'NONE' ? (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <Field label="Postgraduate loan start date">
                      <Input
                        type="date"
                        value={draft.postgraduate_loan_start_date}
                        onChange={(e) =>
                          setDraft({ ...draft, postgraduate_loan_start_date: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Postgraduate loan stop date">
                      <Input
                        type="date"
                        value={draft.postgraduate_loan_stop_date}
                        onChange={(e) =>
                          setDraft({ ...draft, postgraduate_loan_stop_date: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </Section>

            <Section title="FPS Declarations" icon={<FileText size={16} />}>
              <div className="grid items-start gap-x-8 gap-y-4 xl:grid-cols-2">
                <div className="space-y-4">
                  <div className="max-w-[320px]">
                    <Field label="Payroll ID" hint="generated automatically for FPS">
                      <Input value={draft.payroll_id} readOnly className="bg-[#f8f7f4] tracking-widest" />
                    </Field>
                  </div>
                  <div className="max-w-[320px]">
                    <p className="mb-1.5 text-xs font-medium text-navy">Change of Payroll ID</p>
                    <OptionSelect
                      value={draft.payroll_id_change}
                      options={PAYROLL_ID_CHANGE_OPTIONS}
                      onChange={(value) => setDraft({ ...draft, payroll_id_change: value })}
                    />
                  </div>
                  <CheckRow
                    label="Do not include employee on FPS if zero pay"
                    checked={draft.exclude_from_fps_if_zero}
                    onChange={(checked) => setDraft({ ...draft, exclude_from_fps_if_zero: checked })}
                  />
                  <div className="max-w-[420px]">
                    <Field label="Contracted hours per week">
                      <OptionSelect
                        value={draft.contracted_hours_per_week}
                        options={CONTRACTED_HOURS_OPTIONS}
                        onChange={(value) => setDraft({ ...draft, contracted_hours_per_week: value })}
                      />
                    </Field>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="max-w-[320px]">
                    <Field label="Workplace postcode">
                      <Input
                        placeholder="Select"
                        value={draft.workplace_postcode}
                        onChange={(e) => setDraft({ ...draft, workplace_postcode: e.target.value })}
                      />
                    </Field>
                  </div>
                  <CheckRow
                    label="Employee is currently on an irregular payment pattern"
                    checked={draft.irregular_payment_pattern}
                    onChange={(checked) => setDraft({ ...draft, irregular_payment_pattern: checked })}
                  />
                  <CheckRow
                    label="Employee's payments are being made to a body (e.g. a personal representative, trustee or corporate organisation)"
                    checked={draft.payments_to_body}
                    onChange={(checked) => setDraft({ ...draft, payments_to_body: checked })}
                  />
                  <CheckRow
                    label="Include trivial commutation payment declaration"
                    checked={draft.trivial_commutation}
                    onChange={(checked) => setDraft({ ...draft, trivial_commutation: checked })}
                  />
                  <CheckRow
                    label="Include flexible drawdown payment declaration"
                    checked={draft.flexible_drawdown}
                    onChange={(checked) => setDraft({ ...draft, flexible_drawdown: checked })}
                  />
                </div>
              </div>
            </Section>
          </div>
        ) : null}

        {tab === 'Compliance' ? (
          <Section title="Compliance documents">
            {isNew ? (
              <p className="text-sm text-muted">Save the employee first, then upload documents.</p>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,230px))] gap-4">
                  <Field label="Title">
                    <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
                  </Field>
                  <Field label="Type">
                    <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                      <option value="pdf">pdf</option>
                      <option value="doc">doc</option>
                      <option value="image">image</option>
                      <option value="other">other</option>
                    </Select>
                  </Field>
                  <Field label="File">
                    <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
                  </Field>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        setError(null)
                        await uploadComplianceDocument()
                        setMessage('Document uploaded')
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Upload failed')
                      }
                    }}
                  >
                    Upload
                  </Button>
                </div>
                <div className="mt-6 divide-y divide-[#eee]">
                  {documents.length === 0 ? (
                    <p className="py-4 text-sm text-muted">No documents uploaded yet.</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={idOf(doc)} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-navy">{String(doc.title ?? 'Document')}</p>
                          <p className="text-sm text-muted">{formatDate(String(doc.uploaded_at ?? ''))}</p>
                        </div>
                        <span className="text-xs font-semibold uppercase text-muted">
                          {String(doc.file_type ?? '')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </Section>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {!isNew ? (
          <Button
            variant="danger"
            type="button"
            className="mr-auto h-10 min-w-[105px] text-xs"
            disabled={saving}
            onClick={() => {
              setError(null)
              setMessage(null)
              setConfirmingDelete(true)
            }}
          >
            Delete
          </Button>
        ) : null}
        <Button
          variant="secondary"
          type="button"
          className="h-10 w-[105px] text-xs"
          onClick={() => navigate('/employees')}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="h-10 w-[105px] text-xs"
          disabled={saving || locked}
          onClick={async () => {
            try {
              setSaving(true)
              setError(null)
              await saveCurrentTab()
              setMessage('Saved')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Save failed')
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {confirmingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => {
                if (!saving) setConfirmingDelete(false)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-employee-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-employee-title" className="text-lg font-semibold text-navy">
                  Delete {employeeName}?
                </h3>
                <p className="mt-2 text-sm text-muted">
                  This cannot be undone. Their payroll records and payslips will also be deleted.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={saving}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep employee
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={saving}
                    onClick={() => void deleteEmployee()}
                  >
                    {saving ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-navy">
        {label}
        {hint ? <span className="ml-1 text-[8px] font-normal italic">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

function compactClass(extra = '') {
  return `h-[35px] w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] bg-white px-3 text-xs text-navy outline-none placeholder:text-[#999] ${extra}`
}

function isValidEmail(value: string) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim())
}

function isValidNiNumber(value: string) {
  const compact = value.replace(/\s+/g, '').toUpperCase()
  return /^(?!BG|GB|KN|NK|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(compact)
}

function recommendedNiCategory(dob: string): 'A' | 'C' | 'M' | 'X' | null {
  const ageText = ageFromDob(dob)
  if (!ageText) return null
  const years = Number(ageText)
  if (Number.isNaN(years)) return null
  if (years < 16) return 'X'
  if (years < 21) return 'M'
  if (years >= 66) return 'C'
  return 'A'
}

function niCategoryLabel(value: string) {
  return NI_CATEGORIES.find((item) => item.value === value)?.label ?? value
}

function visibleWorksNumber(code?: string | null) {
  const value = (code ?? '').trim()
  if (!value) return ''
  if (/^EMP-\d{8}-\d{4}$/.test(value) || /^EMP-\d+$/.test(value)) return ''
  return value
}

function workingDayCount(days: string[]) {
  return days.length || 5
}

function formatLeaveAmount(value: number) {
  if (!Number.isFinite(value)) return ''
  return String(Math.round(value * 100) / 100)
}

function weeksFromDays(days: string, workingDays: string[]) {
  const amount = Number(days)
  if (days.trim() === '' || Number.isNaN(amount)) return ''
  return formatLeaveAmount(amount / workingDayCount(workingDays))
}

function daysFromWeeks(weeks: string, workingDays: string[]) {
  const amount = Number(weeks)
  if (weeks.trim() === '' || Number.isNaN(amount)) return ''
  return formatLeaveAmount(amount * workingDayCount(workingDays))
}

function showsPreviousEmployment(declaration: string) {
  return declaration === 'B' || declaration === 'C'
}

function normalizeMinWage(value: string) {
  if (value.toLowerCase() === 'national minimum wage (apprentice)') {
    return 'National Minimum Wage (Apprentice)'
  }
  return value || 'National Minimum/Living Wage'
}

function normalizeStudentLoan(value: string) {
  if (value === 'PLAN_8') return 'PLAN_5'
  if (!value || value === 'NONE' || value === 'NO') return 'NONE'
  return value
}

function normalizePostgraduateLoan(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/g, '_')
  if (!compact || compact === 'NONE' || compact === 'NO' || compact === 'N') return 'NONE'
  if (
    compact === 'PGL' ||
    compact === 'POSTGRADUATE' ||
    compact === 'POSTGRADUATE_LOAN' ||
    compact === 'YES' ||
    compact === 'TRUE'
  ) {
    return 'PGL'
  }
  return 'NONE'
}

type SelectOption = { value: string; label: string }
type SelectGroup = { label: string; options: readonly SelectOption[] }

function asSelectOptions(options: readonly (string | SelectOption)[]): SelectOption[] {
  return options.map((item) => (typeof item === 'string' ? { value: item, label: item } : item))
}

function payFrequencyLabel(frequency?: string | null) {
  const value = (frequency ?? '').toUpperCase()
  if (value === 'WEEKLY') return 'Weekly pay schedule'
  if (value === 'FORTNIGHTLY') return 'Fortnightly pay schedule'
  if (value === 'FOUR_WEEKLY') return '4-weekly pay schedule'
  if (value === 'MONTHLY') return 'Monthly pay schedule'
  if (value === 'QUARTERLY') return 'Quarterly pay schedule'
  if (value === 'YEARLY') return 'Yearly pay schedule'
  return ''
}

function existingScheduleLabel(schedule: PayrollSchedule, all: PayrollSchedule[]) {
  const label = payFrequencyLabel(schedule.pay_frequency)
  if (!label) return schedule.schedule_name
  const duplicates = all.filter((item) => item.pay_frequency === schedule.pay_frequency).length > 1
  return duplicates ? `${label} — ${schedule.schedule_name}` : label
}

function payScheduleGroups(schedules: PayrollSchedule[]): SelectGroup[] {
  return [
    {
      label: 'Existing Schedule',
      options: schedules.map((schedule) => ({
        value: `id:${idOf(schedule)}`,
        label: existingScheduleLabel(schedule, schedules),
      })),
    },
    {
      label: 'New Schedule',
      options: NEW_PAY_SCHEDULES.map((option) => ({
        value: `new:${option.value}`,
        label: option.label,
      })),
    },
  ]
}

function OptionSelect({
  value,
  options,
  groups,
  onChange,
  placeholder = 'Select',
  disabled = false,
}: {
  value: string
  options?: readonly (string | SelectOption)[]
  groups?: readonly SelectGroup[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const visibleGroups = (groups ?? []).filter((group) => group.options.length > 0)
  const flat = visibleGroups.length
    ? visibleGroups.flatMap((group) => group.options)
    : asSelectOptions(options ?? [])
  const selectedLabel = flat.find((item) => item.value === value)?.label ?? placeholder

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  function itemClass(selected: boolean) {
    return selected
      ? 'bg-navy text-white'
      : 'text-navy hover:bg-navy hover:text-white'
  }

  return (
    <div className={`relative ${open ? 'z-50' : ''}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        className={compactClass(
          `flex items-center justify-between gap-2 pr-2 text-left ${disabled ? 'cursor-not-allowed bg-[#f8f7f4] text-navy/70' : ''}`,
        )}
        onClick={() => {
          if (!disabled) setOpen((current) => !current)
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={16} className="shrink-0 text-navy" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 max-h-[280px] w-full overflow-y-auto rounded-[6px] border-[0.5px] border-[#d9d9d9] bg-white py-1 shadow-sm">
          {visibleGroups.length
            ? visibleGroups.map((group, index) => (
                <div key={group.label}>
                  {index > 0 ? <div className="my-1 border-t border-[#d9d9d9]" /> : null}
                  <p className="px-3 py-1.5 text-[11px] font-semibold text-[#607080]">{group.label}</p>
                  {group.options.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`block w-full px-5 py-2.5 text-left text-xs font-medium leading-snug ${itemClass(item.value === value)}`}
                      onClick={() => {
                        onChange(item.value)
                        setOpen(false)
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))
            : asSelectOptions(options ?? []).map((item, index, list) => (
                <button
                  key={item.value}
                  type="button"
                  className={`block w-full px-3 py-2.5 text-left text-xs font-medium leading-snug ${itemClass(item.value === value)} ${
                    index < list.length - 1 ? 'border-b border-[#d9d9d9]' : ''
                  }`}
                  onClick={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                >
                  {item.label}
                </button>
              ))}
        </div>
      ) : null}
    </div>
  )
}

function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={compactClass(className)} {...props} />
}

function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={compactClass(className)} {...props} />
}

function ContactRow({
  type,
  value,
  inputType = 'text',
  placeholder,
  error,
  onTypeChange,
  onValueChange,
}: {
  type: string
  value: string
  inputType?: string
  placeholder?: string
  error?: string
  onTypeChange: (value: string) => void
  onValueChange: (value: string) => void
}) {
  return (
    <div className="mb-3 flex gap-3">
      <div className="w-[140px] shrink-0">
        <Select value={type} onChange={(event) => onTypeChange(event.target.value)}>
          {CONTACT_TYPE_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </div>
      <div className="min-w-0 max-w-[260px] flex-1">
        <Input
          type={inputType}
          placeholder={placeholder}
          value={value}
          aria-invalid={Boolean(error)}
          className={error ? 'border-brand' : ''}
          onChange={(event) => onValueChange(event.target.value)}
        />
        {error ? <p className="mt-1 text-[11px] font-medium text-brand">{error}</p> : null}
      </div>
    </div>
  )
}

function CardHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-navy">
      <span className="flex size-[42px] items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
        {icon}
      </span>
      {title}
    </h3>
  )
}

function UnitInput({
  value,
  unit,
  onChange,
  compact = false,
  placeholder,
  className = '',
  disabled = false,
}: {
  value: string
  unit: string
  onChange: (value: string) => void
  compact?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <div className={`flex shrink-0 ${className || (compact ? 'w-[135px]' : 'w-[166px]')}`}>
      <input
        type="number"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={compactClass(
          `rounded-r-none ${compact ? '!h-[27px]' : ''} ${disabled ? 'bg-[#f8f7f4] text-muted' : ''}`,
        )}
      />
      <span
        className={`flex items-center rounded-r-[6px] border-[0.5px] border-l-0 border-[#d9d9d9] bg-[#f8f7f4] px-2 text-xs text-navy ${
          compact ? 'h-[27px]' : 'h-[35px]'
        }`}
      >
        {unit}
      </span>
    </div>
  )
}

function Section({
  title,
  icon,
  className = '',
  children,
}: {
  title: string
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`rounded-[10px] border border-[#d9d9d9] bg-white p-5 ${className}`}>
      <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-navy">
        {icon ? (
          <span className="flex size-[42px] items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
            {icon}
          </span>
        ) : null}
        {title}
      </h3>
      {children}
    </section>
  )
}

function AddLink({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-semibold text-[#3276ca]">
      {children}
    </button>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
  className = '',
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <label className={`flex items-start gap-2 text-sm text-navy ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-3 shrink-0 accent-navy"
      />
      <span>{label}</span>
    </label>
  )
}

function CurrencyInput({
  value,
  onChange,
  suffix,
}: {
  value: string
  onChange: (value: string) => void
  suffix?: string
}) {
  return (
    <div className="flex w-full">
      <label
        className={`flex h-[35px] min-w-0 flex-1 items-center border-[0.5px] border-[#d9d9d9] bg-white px-3 ${
          suffix ? 'rounded-l-[6px]' : 'rounded-[6px]'
        }`}
      >
        <span className="pr-2 text-xs text-muted">£</span>
        <input
          className="w-full border-0 bg-transparent text-xs text-navy outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {suffix ? (
        <span className="flex h-[35px] shrink-0 items-center rounded-r-[6px] border-[0.5px] border-l-0 border-[#d9d9d9] bg-[#f8f7f4] px-3 text-xs text-navy">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? {}
  return (value as Record<string, unknown>) ?? {}
}

function str(value: unknown) {
  return value == null ? '' : String(value)
}

function asJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

function contactsFrom(
  type: string | null | undefined,
  primary: string | null | undefined,
  extras: unknown,
  extraKey: 'address' | 'number',
): Contact[] {
  const extraRows = asJsonArray<Record<string, string>>(extras).map((row) => ({
    type: row.type || 'Work',
    value: row[extraKey] || row.value || '',
  }))
  return [{ type: type || 'Work', value: primary || '' }, ...extraRows]
}

function draftFromEmployee(employee: Employee, schedules: PayrollSchedule[]): Draft {
  const address = asRecord(employee.employee_addresses)
  const employment = asRecord(employee.employment_details)
  const starter = asRecord(employee.starters_leavers)
  const tax = asRecord(employee.employee_tax_details)
  const workingDays = str(employment.usual_working_days)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const departments = str(employment.department)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const scheduleId = str(employment.pay_schedule_id)
  const scheduleRequest = str(employment.pay_schedule_request)
  const paySchedule = scheduleId
    ? `id:${scheduleId}`
    : scheduleRequest
      ? `new:${scheduleRequest}`
      : schedules[0]
        ? `id:${idOf(schedules[0])}`
        : ''
  const starterDeclaration = str(starter.starter_declaration)

  return {
    ...emptyDraft(),
    title: employee.title || 'Mr',
    first_name: employee.first_name || '',
    middle_name: employee.middle_name || '',
    last_name: employee.last_name || '',
    gender: employee.gender || 'Male',
    dob: toDateInput(employee.dob),
    emails: contactsFrom(employee.email_type, employee.email, employee.extra_emails, 'address'),
    phones: contactsFrom(employee.phone_type || 'Mobile', employee.phone, employee.extra_phones, 'number'),
    address_line_1: str(address.address_line_1),
    address_line_2: str(address.address_line_2),
    address_line_3: str(address.address_line_3),
    address_line_4: str(address.address_line_4),
    postcode: str(address.postcode),
    country: str(address.country) || 'United Kingdom',
    photo_url: employee.photo_url || '',
    works_number: visibleWorksNumber(employee.employee_code),
    departments: departments.length ? departments : [],
    working_days: workingDays.length
      ? workingDays
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    min_wage_profile: normalizeMinWage(str(employment.min_wage_profile)),
    typical_hours_per_week: str(employment.typical_hours_per_week),
    leave_year_starts: str(employment.leave_year_starts) || '6 April',
    leave_calculation_method:
      str(employment.leave_calculation_method) || 'Set number of annual leave days',
    annual_leave_days: str(employment.annual_leave_entitlement) || '28',
    annual_leave_weeks:
      str(employment.leave_entitlement_weeks) ||
      weeksFromDays(
        str(employment.annual_leave_entitlement) || '28',
        workingDays.length
          ? workingDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      ),
    carry_over_leave: Boolean(employment.carry_over_leave),
    carry_over_days: Boolean(employment.carry_over_leave)
      ? str(employment.carry_over_days) || '0'
      : '0',
    additional_leave: Boolean(employment.additional_leave),
    additional_leave_days: Boolean(employment.additional_leave)
      ? str(employment.additional_leave_days) || '0'
      : '0',
    start_date: toDateInput(str(starter.start_date) || null),
    starter_declaration: starterDeclaration === 'null' ? '' : starterDeclaration,
    previous_gross_taxable_pay: str(starter.previous_gross_taxable_pay) || '0.00',
    previous_gross_tax: str(starter.previous_gross_tax) || '0.00',
    overseas_secondment: Boolean(starter.overseas_secondment),
    tupe_protected: Boolean(starter.tupe_protected),
    pre_transfer_start_date: toDateInput(str(starter.pre_transfer_start_date) || null),
    leave_date: toDateInput(str(starter.leave_date) || null),
    pay_schedule: paySchedule,
    pay_basis_type: str(employment.pay_basis_type) || 'ANNUAL',
    period_rate: str(employment.period_rate),
    annual_salary: str(employment.annual_salary),
    hourly_rate: str(employment.basic_rate_per_hour) || '0.00',
    extra_hourly_rates: asJsonArray<number>(employment.extra_hourly_rates).map(String),
    daily_rate: str(employment.daily_rate) || '0.00',
    extra_daily_rates: asJsonArray<number>(employment.extra_daily_rates).map(String),
    tax_code: str(tax.tax_code),
    week1month1: Boolean(tax.week1month1),
    ni_number: str(tax.ni_number),
    ni_category: allowedNiCategory(str(tax.ni_category), toDateInput(str(employee.dob) || null)),
    is_director: Boolean(tax.is_director),
    secondary_nics_not_due: Boolean(tax.secondary_nics_not_due),
    student_loan_plan: normalizeStudentLoan(str(tax.student_loan_plan)),
    student_loan_start_date: toDateInput(str(tax.student_loan_start_date) || null),
    student_loan_stop_date: toDateInput(str(tax.student_loan_stop_date) || null),
    postgraduate_loan_plan: normalizePostgraduateLoan(str(tax.postgraduate_loan_plan)),
    postgraduate_loan_start_date: toDateInput(str(tax.postgraduate_loan_start_date) || null),
    postgraduate_loan_stop_date: toDateInput(str(tax.postgraduate_loan_stop_date) || null),
    payroll_id: str(tax.payroll_id),
    workplace_postcode: str(tax.workplace_postcode),
    payroll_id_change: str(tax.payroll_id_change) || 'AUTO',
    contracted_hours_per_week: normalizeContractedHours(str(tax.contracted_hours_per_week)),
    irregular_payment_pattern: Boolean(tax.irregular_payment_pattern),
    exclude_from_fps_if_zero: Boolean(tax.exclude_from_fps_if_zero),
    payments_to_body: Boolean(tax.payments_to_body),
    trivial_commutation: Boolean(tax.trivial_commutation),
    flexible_drawdown: Boolean(tax.flexible_drawdown),
    portal_access: Boolean(employee.portal_access),
  }
}

function updateRow(rows: Contact[], index: number, patch: Partial<Contact>) {
  return rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
}

function ageFromDob(dob: string) {
  if (!dob) return ''
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1
  return String(age)
}

function allowedNiCategory(stored: string, dob: string) {
  const value = stored.trim().toUpperCase()
  if (NI_CATEGORIES.some((item) => item.value === value)) return value
  return recommendedNiCategory(dob) ?? 'A'
}

function normalizeContractedHours(stored: string) {
  const value = stored.trim()
  if (CONTRACTED_HOURS_OPTIONS.some((item) => item.value === value)) return value
  const hours = Number(value)
  if (value && !Number.isNaN(hours)) {
    if (hours < 16) return 'LT16'
    if (hours < 24) return '16_24'
    if (hours < 30) return '24_30'
    return '30_PLUS'
  }
  return DEFAULT_CONTRACTED_HOURS
}

function toNumber(value: string) {
  if (!value.trim()) return undefined
  const amount = Number(value)
  return Number.isNaN(amount) ? undefined : amount
}

function parsePaySchedule(value: string) {
  if (value.startsWith('id:')) {
    return { id: value.slice(3), request: null as string | null }
  }
  if (value.startsWith('new:')) {
    return { id: null as string | null, request: value.slice(4) }
  }
  return { id: null as string | null, request: null as string | null }
}

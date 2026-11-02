import type { FormEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  Clock,
  FileText,
  Layers,
  MapPin,
  Mail,
  Phone,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { lookupsApi } from '../../api'
import { Alert, Button, Card } from '../../components/ui'
import { idOf, labelize } from '../../lib/format'
import { joinPaye, splitPaye } from '../settings/employerSettings'
import type { Company, Role } from '../../types'
import {
  emptyCompanyPayrollSetup,
  employerDefaultsFromSetup,
  PayeRegistrationFields,
  PayrollStartFields,
  RegisteredAddressFields,
  typicalEmployeeFromDefaults,
  TypicalEmployeeFields,
} from './companySetupFields'

export type TeamMemberDraft = {
  key: string
  userId?: string
  first_name: string
  last_name: string
  email: string
  role_id: string
}

export type OrganizationFormValues = {
  company_name: string
  office_number: string
  paye_office: string
  paye_reference: string
  accounts_office_reference: string
  pension_provider: string
  pension_employer_id: string
  sector: string
  address_line_1: string
  address_line_2: string
  address_line_3: string
  address_line_4: string
  postcode: string
  country: string
  payroll_start_mode: string
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
  payroll: boolean
  hr: boolean
  invoice: boolean
  owner_first_name: string
  owner_last_name: string
  owner_email: string
  owner_phone: string
  owner_role_id: string
  members: TeamMemberDraft[]
}

type OrganizationPayload = {
  company_name: string
  office_number?: string
  paye_reference?: string
  accounts_office_reference?: string
  pension_provider?: string
  pension_employer_id?: string
  address?: string
  address_line_1?: string
  address_line_2?: string
  address_line_3?: string
  address_line_4?: string
  postcode?: string
  country?: string
  small_employers_relief?: boolean
  expenses_benefits_method?: string
  payroll_start_mode?: string
  employer_defaults?: { payroll_start_mode: string }
  sector?: string
  modules: string[]
  owner: {
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
  users: {
    first_name: string
    last_name: string
    email: string
    role_id: string
  }[]
}

const SECTORS = [
  'Technology',
  'Retail',
  'Technology / Retail',
  'Hospitality',
  'Healthcare',
  'Construction',
  'Education',
  'Professional services',
  'Manufacturing',
  'Finance',
  'Other',
]

const NEST_PENSION = 'NEST pension'
const OTHER_PENSION = 'Other pension provider'

function isNestPension(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  return normalized === 'nest pension' || normalized === 'nest'
}

function pensionProviderChoice(value: string) {
  if (!value.trim()) return ''
  return isNestPension(value) ? NEST_PENSION : OTHER_PENSION
}

function isValidEmail(value: string) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim())
}

function newMemberKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `member-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function roleIdByName(roles: Role[], name: string) {
  return roles.find((role) => role.role_name.toUpperCase() === name.toUpperCase())?.id ?? ''
}

export function emptyOrganizationForm(roles: Role[] = []): OrganizationFormValues {
  const setup = emptyCompanyPayrollSetup()
  return {
    company_name: '',
    office_number: '',
    paye_office: setup.paye_office,
    paye_reference: setup.paye_reference,
    accounts_office_reference: setup.accounts_office_reference,
    pension_provider: '',
    pension_employer_id: '',
    sector: '',
    address_line_1: setup.address_line_1,
    address_line_2: setup.address_line_2,
    address_line_3: setup.address_line_3,
    address_line_4: setup.address_line_4,
    postcode: setup.postcode,
    country: setup.country,
    payroll_start_mode: setup.payroll_start_mode,
    expenses_benefits_method: setup.expenses_benefits_method,
    small_employers_relief: setup.small_employers_relief,
    typical_pay_frequency: setup.typical_pay_frequency,
    typical_pay_basis: setup.typical_pay_basis,
    typical_pay_method: setup.typical_pay_method,
    leave_year_starts: setup.leave_year_starts,
    leave_calculation_method: setup.leave_calculation_method,
    leave_entitlement_days: setup.leave_entitlement_days,
    leave_entitlement_weeks: setup.leave_entitlement_weeks,
    carry_over_leave: setup.carry_over_leave,
    working_days: setup.working_days,
    payroll: true,
    hr: true,
    invoice: false,
    owner_first_name: '',
    owner_last_name: '',
    owner_email: '',
    owner_phone: '',
    owner_role_id: roleIdByName(roles, 'COMPANY_ADMIN'),
    members: [],
  }
}

export function organizationFormFromCompany(
  company: Company,
  roles: Role[] = [],
): OrganizationFormValues {
  const modules = (company.company_modules ?? [])
    .filter((module) => module.is_active !== false)
    .map((module) => module.module.toUpperCase())
  const owner = company.user_roles?.find((role) => role.is_owner)
  const ownerUserId = idOf(owner?.users)
  const seen = new Set<string>()
  const members = (company.user_roles ?? [])
    .filter((role) => !role.is_owner && idOf(role.users) !== ownerUserId)
    .flatMap((role) => {
      const userId = idOf(role.users)
      if (userId && seen.has(userId)) return []
      if (userId) seen.add(userId)
      return [
        {
          key: idOf(role) || userId || newMemberKey(),
          userId: userId || undefined,
          first_name: role.users?.first_name ?? '',
          last_name: role.users?.last_name ?? '',
          email: role.users?.email ?? '',
          role_id: idOf(role.roles),
        },
      ]
    })

  const paye = splitPaye(company.paye_reference)
  const setup = emptyCompanyPayrollSetup()
  return {
    company_name: company.company_name ?? '',
    office_number: company.office_number ?? '',
    paye_office: paye.office,
    paye_reference: paye.reference,
    accounts_office_reference: company.accounts_office_reference ?? '',
    pension_provider: company.pension_provider ?? '',
    pension_employer_id: company.pension_employer_id ?? '',
    sector: company.sector ?? '',
    address_line_1: company.address_line_1 ?? '',
    address_line_2: company.address_line_2 ?? '',
    address_line_3: company.address_line_3 ?? '',
    address_line_4: company.address_line_4 ?? '',
    postcode: company.postcode ?? '',
    country: company.country || setup.country,
    payroll_start_mode: company.employer_defaults?.payroll_start_mode || setup.payroll_start_mode,
    expenses_benefits_method: company.expenses_benefits_method || setup.expenses_benefits_method,
    small_employers_relief: Boolean(company.small_employers_relief),
    ...typicalEmployeeFromDefaults(company.employer_defaults),
    payroll: modules.includes('PAYROLL'),
    hr: modules.includes('HR'),
    invoice: modules.includes('INVOICE'),
    owner_first_name: owner?.users?.first_name ?? '',
    owner_last_name: owner?.users?.last_name ?? '',
    owner_email: owner?.users?.email ?? '',
    owner_phone: owner?.users?.phone ?? '',
    owner_role_id: idOf(owner?.roles) || roleIdByName(roles, 'COMPANY_ADMIN'),
    members,
  }
}

export function emptyTeamMember(roles: Role[] = []): TeamMemberDraft {
  return {
    key: newMemberKey(),
    first_name: '',
    last_name: '',
    email: '',
    role_id: roleIdByName(roles, 'PAYROLL_MANAGER') || roles[0]?.id || '',
  }
}

export function toOrganizationPayload(form: OrganizationFormValues): OrganizationPayload {
  const modules = [
    form.payroll ? 'PAYROLL' : null,
    form.hr ? 'HR' : null,
    form.invoice ? 'INVOICE' : null,
  ].filter((module): module is string => Boolean(module))

  if (modules.length === 0) {
    throw new Error('Enable at least one module')
  }

  const ownerEmail = form.owner_email.trim().toLowerCase()
  const members = form.members.filter((member) => {
    const filled = member.first_name.trim() || member.last_name.trim() || member.email.trim()
    if (!filled) return false
    return member.email.trim().toLowerCase() !== ownerEmail
  })

  for (const member of members) {
    if (
      !member.first_name.trim() ||
      !member.last_name.trim() ||
      !member.email.trim() ||
      !member.role_id
    ) {
      throw new Error('Complete every team member’s name, email, and role, or remove the row')
    }
    if (!isValidEmail(member.email)) {
      throw new Error('Enter a valid email address')
    }
  }

  if (!isValidEmail(form.owner_email)) {
    throw new Error('Enter a valid email address')
  }

  const emails = [form.owner_email.trim().toLowerCase(), ...members.map((member) => member.email.trim().toLowerCase())]
  if (new Set(emails).size !== emails.length) {
    throw new Error('Each person must have a unique email address')
  }

  const optional = (value: string) => value.trim() || undefined
  const address = [form.address_line_1, form.address_line_2, form.address_line_3, form.address_line_4]
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')

  return {
    company_name: form.company_name.trim(),
    office_number: optional(form.office_number),
    paye_reference: joinPaye(form.paye_office, form.paye_reference) || undefined,
    accounts_office_reference: optional(form.accounts_office_reference),
    pension_provider: optional(form.pension_provider),
    pension_employer_id: optional(form.pension_employer_id),
    address: address || undefined,
    address_line_1: optional(form.address_line_1),
    address_line_2: optional(form.address_line_2),
    address_line_3: optional(form.address_line_3),
    address_line_4: optional(form.address_line_4),
    postcode: optional(form.postcode),
    country: optional(form.country),
    small_employers_relief: form.small_employers_relief,
    expenses_benefits_method: optional(form.expenses_benefits_method),
    payroll_start_mode: form.payroll_start_mode || 'BEGINNING',
    employer_defaults: employerDefaultsFromSetup(form),
    sector: optional(form.sector),
    modules,
    owner: {
      first_name: form.owner_first_name.trim(),
      last_name: form.owner_last_name.trim(),
      email: form.owner_email.trim(),
      phone: optional(form.owner_phone),
    },
    users: members.map((member) => ({
      first_name: member.first_name.trim(),
      last_name: member.last_name.trim(),
      email: member.email.trim(),
      role_id: member.role_id,
    })),
  }
}

export async function validateOrganizationForm(
  form: OrganizationFormValues,
): Promise<OrganizationFormValues> {
  if (!isValidEmail(form.owner_email)) {
    throw new Error('Enter a valid email address')
  }

  const members = form.members.filter(
    (member) => member.first_name.trim() || member.last_name.trim() || member.email.trim(),
  )
  for (const member of members) {
    if (!isValidEmail(member.email)) {
      throw new Error('Enter a valid email address')
    }
  }

  const postcode = form.postcode.trim()
  if (!postcode) return { ...form, postcode: '' }

  const result = await lookupsApi.validatePostcode(postcode)
  if (!result.data.valid) {
    throw new Error('Enter a valid postcode')
  }
  return { ...form, postcode: result.data.formatted || postcode }
}

function roleDisplayName(role: Role) {
  const names: Record<string, string> = {
    COMPANY_ADMIN: 'Company Administrator',
    PAYROLL_MANAGER: 'Payroll Manager',
    PAYROLL_VIEWER: 'Payroll Viewer',
    HR_MANAGER: 'HR Manager',
    COMPANY_MANAGER: 'Company Manager',
  }
  return names[role.role_name.toUpperCase()] ?? labelize(role.role_name)
}

const controlClass =
  'w-full rounded-[10px] border border-[#e4e2de] bg-[#f6f5f2] px-4 py-3 text-sm text-navy outline-none transition placeholder:text-muted focus:ring-2 focus:ring-navy/15 disabled:cursor-not-allowed disabled:opacity-70'

function FormField({
  label,
  required,
  className = '',
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  error?: string | null
  hint?: string | null
  children: ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {required ? <span className="ml-0.5 text-brand">*</span> : null}
      </span>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-brand">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted">{hint}</p>
      ) : null}
    </label>
  )
}

function IconInput({
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">{icon}</span>
      <input className={`pl-11 ${controlClass} ${className}`} {...props} />
    </div>
  )
}

function IconSelect({
  icon,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { icon?: ReactNode }) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted">{icon}</span>
      ) : null}
      <select className={`${icon ? 'pl-11' : ''} ${controlClass} ${className}`} {...props}>
        {children}
      </select>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  subtitle,
  action,
  className = '',
  children,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={`p-5 shadow-[0_8px_24px_rgba(23,55,94,0.04)] md:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy/10 text-navy">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-navy">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-navy' : 'bg-[#d4d2cd]'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function ModuleTile({
  title,
  description,
  enabled,
  disabled,
  icon,
  iconClass,
  onToggle,
}: {
  title: string
  description: string
  enabled: boolean
  disabled?: boolean
  icon: ReactNode
  iconClass: string
  onToggle: (value: boolean) => void
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-[12px] border p-3.5 ${
        enabled ? 'border-navy/15 bg-cream' : 'border-[#eceae6] bg-white'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${iconClass}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      <Toggle checked={enabled} disabled={disabled} onChange={onToggle} />
    </div>
  )
}

export function OrganizationForm({
  title,
  subtitle,
  values,
  roles,
  error,
  saving,
  disabled,
  submitLabel,
  savingLabel,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
  canSave = true,
}: {
  title: string
  subtitle: string
  values: OrganizationFormValues
  roles: Role[]
  error?: string | null
  saving?: boolean
  disabled?: boolean
  submitLabel: string
  savingLabel: string
  onChange: (values: OrganizationFormValues) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onDelete?: () => void
  canSave?: boolean
}) {
  const set = <K extends keyof OrganizationFormValues>(key: K, value: OrganizationFormValues[K]) =>
    onChange({ ...values, [key]: value })

  const updateMember = (key: string, patch: Partial<TeamMemberDraft>) =>
    onChange({
      ...values,
      members: values.members.map((member) => (member.key === key ? { ...member, ...patch } : member)),
    })

  const readOnly = Boolean(disabled)
  const sectors = values.sector && !SECTORS.includes(values.sector) ? [values.sector, ...SECTORS] : SECTORS
  const iconSize = 16
  const valuesRef = useRef(values)
  valuesRef.current = values
  const postcodeRequest = useRef(0)
  const [postcodeError, setPostcodeError] = useState<string | null>(null)
  const [postcodeChecking, setPostcodeChecking] = useState(false)
  const ownerEmailError =
    values.owner_email.trim() && !isValidEmail(values.owner_email) ? 'Enter a valid email address' : null

  useEffect(() => {
    if (readOnly) return
    const value = values.postcode.trim()
    if (!value) {
      setPostcodeError(null)
      setPostcodeChecking(false)
      return
    }

    const requestId = ++postcodeRequest.current
    setPostcodeChecking(true)
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupsApi.validatePostcode(value)
        if (requestId !== postcodeRequest.current) return
        if (!result.data.valid) {
          setPostcodeError('Enter a valid postcode')
          return
        }
        setPostcodeError(null)
        if (result.data.formatted && result.data.formatted !== valuesRef.current.postcode) {
          onChange({ ...valuesRef.current, postcode: result.data.formatted })
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
  }, [values.postcode, readOnly, onChange])

  return (
    <form className="pb-6" onSubmit={onSubmit}>
        <Link
          to="/companies"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline"
        >
          <ChevronLeft size={16} /> Back to Organisations
        </Link>
        <h1 className="text-[32px] font-semibold leading-none text-navy">{title}</h1>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
        {error ? <Alert className="mt-4">{error}</Alert> : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <SectionCard
            icon={<Building2 size={18} />}
            title="Organisation Details"
            subtitle="Basic information about the company."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Company Name" required className="sm:col-span-2">
                <input
                  value={values.company_name}
                  onChange={(event) => set('company_name', event.target.value)}
                  placeholder="Cedar Holdings Ltd"
                  required
                  disabled={readOnly}
                  className={controlClass}
                />
              </FormField>
              <FormField label="Industry / Sector">
                <IconSelect
                  value={values.sector}
                  onChange={(event) => set('sector', event.target.value)}
                  disabled={readOnly}
                >
                  <option value="">Select sector</option>
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </IconSelect>
              </FormField>
              <FormField label="Office Number">
                <IconInput
                  icon={<Phone size={iconSize} />}
                  value={values.office_number}
                  onChange={(event) => set('office_number', event.target.value)}
                  placeholder="+44 20 7946 0958"
                  disabled={readOnly}
                />
              </FormField>
              <FormField label="Pension Provider">
                <IconSelect
                  icon={<Shield size={iconSize} />}
                  value={pensionProviderChoice(values.pension_provider)}
                  onChange={(event) => {
                    const choice = event.target.value
                    if (choice === NEST_PENSION) {
                      set('pension_provider', NEST_PENSION)
                      return
                    }
                    if (choice === OTHER_PENSION) {
                      set(
                        'pension_provider',
                        isNestPension(values.pension_provider) || !values.pension_provider.trim()
                          ? OTHER_PENSION
                          : values.pension_provider,
                      )
                      return
                    }
                    set('pension_provider', '')
                  }}
                  disabled={readOnly}
                >
                  <option value="">Select provider</option>
                  <option value={NEST_PENSION}>NEST pension</option>
                  <option value={OTHER_PENSION}>Other pension provider</option>
                </IconSelect>
              </FormField>
              <FormField label="Pension Employer ID">
                <IconInput
                  icon={<FileText size={iconSize} />}
                  value={values.pension_employer_id}
                  onChange={(event) => set('pension_employer_id', event.target.value)}
                  placeholder="EMP00628276B"
                  disabled={readOnly}
                />
              </FormField>
            </div>
          </SectionCard>

            <SectionCard icon={<Layers size={18} />} title="Enabled Modules">
              <div className="grid gap-3 sm:grid-cols-2">
                <ModuleTile
                  title="Payroll"
                  description="Manage payroll and payslips."
                  enabled={values.payroll}
                  disabled={readOnly}
                  icon={<Wallet size={16} />}
                  iconClass="bg-emerald-50 text-emerald-700"
                  onToggle={(value) => set('payroll', value)}
                />
                <ModuleTile
                  title="HR"
                  description="Leave, rota, and employee management."
                  enabled={values.hr}
                  disabled={readOnly}
                  icon={<Users size={16} />}
                  iconClass="bg-violet-50 text-violet-700"
                  onToggle={(value) => set('hr', value)}
                />
                <ModuleTile
                  title="Invoice"
                  description="Company can request invoice"
                  enabled={values.invoice}
                  disabled={readOnly}
                  icon={<FileText size={16} />}
                  iconClass="bg-sky-50 text-sky-700"
                  onToggle={(value) => set('invoice', value)}
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<User size={18} />}
              title="Organisation Owner"
              subtitle="Primary contact and administrator."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First Name" required>
                  <input
                    value={values.owner_first_name}
                    onChange={(event) => set('owner_first_name', event.target.value)}
                    placeholder="John"
                    required
                    disabled={readOnly}
                    className={controlClass}
                  />
                </FormField>
                <FormField label="Last Name" required>
                  <input
                    value={values.owner_last_name}
                    onChange={(event) => set('owner_last_name', event.target.value)}
                    placeholder="Doe"
                    required
                    disabled={readOnly}
                    className={controlClass}
                  />
                </FormField>
                <FormField label="Email" required className="sm:col-span-2" error={ownerEmailError}>
                  <IconInput
                    icon={<Mail size={iconSize} />}
                    type="email"
                    value={values.owner_email}
                    onChange={(event) => set('owner_email', event.target.value)}
                    placeholder="john.doe@company.com"
                    autoComplete="email"
                    required
                    disabled={readOnly}
                    className={ownerEmailError ? '!border-brand' : ''}
                    aria-invalid={Boolean(ownerEmailError)}
                  />
                </FormField>
                <FormField label="Phone" className="sm:col-span-2">
                  <IconInput
                    icon={<Phone size={iconSize} />}
                    value={values.owner_phone}
                    onChange={(event) => set('owner_phone', event.target.value)}
                    placeholder="+44 20 7946 0958"
                    disabled={readOnly}
                  />
                </FormField>
                <FormField label="Role" required className="sm:col-span-2">
                  <IconSelect icon={<Shield size={iconSize} />} value={values.owner_role_id} disabled>
                    {roles.length === 0 ? (
                      <option value="">Company Administrator</option>
                    ) : (
                      roles.map((role) => (
                        <option key={idOf(role)} value={idOf(role)}>
                          {roleDisplayName(role)}
                        </option>
                      ))
                    )}
                  </IconSelect>
                </FormField>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Users size={18} />}
              title="Team Members"
              action={
                readOnly ? undefined : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-2 text-xs"
                    onClick={() => onChange({ ...values, members: [...values.members, emptyTeamMember(roles)] })}
                  >
                    <Plus size={14} strokeWidth={2.2} />
                    Add Team Member
                  </Button>
                )
              }
            >
              {values.members.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#e4e2de] bg-[#faf9f7] px-4 py-10 text-center">
                  <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-navy/10 text-navy">
                    <Users size={22} />
                  </span>
                  <p className="text-sm font-medium text-navy">No team members yet.</p>
                  <p className="mt-1 text-sm text-muted">
                    Add team members to give them access to this organisation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {values.members.map((member) => {
                    const memberEmailError =
                      member.email.trim() && !isValidEmail(member.email)
                        ? 'Enter a valid email address'
                        : null
                    return (
                    <div key={member.key} className="rounded-[12px] border border-[#eceae6] bg-[#faf9f7] p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="First Name" required>
                          <input
                            value={member.first_name}
                            onChange={(event) => updateMember(member.key, { first_name: event.target.value })}
                            required
                            disabled={readOnly}
                            className={controlClass}
                          />
                        </FormField>
                        <FormField label="Last Name" required>
                          <input
                            value={member.last_name}
                            onChange={(event) => updateMember(member.key, { last_name: event.target.value })}
                            required
                            disabled={readOnly}
                            className={controlClass}
                          />
                        </FormField>
                        <FormField label="Email" required error={memberEmailError}>
                          <IconInput
                            icon={<Mail size={iconSize} />}
                            type="email"
                            value={member.email}
                            onChange={(event) => updateMember(member.key, { email: event.target.value })}
                            required
                            disabled={readOnly}
                            className={memberEmailError ? '!border-brand' : ''}
                            aria-invalid={Boolean(memberEmailError)}
                          />
                        </FormField>
                        <FormField label="Role" required>
                          <IconSelect
                            icon={<Shield size={iconSize} />}
                            value={member.role_id}
                            onChange={(event) => updateMember(member.key, { role_id: event.target.value })}
                            required
                            disabled={readOnly}
                          >
                            <option value="">Select role</option>
                            {roles.map((role) => (
                              <option key={idOf(role)} value={idOf(role)}>
                                {roleDisplayName(role)}
                              </option>
                            ))}
                          </IconSelect>
                        </FormField>
                      </div>
                      {readOnly ? null : (
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
                          onClick={() =>
                            onChange({
                              ...values,
                              members: values.members.filter((row) => row.key !== member.key),
                            })
                          }
                        >
                          <Trash2 size={15} strokeWidth={1.8} />
                          Remove member
                        </button>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>

          <SectionCard
            icon={<CalendarDays size={18} />}
            title="Payroll start"
            subtitle="How this company starts the current tax year."
          >
            <PayrollStartFields
              companyName={values.company_name}
              disabled={readOnly}
              values={values}
              onChange={(next) => onChange({ ...values, ...next })}
            />
          </SectionCard>
          <SectionCard
            icon={<FileText size={18} />}
            title="PAYE registration"
            subtitle="HMRC references used on payroll submissions."
          >
            <PayeRegistrationFields
              companyName={values.company_name}
              disabled={readOnly}
              values={values}
              onChange={(next) => onChange({ ...values, ...next })}
            />
          </SectionCard>

          <SectionCard
            className="lg:col-span-2"
            icon={<MapPin size={18} />}
            title="Registered address"
            subtitle="The address used on payroll and HMRC submissions."
          >
            <RegisteredAddressFields
              companyName={values.company_name}
              disabled={readOnly}
              values={values}
              onChange={(next) => onChange({ ...values, ...next })}
            />
            {postcodeError ? (
              <p className="mt-2 text-[11px] font-medium text-brand">{postcodeError}</p>
            ) : postcodeChecking ? (
              <p className="mt-2 text-[11px] text-muted">Checking postcode…</p>
            ) : null}
          </SectionCard>

          <SectionCard
            className="lg:col-span-2"
            icon={<Clock size={18} />}
            title="Typical employee"
            subtitle="Default settings used when adding a new employee."
          >
            <TypicalEmployeeFields
              companyName={values.company_name}
              disabled={readOnly}
              showIntro={false}
              values={values}
              onChange={(next) => onChange({ ...values, ...next })}
            />
          </SectionCard>
        </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#eceae6] bg-cream pt-5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          {onDelete && !readOnly ? (
            <Button type="button" variant="danger" disabled={saving} onClick={onDelete}>
              <Trash2 size={16} />
              Delete organisation
            </Button>
          ) : null}
        </div>
        <Button type="submit" disabled={saving || readOnly || !canSave}>
          <Save size={16} />
          {saving ? savingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}

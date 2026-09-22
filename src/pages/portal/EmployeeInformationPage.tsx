import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, Field, Input, Loading, PageHeader, Select } from '../../components/ui'
import { formatDate, formatNiNumber, money, toDateInput } from '../../lib/format'
import type { Employee } from '../../types'
import { GENDER_OPTIONS, TITLE_OPTIONS, paymentMethodLabel } from '../employees/employeeOptions'

const TABS = ['Personal', 'Employment', 'Starter/Leaver', 'Payment', 'Tax/NICs/RTI'] as const
type Tab = (typeof TABS)[number]

function firstRecord<T>(value: T[] | T | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function display(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function ReadField({ label, value }: { label: string; value?: unknown }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-navy">{display(value)}</p>
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
  const query = useQuery({
    queryKey: ['my-employee', companyId, employeeId],
    queryFn: () => employeesApi.me(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const employee = (query.data?.data as Employee | undefined) ?? null
  const address = firstRecord(employee?.employee_addresses)
  const employment = firstRecord(employee?.employment_details) as Record<string, unknown> | null
  const starter = firstRecord(employee?.starters_leavers) as Record<string, unknown> | null
  const bank = firstRecord(employee?.bank_details)
  const tax = firstRecord(employee?.employee_tax_details) as Record<string, unknown> | null

  const [draft, setDraft] = useState({
    title: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    dob: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    address_line_3: '',
    address_line_4: '',
    postcode: '',
    country: 'United Kingdom',
  })

  useEffect(() => {
    if (!employee) return
    setDraft({
      title: employee.title ?? '',
      first_name: employee.first_name ?? '',
      middle_name: employee.middle_name ?? '',
      last_name: employee.last_name ?? '',
      gender: employee.gender ?? '',
      dob: toDateInput(employee.dob),
      phone: employee.phone ?? '',
      address_line_1: address?.address_line_1 ?? '',
      address_line_2: address?.address_line_2 ?? '',
      address_line_3: address?.address_line_3 ?? '',
      address_line_4: address?.address_line_4 ?? '',
      postcode: address?.postcode ?? '',
      country: address?.country ?? 'United Kingdom',
    })
  }, [employee, address])

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
        phone: draft.phone || undefined,
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

  return (
    <div>
      <PageHeader
        title="Employee information"
        subtitle="You can update your personal details. Email, employment, pay and tax records are managed by your employer."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-[#d7dee8]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {query.isLoading ? <Loading /> : !employee ? (
        <Card className="p-8">
          <p className="text-sm text-muted">Your employee record is not linked yet.</p>
        </Card>
      ) : (
        <Card className="p-6 md:p-8">
          {tab === 'Personal' ? (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                void savePersonal()
              }}
            >
              {error ? <div className="md:col-span-2"><Alert>{error}</Alert></div> : null}
              {message ? <div className="md:col-span-2"><Alert tone="success">{message}</Alert></div> : null}
              <Field label="Title">
                <Select value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}>
                  <option value="">Select</option>
                  {TITLE_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              </Field>
              <Field label="First name">
                <Input value={draft.first_name} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} required />
              </Field>
              <Field label="Middle name">
                <Input value={draft.middle_name} onChange={(e) => setDraft({ ...draft, middle_name: e.target.value })} />
              </Field>
              <Field label="Last name">
                <Input value={draft.last_name} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} required />
              </Field>
              <Field label="Date of birth">
                <Input type="date" value={draft.dob} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
              </Field>
              <Field label="Gender">
                <Select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Email address">
                <Input value={employee.email ?? ''} readOnly className="bg-[#f4f7fb]" />
                <p className="mt-1 text-xs text-muted">Your login email cannot be changed here.</p>
              </Field>
              <Field label="Phone">
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
              <Field label="Address line 1">
                <Input value={draft.address_line_1} onChange={(e) => setDraft({ ...draft, address_line_1: e.target.value })} />
              </Field>
              <Field label="Address line 2">
                <Input value={draft.address_line_2} onChange={(e) => setDraft({ ...draft, address_line_2: e.target.value })} />
              </Field>
              <Field label="Address line 3">
                <Input value={draft.address_line_3} onChange={(e) => setDraft({ ...draft, address_line_3: e.target.value })} />
              </Field>
              <Field label="Address line 4">
                <Input value={draft.address_line_4} onChange={(e) => setDraft({ ...draft, address_line_4: e.target.value })} />
              </Field>
              <Field label="Postcode">
                <Input value={draft.postcode} onChange={(e) => setDraft({ ...draft, postcode: e.target.value })} />
              </Field>
              <Field label="Country">
                <Input value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save personal details'}</Button>
              </div>
            </form>
          ) : null}

          {tab === 'Employment' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadField label="Employee code" value={employee.employee_code} />
              <ReadField label="Job title" value={employment?.job_title} />
              <ReadField label="Department" value={employment?.department} />
              <ReadField label="Status" value={employment?.status} />
              <ReadField label="Typical hours / week" value={employment?.typical_hours_per_week} />
              <ReadField label="Working days" value={employment?.usual_working_days} />
              <ReadField label="Annual leave days" value={employment?.annual_leave_entitlement} />
              <ReadField label="Leave year starts" value={employment?.leave_year_starts} />
            </div>
          ) : null}

          {tab === 'Starter/Leaver' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadField label="Start date" value={formatDate(String(starter?.start_date ?? ''))} />
              <ReadField label="Starter declaration" value={starter?.starter_declaration} />
              <ReadField label="Leave date" value={starter?.leave_date ? formatDate(String(starter.leave_date)) : '—'} />
              <ReadField label="TUPE protected" value={starter?.tupe_protected} />
              <ReadField label="Overseas secondment" value={starter?.overseas_secondment} />
            </div>
          ) : null}

          {tab === 'Payment' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadField label="Pay basis" value={employment?.pay_basis_type} />
              <ReadField label="Annual salary" value={employment?.annual_salary != null ? money(employment.annual_salary) : '—'} />
              <ReadField label="Hourly rate" value={employment?.basic_rate_per_hour != null ? money(employment.basic_rate_per_hour) : '—'} />
              <ReadField label="Daily rate" value={employment?.daily_rate != null ? money(employment.daily_rate) : '—'} />
              <ReadField label="Period rate" value={employment?.period_rate != null ? money(employment.period_rate) : '—'} />
              <ReadField label="Payment method" value={paymentMethodLabel(bank?.payment_method)} />
              <ReadField label="Bank name" value={bank?.bank_name} />
              <ReadField label="Account name" value={bank?.account_name} />
              <ReadField label="Account number" value={bank?.account_number} />
              <ReadField label="Sort code" value={bank?.sort_code} />
              <ReadField label="Bank reference" value={bank?.bank_reference} />
            </div>
          ) : null}

          {tab === 'Tax/NICs/RTI' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadField label="Tax code" value={tax?.tax_code} />
              <ReadField label="Week 1 / Month 1" value={tax?.week1month1} />
              <ReadField label="NI number" value={formatNiNumber(tax?.ni_number ? String(tax.ni_number) : null)} />
              <ReadField label="NI category" value={tax?.ni_category} />
              <ReadField label="Director" value={tax?.is_director} />
              <ReadField label="Payroll ID" value={tax?.payroll_id} />
              <ReadField label="Student loan plan" value={tax?.student_loan_plan} />
              <ReadField label="Postgraduate loan plan" value={tax?.postgraduate_loan_plan} />
              <ReadField label="Workplace postcode" value={tax?.workplace_postcode} />
            </div>
          ) : null}
        </Card>
      )}
    </div>
  )
}

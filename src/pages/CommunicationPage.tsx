import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Search, Send } from 'lucide-react'
import { communicationApi, companiesApi, employeesApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, EmptyState, Field, Input, Loading, PageHeader, Select } from '../components/ui'
import { fullName, idOf } from '../lib/format'
import type { Company, Employee } from '../types'

const AUDIENCES = [
  { value: 'COMPANY_ADMINS', label: 'Company administrators', hint: 'Owners and company admins' },
  { value: 'EMPLOYEES', label: 'All employees', hint: 'Everyone on the payroll' },
  { value: 'COMPANY_ADMINS_AND_EMPLOYEES', label: 'Admins and employees', hint: 'The whole company' },
  { value: 'SPECIFIC', label: 'Specific employees', hint: 'Tick the people to email' },
] as const

const FROM_OPTIONS = [
  {
    value: 'support' as const,
    label: 'Support',
    email: 'support@cedarpayroll.com',
  },
  {
    value: 'info' as const,
    label: 'Info',
    email: 'info@cedarpayroll.com',
  },
]

function audienceLabel(value: string) {
  return AUDIENCES.find((item) => item.value === value)?.label ?? value
}

function when(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ChoiceCard({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[12px] border px-4 py-3 text-left transition ${
        selected
          ? 'border-navy bg-[#f0f5fe] shadow-[inset_0_0_0_1px_#17375e]'
          : 'border-[#e4e8ee] bg-white hover:border-navy/30'
      }`}
    >
      <span className="block text-sm font-semibold text-navy">{title}</span>
      <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>
    </button>
  )
}

export function CommunicationPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const canUse =
    auth.isBureauAdmin ||
    auth.isSuperAdmin ||
    (auth.isCompanyAdmin && (auth.hasModule('PAYROLL') || auth.hasModule('HR')))
  const [from, setFrom] = useState<'support' | 'info'>('support')
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]['value']>('COMPANY_ADMINS')
  const [allCompanies, setAllCompanies] = useState(false)
  const [companyId, setCompanyId] = useState(auth.companyId ?? '')
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const companiesQuery = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
    enabled: Boolean(canUse && (auth.isBureauAdmin || auth.isSuperAdmin)),
  })
  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId),
    enabled: Boolean(canUse && companyId && audience === 'SPECIFIC' && !allCompanies),
  })
  const listQuery = useQuery({
    queryKey: ['communication'],
    queryFn: () => communicationApi.list(),
    enabled: canUse,
  })

  const companies = (companiesQuery.data?.data as Company[] | undefined) ?? []
  const employees = useMemo(() => {
    const list = (employeesQuery.data?.data as Employee[] | undefined) ?? []
    return [...list].sort((left, right) =>
      fullName(left.first_name, left.last_name).localeCompare(
        fullName(right.first_name, right.last_name),
        'en-GB',
        { sensitivity: 'base' },
      ),
    )
  }, [employeesQuery.data])
  const visibleEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    if (!query) return employees
    return employees.filter((employee) =>
      fullName(employee.first_name, employee.last_name).toLowerCase().includes(query),
    )
  }, [employeeSearch, employees])
  const sent =
    (listQuery.data?.data as Array<{
      id: string
      subject: string
      from: string
      audience: string
      sent_count: number
      failed_count: number
      created_at: string
      sender_name: string
      company_name?: string | null
    }> | undefined) ?? []

  const payload = useMemo(
    () => ({
      from,
      audience,
      all_companies: Boolean((auth.isBureauAdmin || auth.isSuperAdmin) && allCompanies),
      company_ids: allCompanies ? [] : ([companyId || auth.companyId].filter(Boolean) as string[]),
      employee_ids: audience === 'SPECIFIC' ? employeeIds : [],
      subject: subject.trim(),
      body: body.trim(),
    }),
    [allCompanies, audience, auth.companyId, auth.isBureauAdmin, auth.isSuperAdmin, body, companyId, employeeIds, from, subject],
  )

  const previewQuery = useQuery({
    queryKey: ['communication-preview', payload],
    queryFn: () => communicationApi.preview(payload),
    enabled:
      canUse &&
      Boolean(payload.subject && payload.body) &&
      (payload.all_companies || payload.company_ids.length > 0) &&
      (payload.audience !== 'SPECIFIC' || payload.employee_ids.length > 0),
  })
  const previewCount = Number((previewQuery.data?.data as { count?: number } | undefined)?.count ?? 0)

  const send = useMutation({
    mutationFn: () => communicationApi.send(payload),
    onSuccess: async (result) => {
      const data = result.data as { sent_count?: number; failed_count?: number }
      setMessage(
        `Sent ${data.sent_count ?? 0} email${data.sent_count === 1 ? '' : 's'}${
          data.failed_count ? `, ${data.failed_count} failed` : ''
        }. Replies will arrive in Outlook.`,
      )
      setError(null)
      setSubject('')
      setBody('')
      setEmployeeIds([])
      setEmployeeSearch('')
      await queryClient.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (err: Error) => {
      setMessage(null)
      setError(err.message || 'Could not send the email')
    },
  })

  if (!canUse) return <Navigate to="/" replace />

  const canSend = Boolean(payload.subject && payload.body) && previewCount > 0 && !send.isPending
  const allVisibleSelected =
    visibleEmployees.length > 0 &&
    visibleEmployees.every((employee) => employeeIds.includes(idOf(employee)))

  function toggleEmployee(id: string) {
    setEmployeeIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <PageHeader
        title="Communication"
        subtitle="Send updates and information requests. Replies arrive in the matching Outlook inbox."
      />

      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)] md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
            <Mail size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-navy">New email</h2>
            <p className="mt-1 text-sm text-muted">Choose who should receive it, then write the message.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-navy">Send from</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FROM_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.value}
                  selected={from === option.value}
                  title={`Cedar Payroll ${option.label}`}
                  subtitle={option.email}
                  onClick={() => setFrom(option.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-navy">Send to</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {AUDIENCES.map((item) => (
                <ChoiceCard
                  key={item.value}
                  selected={audience === item.value}
                  title={item.label}
                  subtitle={item.hint}
                  onClick={() => {
                    setAudience(item.value)
                    setEmployeeIds([])
                    setEmployeeSearch('')
                  }}
                />
              ))}
            </div>
          </div>

          {auth.isBureauAdmin || auth.isSuperAdmin ? (
            <Field label="Company">
              <Select
                variant="outline"
                value={allCompanies ? 'ALL' : companyId}
                onChange={(event) => {
                  const value = event.target.value
                  setAllCompanies(value === 'ALL')
                  setEmployeeIds([])
                  setEmployeeSearch('')
                  if (value !== 'ALL') setCompanyId(value)
                }}
              >
                <option value="">Select a company</option>
                <option value="ALL">All companies</option>
                {companies.map((company) => (
                  <option key={idOf(company)} value={idOf(company)}>
                    {company.company_name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {audience === 'SPECIFIC' ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-navy">Employees</p>
                {employeeIds.length > 0 ? (
                  <p className="text-xs font-semibold text-navy">
                    {employeeIds.length} selected
                  </p>
                ) : null}
              </div>
              {allCompanies ? (
                <p className="rounded-[12px] border border-[#e8edf5] bg-[#f7f9fc] px-4 py-3 text-sm text-muted">
                  Choose one company to pick individual employees.
                </p>
              ) : !companyId ? (
                <p className="rounded-[12px] border border-[#e8edf5] bg-[#f7f9fc] px-4 py-3 text-sm text-muted">
                  Select a company first.
                </p>
              ) : (
                <div className="overflow-hidden rounded-[14px] border border-[#e4e8ee] bg-white">
                  <div className="flex flex-wrap items-center gap-3 border-b border-[#eef1f5] px-4 py-3">
                    <label className="relative min-w-0 flex-1">
                      <Search
                        size={15}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                      />
                      <input
                        value={employeeSearch}
                        onChange={(event) => setEmployeeSearch(event.target.value)}
                        placeholder="Search employees"
                        className="h-10 w-full rounded-[10px] border border-[#e4e8ee] bg-[#f8f9fb] pr-3 pl-9 text-sm text-navy outline-none placeholder:text-muted focus:border-navy focus:bg-white"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy">
                      <input
                        type="checkbox"
                        className="size-4 accent-navy"
                        checked={allVisibleSelected}
                        onChange={(event) => {
                          const visibleIds = visibleEmployees.map((employee) => idOf(employee))
                          setEmployeeIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, ...visibleIds])]
                              : current.filter((id) => !visibleIds.includes(id)),
                          )
                        }}
                      />
                      Select all
                    </label>
                  </div>
                  {employeesQuery.isLoading ? (
                    <div className="px-4 py-8">
                      <Loading />
                    </div>
                  ) : visibleEmployees.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted">
                      {employees.length === 0
                        ? 'No employees found for this company.'
                        : 'No names match that search.'}
                    </p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {visibleEmployees.map((employee) => {
                        const id = idOf(employee)
                        const checked = employeeIds.includes(id)
                        return (
                          <li key={id}>
                            <label
                              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition ${
                                checked ? 'bg-[#f0f5fe]' : 'hover:bg-[#f8f9fb]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="size-4 shrink-0 accent-navy"
                                checked={checked}
                                onChange={() => toggleEmployee(id)}
                              />
                              <span className="min-w-0">
                                <span className="block font-semibold text-navy">
                                  {fullName(employee.first_name, employee.last_name)}
                                </span>
                                {employee.email ? (
                                  <span className="block truncate text-xs text-muted">{employee.email}</span>
                                ) : null}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <Field label="Subject">
            <Input
              variant="outline"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Payroll information needed"
            />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-navy">Message</p>
            <div className="overflow-hidden rounded-[15px] border border-[#d9d9d9] bg-white focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/20">
              <div className="border-b border-[#eef1f5] bg-[#f7f9fc] px-4 py-3">
                <p className="text-sm font-semibold text-navy">Hello [Name],</p>
                <p className="mt-0.5 text-xs text-muted">
                  Each recipient sees their own name at the start of the email.
                </p>
              </div>
              <textarea
                rows={8}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the update or information request. Recipients can reply in Outlook."
                className="min-h-24 w-full resize-y border-0 bg-white px-4 py-3 text-sm text-navy outline-none placeholder:text-muted"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f5] pt-5">
          <p className="text-sm text-muted">
            {previewQuery.isFetching
              ? 'Counting recipients…'
              : previewCount
                ? `${previewCount} recipient${previewCount === 1 ? '' : 's'} will receive this email.`
                : 'Add a subject, message and audience to see the recipient count.'}
          </p>
          <Button type="button" disabled={!canSend} onClick={() => send.mutate()}>
            <Send size={15} />
            {send.isPending ? 'Sending…' : 'Send email'}
          </Button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[16px] border border-[#e6eaf0] bg-white shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
        <div className="border-b border-[#eef1f5] px-6 py-4">
          <h2 className="text-lg font-semibold text-navy">Sent emails</h2>
          <p className="mt-1 text-sm text-muted">A record of mailshots from this workspace.</p>
        </div>
        {listQuery.isLoading ? (
          <div className="px-6 py-8">
            <Loading />
          </div>
        ) : sent.length === 0 ? (
          <EmptyState
            title="No emails sent yet"
            body="Sent updates and information requests will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#eceae6] text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-6 py-3">Sent</th>
                  <th className="px-6 py-3">From</th>
                  <th className="px-6 py-3">To</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {sent.map((row) => (
                  <tr key={row.id} className="border-b border-[#f0eeea] last:border-0">
                    <td className="px-6 py-3.5 text-navy">
                      <p className="font-medium">{when(row.created_at)}</p>
                      <p className="text-xs text-muted">{row.sender_name}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex rounded-full bg-[#eef3fb] px-2.5 py-1 text-xs font-semibold text-navy">
                        {row.from === 'info' ? 'info@cedarpayroll.com' : 'support@cedarpayroll.com'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-navy">
                      <p>{audienceLabel(row.audience)}</p>
                      {row.company_name ? <p className="text-xs text-muted">{row.company_name}</p> : null}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-navy">{row.subject}</td>
                    <td className="px-6 py-3.5 text-navy">
                      {row.sent_count} sent
                      {row.failed_count ? (
                        <span className="text-brand"> · {row.failed_count} failed</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

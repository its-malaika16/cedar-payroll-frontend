import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { communicationApi, companiesApi, employeesApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Card, EmptyState, Field, Input, Loading, PageHeader, Select, Textarea } from '../components/ui'
import { fullName, idOf } from '../lib/format'
import type { Company, Employee } from '../types'

const AUDIENCES = [
  { value: 'COMPANY_ADMINS', label: 'Company administrators' },
  { value: 'EMPLOYEES', label: 'Employees' },
  { value: 'COMPANY_ADMINS_AND_EMPLOYEES', label: 'Company administrators and employees' },
  { value: 'SPECIFIC', label: 'Specific employees' },
] as const

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
  const employees = (employeesQuery.data?.data as Employee[] | undefined) ?? []
  const sent = (listQuery.data?.data as Array<{
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
      company_ids: allCompanies ? [] : [companyId || auth.companyId].filter(Boolean) as string[],
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
      await queryClient.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (err: Error) => {
      setMessage(null)
      setError(err.message || 'Could not send the email')
    },
  })

  if (!canUse) return <Navigate to="/" replace />

  const canSend =
    Boolean(payload.subject && payload.body) &&
    previewCount > 0 &&
    !send.isPending

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <PageHeader
        title="Communication"
        subtitle="Email companies or employees from support@ or info@. Replies go to the matching Outlook inbox."
      />

      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-navy">New email</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Send from">
            <Select value={from} onChange={(event) => setFrom(event.target.value as 'support' | 'info')}>
              <option value="support">Cedar Payroll Support · support@cedarpayroll.com</option>
              <option value="info">Cedar Payroll · info@cedarpayroll.com</option>
            </Select>
          </Field>
          <Field label="Send to">
            <Select
              value={audience}
              onChange={(event) => {
                setAudience(event.target.value as (typeof AUDIENCES)[number]['value'])
                setEmployeeIds([])
              }}
            >
              {AUDIENCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          {auth.isBureauAdmin || auth.isSuperAdmin ? (
            <Field label="Company">
              <Select
                value={allCompanies ? 'ALL' : companyId}
                onChange={(event) => {
                  const value = event.target.value
                  setAllCompanies(value === 'ALL')
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
          {audience === 'SPECIFIC' && !allCompanies ? (
            <Field label="Employees">
              {employeesQuery.isLoading ? (
                <Loading />
              ) : employees.length === 0 ? (
                <p className="text-sm text-muted">No employees found for this company.</p>
              ) : (
                <select
                  multiple
                  className="min-h-36 w-full rounded-[15px] border-0 bg-input px-4 py-3 text-sm text-navy outline-none"
                  value={employeeIds}
                  onChange={(event) =>
                    setEmployeeIds([...event.target.selectedOptions].map((option) => option.value))
                  }
                >
                  {employees.map((employee) => (
                    <option key={idOf(employee)} value={idOf(employee)}>
                      {fullName(employee.first_name, employee.last_name)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : null}
        </div>
        <div className="mt-4 space-y-4">
          <Field label="Subject">
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Payroll information needed"
            />
          </Field>
          <Field label="Message">
            <Textarea
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write the update or information request. Recipients can reply in Outlook."
            />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {previewQuery.isFetching
              ? 'Counting recipients…'
              : previewCount
                ? `${previewCount} recipient${previewCount === 1 ? '' : 's'} will receive this email.`
                : 'Add a subject, message and audience to see the recipient count.'}
          </p>
          <Button type="button" disabled={!canSend} onClick={() => send.mutate()}>
            {send.isPending ? 'Sending…' : 'Send email'}
          </Button>
        </div>
      </Card>

      <Card className="mt-6">
        {listQuery.isLoading ? (
          <Loading />
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
                  <th className="px-5 py-3">Sent</th>
                  <th className="px-5 py-3">From</th>
                  <th className="px-5 py-3">To</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {sent.map((row) => (
                  <tr key={row.id} className="border-b border-[#f0eeea] last:border-0">
                    <td className="px-5 py-3 text-navy">
                      <p>{when(row.created_at)}</p>
                      <p className="text-xs text-muted">{row.sender_name}</p>
                    </td>
                    <td className="px-5 py-3 text-navy">
                      {row.from === 'info' ? 'info@cedarpayroll.com' : 'support@cedarpayroll.com'}
                    </td>
                    <td className="px-5 py-3 text-navy">
                      <p>{audienceLabel(row.audience)}</p>
                      {row.company_name ? <p className="text-xs text-muted">{row.company_name}</p> : null}
                    </td>
                    <td className="px-5 py-3 font-medium text-navy">{row.subject}</td>
                    <td className="px-5 py-3 text-navy">
                      {row.sent_count} sent
                      {row.failed_count ? ` · ${row.failed_count} failed` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

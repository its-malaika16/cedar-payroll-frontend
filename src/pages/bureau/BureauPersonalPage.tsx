import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutList, Search, Table2, User, Users } from 'lucide-react'
import { employeesApi, hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, EmptyState, Field, Loading } from '../../components/ui'
import { fullName } from '../../lib/format'
import type { Employee } from '../../types'
import { ComplianceDocumentsPanel } from '../hr/compliance/ComplianceDocumentsPanel'
import {
  typesFor,
  type ComplianceDocumentType,
  type ComplianceFile,
} from '../hr/compliance/documentTypes'

function phoneLines(employee: Employee) {
  const lines: string[] = []
  if (employee.phone?.trim()) {
    lines.push(employee.phone_type?.trim() ? `${employee.phone_type}: ${employee.phone}` : employee.phone)
  }
  for (const extra of employee.extra_phones ?? []) {
    if (!extra.number?.trim()) continue
    lines.push(extra.type?.trim() ? `${extra.type}: ${extra.number}` : extra.number)
  }
  return lines
}

function emailLines(employee: Employee) {
  const lines: string[] = []
  if (employee.email?.trim()) {
    lines.push(employee.email_type?.trim() ? `${employee.email_type}: ${employee.email}` : employee.email)
  }
  for (const extra of employee.extra_emails ?? []) {
    if (!extra.address?.trim()) continue
    lines.push(extra.type?.trim() ? `${extra.type}: ${extra.address}` : extra.address)
  }
  return lines
}

function primaryEmail(employee: Employee) {
  return employee.email?.trim() || employee.extra_emails?.find((item) => item.address?.trim())?.address?.trim() || ''
}

function primaryPhone(employee: Employee) {
  return employee.phone?.trim() || employee.extra_phones?.find((item) => item.number?.trim())?.number?.trim() || ''
}

const fieldClass =
  'h-11 w-full rounded-[8px] border border-[#c5d4e4] bg-white px-3 text-sm text-navy outline-none'

function BureauComplianceForm({
  companyId,
  employee,
  documents,
  loading,
}: {
  companyId: string
  employee: Employee | undefined
  documents: ComplianceFile[]
  loading: boolean
}) {
  const queryClient = useQueryClient()
  const [documentType, setDocumentType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const typesQuery = useQuery({
    queryKey: ['compliance-types', companyId, 'employer'],
    queryFn: () => hrApi.complianceTypes(companyId, false),
    enabled: Boolean(companyId),
  })
  const types = ((typesQuery.data?.data as ComplianceDocumentType[] | undefined) ?? typesFor('employer'))
    .map((item) => ({
      ...item,
      requiresExpiry: Boolean(item.requiresExpiry ?? (item as { requires_expiry?: boolean }).requires_expiry),
    }))
    .filter((item) => item.key !== 'NI_EVIDENCE')
    .sort((a, b) => a.label.localeCompare(b.label, 'en-GB', { sensitivity: 'base' }))
  const selectedType = types.find((item) => item.key === documentType) ?? types[0]

  const upload = useMutation({
    mutationFn: async () => {
      if (!employee) throw new Error('Select an employee')
      if (!file || !selectedType) throw new Error('Choose a document type and file')
      if (selectedType.requiresExpiry && !expiryDate) {
        throw new Error(`Enter the expiry date for ${selectedType.label}`)
      }
      const form = new FormData()
      form.append('file', file)
      form.append('document_type', selectedType.key)
      if (expiryDate) form.append('expiry_date', expiryDate)
      return hrApi.uploadCompliance(companyId, employee.id, form)
    },
    onSuccess: async () => {
      setError(null)
      setMessage('Document uploaded')
      setFile(null)
      setExpiryDate('')
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employee?.id] })
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof Error ? err.message : 'Upload failed')
    },
  })

  return (
    <section className="rounded-[12px] border border-[#d7e1ec] bg-white p-5">
      <h2 className="text-base font-semibold text-navy">Compliance</h2>
      {employee ? (
        <p className="mt-1 text-sm text-muted">
          Uploading for {fullName(employee.first_name, employee.last_name)}
        </p>
      ) : null}
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          upload.mutate()
        }}
      >
        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <Field label="Document Type">
          <select
            className={fieldClass}
            value={selectedType?.key ?? ''}
            onChange={(event) => {
              setDocumentType(event.target.value)
              setExpiryDate('')
            }}
          >
            {types.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="File">
          <input
            key={employee?.id ?? 'none'}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.html,.htm"
            className="block w-full rounded-[8px] border border-[#c5d4e4] bg-white px-3 py-2 text-sm text-navy file:mr-3 file:rounded-[6px] file:border file:border-[#c5d4e4] file:bg-[#f4f7fb] file:px-3 file:py-1.5 file:text-sm file:text-navy"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Expiry Date">
          <input
            type="date"
            className={fieldClass}
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
          />
        </Field>
        <div className="flex justify-center pt-2">
          <Button type="submit" disabled={!employee || upload.isPending || !file}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>
      {loading ? (
        <div className="mt-4">
          <Loading />
        </div>
      ) : documents.length > 0 ? (
        <ul className="mt-5 divide-y divide-[#e6eef5] border-t border-[#e6eef5]">
          {documents.map((doc) => (
            <li key={doc.id} className="py-2 text-sm text-navy">
              {doc.title || doc.file_name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function Detail({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.04em] text-muted uppercase">{label}</p>
      {lines.length === 0 ? (
        <p className="mt-1 text-sm text-navy">—</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {lines.map((line) => (
            <li key={line} className="text-sm text-navy">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function BureauPersonalPage() {
  const auth = useAuth()
  const { companyId, isBureauHrManager } = auth
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [view, setView] = useState<'list' | 'table'>('table')

  const employeesQuery = useQuery({
    queryKey: ['bureau-personal-employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId && isBureauHrManager),
  })
  const employees = (employeesQuery.data?.data ?? []) as Employee[]
  const filtered = employees.filter((employee) => {
    const haystack = [
      fullName(employee.first_name, employee.last_name),
      employee.email,
      employee.phone,
      ...(employee.extra_emails ?? []).map((item) => item.address),
      ...(employee.extra_phones ?? []).map((item) => item.number),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })
  const selected =
    filtered.find((employee) => employee.id === employeeId) ?? filtered[0]

  const documentsQuery = useQuery({
    queryKey: ['my-compliance', companyId, selected?.id],
    queryFn: () => hrApi.myCompliance(companyId!, selected!.id),
    enabled: Boolean(companyId && selected?.id && isBureauHrManager),
  })
  const documents = (documentsQuery.data?.data as ComplianceFile[] | undefined) ?? []

  if (!isBureauHrManager) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {view === 'table' ? (
            <p className="mb-2 text-sm text-navy">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-1.5">&gt;</span>
              Bureau Personal
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold text-navy">Bureau Personal</h1>
          <p className="mt-1 text-sm text-muted">
            {view === 'table'
              ? 'Employee information'
              : 'Employee name, phone number, email address and compliance documents.'}
          </p>
        </div>
        <div className="inline-flex rounded-[10px] border border-[#d9d9d9] bg-white p-1">
          <button
            type="button"
            className={`inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold ${
              view === 'table' ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
            }`}
            onClick={() => setView('table')}
          >
            <Table2 size={16} />
            Table
          </button>
          <button
            type="button"
            className={`inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold ${
              view === 'list' ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
            }`}
            onClick={() => setView('list')}
          >
            <LayoutList size={16} />
            List
          </button>
        </div>
      </div>

      {!companyId ? (
        <Alert>Select a company to see its employees.</Alert>
      ) : view === 'table' ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.7fr)]">
          <section className="overflow-hidden rounded-[12px] border border-[#d7e1ec] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#e6eef5] px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
                <Users size={18} />
                Employee Details
              </h2>
              <label className="relative block w-full max-w-[220px]">
                <Search
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                />
                <input
                  className="h-9 w-full rounded-[8px] border border-[#c5d4e4] bg-white pr-3 pl-8 text-sm text-navy outline-none"
                  placeholder="Search..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            {employeesQuery.isLoading ? (
              <Loading />
            ) : employeesQuery.isError ? (
              <div className="p-4">
                <Alert>
                  {employeesQuery.error instanceof Error
                    ? employeesQuery.error.message
                    : 'Could not load employees'}
                </Alert>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm text-navy">
                  <thead>
                    <tr className="border-b border-[#e6eef5]">
                      <th className="px-5 py-3 font-semibold">Employee Name</th>
                      <th className="px-5 py-3 font-semibold">Email Address</th>
                      <th className="px-5 py-3 font-semibold">Phone Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-muted">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((employee) => {
                        const active = employee.id === selected?.id
                        return (
                          <tr
                            key={employee.id}
                            className={`cursor-pointer border-b border-[#eef3f8] last:border-b-0 ${
                              active ? 'bg-[#e7f1f8]' : 'hover:bg-cream'
                            }`}
                            onClick={() => setEmployeeId(employee.id)}
                          >
                            <td className="px-5 py-3.5">{fullName(employee.first_name, employee.last_name)}</td>
                            <td className="px-5 py-3.5">{primaryEmail(employee) || '—'}</td>
                            <td className="px-5 py-3.5">{primaryPhone(employee) || '—'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {documentsQuery.isError ? (
            <Alert>
              {documentsQuery.error instanceof Error
                ? documentsQuery.error.message
                : 'Could not load compliance documents'}
            </Alert>
          ) : (
            <BureauComplianceForm
              key={selected?.id ?? 'none'}
              companyId={companyId}
              employee={selected}
              documents={documents}
              loading={documentsQuery.isLoading}
            />
          )}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="flex min-h-0 flex-col overflow-hidden p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">Employees</h2>
            <label className="relative mb-3 block">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <input
                className="h-10 w-full rounded-[10px] border border-[#d9d9d9] bg-white pr-3 pl-9 text-sm text-navy outline-none"
                placeholder="Search employee..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {employeesQuery.isLoading ? (
                <Loading />
              ) : employeesQuery.isError ? (
                <Alert>
                  {employeesQuery.error instanceof Error
                    ? employeesQuery.error.message
                    : 'Could not load employees'}
                </Alert>
              ) : filtered.length === 0 ? (
                <EmptyState title="No employees found" />
              ) : (
                filtered.map((employee) => {
                  const active = employee.id === selected?.id
                  return (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => setEmployeeId(employee.id)}
                      className={`mb-1 flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm ${
                        active ? 'bg-[#e7f1f8] font-semibold text-navy' : 'text-navy hover:bg-cream'
                      }`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e7f1f8]">
                        <User size={14} />
                      </span>
                      <span className="min-w-0 truncate">
                        {fullName(employee.first_name, employee.last_name)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </Card>

          {selected ? (
            <div className="min-w-0 space-y-4">
              <Card className="p-5">
                <h2 className="text-lg font-semibold text-navy">
                  {fullName(selected.first_name, selected.last_name)}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Detail label="Phone number" lines={phoneLines(selected)} />
                  <Detail label="Email address" lines={emailLines(selected)} />
                </div>
              </Card>
              {documentsQuery.isError ? (
                <Alert>
                  {documentsQuery.error instanceof Error
                    ? documentsQuery.error.message
                    : 'Could not load compliance documents'}
                </Alert>
              ) : (
                <ComplianceDocumentsPanel
                  key={selected.id}
                  companyId={companyId}
                  employeeId={selected.id}
                  role="employer"
                  documents={documents}
                  loading={documentsQuery.isLoading}
                />
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

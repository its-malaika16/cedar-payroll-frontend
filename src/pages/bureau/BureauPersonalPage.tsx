import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, User } from 'lucide-react'
import { employeesApi, hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Card, EmptyState, Loading } from '../../components/ui'
import { fullName } from '../../lib/format'
import type { Employee } from '../../types'
import { ComplianceDocumentsPanel } from '../hr/compliance/ComplianceDocumentsPanel'
import type { ComplianceFile } from '../hr/compliance/documentTypes'

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
      <div>
        <h1 className="text-2xl font-semibold text-navy">Bureau Personal</h1>
        <p className="mt-1 text-sm text-muted">
          Employee name, phone number, email address and compliance documents.
        </p>
      </div>

      {!companyId ? (
        <Alert>Select a company to see its employees.</Alert>
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

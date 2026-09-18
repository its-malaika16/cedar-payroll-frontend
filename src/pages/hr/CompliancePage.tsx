import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, User } from 'lucide-react'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Card, EmptyState, Loading } from '../../components/ui'
import { fullName } from '../../lib/format'
import { ComplianceDocumentsPanel } from './compliance/ComplianceDocumentsPanel'
import type { ComplianceFile } from './compliance/documentTypes'
import { HrTitle } from './HrChrome'

type Group = {
  employee_id: string
  first_name?: string | null
  last_name?: string | null
  employee_code?: string | null
  documents: ComplianceFile[]
  expiring_soon?: number
}

export function CompliancePage() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const query = useQuery({
    queryKey: ['compliance-employees', companyId],
    queryFn: () => hrApi.complianceByEmployee(companyId!),
    enabled: Boolean(companyId),
  })
  const groups = (query.data?.data as Group[] | undefined) ?? []
  const filtered = groups.filter((group) =>
    fullName(group.first_name, group.last_name).toLowerCase().includes(search.trim().toLowerCase()),
  )
  const selected = useMemo(
    () => groups.find((group) => group.employee_id === employeeId) ?? filtered[0],
    [employeeId, filtered, groups],
  )
  const docs = selected?.documents ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6">
        <HrTitle title="Compliance" onBack={() => navigate('/hr')} />
        <p className="mt-2 text-sm font-semibold text-muted">
          Company and bureau view of employee documents, including expiry tracking.
        </p>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">All Employees</h2>
          <label className="relative mb-3 block">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              className="h-10 w-full rounded-[10px] border border-[#d9d9d9] bg-white pl-9 pr-3 text-sm outline-none"
              placeholder="Search employee..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {query.isLoading ? (
              <Loading />
            ) : (
              filtered.map((group) => {
                const active = group.employee_id === selected?.employee_id
                return (
                  <button
                    key={group.employee_id}
                    type="button"
                    onClick={() => setEmployeeId(group.employee_id)}
                    className={`mb-1 flex w-full items-center justify-between gap-2 rounded-[10px] px-2 py-2 text-left text-sm ${
                      active ? 'bg-[#e7f1f8] font-semibold text-navy' : 'text-navy hover:bg-cream'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e7f1f8]">
                        <User size={14} />
                      </span>
                      <span className="truncate">{fullName(group.first_name, group.last_name)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {group.expiring_soon ? `${group.expiring_soon} due` : group.documents.length}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </Card>
        <Card className="flex min-h-0 flex-col overflow-hidden">
          {!selected || !companyId ? (
            <EmptyState title="Select an employee" body="Uploaded files appear here for company and bureau review." />
          ) : (
            <>
              <div className="border-b border-[#eceae6] px-5 py-4">
                <h2 className="text-lg font-semibold text-navy">
                  {fullName(selected.first_name, selected.last_name)}
                </h2>
                <p className="text-sm text-muted">Upload, review and control which employer files the employee can see.</p>
              </div>
              <ComplianceDocumentsPanel
                companyId={companyId}
                employeeId={selected.employee_id}
                role="employer"
                documents={docs}
                loading={query.isLoading}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

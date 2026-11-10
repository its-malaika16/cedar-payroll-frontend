import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { get } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Card, EmptyState, Loading, PageHeader } from '../components/ui'
import { idOf } from '../lib/format'

type ActivityRow = {
  id: string
  created_at?: string | null
  activity_name: string
  employee_name?: string | null
  employeeName?: string | null
  schedule_name?: string | null
  period_label?: string | null
  person_name: string
  email: string
  role: string
  company_name: string
}

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number)
  const next = new Date(year, (month || 1) - 1 + delta, 1)
  return monthKeyFromDate(next)
}

function monthMeta(key: string) {
  const [year, month] = key.split('-').map(Number)
  const days = new Date(year, month, 0).getDate()
  const label = new Date(year, (month || 1) - 1, 1).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  return { days, label }
}

function activityLines(row: ActivityRow) {
  const named =
    row.employee_name?.trim() ||
    row.employeeName?.trim() ||
    row.schedule_name?.trim() ||
    row.period_label?.trim()
  if (named) {
    return { action: row.activity_name.replace(/\s+for\s+[A-Za-z].*$/, '').trim() || row.activity_name, employee: named }
  }
  const match = row.activity_name.match(/^(.*?)\s+for\s+([A-Za-z][A-Za-z' -]{1,80})$/)
  if (match) return { action: match[1].trim(), employee: match[2].trim() }
  const created = row.activity_name.match(/^(Created|Deleted) employee\s+(.+)$/i)
  if (created) return { action: `${created[1]} employee`, employee: created[2].trim() }
  return { action: row.activity_name, employee: '' }
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

export function ActivitiesPage() {
  const auth = useAuth()
  const { companyId, isBureauAdmin, companies } = auth
  const [month, setMonth] = useState(() => monthKeyFromDate(new Date()))
  const meta = useMemo(() => monthMeta(month), [month])
  const companyName = companies.find((company) => company.id === companyId)?.name

  const query = useQuery({
    queryKey: ['activities', companyId, month],
    queryFn: () => get<ActivityRow[]>(`/companies/${companyId}/activities?month=${month}`),
    enabled: Boolean(companyId && isBureauAdmin),
  })
  const list = (query.data?.data as ActivityRow[] | undefined) ?? []

  if (!isBureauAdmin) return <Navigate to="/app" replace />

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <PageHeader
        title="Activities"
        subtitle={
          companyName
            ? `Actions for ${companyName} from 1 to ${meta.days} ${meta.label}.`
            : `Actions for the selected company from 1 to ${meta.days} ${meta.label}.`
        }
        actions={
          <div className="flex items-center gap-2 text-sm font-semibold text-navy">
            <button
              type="button"
              className="rounded-[10px] border border-[#d9d9d9] bg-white p-2 hover:bg-cream"
              aria-label="Previous month"
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[168px] text-center">
              {meta.label}
              <span className="mt-0.5 block text-xs font-medium text-muted">{meta.days} days</span>
            </span>
            <button
              type="button"
              className="rounded-[10px] border border-[#d9d9d9] bg-white p-2 hover:bg-cream"
              aria-label="Next month"
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState
            title="No activities this month"
            body={`Nothing was recorded for ${companyName || 'this company'} between 1 and ${meta.days} ${meta.label}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[#eceae6] bg-cream text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Person</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Activity</th>
                  <th className="px-5 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee]">
                {list.map((row) => {
                  const activity = activityLines(row)
                  return (
                  <tr key={idOf(row)} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-navy">{row.person_name}</p>
                      <p className="text-xs text-muted">{row.email}</p>
                    </td>
                    <td className="px-5 py-3 text-navy">{row.role}</td>
                    <td className="px-5 py-3 text-navy">{row.company_name}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-navy">{activity.action}</p>
                      {activity.employee ? (
                        <p className="text-xs text-muted">{activity.employee}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">{when(row.created_at)}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

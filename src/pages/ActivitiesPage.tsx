import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { get } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Card, EmptyState, Loading, PageHeader } from '../components/ui'
import { idOf } from '../lib/format'

type ActivityRow = {
  id: string
  created_at?: string | null
  activity_name: string
  person_name: string
  email: string
  role: string
  company_name: string
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
  const { companyId, isBureauAdmin } = auth

  const query = useQuery({
    queryKey: ['activities', companyId],
    queryFn: () => get<ActivityRow[]>(`/companies/${companyId}/activities`),
    enabled: Boolean(companyId && isBureauAdmin),
  })
  const list = (query.data?.data as ActivityRow[] | undefined) ?? []

  if (!isBureauAdmin) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <PageHeader
        title="Activities"
        subtitle="Every action taken in the system by bureau, company, and employee users."
      />
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState
            title="No activities yet"
            body="Assigning a shift, adding leave, or other changes will appear here with the person’s name, role, and company."
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
                {list.map((row) => (
                  <tr key={idOf(row)} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-navy">{row.person_name}</p>
                      <p className="text-xs text-muted">{row.email}</p>
                    </td>
                    <td className="px-5 py-3 text-navy">{row.role}</td>
                    <td className="px-5 py-3 text-navy">{row.company_name}</td>
                    <td className="px-5 py-3 font-medium text-navy">{row.activity_name}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">{when(row.created_at)}</td>
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

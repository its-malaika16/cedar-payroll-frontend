import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { helpApi } from '../../api'
import { Card, EmptyState, Loading, Table } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { HrTitle } from '../hr/HrChrome'

type PayrollDueRow = {
  schedule_id: string
  schedule_name: string
  pay_frequency: string
  period_end_date: string
  pay_date: string
  source: 'run' | 'projected'
}

function frequencyLabel(value?: string) {
  if (!value) return '—'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function HelpPayrollDuePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['help-payroll-due', auth.companyId],
    queryFn: () => helpApi.payrollDue(auth.companyId!),
    enabled: Boolean(auth.companyId),
  })
  const rows = (query.data?.data as PayrollDueRow[] | undefined) ?? []

  return (
    <div>
      <HrTitle title="Next payroll due" onBack={() => navigate('/help')} />
      <p className="mt-3 mb-6 text-sm text-muted">
        Schedule names, week or month ending dates, and the next pay date.
      </p>
      {query.isLoading ? <Loading /> : null}
      {!query.isLoading && rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No active schedules"
            body="Add a payroll schedule for this company to see the next due date."
          />
        </Card>
      ) : null}
      {rows.length > 0 ? (
        <Card>
          <Table columns={['Schedule', 'Frequency', 'Week/month ending', 'Pay date']}>
            {rows.map((row) => (
              <tr key={row.schedule_id}>
                <td className="px-4 py-3 font-semibold text-navy">{row.schedule_name}</td>
                <td className="px-4 py-3 text-navy">{frequencyLabel(row.pay_frequency)}</td>
                <td className="px-4 py-3 text-navy">{formatDate(row.period_end_date)}</td>
                <td className="px-4 py-3 text-navy">{formatDate(row.pay_date)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : null}
    </div>
  )
}

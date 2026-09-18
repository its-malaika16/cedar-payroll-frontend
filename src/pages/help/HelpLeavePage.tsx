import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { helpApi } from '../../api'
import { Button, Card, EmptyState, Field, Input, Loading, Table } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { HrTitle } from '../hr/HrChrome'

type LeavePayload = {
  from: string
  to: string
  employees: {
    id: string
    employee_id: string
    employee_name: string
    start_date: string
    end_date: string
    leave_type: string
  }[]
}

function toKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfIsoWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function HelpLeavePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const defaults = useMemo(() => {
    const today = localToday()
    return { from: toKey(today), to: toKey(addDays(today, 27)) }
  }, [])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)

  const query = useQuery({
    queryKey: ['help-leave', auth.companyId, from, to],
    queryFn: () => helpApi.leave(auth.companyId!, from, to),
    enabled: Boolean(auth.companyId && from && to),
  })
  const payload = query.data?.data as LeavePayload | undefined
  const rows = payload?.employees ?? []

  const applyRange = (nextFrom: Date, nextTo: Date) => {
    setFrom(toKey(nextFrom))
    setTo(toKey(nextTo))
  }

  return (
    <div>
      <HrTitle title="Employees on leave" onBack={() => navigate('/help')} />
      <p className="mt-3 mb-6 text-sm text-muted">
        Approved leave for this company. Choose a date range to see who is away.
      </p>
      <Card className="mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="From">
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const today = localToday()
              applyRange(startOfIsoWeek(today), addDays(startOfIsoWeek(today), 6))
            }}
          >
            This week
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const today = localToday()
              applyRange(startOfMonth(today), endOfMonth(today))
            }}
          >
            This month
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const today = localToday()
              applyRange(today, addDays(today, 27))
            }}
          >
            From today
          </Button>
        </div>
      </Card>
      {query.isLoading ? <Loading /> : null}
      {!query.isLoading && rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No employees on leave"
            body="Nobody has approved leave in this date range."
          />
        </Card>
      ) : null}
      {rows.length > 0 ? (
        <Card>
          <Table columns={['Employee', 'Leave starts', 'Leave ends', 'Leave type']}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-semibold text-navy">{row.employee_name}</td>
                <td className="px-4 py-3 text-navy">{formatDate(row.start_date)}</td>
                <td className="px-4 py-3 text-navy">{formatDate(row.end_date)}</td>
                <td className="px-4 py-3 text-navy">{row.leave_type}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : null}
    </div>
  )
}

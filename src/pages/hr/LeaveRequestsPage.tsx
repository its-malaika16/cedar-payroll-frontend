import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Inbox, Search, User, X } from 'lucide-react'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Badge, Button, Card, EmptyState, Loading, Table, Textarea } from '../../components/ui'
import { fullName, idOf, labelize } from '../../lib/format'
import { formatLeaveRange, leaveTypeColor } from './leaveTypes'
import { HrCrumbs, HrTitle, RequestsButton } from './HrChrome'

type LeaveRequest = {
  id?: unknown
  employee_id?: unknown
  leave_type?: string
  start_date?: string
  end_date?: string
  status?: string
  is_paid?: boolean
  reason?: string | null
  rejection_reason?: string | null
  created_at?: string | null
  employees?: { first_name?: string | null; last_name?: string | null }
}

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL'] as const

function statusRank(status?: string) {
  const value = String(status ?? '').toUpperCase()
  if (value === 'PENDING') return 0
  if (value === 'APPROVED') return 1
  if (value === 'REJECTED') return 2
  return 3
}

export function LeaveRequestsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, can } = useAuth()
  const canReview = can('leave.approve')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('PENDING')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState('')
  const [approving, setApproving] = useState<LeaveRequest | null>(null)
  const [approvePaid, setApprovePaid] = useState(true)
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const query = useQuery({
    queryKey: ['leave', companyId],
    queryFn: () => hrApi.leaveAll(companyId!),
    enabled: Boolean(companyId),
  })

  const requests = ((query.data?.data as LeaveRequest[] | undefined) ?? []).map((item) => ({
    ...item,
    id: idOf(item),
    employee_id: String(item.employee_id ?? idOf(item.employees) ?? ''),
  }))

  const pendingCount = requests.filter((item) => String(item.status).toUpperCase() === 'PENDING').length

  const counts = useMemo(() => {
    const next = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0, ALL: requests.length }
    for (const item of requests) {
      const status = String(item.status ?? '').toUpperCase()
      if (status in next) next[status as keyof typeof next] += 1
    }
    return next
  }, [requests])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return requests
      .filter((item) => {
        const status = String(item.status ?? '').toUpperCase()
        if (filter !== 'ALL' && status !== filter) return false
        if (!needle) return true
        const name = fullName(item.employees?.first_name, item.employees?.last_name).toLowerCase()
        return name.includes(needle) || String(item.leave_type ?? '').toLowerCase().includes(needle)
      })
      .sort((left, right) => {
        const rank = statusRank(left.status) - statusRank(right.status)
        if (rank !== 0) return rank
        return String(right.start_date ?? '').localeCompare(String(left.start_date ?? ''))
      })
  }, [filter, requests, search])

  async function review(
    item: LeaveRequest,
    status: 'APPROVED' | 'REJECTED',
    options?: { isPaid?: boolean; reason?: string },
  ) {
    if (!companyId || !item.id) return
    setError(null)
    setMessage(null)
    setBusyId(String(item.id))
    try {
      const result = await hrApi.reviewLeave(companyId, String(item.id), {
        status,
        ...(status === 'APPROVED' ? { is_paid: options?.isPaid } : {}),
        ...(status === 'REJECTED' ? { rejection_reason: options?.reason } : {}),
      })
      setMessage(result.message)
      setApproving(null)
      setRejecting(null)
      setRejectionReason('')
      await queryClient.invalidateQueries({ queryKey: ['leave', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['leave-upcoming', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['leave-balance', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this leave request')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <HrCrumbs
        items={[
          { label: 'HR', to: '/hr' },
          { label: 'Leave', to: '/hr/leave' },
          { label: 'Requests' },
        ]}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <HrTitle title="Requests" onBack={() => navigate('/hr/leave')} />
        <RequestsButton count={pendingCount} active />
      </div>
      <p className="mb-5 text-sm text-muted">
        Leave requests submitted by employees. Approve or reject pending items here.
      </p>

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-[10px] border border-[#d9d9d9] bg-white p-1 text-sm font-semibold">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-[8px] px-3 py-1.5 ${
                filter === item ? 'bg-navy text-white' : 'text-navy'
              }`}
              onClick={() => setFilter(item)}
            >
              {item === 'ALL' ? 'All' : labelize(item)}
              <span className={`ml-1.5 text-xs ${filter === item ? 'text-white/80' : 'text-muted'}`}>
                {counts[item]}
              </span>
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            className="h-10 w-full rounded-[10px] border border-[#d9d9d9] bg-white pl-9 pr-3 text-sm text-navy outline-none"
            placeholder="Search employee or type..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <Card>
        {query.isLoading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No leave requests"
            body={
              filter === 'PENDING'
                ? 'There are no pending leave requests.'
                : 'No leave requests match this filter.'
            }
          />
        ) : (
          <Table columns={['Employee', 'Leave type', 'Dates', 'Paid', 'Status', 'Actions']}>
            {visible.map((item) => {
              const pending = String(item.status).toUpperCase() === 'PENDING'
              const busy = busyId === String(item.id)
              return (
                <tr key={String(item.id)}>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 font-medium text-navy hover:underline"
                      onClick={() => navigate(`/hr/leave/${item.employee_id}`)}
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
                        <User size={14} />
                      </span>
                      {fullName(item.employees?.first_name, item.employees?.last_name)}
                    </button>
                    {item.reason ? (
                      <p className="mt-1 max-w-[280px] truncate text-xs text-muted">{item.reason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-navy">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: leaveTypeColor(item.leave_type) }}
                      />
                      {item.leave_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-navy">{formatLeaveRange(item.start_date, item.end_date)}</td>
                  <td className="px-4 py-3 text-navy">
                    {pending ? '—' : item.is_paid === false ? 'Unpaid' : 'Paid'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={item.status}>{labelize(item.status)}</Badge>
                    {item.rejection_reason ? (
                      <p className="mt-1 max-w-[220px] truncate text-xs text-muted">{item.rejection_reason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {pending && canReview ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={busy}
                          onClick={() => {
                            setApproving(item)
                            setApprovePaid(item.is_paid !== false)
                          }}
                        >
                          <Check size={14} />
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setRejecting(item)
                            setRejectionReason('')
                          }}
                        >
                          <X size={14} />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      {approving ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-navy">Approve leave request</h2>
            <p className="mt-1 text-sm text-muted">
              {fullName(approving.employees?.first_name, approving.employees?.last_name)} ·{' '}
              {formatLeaveRange(approving.start_date, approving.end_date)}
            </p>
            <p className="mt-5 mb-2 text-sm font-medium text-navy">Leave is</p>
            <div className="flex gap-4 text-sm text-navy">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="approve-leave-paid"
                  checked={approvePaid}
                  onChange={() => setApprovePaid(true)}
                />
                Paid
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="approve-leave-paid"
                  checked={!approvePaid}
                  onChange={() => setApprovePaid(false)}
                />
                Unpaid
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setApproving(null)} disabled={Boolean(busyId)}>
                Cancel
              </Button>
              <Button
                disabled={Boolean(busyId)}
                onClick={() => void review(approving, 'APPROVED', { isPaid: approvePaid })}
              >
                Approve request
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {rejecting ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy">Reject leave request</h2>
                <p className="mt-1 text-sm text-muted">
                  {fullName(rejecting.employees?.first_name, rejecting.employees?.last_name)} ·{' '}
                  {formatLeaveRange(rejecting.start_date, rejecting.end_date)}
                </p>
              </div>
              <Inbox size={18} className="text-navy" />
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-navy">Reason</span>
              <Textarea
                variant="outline"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Tell the employee why this request is being rejected"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejecting(null)} disabled={Boolean(busyId)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={Boolean(busyId) || !rejectionReason.trim()}
                onClick={() => void review(rejecting, 'REJECTED', { reason: rejectionReason.trim() })}
              >
                Reject request
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

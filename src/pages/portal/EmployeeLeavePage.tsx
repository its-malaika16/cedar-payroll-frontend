import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Baby,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plane,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Loading } from '../../components/ui'
import { idOf } from '../../lib/format'
import {
  addDays,
  dateKey,
  daysInPeriod,
  formatMonthLabel,
  startOfWeek,
  weeksInMonth,
} from '../hr/rota/rotaDates'
import {
  coversDate,
  EMPLOYEE_LEAVE_TYPES,
  formatLeaveDay,
  formatLeaveDayLong,
  formatLeaveRangeShort,
  idOfLeave,
  leaveStatus,
  statusMeta,
  weekdayCount,
  weeksLabel,
  type LeaveBalance,
  type LeaveItem,
} from './employeeLeave'

type LeaveListResponse = {
  data?: LeaveItem[]
  balance?: LeaveBalance
}

function StatusPill({ status }: { status?: string }) {
  const meta = statusMeta(leaveStatus(status))
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className={`size-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-navy">{label}</span>
      {children}
    </label>
  )
}

function LeaveRequestModal({
  initial,
  onClose,
  onSubmit,
  error,
}: {
  initial?: Partial<LeaveItem>
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => Promise<void>
  error: string | null
}) {
  const [form, setForm] = useState({
    leave_type: initial?.leave_type || 'Annual leave',
    start_date: String(initial?.start_date ?? '').slice(0, 10),
    end_date: String(initial?.end_date ?? initial?.start_date ?? '').slice(0, 10),
    duration_kind: initial?.duration_kind === 'PARTIAL_DAY' ? 'PARTIAL_DAY' : 'FULL_DAY',
    partial_period: initial?.partial_period === 'AFTERNOON' ? 'AFTERNOON' : 'MORNING',
    reason: initial?.reason ?? '',
    attachment_name: initial?.attachment_name ?? '',
  })
  const [busy, setBusy] = useState(false)
  const days = weekdayCount(form.start_date, form.end_date, form.duration_kind === 'PARTIAL_DAY')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-[720px] rounded-[20px] bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#eef2f6] text-navy">
            <User size={28} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-navy">Leave Request Details</h2>
          <p className="mt-1 text-sm text-muted">Verify the details before submitting the request</p>
        </div>
        {error ? (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        <form
          className="mt-8 grid gap-5 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              await onSubmit({
                leave_type: form.leave_type,
                start_date: form.start_date,
                end_date: form.end_date || form.start_date,
                duration_kind: form.duration_kind,
                partial_period: form.duration_kind === 'PARTIAL_DAY' ? form.partial_period : null,
                reason: form.reason.trim() || null,
                attachment_name: form.attachment_name || null,
              })
            } finally {
              setBusy(false)
            }
          }}
        >
          <FieldShell label="Leave Type">
            <select
              className="h-12 w-full rounded-full border border-[#eceae6] bg-[#f7f6f3] px-4 text-sm text-navy outline-none"
              value={form.leave_type}
              onChange={(event) => setForm({ ...form, leave_type: event.target.value })}
            >
              {EMPLOYEE_LEAVE_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Total Days">
            <input
              readOnly
              className="h-12 w-full rounded-full border border-[#eceae6] bg-[#f7f6f3] px-4 text-sm text-navy outline-none"
              value={days || ''}
            />
          </FieldShell>
          <FieldShell label="Start Date">
            <input
              type="date"
              required
              className="h-12 w-full rounded-full border border-[#eceae6] bg-[#f7f6f3] px-4 text-sm text-navy outline-none"
              value={form.start_date}
              onChange={(event) =>
                setForm({
                  ...form,
                  start_date: event.target.value,
                  end_date: form.end_date && form.end_date < event.target.value ? event.target.value : form.end_date,
                })
              }
            />
          </FieldShell>
          <FieldShell label="End Date">
            <input
              type="date"
              required
              className="h-12 w-full rounded-full border border-[#eceae6] bg-[#f7f6f3] px-4 text-sm text-navy outline-none"
              value={form.end_date}
              onChange={(event) => setForm({ ...form, end_date: event.target.value })}
            />
          </FieldShell>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-navy">Leave Duration</p>
            <div className="flex flex-wrap gap-6 text-sm text-navy">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.duration_kind === 'FULL_DAY'}
                  onChange={() => setForm({ ...form, duration_kind: 'FULL_DAY' })}
                />
                <span>
                  Full day
                  <span className="ml-1 text-muted">whole working day</span>
                </span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.duration_kind === 'PARTIAL_DAY'}
                  onChange={() => setForm({ ...form, duration_kind: 'PARTIAL_DAY' })}
                />
                <span>
                  Partial day
                  <span className="ml-1 text-muted">morning / day</span>
                </span>
              </label>
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-navy">Attachment</p>
            <label className="flex min-h-[88px] cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-dashed border-[#d9d9d9] px-4 py-4">
              <span className="inline-flex items-center gap-3 text-sm text-muted">
                <Upload size={20} className="text-navy" />
                {form.attachment_name || 'Drag and drop a file here, or click to browse'}
              </span>
              <span className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white">Browse Files</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(event) =>
                  setForm({ ...form, attachment_name: event.target.files?.[0]?.name ?? '' })
                }
              />
            </label>
            <p className="mt-2 text-xs text-muted">Supported formats: PDF, JPG, PNG, DOC, DOCX</p>
          </div>
          <FieldShell label="Reason">
            <input
              className="h-12 w-full rounded-full border border-[#eceae6] bg-[#f7f6f3] px-4 text-sm text-navy outline-none"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              placeholder="Optional"
            />
          </FieldShell>
          <div className="flex items-end justify-end gap-3 sm:col-span-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-full border border-[#d9d9d9] px-6 text-sm font-semibold text-navy"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !form.start_date || !form.end_date}
              className="h-11 rounded-full bg-navy px-6 text-sm font-semibold text-white disabled:opacity-40"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function useEmployeeLeave() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const query = useQuery({
    queryKey: ['my-leave', companyId, employeeId],
    queryFn: () => hrApi.myLeave(companyId!, employeeId!) as Promise<LeaveListResponse>,
    enabled: Boolean(companyId && employeeId),
  })
  const balanceQuery = useQuery({
    queryKey: ['leave-balance', companyId, employeeId],
    queryFn: () => hrApi.leaveBalance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const requests = ((query.data?.data as LeaveItem[] | undefined) ?? []).map((item) => ({
    ...item,
    id: idOf(item),
  }))
  const balance = (balanceQuery.data?.data as LeaveBalance | undefined) ?? query.data?.balance
  return { companyId, employeeId, query, balanceQuery, requests, balance }
}

export function EmployeeLeavePage() {
  const navigate = useNavigate()
  const { companyId, employeeId, query, requests, balance } = useEmployeeLeave()
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'week' | 'month'>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [modal, setModal] = useState<Partial<LeaveItem> | null>(null)

  const weekStart = startOfWeek(anchor)
  const monthWeeks = useMemo(() => weeksInMonth(anchor), [anchor])
  const weekDays = useMemo(() => daysInPeriod(weekStart, addDays(weekStart, 6)), [weekStart])
  const periodLabel =
    view === 'month'
      ? `${new Date(anchor.getFullYear(), anchor.getMonth(), 1).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
        })} - ${new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`
      : `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - ${addDays(weekStart, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const todayKey = dateKey(new Date())
  const recent = requests.slice(0, 3)
  const timelineItem = requests.find((item) => leaveStatus(item.status) === 'PENDING') ?? requests[0]
  const cards = [
    { label: 'Annual Leave Remaining', icon: Plane, value: balance?.annual },
    { label: 'SSP remaining', icon: BedDouble, value: balance?.ssp },
    { label: 'SMP Remaining', icon: Baby, value: balance?.smp },
    { label: 'SPP remaining', icon: CalendarDays, value: balance?.spp },
  ]

  async function submitRequest(body: Record<string, unknown>) {
    if (!companyId || !employeeId) return
    setError(null)
    await hrApi.createLeave(companyId, employeeId, body)
    setModal(null)
    await query.refetch()
  }

  function shiftPeriod(direction: number) {
    setAnchor((current) =>
      view === 'month'
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : addDays(current, direction * 7),
    )
  }

  function openDay(day: Date) {
    const key = dateKey(day)
    const existing = requests.find((item) => coversDate(item, key))
    if (existing) {
      navigate(`/portal/leave/requests?id=${idOfLeave(existing)}`)
      return
    }
    setModal({ start_date: key, end_date: key })
  }

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        Leave
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-semibold text-navy">Leave</h1>
          <p className="mt-1 text-sm text-muted">Request and manage your leave</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ start_date: todayKey, end_date: todayKey })}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white"
        >
          Request leave
        </button>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <section key={card.label} className="rounded-[16px] border border-[#eceae6] bg-white px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-xs text-muted">{card.label}</p>
                  <p className="mt-1 text-xl font-semibold text-navy">{weeksLabel(card.value?.remaining_weeks)}</p>
                  <p className="text-xs text-muted">out of {weeksLabel(card.value?.entitled_weeks)}</p>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-[#eceae6] p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`rounded-full px-4 py-2 ${view === 'week' ? 'bg-navy text-white' : 'text-navy'}`}
          >
            Week Overview
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`rounded-full px-4 py-2 ${view === 'month' ? 'bg-navy text-white' : 'text-navy'}`}
          >
            Month Overview
          </button>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-1 text-sm font-semibold text-navy">
          <button type="button" className="rounded-full p-1 hover:bg-[#f6f5f2]" onClick={() => shiftPeriod(-1)}>
            <ChevronLeft size={18} />
          </button>
          <span className="inline-flex items-center gap-2 px-2">
            <CalendarDays size={15} />
            {periodLabel}
          </span>
          <button type="button" className="rounded-full p-1 hover:bg-[#f6f5f2]" onClick={() => shiftPeriod(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[16px] border border-[#eceae6] bg-white p-5">
          <div className="mb-4 flex items-center justify-between text-navy">
            <button type="button" className="rounded-full p-1 hover:bg-[#f6f5f2]" onClick={() => shiftPeriod(-1)}>
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold">{formatMonthLabel(anchor)}</p>
            <button type="button" className="rounded-full p-1 hover:bg-[#f6f5f2]" onClick={() => shiftPeriod(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          {query.isLoading ? (
            <Loading />
          ) : view === 'month' ? (
            <>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {monthWeeks.flat().map((day) => {
                  const key = dateKey(day)
                  const outside = day.getMonth() !== anchor.getMonth()
                  const match = requests.find((item) => coversDate(item, key))
                  const status = match ? leaveStatus(match.status) : null
                  const today = key === todayKey
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openDay(day)}
                      className={`min-h-[64px] rounded-[10px] px-2 py-2 text-left ${
                        outside ? 'text-muted/40' : 'text-navy hover:bg-[#f7f6f3]'
                      }`}
                    >
                      <span
                        className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold ${
                          today ? 'bg-navy text-white' : ''
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {match && status ? (
                        <span className={`mt-2 block size-2 rounded-full ${statusMeta(status).dot}`} />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="grid gap-3 md:grid-cols-7">
              {weekDays.map((day) => {
                const key = dateKey(day)
                const match = requests.find((item) => coversDate(item, key))
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openDay(day)}
                    className="min-h-[120px] rounded-[12px] border border-[#eceae6] p-3 text-left hover:bg-[#f7f6f3]"
                  >
                    <p className="text-xs text-muted">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                    <p className="mt-1 text-lg font-semibold text-navy">{day.getDate()}</p>
                    {match ? <div className="mt-3"><StatusPill status={match.status} /></div> : null}
                  </button>
                )
              })}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#22c55e]" />
              Approved
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#e2a334]" />
              Pending
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#d32027]" />
              Rejected
            </span>
          </div>
        </section>

        <div className="space-y-5">
          <aside className="rounded-[16px] border border-[#eceae6] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
                <span className="flex size-8 items-center justify-center rounded-[8px] bg-[#eef2f6]">
                  <User size={15} />
                </span>
                My Leave Requests
              </p>
              <Link to="/portal/leave/requests" className="text-xs font-semibold text-navy">
                View All +
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {recent.length === 0 ? (
                <p className="text-sm text-muted">No leave requests yet. Click a day to request leave.</p>
              ) : (
                recent.map((item) => (
                  <button
                    key={idOfLeave(item)}
                    type="button"
                    onClick={() => navigate(`/portal/leave/requests?id=${idOfLeave(item)}`)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-navy">{item.leave_type}</p>
                      <p className="text-xs text-muted">{formatLeaveRangeShort(item.start_date, item.end_date)}</p>
                    </div>
                    <StatusPill status={item.status} />
                  </button>
                ))
              )}
            </div>
          </aside>

          <aside className="rounded-[16px] border border-[#eceae6] bg-white p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
              <span className="flex size-8 items-center justify-center rounded-[8px] bg-[#eef2f6]">
                <Clock3 size={15} />
              </span>
              Approval Timeline
            </p>
            <ApprovalTimeline item={timelineItem} />
          </aside>
        </div>
      </div>

      {modal ? (
        <LeaveRequestModal
          initial={modal}
          error={error}
          onClose={() => {
            setError(null)
            setModal(null)
          }}
          onSubmit={async (body) => {
            try {
              await submitRequest(body)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not submit this leave request')
              throw err
            }
          }}
        />
      ) : null}
    </div>
  )
}

function ApprovalTimeline({ item }: { item?: LeaveItem }) {
  const status = item ? leaveStatus(item.status) : null
  const submittedAt = item?.created_at
    ? new Date(item.created_at).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null
  const assigned = Boolean(item?.assigned_by_admin || item?.source === 'ADMIN')
  const steps = [
    {
      title: 'Request Submitted',
      body: assigned
        ? 'This leave was assigned by your administrator'
        : submittedAt
          ? `${submittedAt}\nYour leave request has been submitted`
          : 'Submit a leave request to start the approval process',
      state: item ? 'done' : 'wait',
    },
    {
      title: 'Waiting for Approval',
      body: assigned
        ? 'Assigned leave does not need a further review'
        : status === 'PENDING'
          ? 'Sent to HR / Administrator\nUnder review by HR / Admin'
          : item
            ? 'Reviewed by HR / Administrator'
            : 'Your request is sent to HR for review',
      state: !item ? 'idle' : status === 'PENDING' && !assigned ? 'current' : 'done',
    },
    {
      title: 'Approval Decision',
      body:
        status === 'APPROVED'
          ? assigned
            ? 'This leave was assigned and approved by your administrator'
            : 'This request was approved by the administrator'
          : status === 'REJECTED'
            ? 'This request was rejected by the administrator'
            : 'You will be notified once a decision is made',
      state:
        status === 'APPROVED' ? 'done' : status === 'REJECTED' ? 'rejected' : item ? 'idle' : 'idle',
    },
  ] as const

  return (
    <ol className="mt-5 space-y-5">
      {steps.map((step) => (
        <li key={step.title} className="flex gap-3">
          <span
            className={`mt-0.5 flex size-6 items-center justify-center rounded-full ${
              step.state === 'done'
                ? 'bg-[#e7f6ec] text-[#1b7d4f]'
                : step.state === 'current'
                  ? 'bg-[#fff4e5] text-[#c2782a]'
                  : step.state === 'rejected'
                    ? 'bg-[#fdecee] text-[#d32027]'
                    : 'bg-[#eceae6] text-muted'
            }`}
          >
            {step.state === 'done' ? (
              <CheckCircle2 size={15} />
            ) : step.state === 'rejected' ? (
              <XCircle size={15} />
            ) : (
              <Clock3 size={14} />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">{step.title}</p>
            <p className="mt-1 whitespace-pre-line text-xs text-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function EmployeeLeaveRequestsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { companyId, employeeId, query, requests } = useEmployeeLeave()
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<Partial<LeaveItem> | null>(null)
  const selectedId = params.get('id')
  const selected = requests.find((item) => idOfLeave(item) === selectedId) ?? requests[0] ?? null

  async function cancelRequest(item: LeaveItem) {
    if (!companyId || !employeeId || !item.id) return
    setError(null)
    await hrApi.cancelLeave(companyId, employeeId, String(item.id))
    await query.refetch()
  }

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        <Link to="/portal/leave" className="hover:text-navy">
          Leave
        </Link>
        {' > '}
        Request List
      </p>
      <h1 className="mt-2 text-[32px] font-semibold text-navy">Leave Request List</h1>
      <p className="mt-1 text-sm text-muted">Request and manage your leave</p>
      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[16px] border border-[#eceae6] bg-white">
          <div className="flex items-center gap-3 border-b border-[#eceae6] px-5 py-4">
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-[#eef2f6] text-navy">
              <User size={15} />
            </span>
            <p className="text-sm font-semibold text-navy">My Leave Requests</p>
          </div>
          {query.isLoading ? (
            <div className="px-5 py-8">
              <Loading />
            </div>
          ) : requests.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">No leave requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-medium text-muted">
                    {['Leave Type', 'Start Date', 'End Date', 'Status'].map((column) => (
                      <th key={column} className="px-5 py-3 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((item) => {
                    const active = selected && idOfLeave(item) === idOfLeave(selected)
                    return (
                      <tr
                        key={idOfLeave(item)}
                        className={`cursor-pointer border-t border-[#f3f1ec] ${active ? 'bg-[#eef5fb]' : ''}`}
                        onClick={() => setParams({ id: idOfLeave(item) })}
                      >
                        <td className="px-5 py-4 font-medium text-navy">{item.leave_type}</td>
                        <td className="px-5 py-4 text-navy">{formatLeaveDay(item.start_date)}</td>
                        <td className="px-5 py-4 text-navy">{formatLeaveDay(item.end_date)}</td>
                        <td className="px-5 py-4">
                          <StatusPill status={item.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-[16px] border border-[#eceae6] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
              <CalendarDays size={16} />
              Request Details
            </p>
            <button type="button" onClick={() => navigate('/portal/leave')} className="text-muted hover:text-navy">
              <X size={18} />
            </button>
          </div>
          {selected ? (
            <>
              <dl className="mt-5 space-y-4 text-sm">
                <Row label="Request ID" value={selected.request_code || `LV-${idOfLeave(selected)}`} />
                <Row label="Leave Type" value={selected.leave_type || '—'} />
                <Row label="Start Date" value={formatLeaveDayLong(selected.start_date)} />
                <Row label="End Date" value={formatLeaveDayLong(selected.end_date)} />
                <Row
                  label="Duration"
                  value={`${selected.days ?? weekdayCount(String(selected.start_date), String(selected.end_date), selected.duration_kind === 'PARTIAL_DAY')} days`}
                />
                <Row label="Leave Period" value={selected.duration_label || 'Full day'} />
                <Row
                  label="Reason"
                  value={
                    selected.assigned_by_admin
                      ? selected.reason || 'Assigned by your administrator'
                      : selected.reason || '—'
                  }
                />
                <Row label="Attachment" value={selected.attachment_name || 'No Attachment'} />
              </dl>
              <div className="mt-6">
                {leaveStatus(selected.status) === 'PENDING' ? (
                  <div className="rounded-[12px] bg-[#fff4e5] px-4 py-3 text-sm text-[#c2782a]">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <Clock3 size={16} />
                      Pending
                    </p>
                    <p className="mt-1 text-xs">This request will be reviewed by the administrator</p>
                    <button
                      type="button"
                      onClick={() => void cancelRequest(selected).catch((err) => setError(err instanceof Error ? err.message : 'Could not cancel'))}
                      className="mt-4 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white"
                    >
                      Cancel Request
                    </button>
                  </div>
                ) : leaveStatus(selected.status) === 'REJECTED' ? (
                  <div className="rounded-[12px] bg-[#fdecee] px-4 py-3 text-sm text-[#d32027]">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <User size={16} />
                      Rejected
                    </p>
                    <p className="mt-1 text-xs">
                      {selected.rejection_reason || 'This request was rejected by the administrator'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setModal(selected)}
                      className="mt-4 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white"
                    >
                      Request Again
                    </button>
                  </div>
                ) : leaveStatus(selected.status) === 'APPROVED' ? (
                  <div className="rounded-[12px] bg-[#e7f6ec] px-4 py-3 text-sm text-[#1b7d4f]">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <Check size={16} />
                      Accepted
                    </p>
                    <p className="mt-1 text-xs">
                      {selected.assigned_by_admin
                        ? 'This leave was assigned and approved by your administrator'
                        : 'This request was approved by the administrator'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">This request was cancelled.</p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">Select a request to see the details.</p>
          )}
        </aside>
      </div>

      {modal ? (
        <LeaveRequestModal
          initial={modal}
          error={error}
          onClose={() => {
            setError(null)
            setModal(null)
          }}
          onSubmit={async (body) => {
            if (!companyId || !employeeId) return
            try {
              setError(null)
              await hrApi.createLeave(companyId, employeeId, body)
              setModal(null)
              await query.refetch()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not submit this leave request')
              throw err
            }
          }}
        />
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-navy">{value}</dd>
    </div>
  )
}

export { EmployeeLeavePage as PortalLeavePage }

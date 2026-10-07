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
  CloudUpload,
  Plane,
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
  type LeaveStatus,
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

function leaveBlockTone(status: LeaveStatus) {
  return {
    PENDING: { bar: 'border-l-[#e2a334]', surface: 'bg-[#fffaf3]', ink: 'text-[#9a6420]' },
    APPROVED: { bar: 'border-l-[#1b7d4f]', surface: 'bg-[#f3faf6]', ink: 'text-[#1b7d4f]' },
    REJECTED: { bar: 'border-l-[#d32027]', surface: 'bg-[#fff6f6]', ink: 'text-[#d32027]' },
    CANCELLED: { bar: 'border-l-[#c5c5c5]', surface: 'bg-[#f7f6f3]', ink: 'text-muted' },
  }[status]
}

function BalanceCard({
  label,
  icon: Icon,
  remaining,
  entitled,
}: {
  label: string
  icon: typeof Plane
  remaining?: number
  entitled?: number
}) {
  const entitledWeeks = Number(entitled ?? 0)
  const remainingWeeks = Number(remaining ?? 0)
  const ratio = entitledWeeks > 0 ? Math.min(1, Math.max(0, remainingWeeks / entitledWeeks)) : 0
  return (
    <section className="rounded-[16px] border border-[#e4e2dd] bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#eef2f6] text-navy">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-[22px] font-semibold leading-none text-navy">{weeksLabel(remaining)}</p>
          <p className="mt-1.5 text-xs text-muted">out of {weeksLabel(entitled)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eceae6]">
            <div className="h-full rounded-full bg-navy" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}

function LeaveBlock({ item, compact = false }: { item: LeaveItem; compact?: boolean }) {
  const status = leaveStatus(item.status)
  const tone = leaveBlockTone(status)
  return (
    <div className={`rounded-[10px] border border-[#eceae6] border-l-[3px] ${tone.bar} ${tone.surface} ${compact ? 'px-1.5 py-1' : 'px-2.5 py-2'}`}>
      <p className={`truncate font-semibold text-navy ${compact ? 'text-[11px] leading-4' : 'text-xs'}`}>
        {item.leave_type || 'Leave'}
      </p>
      <p className={`font-medium ${tone.ink} ${compact ? 'text-[10px] leading-4' : 'mt-0.5 text-[11px]'}`}>
        {statusMeta(status).label}
      </p>
    </div>
  )
}

function LeaveLegend() {
  return (
    <div className="flex flex-wrap items-center gap-5 border-t border-[#f1efeb] px-5 py-3 text-xs font-medium text-[#5c6770]">
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
  )
}

const requestFieldClass =
  'h-11 w-full rounded-[8px] border border-[#d5d8de] bg-white px-3 text-sm text-navy outline-none focus:border-navy'

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-navy">{label}</span>
      {children}
    </label>
  )
}

function DurationChoice({
  checked,
  title,
  hint,
  onSelect,
}: {
  checked: boolean
  title: string
  hint: string
  onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} className="flex items-center gap-3 text-left">
      <span
        className={`size-5 shrink-0 rounded-full ${checked ? 'bg-navy' : 'border-2 border-[#d5d8de] bg-white'}`}
      />
      <span>
        <span className="block text-sm font-semibold text-navy">{title}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </button>
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/30 p-4">
      <div className="w-full max-w-[760px] overflow-hidden rounded-[12px] border border-[#e4e2dd] bg-white shadow-[0_16px_40px_rgba(23,55,94,0.12)]">
        <div className="flex items-center gap-4 border-b border-[#eceae6] px-6 py-5">
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-navy">
            <User size={22} />
            <span className="absolute right-1.5 bottom-1.5 size-2.5 rounded-full bg-navy ring-2 ring-[#e8eef5]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-navy">Leave Request Details</h2>
            <p className="text-sm text-muted">Verify the details before submitting request</p>
          </div>
        </div>
        {error ? (
          <div className="px-6 pt-5">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        <form
          className="px-6 py-6"
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
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Leave Type">
              <select
                className={requestFieldClass}
                value={form.leave_type}
                onChange={(event) => setForm({ ...form, leave_type: event.target.value })}
              >
                {EMPLOYEE_LEAVE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </FieldShell>
            <FieldShell label="Total Days">
              <input readOnly className={requestFieldClass} value={days || ''} />
            </FieldShell>
            <FieldShell label="Start Date">
              <input
                type="date"
                required
                className={requestFieldClass}
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
                className={requestFieldClass}
                value={form.end_date}
                onChange={(event) => setForm({ ...form, end_date: event.target.value })}
              />
            </FieldShell>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-sm font-medium text-navy">Leave Duration</p>
            <div className="flex flex-wrap gap-10">
              <DurationChoice
                checked={form.duration_kind === 'FULL_DAY'}
                title="Full Day"
                hint="whole working day"
                onSelect={() => setForm({ ...form, duration_kind: 'FULL_DAY' })}
              />
              <DurationChoice
                checked={form.duration_kind === 'PARTIAL_DAY'}
                title="Partial Day"
                hint="Morning / Day"
                onSelect={() => setForm({ ...form, duration_kind: 'PARTIAL_DAY' })}
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-navy">Attachment</p>
            <label
              className="flex cursor-pointer items-center justify-between gap-4 rounded-[8px] border border-dashed border-[#c5c9d0] px-4 py-3.5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files?.[0]
                if (file) setForm({ ...form, attachment_name: file.name })
              }}
            >
              <span className="inline-flex min-w-0 items-center gap-3">
                <CloudUpload size={28} className="shrink-0 text-navy" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">
                    {form.attachment_name || 'Drag and drop file here, or click to browse'}
                  </span>
                  <span className="block text-xs text-muted">Supported formats: PDF, JPG, PNG, DOC, DOCX</span>
                </span>
              </span>
              <span className="shrink-0 rounded-[8px] bg-navy px-4 py-2.5 text-sm font-semibold text-white">
                Browse Files
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(event) =>
                  setForm({ ...form, attachment_name: event.target.files?.[0]?.name ?? '' })
                }
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 min-w-[112px] rounded-[8px] border border-[#d5d8de] bg-white px-5 text-sm font-semibold text-navy"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !form.start_date || !form.end_date}
              className="h-11 min-w-[148px] rounded-[8px] bg-navy px-5 text-sm font-semibold text-white disabled:opacity-40"
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
        {cards.map((card) => (
          <BalanceCard
            key={card.label}
            label={card.label}
            icon={card.icon}
            remaining={card.value?.remaining_weeks}
            entitled={card.value?.entitled_weeks}
          />
        ))}
      </div>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-[16px] border border-[#e4e2dd] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1efeb] px-4 py-3">
            <div className="inline-flex rounded-[10px] border border-[#e4e2dd] bg-[#f8f7f4] p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setView('week')}
                className={`rounded-[8px] px-3.5 py-1.5 ${view === 'week' ? 'bg-navy text-white' : 'text-muted hover:text-navy'}`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView('month')}
                className={`rounded-[8px] px-3.5 py-1.5 ${view === 'month' ? 'bg-navy text-white' : 'text-muted hover:text-navy'}`}
              >
                Month
              </button>
            </div>
            <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#e4e2dd] bg-white px-1.5 py-1 text-sm font-semibold text-navy">
              <button type="button" className="rounded-[8px] p-1.5 hover:bg-[#f6f5f2]" onClick={() => shiftPeriod(-1)} aria-label="Previous">
                <ChevronLeft size={18} />
              </button>
              <span className="inline-flex min-w-[190px] items-center justify-center gap-2 px-1">
                <CalendarDays size={15} />
                {periodLabel}
              </span>
              <button type="button" className="rounded-[8px] p-1.5 hover:bg-[#f6f5f2]" onClick={() => shiftPeriod(1)} aria-label="Next">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {query.isLoading ? (
            <div className="px-5 py-10">
              <Loading />
            </div>
          ) : view === 'month' ? (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 border-b border-[#f1efeb] text-center text-[11px] font-semibold tracking-[0.08em] text-[#8a93a0] uppercase">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="px-2 py-3">
                      {day}
                    </div>
                  ))}
                </div>
                {monthWeeks.map((week) => (
                  <div key={dateKey(week[0])} className="grid grid-cols-7">
                    {week.map((day) => {
                      const key = dateKey(day)
                      const outside = day.getMonth() !== anchor.getMonth()
                      const weekend = day.getDay() === 0 || day.getDay() === 6
                      const match = requests.find((item) => coversDate(item, key))
                      const today = key === todayKey
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => openDay(day)}
                          className={`flex min-h-[112px] flex-col border-r border-b border-[#f1efeb] p-2.5 text-left last:border-r-0 ${
                            outside ? 'bg-[#f7f6f3]' : weekend ? 'bg-[#fcfbf8] hover:bg-[#f7f6f3]' : 'bg-white hover:bg-[#faf9f7]'
                          }`}
                        >
                          <span
                            className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                              today ? 'bg-navy text-white' : outside ? 'text-[#c5c9d0]' : 'text-navy'
                            }`}
                          >
                            {day.getDate()}
                          </span>
                          {match && !outside ? (
                            <div className="mt-2">
                              <LeaveBlock item={match} compact />
                            </div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[720px] grid-cols-7">
                {weekDays.map((day) => {
                  const key = dateKey(day)
                  const match = requests.find((item) => coversDate(item, key))
                  const today = key === todayKey
                  const weekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openDay(day)}
                      className={`group flex min-h-[168px] flex-col border-r border-[#f1efeb] p-3 text-left last:border-r-0 ${
                        weekend && !match ? 'bg-[#fcfbf8]' : 'bg-white'
                      } hover:bg-[#faf9f7]`}
                    >
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-[#8a93a0] uppercase">
                        {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </p>
                      <span
                        className={`mt-2 flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                          today ? 'bg-navy text-white' : 'text-navy'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      <div className="mt-3">
                        {match ? (
                          <LeaveBlock item={match} />
                        ) : (
                          <p className="text-[11px] font-medium text-[#b7bdc6] group-hover:text-navy">
                            <span className="group-hover:hidden">No leave</span>
                            <span className="hidden group-hover:inline">Request leave</span>
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <LeaveLegend />
        </section>

        <div className="space-y-4">
          <aside className="rounded-[16px] border border-[#e4e2dd] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
                <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#eef2f6]">
                  <User size={15} />
                </span>
                My Leave Requests
              </p>
              <Link to="/portal/leave/requests" className="text-xs font-semibold text-navy hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {recent.length === 0 ? (
                <div className="rounded-[12px] bg-[#f8f7f4] px-4 py-6 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-white text-navy">
                    <CalendarDays size={16} />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-navy">No requests yet</p>
                  <p className="mt-1 text-xs text-muted">Choose a day to request leave.</p>
                </div>
              ) : (
                recent.map((item) => (
                  <button
                    key={idOfLeave(item)}
                    type="button"
                    onClick={() => navigate(`/portal/leave/requests?id=${idOfLeave(item)}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-[#f1efeb] px-3 py-3 text-left hover:bg-[#faf9f7]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{item.leave_type}</p>
                      <p className="mt-0.5 text-xs text-muted">{formatLeaveRangeShort(item.start_date, item.end_date)}</p>
                    </div>
                    <StatusPill status={item.status} />
                  </button>
                ))
              )}
            </div>
          </aside>

          <aside className="rounded-[16px] border border-[#e4e2dd] bg-white p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
              <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#eef2f6]">
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
    <ol className="relative mt-5 space-y-0">
      <span className="absolute top-3 bottom-3 left-[11px] w-px bg-[#eceae6]" />
      {steps.map((step) => (
        <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
          <span
            className={`relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
              step.state === 'done'
                ? 'bg-[#e7f6ec] text-[#1b7d4f]'
                : step.state === 'current'
                  ? 'bg-[#fff4e5] text-[#c2782a]'
                  : step.state === 'rejected'
                    ? 'bg-[#fdecee] text-[#d32027]'
                    : 'bg-[#f4f3ef] text-muted'
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
            <p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted">{step.body}</p>
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

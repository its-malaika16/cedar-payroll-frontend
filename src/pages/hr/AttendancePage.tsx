import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, User, UserCheck, UserX, Clock3, BadgeCheck, LogOut } from 'lucide-react'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Button, EmptyState, Loading } from '../../components/ui'
import { fullName } from '../../lib/format'
import { StatCard } from './timesheets/TimesheetStatusBadge'
import { addDays, dateKey, formatWeekRange, startOfWeek } from './rota/rotaDates'
import { HrTitle } from './HrChrome'

type AttendanceStatus =
  | 'Present'
  | 'Working'
  | 'Absent'
  | 'Late'
  | 'On Leave'
  | 'Day Off'
  | 'Scheduled'

type DayCell = {
  date: string
  scheduled_shift: string
  scheduled_hours: number
  check_in: string
  check_out: string
  check_in_label: string
  break_minutes: number
  total_hours: number
  status: AttendanceStatus
}

type AttendanceRow = DayCell & {
  employee_id: string
  first_name?: string | null
  last_name?: string | null
  days?: DayCell[]
  weekly_hours?: number
  weekly_scheduled?: number
}

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  Present: 'border-[#bfe3c6] bg-[#eef8f0] text-[#2f8a4b]',
  Working: 'border-[#c9daf4] bg-[#eaf3fb] text-[#17375e]',
  Scheduled: 'border-[#d4dde8] bg-[#e8eef6] text-[#17375e]',
  Absent: 'border-[#f3c4c6] bg-[#fdecec] text-[#d32027]',
  Late: 'border-[#f3d2a8] bg-[#fff6ea] text-[#c2782a]',
  'On Leave': 'border-[#d9d9d9] bg-[#eef2f6] text-navy/70',
  'Day Off': 'border-[#eceae6] bg-[#f7f6f3] text-navy/50',
}

const LEGEND: { status: AttendanceStatus; swatch: string; label: string }[] = [
  { status: 'Working', swatch: 'bg-[#7eb6d9]', label: 'Working' },
  { status: 'Scheduled', swatch: 'bg-[#17375e]', label: 'Scheduled' },
  { status: 'Present', swatch: 'bg-[#2f8a4b]', label: 'Present' },
  { status: 'Absent', swatch: 'bg-[#d32027]', label: 'Absent' },
  { status: 'Late', swatch: 'bg-[#c2782a]', label: 'Late' },
  { status: 'On Leave', swatch: 'bg-[#8a9bb0]', label: 'On leave' },
  { status: 'Day Off', swatch: 'bg-[#c5cdd6]', label: 'Day off' },
]

function hoursLabel(value?: number) {
  if (value == null || Number.isNaN(value)) return '—'
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function personName(row: AttendanceRow) {
  return fullName(row.first_name, row.last_name)
}

function WeekCell({ cell }: { cell?: DayCell }) {
  const status = cell?.status ?? 'Day Off'
  const hasClock = Boolean(cell?.check_in && cell.check_in !== '—')
  const shift = cell?.scheduled_shift && cell.scheduled_shift !== '—' ? cell.scheduled_shift : null
  const quiet = status === 'Day Off' || status === 'On Leave' || status === 'Absent'

  return (
    <div
      className={`flex min-h-[72px] flex-col justify-center rounded-[10px] border px-2.5 py-2 text-xs ${STATUS_STYLE[status]}`}
    >
      {quiet ? (
        <span className="font-semibold">{status}</span>
      ) : (
        <>
          <p className="font-medium leading-snug">
            {hasClock ? `${cell?.check_in} – ${cell?.check_out === '—' ? 'now' : cell?.check_out}` : shift}
          </p>
          {status === 'Late' || status === 'Working' ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">{status}</p>
          ) : null}
          <p className="mt-1 font-semibold">
            {hoursLabel(hasClock ? cell?.total_hours : cell?.scheduled_hours)}
          </p>
        </>
      )}
    </div>
  )
}

export function AttendancePage() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [anchor, setAnchor] = useState(() => new Date())
  const date = dateKey(view === 'week' ? startOfWeek(anchor) : anchor)

  const query = useQuery({
    queryKey: ['attendance-overview', companyId, date, view],
    queryFn: () => hrApi.attendanceOverview(companyId!, date, view),
    enabled: Boolean(companyId),
  })

  const payload = query.data?.data as
    | {
        summary?: { present: number; late: number; absent: number; currently_working: number }
        employees?: AttendanceRow[]
        from?: string
        to?: string
      }
    | undefined
  const rows = payload?.employees ?? []
  const summary = payload?.summary
  const weekStart = startOfWeek(anchor)
  const weekLabels = useMemo(
    () =>
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => ({
        label,
        key: dateKey(addDays(weekStart, index)),
      })),
    [weekStart],
  )

  const heading =
    view === 'day'
      ? `${anchor.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${
          dateKey(anchor) === dateKey(new Date()) ? ' (Today)' : ''
        }`
      : formatWeekRange(weekStart)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <HrTitle title="Attendance" onBack={() => navigate('/hr')} />
          <p className="mt-2 text-sm font-semibold text-muted">
            Daily and weekly check-in, lateness and absence across the team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/hr/leave">
            <Button variant="secondary">
              <LogOut size={16} />
              Leave
            </Button>
          </Link>
          <Link to="/timesheets">
            <Button variant="secondary">Review timesheets</Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<UserCheck size={18} />} label="Present" value={`${summary?.present ?? 0} Employees`} />
        <StatCard icon={<Clock3 size={18} />} label="Late" value={`${summary?.late ?? 0} Employees`} />
        <StatCard icon={<UserX size={18} />} label="Absent" value={`${summary?.absent ?? 0} Employees`} />
        <StatCard
          icon={<BadgeCheck size={18} />}
          label="Currently working"
          value={`${summary?.currently_working ?? 0} Employees`}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-[10px] border border-[#d9d9d9] bg-white p-1 text-sm font-semibold">
          <button
            type="button"
            className={`rounded-[8px] px-3 py-1.5 ${view === 'day' ? 'bg-navy text-white' : 'text-navy'}`}
            onClick={() => setView('day')}
          >
            Daily Overview
          </button>
          <button
            type="button"
            className={`rounded-[8px] px-3 py-1.5 ${view === 'week' ? 'bg-navy text-white' : 'text-navy'}`}
            onClick={() => {
              setView('week')
              setAnchor(startOfWeek(anchor))
            }}
          >
            Weekly Overview
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1 text-sm font-semibold text-navy">
          <button
            type="button"
            className="rounded p-1 hover:bg-white"
            onClick={() => setAnchor(addDays(anchor, view === 'day' ? -1 : -7))}
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[220px] text-center">{heading}</span>
          <button
            type="button"
            className="rounded p-1 hover:bg-white"
            onClick={() => setAnchor(addDays(anchor, view === 'day' ? 1 : 7))}
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-navy">
        {LEGEND.map((item) => (
          <span key={item.status} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${item.swatch}`} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[16px] border border-[#e4e2dd] bg-white">
        {query.isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No attendance for this period"
            body="Employees will appear here once they are on the rota or have checked in."
          />
        ) : view === 'day' ? (
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-[#eceae6] bg-[#f7f6f3] text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              <tr>
                {['Employee', 'Scheduled Shift', 'Check In', 'Check Out', 'Break', 'Total Hours', 'Status'].map(
                  (column) => (
                    <th key={column} className="px-4 py-3">
                      {column}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {rows.map((row) => (
                <tr key={row.employee_id} className="hover:bg-cream/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 font-medium text-navy">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] text-navy/70">
                        <User size={14} />
                      </span>
                      <span className="truncate">{personName(row)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-navy/80">
                    {row.scheduled_shift}
                    {row.scheduled_hours ? ` · ${hoursLabel(row.scheduled_hours)}` : ''}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.check_in}
                    {row.check_in_label !== '—' ? (
                      <span className="ml-1 text-xs text-muted">{row.check_in_label}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-navy/80">{row.check_out}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-navy/80">
                    {row.break_minutes ? `${row.break_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-navy/80">{hoursLabel(row.total_hours)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[220px]" />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col className="w-[140px]" />
            </colgroup>
            <thead className="border-b border-[#eceae6] bg-[#f7f6f3] text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="sticky left-0 z-10 bg-[#f7f6f3] px-4 py-3">Employee</th>
                {weekLabels.map((day) => (
                  <th key={day.key} className="px-2 py-3 text-center">
                    {day.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Weekly Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {rows.map((row) => (
                <tr key={row.employee_id} className="group hover:bg-cream/60">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 align-top group-hover:bg-[#faf9f6]">
                    <span className="flex items-center gap-2.5 font-medium text-navy">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] text-navy/70">
                        <User size={14} />
                      </span>
                      <span className="truncate">{personName(row)}</span>
                    </span>
                  </td>
                  {weekLabels.map((day) => {
                    const cell = row.days?.find((item) => item.date === day.key)
                    return (
                      <td key={day.key} className="px-1.5 py-2 align-top">
                        <WeekCell cell={cell} />
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 align-top text-right text-sm font-semibold text-navy">
                    <span className="block">{hoursLabel(row.weekly_hours)}</span>
                    <span className="text-xs font-medium text-muted">
                      of {hoursLabel(row.weekly_scheduled)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

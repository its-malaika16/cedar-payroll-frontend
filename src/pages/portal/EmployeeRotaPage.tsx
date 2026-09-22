import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Plane } from 'lucide-react'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Loading } from '../../components/ui'
import {
  addDays,
  dateKey,
  daysInPeriod,
  formatMonthLabel,
  startOfWeek,
  weeksInMonth,
} from '../hr/rota/rotaDates'
import {
  calendarLeaveLabel,
  decodeShiftNotes,
  formatTimeRange,
  hoursBetween,
  isApprovedLeave,
  isCalendarLeaveType,
  leaveCoversDate,
  shiftDateKey,
  type LeaveItem,
  type RotaShift,
} from '../hr/rota/rotaModel'

type ViewMode = 'week' | 'month'

type OpenShift = {
  id: string
  shift_date: string
  start_time?: string
  end_time?: string
}

type RotaLeave = LeaveItem & { custom_label?: string | null }

type MyShiftsResponse = {
  data?: RotaShift[]
  open_shifts?: OpenShift[]
  leave?: RotaLeave[]
}

function hoursLabel(value: number) {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded)
  return `${text} hrs`
}

function formatRange(days: Date[]) {
  if (days.length === 0) return ''
  const start = days[0]
  const end = days[days.length - 1]
  const startDay = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const endDay = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${startDay} - ${endDay}`
}

function formatDayTitle(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function leaveTitle(item: RotaLeave) {
  if (item.status === 'CALENDAR' || isCalendarLeaveType(item.leave_type)) {
    return calendarLeaveLabel(item.leave_type, item.custom_label)
  }
  return item.leave_type?.trim() || 'On Leave'
}

function StatCard({
  icon,
  label,
  value,
  period,
}: {
  icon: ReactNode
  label: string
  value: string
  period: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[16px] border border-[#e4e2dd] bg-white px-5 py-4">
      <span className="mt-0.5 flex size-9 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-navy">{value}</p>
        <p className="text-xs text-muted">{period}</p>
      </div>
    </div>
  )
}

function ScheduleRow({
  tone,
  icon,
  title,
  detail,
  extra,
}: {
  tone: 'shift' | 'leave' | 'off'
  icon: ReactNode
  title: string
  detail: string
  extra?: string
}) {
  const styles = {
    shift: 'bg-[#eef4fb] text-navy',
    leave: 'bg-[#fdecee] text-[#d32027]',
    off: 'bg-[#f3f3f3] text-[#8a93a0]',
  }[tone]
  return (
    <div className={`flex min-h-[56px] items-center justify-between rounded-[10px] px-4 py-3 ${styles}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {detail ? <p className="text-xs opacity-80">{detail}</p> : null}
        </div>
      </div>
      {extra ? <p className="shrink-0 text-sm font-semibold">{extra}</p> : null}
    </div>
  )
}

export function EmployeeRotaPage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))

  const query = useQuery({
    queryKey: ['my-shifts', companyId, employeeId],
    queryFn: () => hrApi.myShifts(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })

  const payload = query.data as MyShiftsResponse | undefined
  const shifts = (payload?.data ?? []) as RotaShift[]
  const openShifts = payload?.open_shifts ?? []
  const leave = (payload?.leave ?? []).filter(isApprovedLeave)

  const days = useMemo(() => {
    if (view === 'week') return daysInPeriod(anchor, addDays(anchor, 6))
    const weeks = weeksInMonth(anchor)
    const first = weeks[0]?.[0]
    const last = weeks[weeks.length - 1]?.[6]
    if (!first || !last) return daysInPeriod(new Date(anchor.getFullYear(), anchor.getMonth(), 1), new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0))
    return daysInPeriod(first, last).filter((day) => day.getMonth() === anchor.getMonth())
  }, [anchor, view])

  const periodLabel = view === 'week' ? formatRange(days) : formatMonthLabel(anchor)
  const statPeriod = view === 'week' ? 'This week' : 'This month'

  const stats = useMemo(() => {
    const keys = new Set(days.map(dateKey))
    const weekShifts = shifts.filter((shift) => keys.has(shiftDateKey(shift)))
    const hours = weekShifts.reduce((total, shift) => {
      const meta = decodeShiftNotes(shift.notes)
      return total + hoursBetween(shift.start_time, shift.end_time, meta.breakMinutes)
    }, 0)
    const open = openShifts.filter((shift) => keys.has(String(shift.shift_date).slice(0, 10))).length
    const leaveDays = days.filter((day) => leave.some((item) => leaveCoversDate(item, dateKey(day)))).length
    return {
      hours: Math.round(hours * 10) / 10,
      scheduled: weekShifts.length,
      open,
      leaveDays,
    }
  }, [days, leave, openShifts, shifts])

  function step(direction: number) {
    setAnchor((current) => {
      if (view === 'week') return addDays(current, direction * 7)
      return new Date(current.getFullYear(), current.getMonth() + direction, 1)
    })
  }

  function changeView(next: ViewMode) {
    setView(next)
    setAnchor(next === 'week' ? startOfWeek(new Date()) : new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  }

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        ROTTA
      </p>
      <h1 className="mt-2 text-[32px] font-semibold text-navy">ROTTA</h1>
      <p className="mt-1 text-sm text-muted">View your scheduled shifts and time</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CalendarDays size={18} />}
          label="Scheduled Hours"
          value={hoursLabel(stats.hours)}
          period={statPeriod}
        />
        <StatCard
          icon={<Clock3 size={18} />}
          label="Scheduled Shifts"
          value={String(stats.scheduled)}
          period={statPeriod}
        />
        <StatCard
          icon={<ArrowLeftRight size={18} />}
          label="Open Shifts"
          value={String(stats.open)}
          period={statPeriod}
        />
        <StatCard
          icon={<Plane size={18} />}
          label="On Leave"
          value={`${stats.leaveDays} ${stats.leaveDays === 1 ? 'day' : 'days'}`}
          period={statPeriod}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6 text-sm font-semibold text-muted">
          {(['week', 'month'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeView(item)}
              className={`-mb-px border-b-2 pb-2 ${
                view === item ? 'border-navy text-navy' : 'border-transparent hover:text-navy'
              }`}
            >
              {item === 'week' ? 'Week Overview' : 'Month Overview'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-navy">
          <button type="button" className="rounded p-1 hover:bg-white" onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <span className="inline-flex items-center gap-2 min-w-[220px] justify-center">
            <CalendarDays size={16} />
            {periodLabel}
          </span>
          <button type="button" className="rounded p-1 hover:bg-white" onClick={() => step(1)} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[#eceae6] bg-white">
        <div className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-[#eceae6] bg-[#fafafa] px-5 py-3 text-sm font-semibold text-navy">
          <div>Date</div>
          <div>My Schedule</div>
        </div>
        {query.isLoading ? (
          <div className="px-5 py-8">
            <Loading />
          </div>
        ) : (
          days.map((day) => {
            const key = dateKey(day)
            const dayShifts = shifts.filter((shift) => shiftDateKey(shift) === key)
            const dayLeave = leave.find((item) => leaveCoversDate(item, key))
            return (
              <div
                key={key}
                className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-4 border-b border-[#eceae6] px-5 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-semibold text-navy">{formatDayTitle(day)}</p>
                  <p className="text-xs text-muted">
                    {day.toLocaleDateString('en-GB', { weekday: 'long' })}
                  </p>
                </div>
                <div className="space-y-2">
                  {dayLeave ? (
                    <ScheduleRow
                      tone="leave"
                      icon={<CalendarDays size={18} />}
                      title={leaveTitle(dayLeave)}
                      detail="All Day"
                    />
                  ) : dayShifts.length > 0 ? (
                    dayShifts.map((shift) => {
                      const meta = decodeShiftNotes(shift.notes)
                      const hours = hoursBetween(shift.start_time, shift.end_time, meta.breakMinutes)
                      return (
                        <ScheduleRow
                          key={shift.id}
                          tone="shift"
                          icon={<CalendarDays size={18} />}
                          title={formatTimeRange(shift.start_time, shift.end_time)}
                          detail={shift.role_name?.trim() || 'Scheduled'}
                          extra={hoursLabel(hours)}
                        />
                      )
                    })
                  ) : (
                    <ScheduleRow tone="off" icon={<CalendarDays size={18} />} title="Day Off" detail="" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5 text-xs font-medium text-navy">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-navy" />
          Scheduled Shift
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#d32027]" />
          On Leave
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#c5c5c5]" />
          Day Off
        </span>
      </div>
    </div>
  )
}

export { EmployeeRotaPage as PortalRotaPage }

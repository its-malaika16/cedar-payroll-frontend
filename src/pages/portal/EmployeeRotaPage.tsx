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
  if (tone === 'off') {
    return (
      <div className="flex h-11 items-center gap-2 text-sm text-[#9aa3ad]">
        <span className="size-1.5 rounded-full bg-[#d5d8de]" />
        Day off
      </div>
    )
  }
  const leaveTone = tone === 'leave'
  return (
    <div
      className={`flex min-h-[68px] items-center justify-between gap-3 rounded-[12px] border border-[#e7e4de] border-l-[3px] px-4 py-3 ${
        leaveTone ? 'border-l-[#d32027] bg-[#fff7f7]' : 'border-l-navy bg-[#f5f8fc]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            leaveTone ? 'bg-[#fdecee] text-[#d32027]' : 'bg-white text-navy shadow-sm'
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${leaveTone ? 'text-[#b42318]' : 'text-navy'}`}>{title}</p>
          {detail ? <p className="text-xs text-[#607080]">{detail}</p> : null}
        </div>
      </div>
      {extra ? (
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy shadow-sm">
          {extra}
        </span>
      ) : null}
    </div>
  )
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MonthCalendar({
  weeks,
  month,
  shifts,
  leave,
}: {
  weeks: Date[][]
  month: number
  shifts: RotaShift[]
  leave: RotaLeave[]
}) {
  const todayKey = dateKey(new Date())
  return (
    <div className="mt-4 overflow-x-auto rounded-[16px] border border-[#e6e4df] bg-white">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-7 border-b border-[#eceae6]">
          {WEEKDAYS.map((label, index) => (
            <div
              key={label}
              className={`px-3 py-3 text-[11px] font-semibold tracking-[0.08em] uppercase ${
                index >= 5 ? 'text-[#9aa3ad]' : 'text-navy'
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={dateKey(week[0])} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = day.getMonth() === month
              const key = dateKey(day)
              const weekend = day.getDay() === 0 || day.getDay() === 6
              const isToday = inMonth && key === todayKey
              const dayShifts = inMonth ? shifts.filter((shift) => shiftDateKey(shift) === key) : []
              const dayLeave = inMonth ? leave.find((item) => leaveCoversDate(item, key)) : undefined
              return (
                <div
                  key={key}
                  className={`min-h-[124px] border-r border-b border-[#f1efeb] p-2.5 ${
                    !inMonth ? 'bg-[#f7f6f3]' : weekend ? 'bg-[#fcfbf8]' : 'bg-white'
                  }`}
                >
                  <span
                    className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday ? 'bg-navy text-white' : inMonth ? 'text-navy' : 'text-[#c5c9d0]'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {inMonth && (dayLeave || dayShifts.length > 0) ? (
                    <div className="mt-2 space-y-1.5">
                      {dayLeave ? (
                        <div className="rounded-[8px] border-l-[3px] border-[#d32027] bg-[#fdecee] px-2 py-1.5">
                          <p className="truncate text-[11px] font-semibold leading-4 text-[#b42318]">
                            {leaveTitle(dayLeave)}
                          </p>
                          <p className="text-[10px] leading-4 text-[#d32027]">All day</p>
                        </div>
                      ) : (
                        dayShifts.map((shift) => {
                          const meta = decodeShiftNotes(shift.notes)
                          const hours = hoursBetween(shift.start_time, shift.end_time, meta.breakMinutes)
                          return (
                            <div
                              key={shift.id}
                              className="rounded-[8px] border-l-[3px] border-navy bg-[#eef3fb] px-2 py-1.5"
                            >
                              <p className="truncate text-[11px] font-semibold leading-4 text-navy">
                                {formatTimeRange(shift.start_time, shift.end_time)}
                              </p>
                              <p className="text-[10px] leading-4 text-[#5c6e82]">{hoursLabel(hours)}</p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
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

  const monthWeeks = useMemo(() => (view === 'month' ? weeksInMonth(anchor) : []), [anchor, view])
  const days = useMemo(() => {
    if (view === 'week') return daysInPeriod(anchor, addDays(anchor, 6))
    return daysInPeriod(
      new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0),
    )
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
        ROTA
      </p>
      <h1 className="mt-2 text-[32px] font-semibold text-navy">ROTA</h1>
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
        <div className="inline-flex items-center rounded-[10px] border border-[#d9d9d9] bg-white p-1 text-sm font-semibold">
          {(['week', 'month'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeView(item)}
              className={`rounded-full px-4 py-2 ${
                view === item ? 'bg-navy text-white' : 'text-muted hover:text-navy'
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
          <span className="inline-flex min-w-0 items-center justify-center gap-2 sm:min-w-[220px]">
            <CalendarDays size={16} />
            {periodLabel}
          </span>
          <button type="button" className="rounded p-1 hover:bg-white" onClick={() => step(1)} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="mt-4 rounded-[12px] border border-[#eceae6] bg-white px-5 py-8">
          <Loading />
        </div>
      ) : view === 'month' ? (
        <MonthCalendar
          weeks={monthWeeks}
          month={anchor.getMonth()}
          shifts={shifts}
          leave={leave}
        />
      ) : (
      <div className="mt-4 overflow-hidden rounded-[16px] border border-[#e6e4df] bg-white">
        <div className="grid grid-cols-1 border-b border-[#eceae6] text-[11px] font-semibold tracking-[0.08em] text-[#8a93a0] uppercase sm:grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-[#eceae6] px-5 py-3 sm:border-r">Date</div>
          <div className="px-5 py-3">My Schedule</div>
        </div>
        {days.map((day) => {
            const key = dateKey(day)
            const dayShifts = shifts.filter((shift) => shiftDateKey(shift) === key)
            const dayLeave = leave.find((item) => leaveCoversDate(item, key))
            const isToday = key === dateKey(new Date())
            const weekend = day.getDay() === 0 || day.getDay() === 6
            return (
              <div
                key={key}
                className={`grid grid-cols-1 items-stretch border-b border-[#f1efeb] last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)] ${
                  weekend && !dayLeave && dayShifts.length === 0 ? 'bg-[#fcfbf8]' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3 border-[#eceae6] px-5 py-3 sm:border-r">
                  <span
                    className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-[12px] ${
                      isToday ? 'bg-navy text-white' : 'bg-[#f4f3ef] text-navy'
                    }`}
                  >
                    <span className="text-sm font-semibold leading-none">{day.getDate()}</span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {day.toLocaleDateString('en-GB', { weekday: 'long' })}
                    </p>
                    <p className="text-xs text-muted">
                      {day.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 px-5 py-3">
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
          })}
      </div>
      )}

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

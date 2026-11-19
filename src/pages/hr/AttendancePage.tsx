import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, User, UserCheck, UserX, Clock3, BadgeCheck, MapPin, X } from 'lucide-react'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, EmptyState, Loading } from '../../components/ui'
import { fullName } from '../../lib/format'
import { StatCard } from './timesheets/TimesheetStatusBadge'
import { addDays, dateKey, formatWeekRange, startOfWeek } from './rota/rotaDates'
import { formatClock, formatTimeRange } from './rota/rotaModel'
import { HrTitle } from './HrChrome'
import { AttendancePlaceMap } from './AttendancePlaceMap'

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
  scheduled_start?: string | null
  scheduled_end?: string | null
  scheduled_shift: string
  scheduled_hours: number
  check_in_at?: string | null
  check_out_at?: string | null
  check_in: string
  check_out: string
  check_in_label: string
  break_minutes: number
  paid_break?: boolean
  on_break?: boolean
  break_started_at?: string | null
  break_ended_at?: string | null
  can_start_break?: boolean
  can_end_break?: boolean
  total_hours: number
  overtime_hours?: number
  status: AttendanceStatus
  can_check_in?: boolean
  can_check_out?: boolean
  check_in_opens_at?: string | null
  work_site?: string | null
  check_in_place?: string | null
  check_out_place?: string | null
  check_in_latitude?: number | null
  check_in_longitude?: number | null
  check_out_latitude?: number | null
  check_out_longitude?: number | null
  check_in_within_radius?: boolean | null
  check_out_within_radius?: boolean | null
  check_in_distance_m?: number | null
  check_out_distance_m?: number | null
}

type AttendanceRow = DayCell & {
  employee_id: string
  first_name?: string | null
  last_name?: string | null
  days?: DayCell[]
  weekly_hours?: number
  weekly_scheduled?: number
  weekly_overtime?: number
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

function clockLabel(iso?: string | null, fallback?: string) {
  if (iso) {
    const date = new Date(iso)
    if (!Number.isNaN(date.getTime())) return formatClock(date)
  }
  return fallback && fallback !== '—' ? fallback : '—'
}

function shiftLabel(cell?: Pick<DayCell, 'scheduled_start' | 'scheduled_end' | 'scheduled_shift'>) {
  if (cell?.scheduled_start && cell?.scheduled_end) {
    const label = formatTimeRange(cell.scheduled_start, cell.scheduled_end)
    if (label) return label
  }
  return cell?.scheduled_shift && cell.scheduled_shift !== '—' ? cell.scheduled_shift : '—'
}

function metresLabel(value?: number | null) {
  if (value == null || Number.isNaN(value)) return ''
  if (value < 1000) return `${Math.round(value)} m`
  const km = value / 1000
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`
}

function RadiusLine({
  label,
  within,
  distance,
}: {
  label: string
  within?: boolean | null
  distance?: number | null
}) {
  if (within == null && distance == null) return null
  return (
    <p className={within ? 'text-xs font-medium text-[#2f8a4b]' : 'text-xs font-medium text-brand'}>
      {label}: {within ? 'Within radius' : 'Outside radius'}
      {distance != null ? ` · ${metresLabel(distance)}` : ''}
    </p>
  )
}

function BreakTimes({ row }: { row: Pick<DayCell, 'break_started_at' | 'break_ended_at' | 'break_minutes' | 'paid_break' | 'on_break'> }) {
  const started = clockLabel(row.break_started_at)
  const ended = row.on_break ? 'On break' : clockLabel(row.break_ended_at)
  if (started === '—' && ended === '—') {
    return <span>—</span>
  }
  return (
    <div className="whitespace-nowrap text-navy/80">
      <p>Start {started}</p>
      <p>End {ended}</p>
      {row.break_minutes ? (
        <p className="text-xs text-muted">
          {row.break_minutes} min{row.paid_break ? ' paid' : ''}
        </p>
      ) : null}
    </div>
  )
}

function overtimeHours(cell?: Pick<DayCell, 'overtime_hours' | 'total_hours' | 'scheduled_hours'>) {
  if (!cell) return 0
  if (cell.overtime_hours != null && !Number.isNaN(cell.overtime_hours)) return Math.max(0, cell.overtime_hours)
  return Math.max(0, (cell.total_hours ?? 0) - (cell.scheduled_hours ?? 0))
}

function overtimeLabel(cell?: Pick<DayCell, 'overtime_hours' | 'total_hours' | 'scheduled_hours'>) {
  const value = overtimeHours(cell)
  return value > 0.01 ? hoursLabel(value) : '—'
}

function personName(row: AttendanceRow) {
  return fullName(row.first_name, row.last_name)
}

type LiveLocation = {
  employee_id: string
  first_name?: string | null
  last_name?: string | null
  work_site?: string | null
  check_in_at?: string
  last_seen_at?: string | null
  latitude: number
  longitude: number
  place?: string | null
  within_radius?: boolean | null
  distance_m?: number | null
  workplace_latitude?: number | null
  workplace_longitude?: number | null
  attendance_radius_meters?: number | null
}

function seenLabel(iso?: string | null) {
  if (!iso) return 'Waiting for a location update'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Waiting for a location update'
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000))
  if (minutes < 1) return 'Updated just now'
  if (minutes === 1) return 'Updated 1 minute ago'
  if (minutes < 60) return `Updated ${minutes} minutes ago`
  return `Updated at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

function hasClock(iso?: string | null, fallback?: string) {
  return clockLabel(iso, fallback) !== '—'
}

function MarkAttendanceButtons({
  name,
  row,
  busy,
  onCheckIn,
  onCheckOut,
  onStartBreak,
  onEndBreak,
}: {
  name: string
  row: AttendanceRow
  busy: boolean
  onCheckIn: () => void
  onCheckOut: () => void
  onStartBreak: () => void
  onEndBreak: () => void
}) {
  if (row.status === 'On Leave') {
    return <span className="text-xs text-muted">On leave</span>
  }
  if (row.can_check_out) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {row.on_break || row.can_end_break ? (
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={busy}
            onClick={onEndBreak}
            aria-label={`End break for ${name}`}
          >
            End break
          </Button>
        ) : row.can_start_break ? (
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={busy}
            onClick={onStartBreak}
            aria-label={`Start break for ${name}`}
          >
            Start break
          </Button>
        ) : null}
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={busy}
          onClick={onCheckOut}
          aria-label={`Check ${name} out`}
        >
          Check out
        </Button>
      </div>
    )
  }
  if (row.can_check_in) {
    return (
      <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={onCheckIn} aria-label={`Check ${name} in`}>
        Check in
      </Button>
    )
  }
  if (hasClock(row.check_in_at, row.check_in) && hasClock(row.check_out_at, row.check_out)) {
    return <span className="text-xs text-muted">Recorded</span>
  }
  if (!row.scheduled_start) {
    return <span className="text-xs text-muted">No shift</span>
  }
  if (row.scheduled_start && row.check_in_opens_at) {
    return (
      <div>
        <Button className="px-3 py-1.5 text-xs" disabled>
          Check in
        </Button>
        <p className="mt-1 text-[11px] font-medium text-muted">
          Opens 30 minutes before the shift ({clockLabel(row.check_in_opens_at)})
        </p>
      </div>
    )
  }
  return <span className="text-xs text-muted">—</span>
}

function WeekCell({ cell }: { cell?: DayCell }) {
  const status = cell?.status ?? 'Day Off'
  const checkIn = clockLabel(cell?.check_in_at, cell?.check_in)
  const checkOut = clockLabel(cell?.check_out_at, cell?.check_out)
  const hasClock = checkIn !== '—'
  const shift = shiftLabel(cell)
  const shiftText = shift !== '—' ? shift : null
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
            {hasClock ? `${checkIn} – ${checkOut === '—' ? 'now' : checkOut}` : shiftText}
          </p>
          {status === 'Late' || status === 'Working' ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">{status}</p>
          ) : null}
          <p className="mt-1 font-semibold">
            {hoursLabel(hasClock ? cell?.total_hours : cell?.scheduled_hours)}
          </p>
          {overtimeHours(cell) > 0.01 ? (
            <p className="mt-0.5 text-[10px] font-semibold text-navy/70">OT {overtimeLabel(cell)}</p>
          ) : null}
        </>
      )}
    </div>
  )
}

export function AttendancePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [anchor, setAnchor] = useState(() => new Date())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [locationsOpen, setLocationsOpen] = useState(false)
  const date = dateKey(view === 'week' ? startOfWeek(anchor) : anchor)
  const isToday = view === 'day' && date === dateKey(new Date())

  const query = useQuery({
    queryKey: ['attendance-overview', companyId, date, view],
    queryFn: () => hrApi.attendanceOverview(companyId!, date, view),
    enabled: Boolean(companyId),
  })
  const locationsQuery = useQuery({
    queryKey: ['attendance-live-locations', companyId],
    queryFn: () => hrApi.liveAttendanceLocations(companyId!),
    enabled: Boolean(companyId && locationsOpen),
    refetchInterval: locationsOpen ? 15_000 : false,
  })
  const liveLocations = (locationsQuery.data?.data as LiveLocation[] | undefined) ?? []

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

  async function markAttendance(row: AttendanceRow, action: 'in' | 'out' | 'start-break' | 'end-break') {
    if (!companyId) return
    const name = personName(row) || 'this employee'
    if ((action === 'in' || action === 'out') && !row.scheduled_start) {
      setNotice({ tone: 'danger', text: `${name} has no shift assigned today` })
      return
    }
    setBusyId(row.employee_id)
    setNotice(null)
    try {
      if (action === 'in') await hrApi.markAttendanceCheckIn(companyId, row.employee_id)
      else if (action === 'out') await hrApi.markAttendanceCheckOut(companyId, row.employee_id)
      else if (action === 'start-break') await hrApi.markAttendanceStartBreak(companyId, row.employee_id)
      else await hrApi.markAttendanceEndBreak(companyId, row.employee_id)
      await queryClient.invalidateQueries({ queryKey: ['attendance-overview'] })
      setNotice({
        tone: 'success',
        text:
          action === 'in'
            ? `Checked ${name} in`
            : action === 'out'
              ? `Checked ${name} out`
              : action === 'start-break'
                ? `Started ${name}'s break`
                : `Ended ${name}'s break`,
      })
    } catch (err) {
      setNotice({
        tone: 'danger',
        text: err instanceof Error ? err.message : 'Could not update attendance',
      })
    } finally {
      setBusyId(null)
    }
  }

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
            Daily and weekly check-in, lateness and absence across the team. If someone cannot use
            their phone, a company admin or manager can check them in or out from this page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setLocationsOpen(true)}>
            <MapPin size={16} />
            Track Employees
          </Button>
          <Link to="/timesheets">
            <Button variant="secondary">Review timesheets</Button>
          </Link>
        </div>
      </div>

      {locationsOpen ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-navy/40 p-4">
          <div className="mx-auto mt-8 w-full max-w-3xl rounded-[16px] bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy">Track Employees</h2>
                <p className="mt-1 text-sm text-muted">
                  Live position for employees who are checked in. Their phone keeps sharing location
                  from check-in until check-out, including when the app is in the background.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-navy hover:bg-cream"
                onClick={() => setLocationsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {locationsQuery.isLoading ? (
              <Loading />
            ) : liveLocations.length === 0 ? (
              <p className="text-sm text-muted">Nobody is checked in at the moment.</p>
            ) : (
              <div className="space-y-4">
                {liveLocations.map((item) => {
                  const name = fullName(item.first_name, item.last_name) || 'Employee'
                  const onsite = String(item.work_site ?? '').toUpperCase() !== 'OFFSITE'
                  return (
                    <div key={item.employee_id} className="rounded-[12px] border border-[#eceae6] p-4">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-navy">{name}</p>
                          <p className="text-xs text-muted">{seenLabel(item.last_seen_at)}</p>
                        </div>
                        {onsite ? (
                          <p
                            className={
                              item.within_radius
                                ? 'text-sm font-semibold text-[#2f8a4b]'
                                : 'text-sm font-semibold text-brand'
                            }
                          >
                            {item.within_radius ? 'Within radius' : 'Outside radius'}
                            {item.distance_m != null ? ` · ${metresLabel(item.distance_m)}` : ''}
                          </p>
                        ) : (
                          <p className="text-sm font-semibold text-navy">Offsite</p>
                        )}
                      </div>
                      {item.place ? <p className="mb-2 text-xs text-navy/80">{item.place}</p> : null}
                      <AttendancePlaceMap
                        latitude={item.latitude}
                        longitude={item.longitude}
                        label={item.place}
                        workplaceLatitude={item.workplace_latitude}
                        workplaceLongitude={item.workplace_longitude}
                        radiusMeters={onsite ? item.attendance_radius_meters : null}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      ) : null}

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
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-[#eceae6] bg-[#f7f6f3] text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              <tr>
                {[
                  'Employee',
                  'Scheduled Shift',
                  'Check In',
                  'Check Out',
                  'Location',
                  'Break',
                  'Total Hours',
                  'Overtime',
                  'Status',
                  ...(isToday ? ['Mark'] : []),
                ].map((column) => (
                  <th key={column} className="px-4 py-3">
                    {column}
                  </th>
                ))}
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
                    {shiftLabel(row)}
                    {row.scheduled_hours ? ` · ${hoursLabel(row.scheduled_hours)}` : ''}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {clockLabel(row.check_in_at, row.check_in)}
                    {row.check_in_label !== '—' ? (
                      <span className="ml-1 text-xs text-muted">{row.check_in_label}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-navy/80">
                    {clockLabel(row.check_out_at, row.check_out)}
                  </td>
                  <td className="min-w-[240px] max-w-[320px] px-4 py-3 text-navy/80">
                    {row.work_site === 'OFFSITE' ? (
                      <>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Offsite
                        </p>
                        {row.check_in_latitude != null || row.check_out_latitude != null ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="mb-1 truncate text-[11px] font-medium text-navy" title={row.check_in_place ?? undefined}>
                                In {row.check_in_place || 'saved'}
                              </p>
                              <AttendancePlaceMap
                                compact
                                latitude={row.check_in_latitude}
                                longitude={row.check_in_longitude}
                                label={row.check_in_place}
                              />
                            </div>
                            <div>
                              <p className="mb-1 truncate text-[11px] font-medium text-navy" title={row.check_out_place ?? undefined}>
                                Out {row.check_out_place || (row.check_out_latitude != null ? 'saved' : '—')}
                              </p>
                              <AttendancePlaceMap
                                compact
                                latitude={row.check_out_latitude}
                                longitude={row.check_out_longitude}
                                label={row.check_out_place}
                              />
                            </div>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Onsite
                        </p>
                        {row.check_in_at ? (
                          <RadiusLine
                            label="In"
                            within={row.check_in_within_radius}
                            distance={row.check_in_distance_m}
                          />
                        ) : (
                          <p className="text-xs text-muted">Not checked in</p>
                        )}
                        {row.check_out_at ? (
                          <RadiusLine
                            label="Out"
                            within={row.check_out_within_radius}
                            distance={row.check_out_distance_m}
                          />
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BreakTimes row={row} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-navy/80">{hoursLabel(row.total_hours)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-navy/80">{overtimeLabel(row)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  {isToday ? (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <MarkAttendanceButtons
                        name={personName(row)}
                        row={row}
                        busy={busyId === row.employee_id}
                        onCheckIn={() => void markAttendance(row, 'in')}
                        onCheckOut={() => void markAttendance(row, 'out')}
                        onStartBreak={() => void markAttendance(row, 'start-break')}
                        onEndBreak={() => void markAttendance(row, 'end-break')}
                      />
                    </td>
                  ) : null}
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
                    {row.weekly_overtime && row.weekly_overtime > 0.01 ? (
                      <span className="mt-1 block text-xs font-medium text-navy/70">
                        OT {hoursLabel(row.weekly_overtime)}
                      </span>
                    ) : null}
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

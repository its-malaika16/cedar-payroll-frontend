import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Minus,
  User,
  XCircle,
} from 'lucide-react'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Loading } from '../../components/ui'
import {
  addDays,
  dateKey,
  daysInPeriod,
  formatMonthLabel,
  startOfWeek,
  weeksInMonth,
} from '../hr/rota/rotaDates'
import { hoursBetween, shiftDateKey, type RotaShift } from '../hr/rota/rotaModel'

const MIN_RADIUS_METERS = 3000
const MAX_RADIUS_METERS = 5000
const DEFAULT_RADIUS_METERS = 3000
const LATE_GRACE_MINUTES = 10

type AttendanceRecord = {
  check_in_at?: string | null
  check_out_at?: string | null
}

type TodayPayload = {
  shift?: {
    start_time: string
    end_time: string
    role_name?: string | null
    location?: string | null
  } | null
  attendance?: AttendanceRecord | null
  open_attendance?: AttendanceRecord | null
  can_check_in?: boolean
  can_check_out?: boolean
  check_in_opens_at?: string | null
  location_configured?: boolean
  radius_meters?: number
  workplace_latitude?: number | null
  workplace_longitude?: number | null
  late?: boolean
  checked_in_late?: boolean
  checked_in_early_minutes?: number
  checked_out_early?: boolean
  absent?: boolean
  hours_worked?: number
  expected_hours?: number
  overtime_hours?: number
  remaining_hours?: number
}

type DayStatus =
  | 'on_shift'
  | 'on_time'
  | 'late'
  | 'overtime'
  | 'early_out'
  | 'absent'
  | 'off'
  | 'upcoming'

function clock(value?: string | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadius = 6371000
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function kmLabel(meters: number) {
  const km = Math.round((meters / 1000) * 10) / 10
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`
}

function clampRadius(value?: number | null) {
  const raw = value && value > 0 ? value : DEFAULT_RADIUS_METERS
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, Math.round(raw)))
}

function hoursLabel(value = 0) {
  const safe = Math.max(0, value)
  const hours = Math.floor(safe)
  const minutes = Math.round((safe - hours) * 60)
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

function compactHours(value = 0) {
  const safe = Math.max(0, value)
  const hours = Math.floor(safe)
  const minutes = Math.round((safe - hours) * 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function shiftHours(shift?: { start_time: string; end_time: string } | null) {
  if (!shift) return 0
  return hoursBetween(shift.start_time, shift.end_time)
}

function dayStatus(
  shift: RotaShift | undefined,
  record: AttendanceRecord | undefined,
  now: Date,
  todayKey: string,
): DayStatus {
  const key = shift ? shiftDateKey(shift) : record?.check_in_at ? String(record.check_in_at).slice(0, 10) : ''
  const checkIn = record?.check_in_at ? new Date(record.check_in_at) : null
  const checkOut = record?.check_out_at ? new Date(record.check_out_at) : null
  if (!shift) return 'off'
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const lateAfter = new Date(start.getTime() + LATE_GRACE_MINUTES * 60_000)
  if (!checkIn || Number.isNaN(checkIn.getTime())) {
    if (key < todayKey || now.getTime() > end.getTime()) return 'absent'
    return 'upcoming'
  }
  if (!checkOut) return checkIn.getTime() > lateAfter.getTime() ? 'late' : 'on_shift'
  if (checkOut.getTime() < end.getTime()) return 'early_out'
  if (hoursBetween(checkIn, checkOut) - shiftHours(shift) > 0.01 || checkOut.getTime() > end.getTime()) {
    return 'overtime'
  }
  return checkIn.getTime() > lateAfter.getTime() ? 'late' : 'on_time'
}

function statusMeta(status: DayStatus) {
  return {
    on_shift: { label: 'On Shift', className: 'bg-[#e7f6ec] text-[#1b7d4f]' },
    on_time: { label: 'On time', className: 'bg-[#e7f6ec] text-[#1b7d4f]' },
    late: { label: 'Checked in late', className: 'bg-[#fff4e5] text-[#c2782a]' },
    overtime: { label: 'Overtime', className: 'bg-[#eef3fb] text-navy' },
    early_out: { label: 'Checked out early', className: 'bg-[#fdecee] text-[#d32027]' },
    absent: { label: 'Absent', className: 'bg-[#fdecee] text-[#d32027]' },
    off: { label: '', className: '' },
    upcoming: { label: 'Scheduled', className: 'bg-[#eef3fb] text-navy' },
  }[status]
}

function StatusDot({ tone }: { tone: 'green' | 'amber' | 'navy' | 'red' | 'muted' }) {
  const color = {
    green: 'bg-[#22c55e]',
    amber: 'bg-[#e2a334]',
    navy: 'bg-navy',
    red: 'bg-[#d32027]',
    muted: 'bg-[#c5c5c5]',
  }[tone]
  return <span className={`inline-block size-2 rounded-full ${color}`} />
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'success' | 'warning' | 'danger' | 'info'
  icon: ReactNode
  children: ReactNode
}) {
  const styles = {
    success: 'bg-[#e7f6ec] text-[#1b7d4f]',
    warning: 'bg-[#fff4e5] text-[#c2782a]',
    danger: 'bg-[#fdecee] text-[#d32027]',
    info: 'bg-[#eef3fb] text-navy',
  }[tone]
  return (
    <div className={`mt-5 flex items-center gap-2 rounded-[10px] px-4 py-3 text-sm font-medium ${styles}`}>
      {icon}
      <span>{children}</span>
    </div>
  )
}

export function EmployeeAttendancePage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [error, setError] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [tab, setTab] = useState<'list' | 'calendar'>('list')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const historyQuery = useQuery({
    queryKey: ['attendance', companyId, employeeId],
    queryFn: () => hrApi.attendance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const todayQuery = useQuery({
    queryKey: ['attendance-today', companyId, employeeId],
    queryFn: () => hrApi.todayAttendance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
    refetchInterval: 15_000,
  })
  const shiftsQuery = useQuery({
    queryKey: ['my-shifts', companyId, employeeId],
    queryFn: () => hrApi.myShifts(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Location is required to check in. You must be within 3-5 km of the workplace.')
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setGeoError(null)
      },
      () =>
        setGeoError(
          'Allow location access so we can confirm you are within 3-5 km of the workplace.',
        ),
      { enableHighAccuracy: true, maximumAge: 15_000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const today = todayQuery.data?.data as TodayPayload | undefined
  const records = (historyQuery.data?.data as AttendanceRecord[] | undefined) ?? []
  const shifts = (shiftsQuery.data?.data as RotaShift[] | undefined) ?? []
  const now = new Date()
  const todayKey = dateKey(now)
  const weekDays = useMemo(() => daysInPeriod(weekStart, addDays(weekStart, 6)), [weekStart])
  const weekLabel = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - ${addDays(weekStart, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const shortWeek = `${weekStart.getDate()} - ${addDays(weekStart, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  function recordFor(key: string) {
    return records.find((item) => item.check_in_at && dateKey(new Date(item.check_in_at)) === key)
  }

  function shiftFor(key: string) {
    return shifts.find((item) => shiftDateKey(item) === key)
  }

  const weekRows = [...weekDays].reverse().map((day) => {
    const key = dateKey(day)
    const shift = shiftFor(key)
    const record = recordFor(key)
    const checkIn = record?.check_in_at ? new Date(record.check_in_at) : null
    const checkOut = record?.check_out_at ? new Date(record.check_out_at) : null
    const worked = checkIn
      ? hoursBetween(checkIn, checkOut && !Number.isNaN(checkOut.getTime()) ? checkOut : key === todayKey ? now : checkIn)
      : 0
    const expected = shift ? shiftHours(shift) : 0
    return {
      key,
      day,
      shift,
      record,
      checkIn,
      checkOut,
      worked: checkIn && (checkOut || key === todayKey) ? worked : 0,
      overtime: Math.max(0, worked - expected),
      status: dayStatus(shift, record, now, todayKey),
    }
  })

  const weekStats = useMemo(() => {
    const scheduled = weekRows.filter((row) => row.shift)
    const workedDays = weekRows.filter((row) => row.checkIn)
    return {
      workingDays: `${workedDays.length}/${Math.max(scheduled.length, 5)}`,
      totalHours: weekRows.reduce((total, row) => total + row.worked, 0),
      overtime: weekRows.reduce((total, row) => total + row.overtime, 0),
      late: weekRows.filter((row) => row.status === 'late').length,
      earlyOut: weekRows.filter((row) => row.status === 'early_out').length,
    }
  }, [weekRows])

  async function punch(kind: 'in' | 'out') {
    if (!employeeId) return
    try {
      setError(null)
      const position = coords ?? await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (current) =>
            resolve({
              latitude: current.coords.latitude,
              longitude: current.coords.longitude,
            }),
          () =>
            reject(
              new Error(
                'Location permission is required. You can only check in within 3-5 km of the workplace.',
              ),
            ),
          { enableHighAccuracy: true },
        )
      })
      const radius = clampRadius(today?.radius_meters)
      if (
        today?.workplace_latitude != null &&
        today?.workplace_longitude != null
      ) {
        const distance = distanceMeters(
          position.latitude,
          position.longitude,
          today.workplace_latitude,
          today.workplace_longitude,
        )
        if (distance > radius) {
          throw new Error(
            `You must be within ${kmLabel(radius)} of the workplace to ${kind === 'in' ? 'check in' : 'check out'}. You are currently ${kmLabel(distance)} away.`,
          )
        }
      }
      if (kind === 'in') await hrApi.checkIn(companyId!, employeeId, position)
      else await hrApi.checkOut(companyId!, employeeId, position)
      await Promise.all([historyQuery.refetch(), todayQuery.refetch()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attendance failed')
    }
  }

  const checkInAt = today?.attendance?.check_in_at ?? today?.open_attendance?.check_in_at
  const checkOutAt = today?.attendance?.check_out_at
  const expected = today?.expected_hours ?? (today?.shift ? shiftHours(today.shift) : 8)
  const worked = today?.hours_worked ?? 0
  const progress = expected > 0 ? Math.min(140, Math.round((worked / expected) * 100)) : 0
  const onShift = Boolean(checkInAt && !checkOutAt)
  const earlyMinutes = today?.checked_in_early_minutes ?? 0
  const radius = clampRadius(today?.radius_meters)
  const currentDistance =
    coords && today?.workplace_latitude != null && today?.workplace_longitude != null
      ? distanceMeters(
          coords.latitude,
          coords.longitude,
          today.workplace_latitude,
          today.workplace_longitude,
        )
      : null
  const insideRadius = currentDistance == null ? null : currentDistance <= radius
  const canCheckIn = Boolean(today?.can_check_in && insideRadius !== false && !geoError)
  const canCheckOut = Boolean(today?.can_check_out && insideRadius !== false && !geoError)

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        Attendance
      </p>
      <h1 className="mt-2 text-[32px] font-semibold text-navy">Attendance</h1>
      <p className="mt-1 text-sm text-muted">Check in and out from within 3-5 km of the workplace</p>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="rounded-[16px] border border-[#eceae6] bg-white p-5">
          {todayQuery.isLoading ? (
            <Loading />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
                    <CalendarDays size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">Today</p>
                    <p className="text-xs text-muted">
                      {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {today?.shift ? (
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      today.absent
                        ? 'bg-[#fdecee] text-[#d32027]'
                        : onShift
                          ? 'bg-[#e7f6ec] text-[#1b7d4f]'
                          : 'bg-[#eef3fb] text-navy'
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${
                        today.absent ? 'bg-[#d32027]' : onShift ? 'bg-[#22c55e]' : 'bg-navy'
                      }`}
                    />
                    {today.absent ? 'Absent' : onShift ? 'On Shift' : checkOutAt ? 'Checked out' : 'Scheduled'}
                  </span>
                ) : null}
              </div>

              {today?.shift ? (
                <>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Clock3 size={18} className="mt-0.5 text-navy" />
                      <div>
                        <p className="text-xs text-muted">Scheduled Shift</p>
                        <p className="mt-1 text-sm font-semibold text-navy">
                          {clock(today.shift.start_time)} - {clock(today.shift.end_time)}
                        </p>
                        <p className="text-xs text-muted">{today.shift.location || today.shift.role_name || 'Workplace'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      {today.absent ? (
                        <XCircle size={18} className="mt-0.5 text-[#d32027]" />
                      ) : checkInAt ? (
                        <CheckCircle2 size={18} className="mt-0.5 text-[#1b7d4f]" />
                      ) : (
                        <Minus size={18} className="mt-0.5 text-muted" />
                      )}
                      <div>
                        <p className="text-xs text-muted">Your Status</p>
                        <p className="mt-1 text-sm font-semibold text-navy">
                          {today.absent
                            ? 'No Check In'
                            : checkOutAt
                              ? 'Checked out'
                              : checkInAt
                                ? 'Checked In'
                                : 'Not checked in'}
                        </p>
                        <p className="text-xs text-muted">
                          {today.absent
                            ? 'Absent'
                            : checkOutAt
                              ? `At ${clock(checkOutAt)}`
                              : checkInAt
                                ? `Since ${clock(checkInAt)}`
                                : today.can_check_in
                                  ? today.late
                                    ? 'Check-in is late'
                                    : 'Check-in is open'
                                  : today.check_in_opens_at
                                    ? `Opens ${clock(today.check_in_opens_at)}`
                                    : 'Waiting for shift'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {today.absent ? (
                    <Banner tone="danger" icon={<XCircle size={16} />}>
                      You have not checked in today.
                    </Banner>
                  ) : checkOutAt && today.checked_out_early ? (
                    <Banner tone="danger" icon={<Clock3 size={16} />}>
                      You checked out early
                    </Banner>
                  ) : checkOutAt && (today.overtime_hours ?? 0) > 0 ? (
                    <Banner tone="info" icon={<Clock3 size={16} />}>
                      You worked overtime!
                    </Banner>
                  ) : checkInAt && today.checked_in_late ? (
                    <Banner tone="warning" icon={<Clock3 size={16} />}>
                      You checked in late
                    </Banner>
                  ) : checkInAt && earlyMinutes > 0 ? (
                    <Banner tone="success" icon={<CheckCircle2 size={16} />}>
                      You have checked in {earlyMinutes} minute{earlyMinutes === 1 ? '' : 's'} before your shift.
                    </Banner>
                  ) : checkInAt ? (
                    <Banner tone="success" icon={<CheckCircle2 size={16} />}>
                      Great! You are on time
                    </Banner>
                  ) : null}
                  {geoError ? (
                    <Banner tone="warning" icon={<Clock3 size={16} />}>
                      {geoError}
                    </Banner>
                  ) : insideRadius === false ? (
                    <Banner tone="warning" icon={<Clock3 size={16} />}>
                      You must be within {kmLabel(radius)} of the workplace to{' '}
                      {today.can_check_out ? 'check out' : 'check in'}. You are currently{' '}
                      {kmLabel(currentDistance ?? 0)} away.
                    </Banner>
                  ) : null}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={!canCheckIn}
                      onClick={() => void punch('in')}
                      className="rounded-full bg-[#eceae6] px-4 py-3 text-sm font-semibold text-navy disabled:cursor-not-allowed disabled:text-muted enabled:bg-navy enabled:text-white"
                    >
                      Check In
                      {checkInAt ? <span className="mt-1 block text-xs font-medium">{clock(checkInAt)}</span> : null}
                    </button>
                    <button
                      type="button"
                      disabled={!canCheckOut}
                      onClick={() => void punch('out')}
                      className="rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#eceae6] disabled:text-muted"
                    >
                      Check out
                      {checkOutAt ? <span className="mt-1 block text-xs font-medium">{clock(checkOutAt)}</span> : null}
                    </button>
                  </div>
                  {today.location_configured === false ? (
                    <p className="mt-3 text-xs text-muted">
                      Your employer still needs to save the workplace location in Settings.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-6 text-sm text-muted">No shift is assigned for today.</p>
              )}
            </>
          )}
        </section>

        <section className="rounded-[16px] border border-[#eceae6] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
              <Clock3 size={18} />
            </span>
            <p className="text-sm font-semibold text-navy">Working Hours</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted">Worked so far</p>
              <p className="mt-1 text-lg font-semibold text-navy">{compactHours(worked)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Expected today</p>
              <p className="mt-1 text-lg font-semibold text-navy">{compactHours(expected)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Overtime</p>
              <p className="mt-1 text-lg font-semibold text-navy">{hoursLabel(today?.overtime_hours ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Remaining</p>
              <p className="mt-1 text-lg font-semibold text-navy">{hoursLabel(today?.remaining_hours ?? expected)}</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-[#eceae6]">
              <div className="h-full rounded-full bg-navy" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <p className="mt-2 text-right text-xs text-muted">{progress}%</p>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-[16px] border border-[#eceae6] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceae6] px-5 py-4">
            <div className="flex gap-6 text-sm font-semibold text-muted">
              <button
                type="button"
                onClick={() => setTab('list')}
                className={`-mb-4 border-b-2 pb-3 ${tab === 'list' ? 'border-navy text-navy' : 'border-transparent'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <User size={15} />
                  My Attendance
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('calendar')}
                className={`-mb-4 border-b-2 pb-3 ${tab === 'calendar' ? 'border-navy text-navy' : 'border-transparent'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={15} />
                  Calendar View
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-navy">
              <button
                type="button"
                className="rounded p-1 hover:bg-[#f6f5f2]"
                onClick={() =>
                  tab === 'list'
                    ? setWeekStart((value) => addDays(value, -7))
                    : setMonthAnchor((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))
                }
              >
                <ChevronLeft size={18} />
              </button>
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={15} />
                {tab === 'list' ? weekLabel : formatMonthLabel(monthAnchor)}
              </span>
              <button
                type="button"
                className="rounded p-1 hover:bg-[#f6f5f2]"
                onClick={() =>
                  tab === 'list'
                    ? setWeekStart((value) => addDays(value, 7))
                    : setMonthAnchor((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {historyQuery.isLoading || shiftsQuery.isLoading ? (
            <div className="px-5 py-8">
              <Loading />
            </div>
          ) : tab === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eceae6] text-xs font-medium text-muted">
                    {['Date', 'Scheduled Shift', 'Check In', 'Check Out', 'Work Hours', 'Overtime', 'Status'].map(
                      (column) => (
                        <th key={column} className="px-4 py-3 font-medium">
                          {column}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {weekRows.map((row) => {
                    const meta = statusMeta(row.status)
                    const tone =
                      row.status === 'late' || row.status === 'early_out'
                        ? 'amber'
                        : row.status === 'absent'
                          ? 'red'
                          : row.status === 'overtime'
                            ? 'navy'
                            : row.status === 'on_shift' || row.status === 'on_time'
                              ? 'green'
                              : 'muted'
                    return (
                      <tr key={row.key} className="border-b border-[#f3f1ec] last:border-b-0">
                        <td className="px-4 py-3 text-navy">
                          {row.day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-navy">
                          {row.shift ? `${clock(row.shift.start_time)} - ${clock(row.shift.end_time)}` : '--'}
                        </td>
                        <td className="px-4 py-3 text-navy">
                          {row.checkIn ? (
                            <span className="inline-flex items-center gap-2">
                              <StatusDot
                                tone={row.status === 'late' ? 'amber' : 'green'}
                              />
                              {clock(row.checkIn)}
                            </span>
                          ) : row.shift ? (
                            '—'
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="px-4 py-3 text-navy">
                          {row.checkOut ? (
                            <span className="inline-flex items-center gap-2">
                              <StatusDot tone={row.status === 'early_out' ? 'red' : 'green'} />
                              {clock(row.checkOut)}
                            </span>
                          ) : row.checkIn ? (
                            '—'
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="px-4 py-3 text-navy">{row.shift || row.checkIn ? compactHours(row.worked) : ''}</td>
                        <td className="px-4 py-3 text-navy">{row.shift || row.checkIn ? hoursLabel(row.overtime) : ''}</td>
                        <td className="px-4 py-3">
                          {meta.label ? (
                            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                              <StatusDot tone={tone} />
                              {meta.label}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {weeksInMonth(monthAnchor).flat().map((day) => {
                  const key = dateKey(day)
                  const outside = day.getMonth() !== monthAnchor.getMonth()
                  const status = dayStatus(shiftFor(key), recordFor(key), now, todayKey)
                  const tone =
                    status === 'absent' || status === 'early_out'
                      ? 'bg-[#fdecee] text-[#d32027]'
                      : status === 'late'
                        ? 'bg-[#fff4e5] text-[#c2782a]'
                        : status === 'overtime' || status === 'on_shift'
                          ? 'bg-[#eef3fb] text-navy'
                          : status === 'on_time'
                            ? 'bg-[#e7f6ec] text-[#1b7d4f]'
                            : 'bg-[#f7f6f3] text-muted'
                  return (
                    <div
                      key={key}
                      className={`min-h-[72px] rounded-[10px] px-2 py-2 text-left ${outside ? 'opacity-30' : tone}`}
                    >
                      <p className="text-xs font-semibold">{day.getDate()}</p>
                      <p className="mt-2 text-[10px] font-medium">{statusMeta(status).label || 'Day off'}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-[16px] border border-[#eceae6] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">This Week</p>
              <p className="text-xs text-muted">{shortWeek}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm text-navy">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Working days</dt>
              <dd className="font-semibold">{weekStats.workingDays}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Total hours</dt>
              <dd className="font-semibold">{compactHours(weekStats.totalHours)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Overtime</dt>
              <dd className="font-semibold">{hoursLabel(weekStats.overtime)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Late Arrival</dt>
              <dd className="font-semibold">{weekStats.late}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Early Checkout</dt>
              <dd className="font-semibold">{weekStats.earlyOut}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}

export { EmployeeAttendancePage as PortalAttendancePage }

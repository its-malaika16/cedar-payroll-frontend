import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  User,
  Users,
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

const MIN_RADIUS_METERS = 25
const MAX_RADIUS_METERS = 5000
const DEFAULT_RADIUS_METERS = 3000
const LATE_GRACE_MINUTES = 10
const CHECK_IN_OPENS_MINUTES = 30

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
  workplace_name?: string | null
  workplace_address?: string | null
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
  return date
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase()
    .replace('  ', ' ')
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
  const rounded = Math.max(0, Math.round(meters))
  if (rounded < 1000) return `${rounded} m`
  const km = rounded / 1000
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`
}

function clampRadius(value?: number | null) {
  const raw = value && value > 0 ? value : DEFAULT_RADIUS_METERS
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, Math.round(raw)))
}

function hoursParts(value = 0) {
  const safe = Math.max(0, value)
  let hours = Math.floor(safe)
  let minutes = Math.round((safe - hours) * 60)
  if (minutes === 60) {
    hours += 1
    minutes = 0
  }
  return { hours, minutes }
}

function hoursLabel(value = 0) {
  const { hours, minutes } = hoursParts(value)
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

function compactHours(value = 0) {
  const { hours, minutes } = hoursParts(value)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function spacedHours(value = 0, padHours = false) {
  const { hours, minutes } = hoursParts(value)
  const hourText = padHours ? String(hours).padStart(2, '0') : String(hours)
  return `${hourText} h ${String(minutes).padStart(2, '0')} m`
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
    early_out: { label: 'Checked out early', className: 'bg-[#fff4e5] text-[#c2782a]' },
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

function StatusMark({
  tone,
}: {
  tone: 'success' | 'warning' | 'danger' | 'muted'
}) {
  const fill = {
    success: 'bg-[#22c55e]',
    warning: 'bg-[#e2a334]',
    danger: 'bg-[#d32027]',
    muted: 'bg-[#c5c5c5]',
  }[tone]
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white ${fill}`}>
      {tone === 'muted' ? (
        <span className="text-lg leading-none">–</span>
      ) : (
        <Check size={20} strokeWidth={3} />
      )}
    </span>
  )
}

export function EmployeeAttendancePage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [tab, setTab] = useState<'list' | 'calendar'>('list')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [nowMs, setNowMs] = useState(() => Date.now())

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
      setGeoError('Location is required to check in. You must be inside the attendance area set by your employer.')
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
          'Allow location access so we can confirm you are inside the attendance area set by your employer.',
        ),
      { enableHighAccuracy: true, maximumAge: 15_000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const today = todayQuery.data?.data as TodayPayload | undefined
  const records = (historyQuery.data?.data as AttendanceRecord[] | undefined) ?? []
  const shifts = (shiftsQuery.data?.data as RotaShift[] | undefined) ?? []
  const now = new Date()
  const todayKey = dateKey(now)
  const weekDays = useMemo(() => daysInPeriod(weekStart, addDays(weekStart, 6)), [weekStart])
  const weekLabel = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - ${addDays(weekStart, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const weekEnd = addDays(weekStart, 6)
  const shortWeek = `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('en-GB', { month: 'short' })}, ${weekEnd.getFullYear()}`

  function recordFor(key: string) {
    return records.find((item) => item.check_in_at && dateKey(new Date(item.check_in_at)) === key)
  }

  function shiftFor(key: string) {
    return shifts.find((item) => shiftDateKey(item) === key)
  }

  const viewingCurrentWeek = dateKey(weekStart) === dateKey(startOfWeek(now))
  const weekRows = [...weekDays]
    .filter((day) => !viewingCurrentWeek || dateKey(day) <= todayKey)
    .reverse()
    .map((day) => {
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

  function readLocation() {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Location is required to check in. Allow location access on this device.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (current) =>
          resolve({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          }),
        () =>
          reject(
            new Error(
              'Location permission is required. You can only check in inside the attendance area set by your employer.',
            ),
          ),
        { enableHighAccuracy: true },
      )
    })
  }

  async function punch(kind: 'in' | 'out') {
    if (!employeeId) return
    try {
      setBusy(true)
      setError(null)
      const position = coords ?? (await readLocation())
      setCoords(position)
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
    } finally {
      setBusy(false)
    }
  }

  const checkInAt = today?.attendance?.check_in_at ?? today?.open_attendance?.check_in_at
  const checkOutAt = today?.attendance?.check_out_at
  const expected = today?.expected_hours ?? (today?.shift ? shiftHours(today.shift) : 8)
  const worked = today?.hours_worked ?? 0
  const progress = expected > 0 ? Math.min(140, Math.round((worked / expected) * 100)) : 0
  const onShift = Boolean(checkInAt && !checkOutAt)
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
  const hasWorkplace = today?.workplace_latitude != null && today?.workplace_longitude != null
  const alreadyCheckedIn = Boolean(onShift || checkInAt)
  const opensAt = today?.shift?.start_time
    ? new Date(new Date(today.shift.start_time).getTime() - CHECK_IN_OPENS_MINUTES * 60_000)
    : today?.check_in_opens_at
      ? new Date(today.check_in_opens_at)
      : null
  const windowOpen = !opensAt || Number.isNaN(opensAt.getTime()) || nowMs >= opensAt.getTime()
  const canCheckIn = Boolean(
    hasWorkplace && !alreadyCheckedIn && windowOpen && insideRadius !== false && !geoError && !busy,
  )
  const canCheckOut = Boolean(today?.can_check_out && insideRadius !== false && !geoError && !busy)
  const locationLabel = today?.shift?.location || today?.shift?.role_name || 'Office'
  const overtimeHours = today?.overtime_hours ?? 0
  const remainingHours = today?.remaining_hours ?? Math.max(0, expected - worked)

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
      <p className="mt-1 text-sm text-muted">
        Check in and out from within {kmLabel(radius)} of workplace
      </p>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
        <section className="rounded-[16px] border border-[#eceae6] bg-white p-5">
          {todayQuery.isLoading ? (
            <Loading />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <p className="text-lg font-semibold text-navy">Today</p>
                  <p className="text-sm text-muted">
                    {now.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              {today?.shift ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Clock3 size={22} className="mt-0.5 text-navy" />
                    <div>
                      <p className="text-sm text-muted">Schedule Shift</p>
                      <p className="mt-0.5 text-base font-semibold text-navy">
                        {clock(today.shift.start_time)} - {clock(today.shift.end_time)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                        <MapPin size={14} />
                        {locationLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <StatusMark
                      tone={
                        today.absent
                          ? 'danger'
                          : today.checked_in_late
                            ? 'warning'
                            : checkInAt
                              ? 'success'
                              : 'muted'
                      }
                    />
                    <div>
                      <p className="text-sm text-muted">Your Status</p>
                      <p className="mt-0.5 text-base font-semibold text-navy">
                        {today.absent
                          ? 'No Check In'
                          : checkOutAt
                            ? 'Checked out'
                            : checkInAt
                              ? 'Checked In'
                              : 'Not checked in'}
                      </p>
                      <p className="text-sm text-muted">
                        {checkOutAt
                          ? `At ${clock(checkOutAt)}`
                          : checkInAt
                            ? `Since ${clock(checkInAt)}`
                            : windowOpen
                              ? 'Check-in is open'
                              : opensAt
                                ? `Opens ${clock(opensAt)}`
                                : 'Waiting for workplace location'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted">
                  No shift is assigned for today. You can still check in if you are inside the office radius.
                </p>
              )}
              {geoError ? (
                <Banner tone="danger" icon={<XCircle size={16} />}>
                  {geoError}
                </Banner>
              ) : checkOutAt && today?.checked_out_early ? (
                <Banner
                  tone="warning"
                  icon={
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#e2a334] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  }
                >
                  You checked out early
                </Banner>
              ) : checkInAt && today?.checked_in_late ? (
                <Banner
                  tone="warning"
                  icon={
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#e2a334] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  }
                >
                  You checked in late
                </Banner>
              ) : onShift ? (
                <Banner
                  tone="success"
                  icon={
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#22c55e] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  }
                >
                  Great! You are on time
                </Banner>
              ) : !hasWorkplace ? (
                <Banner tone="info" icon={<Clock3 size={16} />}>
                  Your employer still needs to save the workplace pin in Company info.
                </Banner>
              ) : insideRadius === false ? (
                <Banner tone="danger" icon={<XCircle size={16} />}>
                  You are {kmLabel(currentDistance ?? 0)} from the office. Check-in is allowed within {kmLabel(radius)}.
                </Banner>
              ) : !windowOpen && opensAt ? (
                <Banner tone="info" icon={<Clock3 size={16} />}>
                  Check-in opens at {clock(opensAt)}
                </Banner>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={!canCheckIn}
                  onClick={() => void punch('in')}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-full px-4 text-sm font-semibold ${
                    canCheckIn
                      ? 'bg-navy text-white'
                      : 'cursor-not-allowed bg-[#eceae6] text-muted'
                  }`}
                >
                  <span>{busy && !onShift ? 'Checking…' : alreadyCheckedIn ? 'Checked In' : 'Check In'}</span>
                  {alreadyCheckedIn && checkInAt ? (
                    <span className="text-[11px] font-medium">{clock(checkInAt)}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  disabled={!canCheckOut}
                  onClick={() => void punch('out')}
                  className={`flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                    canCheckOut
                      ? 'bg-navy text-white'
                      : 'cursor-not-allowed bg-[#eceae6] text-muted'
                  }`}
                >
                  {busy && onShift ? 'Checking…' : 'Check out'}
                </button>
              </div>
            </>
          )}
        </section>

        <section className="rounded-[16px] border border-[#eceae6] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
              <Clock3 size={18} />
            </span>
            <p className="text-lg font-semibold text-navy">Working Hours</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[12px] bg-[#f3f6fa] px-4 py-3">
              <p className="text-sm text-muted">Worked so far</p>
              <p className="mt-1 text-xl font-semibold text-navy">{spacedHours(worked)}</p>
            </div>
            <div className="rounded-[12px] bg-[#f3f6fa] px-4 py-3">
              <p className="text-sm text-muted">Expected today</p>
              <p className="mt-1 text-xl font-semibold text-navy">{spacedHours(expected)}</p>
            </div>
            <div className="px-1 py-2">
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <Clock3 size={15} />
                Overtime
              </p>
              <p className="mt-1 text-lg font-semibold text-navy">{spacedHours(overtimeHours, true)}</p>
            </div>
            <div className="px-1 py-2">
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <Users size={15} />
                Overtime remaining
              </p>
              <p className="mt-1 text-lg font-semibold text-navy">{spacedHours(remainingHours, true)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e8e4dc]">
              <div
                className="h-full rounded-full bg-navy"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-navy">{Math.min(progress, 100)}%</span>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-[16px] border border-[#eceae6] bg-white">
          <div className="flex flex-wrap items-center gap-6 px-5 pt-4 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`inline-flex items-center gap-2 pb-3 ${tab === 'list' ? 'text-navy' : 'text-muted'}`}
            >
              <User size={15} />
              My Attendance
            </button>
            <button
              type="button"
              onClick={() => setTab('calendar')}
              className={`inline-flex items-center gap-2 pb-3 ${tab === 'calendar' ? 'text-navy' : 'text-muted'}`}
            >
              <CalendarDays size={15} />
              Calendar View
            </button>
          </div>
          <div className="flex items-center gap-3 px-5 pb-3 text-sm font-semibold text-navy">
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
                              <StatusDot tone={row.status === 'early_out' ? 'amber' : 'green'} />
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
              <dd className={`font-semibold ${weekStats.late ? 'text-[#d32027]' : ''}`}>{weekStats.late}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Early Checkout</dt>
              <dd className={`font-semibold ${weekStats.earlyOut ? 'text-[#d32027]' : ''}`}>{weekStats.earlyOut}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}

export { EmployeeAttendancePage as PortalAttendancePage }

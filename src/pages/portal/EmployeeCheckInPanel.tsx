import { useEffect, useState } from 'react'

const PIN_BLUE = '#2563eb'
const CHECK_IN_OPENS_MINUTES = 30

export type EmployeeCheckInToday = {
  workplace_name?: string | null
  workplace_address?: string | null
  workplace_latitude?: number | null
  workplace_longitude?: number | null
  location_configured?: boolean
  radius_meters?: number
  can_check_in?: boolean
  can_check_out?: boolean
  check_in_opens_at?: string | null
  check_in_opens_minutes?: number
  shift?: { start_time: string; end_time: string } | null
  attendance?: { check_in_at?: string | null } | null
  open_attendance?: { check_in_at?: string | null } | null
}

function clock(value?: string | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

function checkInOpensAt(today?: EmployeeCheckInToday) {
  if (today?.shift?.start_time) {
    const start = new Date(today.shift.start_time)
    if (!Number.isNaN(start.getTime())) {
      const minutes = today.check_in_opens_minutes ?? CHECK_IN_OPENS_MINUTES
      return new Date(start.getTime() - minutes * 60_000)
    }
  }
  if (!today?.check_in_opens_at) return null
  const opens = new Date(today.check_in_opens_at)
  return Number.isNaN(opens.getTime()) ? null : opens
}

function radiusLabel(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`
}

export function EmployeeCheckInPanel({
  today,
  distance,
  insideRadius,
  geoError,
  busy,
  checkedIn,
  onCheckIn,
  onCheckOut,
  onRefreshLocation,
}: {
  today?: EmployeeCheckInToday
  coords: { latitude: number; longitude: number } | null
  distance: number | null
  insideRadius: boolean | null
  geoError: string | null
  busy: boolean
  checkedIn: boolean
  onCheckIn: () => void
  onCheckOut: () => void
  onRefreshLocation: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const lat = today?.workplace_latitude ?? null
  const lng = today?.workplace_longitude ?? null
  const radius = today?.radius_meters ?? 3000
  const hasWorkplace = lat != null && lng != null
  const officeName = today?.workplace_name?.trim() || 'Main Office'
  const officeAddress = today?.workplace_address?.trim() || 'Workplace'
  const alreadyCheckedIn = Boolean(
    checkedIn || today?.attendance?.check_in_at || today?.open_attendance?.check_in_at,
  )
  const opensAt = checkInOpensAt(today)
  const windowOpen = !opensAt || now >= opensAt.getTime()
  const canCheckIn = Boolean(
    hasWorkplace && !alreadyCheckedIn && windowOpen && insideRadius !== false && !geoError && !busy,
  )
  const canCheckOut = Boolean(today?.can_check_out && insideRadius !== false && !geoError && !busy)
  const tooEarly = Boolean(!alreadyCheckedIn && opensAt && now < opensAt.getTime())
  const progress =
    distance == null || radius <= 0 ? 0 : Math.max(0, Math.min(100, 100 - (distance / radius) * 100))

  return (
    <section className="flex max-w-[560px] flex-col gap-4 rounded-[20px] border border-[#d9d9d9] bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" className="size-7 shrink-0" fill={PIN_BLUE} aria-hidden>
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-navy sm:text-2xl">{checkedIn ? 'Check Out' : 'Check In'}</h2>
          <p className="mt-1 text-sm text-muted">
            You must be within {radiusLabel(radius)} of your office to {checkedIn ? 'check out' : 'check in'}.
          </p>
        </div>
      </div>

      {!hasWorkplace ? (
        <p className="rounded-[12px] bg-[#e8eef6] px-3 py-2 text-sm font-medium text-navy">
          Your employer still needs to save the workplace pin in Company info.
        </p>
      ) : null}

      <div className="flex items-start gap-3 rounded-[16px] bg-[#e9f8ef] px-3 py-3 sm:px-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-navy">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
            <path d="M4 20V8l8-4 8 4v12H4z" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-navy">{officeName}</p>
          <p className="mt-0.5 break-words text-sm text-[#3d5572]">{officeAddress}</p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              hasWorkplace ? 'bg-[#c9f0d6] text-[#157a3a]' : 'bg-[#f0efec] text-muted'
            }`}
          >
            {hasWorkplace ? 'Approved location' : 'Not set yet'}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-navy">Your distance</p>
        {geoError ? (
          <p className="mt-2 text-sm text-brand">{geoError}</p>
        ) : distance == null ? (
          <p className="mt-2 text-sm text-muted">Reading your device location…</p>
        ) : insideRadius ? (
          <div className="mt-2">
            <p className="text-sm font-semibold text-[#157a3a]">You&apos;re within range!</p>
            <div className="mt-1 flex justify-between text-sm text-navy">
              <span>{radiusLabel(distance)} from office</span>
              <span className="text-muted">Limit: {radiusLabel(radius)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4efe8]">
              <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm font-semibold text-brand">You&apos;re outside the check-in area</p>
            <div className="mt-1 flex justify-between text-sm text-navy">
              <span>{radiusLabel(distance)} from office</span>
              <span className="text-muted">Limit: {radiusLabel(radius)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f3e4e4]">
              <div className="h-full rounded-full bg-brand" style={{ width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={checkedIn ? !canCheckOut : !canCheckIn}
        onClick={checkedIn ? onCheckOut : onCheckIn}
        className="h-12 rounded-[10px] bg-navy text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#eceae6] disabled:text-muted"
      >
        {busy ? 'Checking…' : checkedIn ? 'Check Out Now' : 'Check In Now'}
      </button>
      <button
        type="button"
        onClick={onRefreshLocation}
        className="h-12 rounded-[10px] border border-navy text-sm font-semibold text-navy"
      >
        Use My Current Location
      </button>
      {tooEarly && opensAt ? (
        <p className="text-xs text-muted">
          Check-in opens at {clock(opensAt)} ({today?.check_in_opens_minutes ?? CHECK_IN_OPENS_MINUTES} minutes before
          your shift).
        </p>
      ) : null}

      <div className="rounded-[16px] bg-[#eef4fb] px-4 py-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
          <span className="flex size-5 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
            i
          </span>
          How it works
        </p>
        <ol className="space-y-2 text-sm text-navy">
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">
              1
            </span>
            Be within {radiusLabel(radius)} of your office from{' '}
            {today?.check_in_opens_minutes ?? CHECK_IN_OPENS_MINUTES} minutes before your shift
          </li>
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">
              2
            </span>
            Click “{checkedIn ? 'Check Out Now' : 'Check In Now'}”
          </li>
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">
              3
            </span>
            You’ll see a confirmation message
          </li>
        </ol>
      </div>
    </section>
  )
}

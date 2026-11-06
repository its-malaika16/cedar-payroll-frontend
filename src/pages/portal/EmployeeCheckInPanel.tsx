import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const PIN_BLUE = '#2563eb'

const officeIcon = L.divIcon({
  className: 'workplace-pin',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
  html: `<svg class="workplace-pin-mark" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="${PIN_BLUE}" d="M12 0C6.5 0 2 4.4 2 9.8c0 7.4 10 22.2 10 22.2s10-14.8 10-22.2C22 4.4 17.5 0 12 0z"/>
    <circle cx="12" cy="10" r="3.4" fill="#fff"/>
  </svg>`,
})

const youIcon = L.divIcon({
  className: 'workplace-pin',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<span style="display:block;width:18px;height:18px;border-radius:99px;background:#17375e;border:3px solid #fff;box-shadow:0 0 0 2px rgb(23 55 94 / 0.25)"></span>`,
})

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
}

function radiusLabel(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`
}

function zoomForRadius(meters: number) {
  if (meters <= 50) return 19
  if (meters <= 125) return 18
  if (meters <= 250) return 17
  if (meters <= 500) return 16
  if (meters <= 1000) return 15
  if (meters <= 2500) return 14
  return 13
}

export function EmployeeCheckInPanel({
  today,
  coords,
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
  const frameEl = useRef<HTMLDivElement>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const officeRef = useRef<L.Marker | null>(null)
  const youRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  const lat = today?.workplace_latitude ?? null
  const lng = today?.workplace_longitude ?? null
  const radius = today?.radius_meters ?? 3000
  const hasWorkplace = lat != null && lng != null
  const officeName = today?.workplace_name?.trim() || 'Main Office'
  const officeAddress = today?.workplace_address?.trim() || 'Workplace'

  useEffect(() => {
    function paint() {
      const map = mapRef.current
      if (!map || lat == null || lng == null) return
      const point: L.LatLngExpression = [lat, lng]
      if (!officeRef.current) {
        officeRef.current = L.marker(point, { icon: officeIcon, interactive: false }).addTo(map)
      } else {
        officeRef.current.setLatLng(point)
      }
      if (!circleRef.current) {
        circleRef.current = L.circle(point, {
          radius,
          color: PIN_BLUE,
          weight: 2,
          dashArray: '7 6',
          fillColor: PIN_BLUE,
          fillOpacity: 0.12,
        }).addTo(map)
      } else {
        circleRef.current.setLatLng(point)
        circleRef.current.setRadius(radius)
      }
      if (coords) {
        const you: L.LatLngExpression = [coords.latitude, coords.longitude]
        if (!youRef.current) {
          youRef.current = L.marker(you, { icon: youIcon, interactive: false }).addTo(map)
        } else {
          youRef.current.setLatLng(you)
        }
      }
      map.invalidateSize({ animate: false })
      if (circleRef.current) {
        const bounds = circleRef.current.getBounds()
        if (coords) bounds.extend([coords.latitude, coords.longitude])
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: zoomForRadius(radius) })
      } else {
        map.setView(point, zoomForRadius(radius), { animate: false })
      }
    }

    function createMap() {
      if (mapRef.current || !mapEl.current || lat == null || lng == null) return
      if (!frameEl.current || frameEl.current.clientWidth < 80) return
      const map = L.map(mapEl.current, {
        center: [lat, lng],
        zoom: zoomForRadius(radius),
        scrollWheelZoom: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      map.zoomControl.setPosition('topleft')
      mapRef.current = map
      window.requestAnimationFrame(paint)
    }

    createMap()
    const observer = new ResizeObserver(() => {
      createMap()
      paint()
    })
    if (frameEl.current) observer.observe(frameEl.current)
    const timer = window.setTimeout(() => {
      createMap()
      paint()
    }, 50)
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [coords, lat, lng, radius])

  useEffect(() => {
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      officeRef.current = null
      youRef.current = null
      circleRef.current = null
    }
  }, [])

  const canCheckIn = Boolean(today?.can_check_in && insideRadius !== false && !geoError && !busy)
  const canCheckOut = Boolean(today?.can_check_out && insideRadius !== false && !geoError && !busy)
  const progress =
    distance == null || radius <= 0 ? 0 : Math.max(0, Math.min(100, 100 - (distance / radius) * 100))

  return (
    <div className="workplace-checkin grid items-stretch gap-4 xl:grid-cols-2">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9] bg-white p-2.5 sm:p-3">
        <div ref={frameEl} className="workplace-map-frame min-h-[280px] flex-1 overflow-hidden rounded-[16px] sm:min-h-[320px] xl:min-h-0">
          {!hasWorkplace ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#e8eef6] px-4 text-center text-sm font-medium text-navy">
              Your employer still needs to save the workplace pin in Company info.
            </div>
          ) : null}
          <div ref={mapEl} className="workplace-map-surface" />
          <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-navy shadow-sm sm:bottom-3 sm:left-3">
            <span className="size-3 rounded-full border-2 border-dashed border-[#2563eb]" />
            Check-in radius ({radiusLabel(radius)})
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#d9d9d9] bg-white p-4 sm:p-5">
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
        {today?.check_in_opens_at && today.can_check_in === false && !checkedIn ? (
          <p className="text-xs text-muted">
            Check-in opens at {new Date(today.check_in_opens_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()} if you have a shift today.
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
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">1</span>
              Be within {radiusLabel(radius)} of your office location
            </li>
            <li className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">2</span>
              Click “{checkedIn ? 'Check Out Now' : 'Check In Now'}”
            </li>
            <li className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">3</span>
              You’ll see a confirmation message
            </li>
          </ol>
        </div>
      </section>
    </div>
  )
}

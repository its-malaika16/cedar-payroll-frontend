import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Field, Input as UiInput } from '../../components/ui'
import {
  DEFAULT_ATTENDANCE_RADIUS_METERS,
  MAX_ATTENDANCE_RADIUS_METERS,
  MIN_ATTENDANCE_RADIUS_METERS,
} from './employerSettings'

const UK_CENTRE: L.LatLngExpression = [53.4808, -2.2426]

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type WorkplaceMapPickerProps = {
  latitude: string
  longitude: string
  radiusMeters: string
  postcode: string
  addressQuery: string
  onLocationChange: (latitude: string, longitude: string) => void
  onRadiusChange: (meters: string) => void
}

function parseCoord(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCoord(value: number) {
  return value.toFixed(6)
}

function clampRadius(value: number) {
  return Math.min(
    MAX_ATTENDANCE_RADIUS_METERS,
    Math.max(MIN_ATTENDANCE_RADIUS_METERS, Math.round(value)),
  )
}

function radiusLabel(meters: number) {
  if (meters < 1000) return `${meters} m`
  const km = meters / 1000
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`
}

async function lookupPlace(query: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'gb')
  url.searchParams.set('q', query)
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Search failed')
  const results = (await response.json()) as Array<{ lat: string; lon: string }>
  const match = results[0]
  if (!match) return null
  return {
    latitude: formatCoord(Number(match.lat)),
    longitude: formatCoord(Number(match.lon)),
  }
}

export function WorkplaceMapPicker({
  latitude,
  longitude,
  radiusMeters,
  postcode,
  addressQuery,
  onLocationChange,
  onRadiusChange,
}: WorkplaceMapPickerProps) {
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onLocationChangeRef = useRef(onLocationChange)
  const lastFitted = useRef<{ lat: number | null; lng: number | null; ready: boolean }>({
    lat: null,
    lng: null,
    ready: false,
  })
  const defaulted = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [search, setSearch] = useState(postcode)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  onLocationChangeRef.current = onLocationChange

  const lat = parseCoord(latitude)
  const lng = parseCoord(longitude)
  const hasPoint = lat != null && lng != null
  const radius = clampRadius(Number(radiusMeters) || DEFAULT_ATTENDANCE_RADIUS_METERS)

  useEffect(() => {
    setSearch((current) => current.trim() || postcode)
  }, [postcode])

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return

    const map = L.map(mapEl.current, {
      center: hasPoint ? [lat, lng] : UK_CENTRE,
      zoom: hasPoint ? 16 : 6,
      scrollWheelZoom: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      onLocationChangeRef.current(formatCoord(event.latlng.lat), formatCoord(event.latlng.lng))
    })

    mapRef.current = map
    setMapReady(true)
    const resize = window.setTimeout(() => map.invalidateSize(), 120)
    const resizeAgain = window.setTimeout(() => map.invalidateSize(), 400)
    return () => {
      window.clearTimeout(resize)
      window.clearTimeout(resizeAgain)
      setMapReady(false)
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    if (!hasPoint) {
      markerRef.current?.remove()
      circleRef.current?.remove()
      markerRef.current = null
      circleRef.current = null
      return
    }

    const point: L.LatLngExpression = [lat, lng]
    const createdMarker = !markerRef.current
    if (!markerRef.current) {
      markerRef.current = L.marker(point, { draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const next = markerRef.current?.getLatLng()
        if (!next) return
        onLocationChangeRef.current(formatCoord(next.lat), formatCoord(next.lng))
      })
    } else {
      markerRef.current.setLatLng(point)
    }

    if (!circleRef.current) {
      circleRef.current = L.circle(point, {
        radius,
        color: '#17375e',
        weight: 2,
        fillColor: '#17375e',
        fillOpacity: 0.12,
      }).addTo(map)
    } else {
      circleRef.current.setLatLng(point)
      circleRef.current.setRadius(radius)
    }

    const jumped =
      lastFitted.current.lat == null ||
      lastFitted.current.lng == null ||
      Math.abs(lastFitted.current.lat - lat) > 0.0008 ||
      Math.abs(lastFitted.current.lng - lng) > 0.0008
    lastFitted.current = { lat, lng, ready: true }
    if (createdMarker || jumped) {
      const bounds = circleRef.current.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 })
      window.setTimeout(() => map.invalidateSize(), 80)
    }
  }, [hasPoint, lat, lng, mapReady, radius])

  useEffect(() => {
    if (!mapReady || hasPoint || defaulted.current) return
    const query = postcode.trim() || addressQuery.trim()
    if (!query) return
    defaulted.current = true
    void lookupPlace(query)
      .then((match) => {
        if (!match) return
        onLocationChangeRef.current(match.latitude, match.longitude)
      })
      .catch(() => {
        defaulted.current = false
      })
  }, [addressQuery, hasPoint, mapReady, postcode])

  async function geocode(query: string) {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchError('Enter an address or postcode to search')
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const match = await lookupPlace(trimmed)
      if (!match) {
        setSearchError('No matching location found. Try a postcode or street name.')
        return
      }
      onLocationChange(match.latitude, match.longitude)
    } catch {
      setSearchError('Could not search the map. Try again in a moment.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        The map starts from the company postcode. Drop the pin on the office, then choose a
        check-in radius from 100 m to 5 km. The pin and radius are saved automatically.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void geocode(search)
            }
          }}
          placeholder="Search for an address or postcode"
          className="h-11 flex-1 rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none focus:border-navy"
        />
        <button
          type="button"
          onClick={() => void geocode(search)}
          disabled={searching}
          className="h-11 rounded-[8px] bg-navy px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
        <button
          type="button"
          onClick={() => void geocode(postcode.trim() || addressQuery)}
          disabled={searching || !(postcode.trim() || addressQuery.trim())}
          className="h-11 rounded-[8px] border border-navy px-4 text-sm font-semibold text-navy disabled:opacity-60"
        >
          Use office address
        </button>
      </div>
      {searchError ? <p className="text-sm text-brand">{searchError}</p> : null}
      <div
        ref={mapEl}
        className="z-0 h-[380px] min-h-[380px] w-full overflow-hidden rounded-[10px] border border-[#d9d9d9]"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Latitude">
          <UiInput
            variant="outline"
            value={latitude}
            onChange={(event) => onLocationChange(event.target.value, longitude)}
            placeholder="53.480800"
          />
        </Field>
        <Field label="Longitude">
          <UiInput
            variant="outline"
            value={longitude}
            onChange={(event) => onLocationChange(latitude, event.target.value)}
            placeholder="-2.242600"
          />
        </Field>
      </div>
      <div>
        <span className="mb-2 block text-sm font-medium text-navy">
          {`Check-in radius (${MIN_ATTENDANCE_RADIUS_METERS}-${MAX_ATTENDANCE_RADIUS_METERS} metres)`}
        </span>
        <div className="space-y-2">
          <input
            type="range"
            min={MIN_ATTENDANCE_RADIUS_METERS}
            max={MAX_ATTENDANCE_RADIUS_METERS}
            step={50}
            value={radius}
            onChange={(event) => onRadiusChange(event.target.value)}
            className="w-full accent-navy"
          />
          <div className="flex items-center gap-3">
            <UiInput
              variant="outline"
              value={radiusMeters}
              onChange={(event) => onRadiusChange(event.target.value)}
              placeholder={String(DEFAULT_ATTENDANCE_RADIUS_METERS)}
            />
            <span className="shrink-0 text-sm text-muted">{radiusLabel(radius)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  DEFAULT_ATTENDANCE_RADIUS_METERS,
  MAX_ATTENDANCE_RADIUS_METERS,
  MIN_ATTENDANCE_RADIUS_METERS,
} from './employerSettings'

const PIN_BLUE = '#2563eb'

const officeIcon = L.divIcon({
  className: 'workplace-pin',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
  popupAnchor: [0, -36],
  html: `<svg class="workplace-pin-mark" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="${PIN_BLUE}" d="M12 0C6.5 0 2 4.4 2 9.8c0 7.4 10 22.2 10 22.2s10-14.8 10-22.2C22 4.4 17.5 0 12 0z"/>
    <circle cx="12" cy="10" r="3.4" fill="#fff"/>
  </svg>`,
})

type WorkplaceMapPickerProps = {
  latitude: string
  longitude: string
  radiusMeters: string
  postcode: string
  addressLine: string
  officeName: string
  addressQuery: string
  active?: boolean
  onLocationChange: (latitude: string, longitude: string) => void
  onRadiusChange: (meters: string) => void
}

function parseCoord(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
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

function zoomForRadius(meters: number) {
  if (meters <= 50) return 19
  if (meters <= 125) return 18
  if (meters <= 250) return 17
  if (meters <= 500) return 16
  if (meters <= 1000) return 15
  if (meters <= 2500) return 14
  return 13
}

function isUsablePoint(lat: number | null, lng: number | null): lat is number {
  return lat != null && lng != null && !(lat === 0 && lng === 0)
}

function frameIsReady(el: HTMLElement | null) {
  return Boolean(el && el.clientWidth >= 160 && el.clientHeight >= 160)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const chars: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return chars[character] ?? character
  })
}

type NominatimAddress = {
  road?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  hamlet?: string
  neighbourhood?: string
}

type NominatimPlace = {
  lat: string
  lon: string
  display_name?: string
  address?: NominatimAddress
}

function stripPostcode(value: string) {
  return value
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*|,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function placeLabel(place: NominatimPlace) {
  const address = place.address
  const parts = [
    address?.road,
    address?.neighbourhood || address?.suburb,
    address?.village || address?.hamlet || address?.town || address?.city,
  ].filter(Boolean)
  if (parts.length) return parts.join(', ')
  return stripPostcode(place.display_name ?? '') || 'Selected location'
}

function popupHtml(label: string) {
  const text = escapeHtml(label.trim() || 'Selected location')
  return `<div style="min-width:120px;max-width:220px;font-family:inherit;color:#17375e;font-size:13px;font-weight:700;line-height:1.35">${text}</div>`
}

type PlaceHit = {
  id: string
  title: string
  detail: string
  label: string
  latitude: string
  longitude: string
}

type PhotonFeature = {
  geometry?: { coordinates?: number[] }
  properties?: {
    osm_id?: number
    osm_type?: string
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    district?: string
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    country?: string
  }
}

const SEARCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'CedarPayroll/1.0 (workplace-map)',
}

function uniqueParts(parts: Array<string | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of parts) {
    const value = part?.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

function photonHit(feature: PhotonFeature, index: number): PlaceHit | null {
  const coords = feature.geometry?.coordinates
  const props = feature.properties ?? {}
  if (!coords || coords.length < 2) return null
  const line = uniqueParts([props.housenumber, props.street]).join(' ')
  const title = props.name?.trim() || line || 'Selected location'
  const detail = uniqueParts([
    props.name && line ? line : undefined,
    props.district,
    props.city || props.town || props.village,
    props.county || props.state,
    props.postcode,
    props.country,
  ]).join(', ')
  return {
    id: `${props.osm_type ?? 'place'}-${props.osm_id ?? index}`,
    title,
    detail,
    label: uniqueParts([title, detail]).join(', '),
    latitude: formatCoord(coords[1]),
    longitude: formatCoord(coords[0]),
  }
}

async function suggestPlaces(query: string, signal?: AbortSignal) {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '7')
  url.searchParams.set('lang', 'en')
  const response = await fetch(url.toString(), { headers: SEARCH_HEADERS, signal })
  if (!response.ok) throw new Error('Search failed')
  const payload = (await response.json()) as { features?: PhotonFeature[] }
  const hits = (payload.features ?? []).map(photonHit).filter((item): item is PlaceHit => Boolean(item))
  const seen = new Set<string>()
  return hits.filter((item) => {
    const key = `${item.latitude},${item.longitude},${item.label.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function nominatimSearch(query: string, countrycodes?: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('q', query)
  if (countrycodes) url.searchParams.set('countrycodes', countrycodes)
  const response = await fetch(url.toString(), { headers: SEARCH_HEADERS })
  if (!response.ok) throw new Error('Search failed')
  const results = (await response.json()) as NominatimPlace[]
  return results.map((match, index) => ({
    id: `nominatim-${match.lat}-${match.lon}-${index}`,
    title: placeLabel(match),
    detail: stripPostcode(match.display_name ?? ''),
    label: placeLabel(match),
    latitude: formatCoord(Number(match.lat)),
    longitude: formatCoord(Number(match.lon)),
  }))
}

async function lookupPlace(query: string) {
  const suggestions = await suggestPlaces(query).catch(() => [] as PlaceHit[])
  if (suggestions[0]) {
    return {
      latitude: suggestions[0].latitude,
      longitude: suggestions[0].longitude,
      label: suggestions[0].title,
    }
  }
  const worldwide = await nominatimSearch(query)
  const uk = worldwide.length ? worldwide : await nominatimSearch(query, 'gb')
  const match = uk[0]
  if (!match) return null
  return {
    latitude: match.latitude,
    longitude: match.longitude,
    label: match.title,
  }
}

async function reversePlace(latitude: number, longitude: number) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'json')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Lookup failed')
  const match = (await response.json()) as NominatimPlace
  return placeLabel(match)
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PinHeaderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill={PIN_BLUE} aria-hidden>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}

function SuggestionList({
  items,
  activeIndex,
  onSelect,
}: {
  items: PlaceHit[]
  activeIndex: number
  onSelect: (item: PlaceHit) => void
}) {
  if (!items.length) return null
  return (
    <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-[1200] max-h-64 overflow-auto rounded-[14px] border border-[#e6e6e6] bg-white py-1 shadow-[0_12px_32px_rgba(23,55,94,0.16)]">
      {items.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
            className={`flex w-full items-start gap-3 px-3 py-2.5 text-left ${
              index === activeIndex ? 'bg-[#eef4fb]' : 'hover:bg-[#f7f6f3]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-[#2563eb]" fill="currentColor" aria-hidden>
              <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-navy">{item.title}</span>
              {item.detail ? <span className="mt-0.5 block truncate text-xs text-muted">{item.detail}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-navy" fill="none" aria-hidden>
      <path d="M4 20V8l8-4 8 4v12H4z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 20v-6h6v6M9 10h1.5M13.5 10H15M9 13h1.5M13.5 13H15" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function WorkplaceMapPicker({
  latitude,
  longitude,
  radiusMeters,
  postcode,
  addressLine,
  officeName,
  addressQuery,
  active = true,
  onLocationChange,
  onRadiusChange,
}: WorkplaceMapPickerProps) {
  const frameEl = useRef<HTMLDivElement>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onLocationChangeRef = useRef(onLocationChange)
  const userMoved = useRef(false)
  const locating = useRef(false)
  const skipMapSuggest = useRef(false)
  const skipOfficeSuggest = useRef(false)
  const [mapQuery, setMapQuery] = useState('')
  const [postcodeQuery, setPostcodeQuery] = useState('')
  const [pinLabel, setPinLabel] = useState('Selected location')
  const [searching, setSearching] = useState(false)
  const [postcodeSearching, setPostcodeSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [postcodeError, setPostcodeError] = useState<string | null>(null)
  const [mapSuggestions, setMapSuggestions] = useState<PlaceHit[]>([])
  const [officeSuggestions, setOfficeSuggestions] = useState<PlaceHit[]>([])
  const [mapHighlight, setMapHighlight] = useState(0)
  const [officeHighlight, setOfficeHighlight] = useState(0)
  const [mapSuggestOpen, setMapSuggestOpen] = useState(false)
  const [officeSuggestOpen, setOfficeSuggestOpen] = useState(false)

  onLocationChangeRef.current = onLocationChange

  const lat = parseCoord(latitude)
  const lng = parseCoord(longitude)
  const hasPoint = isUsablePoint(lat, lng)
  const radius = clampRadius(Number(radiusMeters) || DEFAULT_ATTENDANCE_RADIUS_METERS)
  const title = officeName.trim() || 'Main Office'
  const street = addressLine.trim()
  const viewRef = useRef({ lat, lng, radius, hasPoint, pinLabel })
  viewRef.current = { lat, lng, radius, hasPoint, pinLabel }

  useEffect(() => {
    const query = mapQuery.trim()
    if (skipMapSuggest.current) {
      skipMapSuggest.current = false
      return
    }
    if (query.length < 2) {
      setMapSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void suggestPlaces(query, controller.signal)
        .then((items) => {
          setMapSuggestions(items)
          setMapHighlight(0)
          setMapSuggestOpen(true)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setMapSuggestions([])
        })
    }, 280)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [mapQuery])

  useEffect(() => {
    const query = postcodeQuery.trim()
    if (skipOfficeSuggest.current) {
      skipOfficeSuggest.current = false
      return
    }
    if (query.length < 2) {
      setOfficeSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void suggestPlaces(query, controller.signal)
        .then((items) => {
          setOfficeSuggestions(items)
          setOfficeHighlight(0)
          setOfficeSuggestOpen(true)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setOfficeSuggestions([])
        })
    }, 280)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [postcodeQuery])

  useEffect(() => {
    function paint() {
      const map = mapRef.current
      const view = viewRef.current
      if (!map || !view.hasPoint || view.lat == null || view.lng == null) return
      const point: L.LatLngExpression = [view.lat, view.lng]
      const html = popupHtml(view.pinLabel)
      if (!markerRef.current) {
        markerRef.current = L.marker(point, { draggable: true, icon: officeIcon }).addTo(map)
        markerRef.current.bindPopup(html, {
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: 'workplace-popup',
        })
        markerRef.current.on('dragend', () => {
          const next = markerRef.current?.getLatLng()
          if (!next) return
          userMoved.current = true
          onLocationChangeRef.current(formatCoord(next.lat), formatCoord(next.lng))
          void reversePlace(next.lat, next.lng).then(setPinLabel).catch(() => {
            setPinLabel('Selected location')
          })
        })
      } else {
        markerRef.current.setLatLng(point)
        markerRef.current.setPopupContent(html)
      }
      markerRef.current.openPopup()
      if (!circleRef.current) {
        circleRef.current = L.circle(point, {
          radius: view.radius,
          color: PIN_BLUE,
          weight: 2,
          dashArray: '7 6',
          fillColor: PIN_BLUE,
          fillOpacity: 0.12,
        }).addTo(map)
      } else {
        circleRef.current.setLatLng(point)
        circleRef.current.setRadius(view.radius)
      }
      map.invalidateSize({ animate: false })
      map.setView(point, zoomForRadius(view.radius), { animate: false })
    }

    function createMap() {
      if (mapRef.current || !active || !viewRef.current.hasPoint || !mapEl.current) return
      if (!frameIsReady(frameEl.current)) return
      const view = viewRef.current
      if (view.lat == null || view.lng == null) return
      const map = L.map(mapEl.current, {
        center: [view.lat, view.lng],
        zoom: zoomForRadius(view.radius),
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      map.zoomControl.setPosition('topleft')
      map.on('click', (event: L.LeafletMouseEvent) => {
        userMoved.current = true
        onLocationChangeRef.current(formatCoord(event.latlng.lat), formatCoord(event.latlng.lng))
        void reversePlace(event.latlng.lat, event.latlng.lng).then(setPinLabel).catch(() => {
          setPinLabel('Selected location')
        })
      })
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
  }, [active, hasPoint, lat, lng, radius, pinLabel])

  useEffect(() => {
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!hasPoint || lat == null || lng == null) return
    let cancelled = false
    void reversePlace(lat, lng)
      .then((label) => {
        if (!cancelled) setPinLabel(label)
      })
      .catch(() => {
        if (!cancelled) setPinLabel('Selected location')
      })
    return () => {
      cancelled = true
    }
  }, [hasPoint, lat, lng])

  useEffect(() => {
    if (!active || hasPoint || locating.current || userMoved.current) return
    const query = postcode.trim() || addressQuery.trim()
    if (!query) return
    locating.current = true
    setSearching(true)
    void lookupPlace(query)
      .then((match) => {
        if (!match || userMoved.current) return
        setPinLabel(match.label)
        onLocationChangeRef.current(match.latitude, match.longitude)
      })
      .catch(() => {
        setSearchError('Could not find that postcode on the map. Search instead.')
      })
      .finally(() => {
        locating.current = false
        setSearching(false)
      })
  }, [active, addressQuery, hasPoint, postcode])

  function applyPlace(hit: PlaceHit) {
    skipMapSuggest.current = true
    skipOfficeSuggest.current = true
    userMoved.current = true
    setPinLabel(hit.title)
    setMapQuery('')
    setPostcodeQuery('')
    setMapSuggestions([])
    setOfficeSuggestions([])
    setMapSuggestOpen(false)
    setOfficeSuggestOpen(false)
    setSearchError(null)
    setPostcodeError(null)
    onLocationChange(hit.latitude, hit.longitude)
  }

  async function searchMapLocation(query: string) {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchError('Enter an address, street, town or place')
      return
    }
    if (mapSuggestions[mapHighlight]) {
      applyPlace(mapSuggestions[mapHighlight])
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const match = await lookupPlace(trimmed)
      if (!match) {
        setSearchError('No matching address found. Try a street, building or town name.')
        return
      }
      applyPlace({
        id: 'search',
        title: match.label,
        detail: match.label,
        label: match.label,
        latitude: match.latitude,
        longitude: match.longitude,
      })
    } catch {
      setSearchError('Could not search the map. Try again in a moment.')
    } finally {
      setSearching(false)
    }
  }

  async function searchByPostcode(query: string) {
    const trimmed = query.trim()
    if (!trimmed) {
      setPostcodeError('Enter a postcode to find the office')
      return
    }
    setPostcodeSearching(true)
    setPostcodeError(null)
    if (officeSuggestions[officeHighlight]) {
      applyPlace(officeSuggestions[officeHighlight])
      setPostcodeSearching(false)
      return
    }
    try {
      const match = await lookupPlace(trimmed)
      if (!match) {
        setPostcodeError('No matching address or postcode found. Try a street or postcode.')
        return
      }
      applyPlace({
        id: 'office-search',
        title: match.label,
        detail: match.label,
        label: match.label,
        latitude: match.latitude,
        longitude: match.longitude,
      })
    } catch {
      setPostcodeError('Could not search that address. Try again in a moment.')
    } finally {
      setPostcodeSearching(false)
    }
  }

  const locationLine = [street, postcode.trim()].filter(Boolean).join(', ') || 'Add the office address above'

  return (
    <div className="workplace-checkin grid items-stretch gap-4 xl:grid-cols-2">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9] bg-white p-2.5 sm:p-3">
        <div ref={frameEl} className="workplace-map-frame min-h-[280px] flex-1 overflow-hidden rounded-[16px] sm:min-h-[320px] xl:min-h-0">
          <span className="workplace-map-sizer" />
          <div className="pointer-events-none absolute inset-x-2 top-2 z-[1100] sm:inset-x-3 sm:top-3">
            <div className="pointer-events-auto relative">
              <div className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-[#e6e6e6] bg-white px-3 shadow-sm sm:h-11 sm:px-4">
                <button
                  type="button"
                  onClick={() => void searchMapLocation(mapQuery)}
                  className="shrink-0 text-muted"
                  aria-label="Search location"
                >
                  <SearchIcon />
                </button>
                <input
                  value={mapQuery}
                  onChange={(event) => {
                    setMapQuery(event.target.value)
                    setSearchError(null)
                    setMapSuggestOpen(true)
                  }}
                  onFocus={() => {
                    if (mapSuggestions.length) setMapSuggestOpen(true)
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setMapSuggestOpen(false), 120)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && mapSuggestions.length) {
                      event.preventDefault()
                      setMapHighlight((current) => (current + 1) % mapSuggestions.length)
                      return
                    }
                    if (event.key === 'ArrowUp' && mapSuggestions.length) {
                      event.preventDefault()
                      setMapHighlight((current) => (current - 1 + mapSuggestions.length) % mapSuggestions.length)
                      return
                    }
                    if (event.key === 'Escape') {
                      setMapSuggestOpen(false)
                      return
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void searchMapLocation(mapQuery)
                    }
                  }}
                  placeholder="Search address, street, building or town..."
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-muted sm:h-10"
                />
              </div>
              {mapSuggestOpen ? (
                <SuggestionList items={mapSuggestions} activeIndex={mapHighlight} onSelect={applyPlace} />
              ) : null}
            </div>
          </div>
          {!hasPoint ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#e8eef6] px-4 text-center text-sm font-medium text-navy">
              {searching ? 'Finding that location…' : 'Search a place or click the map to drop a pin'}
            </div>
          ) : null}
          <div ref={mapEl} className="workplace-map-surface" />
          <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-navy shadow-sm sm:bottom-3 sm:left-3">
            <span className="size-3 shrink-0 rounded-full border-2 border-dashed border-[#2563eb]" />
            Check-in radius ({radiusLabel(radius)})
          </div>
        </div>
        {searchError ? (
          <p className="mt-2 shrink-0 px-1 text-sm text-brand">{searchError}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#d9d9d9] bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <PinHeaderIcon />
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-navy sm:text-2xl">Workplace check-in</h3>
            <p className="mt-1 text-sm text-muted">
              Employees must be within {radiusLabel(radius)} of this pin to check in.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[16px] bg-[#e9f8ef] px-3 py-3 sm:px-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-navy sm:size-11">
            <BuildingIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">{title}</p>
            <p className="mt-0.5 break-words text-sm text-[#3d5572]">{locationLine}</p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                hasPoint ? 'bg-[#c9f0d6] text-[#157a3a]' : 'bg-[#f0efec] text-muted'
              }`}
            >
              {hasPoint ? 'Office location' : 'No pin yet'}
            </span>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-semibold text-navy">Find office</span>
          <div className="relative flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <input
                value={postcodeQuery}
                onChange={(event) => {
                  setPostcodeQuery(event.target.value)
                  setPostcodeError(null)
                  setOfficeSuggestOpen(true)
                }}
                onFocus={() => {
                  if (officeSuggestions.length) setOfficeSuggestOpen(true)
                }}
                onBlur={() => {
                  window.setTimeout(() => setOfficeSuggestOpen(false), 120)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' && officeSuggestions.length) {
                    event.preventDefault()
                    setOfficeHighlight((current) => (current + 1) % officeSuggestions.length)
                    return
                  }
                  if (event.key === 'ArrowUp' && officeSuggestions.length) {
                    event.preventDefault()
                    setOfficeHighlight((current) => (current - 1 + officeSuggestions.length) % officeSuggestions.length)
                    return
                  }
                  if (event.key === 'Escape') {
                    setOfficeSuggestOpen(false)
                    return
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void searchByPostcode(postcodeQuery)
                  }
                }}
                placeholder="Search by postcode or address"
                autoComplete="off"
                className="h-11 w-full rounded-[10px] border border-[#d9d9d9] bg-white px-4 text-sm text-navy outline-none focus:border-navy"
              />
              {officeSuggestOpen ? (
                <SuggestionList items={officeSuggestions} activeIndex={officeHighlight} onSelect={applyPlace} />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void searchByPostcode(postcodeQuery)}
              disabled={postcodeSearching}
              className="h-11 shrink-0 rounded-[10px] bg-navy px-5 text-sm font-semibold text-white disabled:opacity-60 sm:w-[7.5rem]"
            >
              {postcodeSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {postcodeError ? <p className="mt-2 text-sm text-brand">{postcodeError}</p> : null}
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-navy">Check-in radius</span>
            <span className="text-lg font-semibold text-navy">{radiusLabel(radius)}</span>
          </div>
          <input
            type="range"
            min={MIN_ATTENDANCE_RADIUS_METERS}
            max={MAX_ATTENDANCE_RADIUS_METERS}
            step={25}
            value={radius}
            onChange={(event) => onRadiusChange(event.target.value)}
            className="w-full accent-navy"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{MIN_ATTENDANCE_RADIUS_METERS} m</span>
            <span>5 km</span>
          </div>
        </div>

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
              Search a place on the map, or find the office by postcode
            </li>
            <li className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">
                2
              </span>
              Set how far employees can check in ({MIN_ATTENDANCE_RADIUS_METERS} m to 5 km)
            </li>
            <li className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-navy/20 text-xs font-semibold">
                3
              </span>
              Click Save employer settings
            </li>
          </ol>
        </div>
      </section>
    </div>
  )
}

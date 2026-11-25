import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const PIN_NAVY = '#17375e'

const pinIcon = L.divIcon({
  className: 'attendance-pin',
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  popupAnchor: [0, -30],
  html: `<svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="${PIN_NAVY}" d="M12 0C6.5 0 2 4.4 2 9.8c0 7.4 10 22.2 10 22.2s10-14.8 10-22.2C22 4.4 17.5 0 12 0z"/>
    <circle cx="12" cy="10" r="3.4" fill="#fff"/>
  </svg>`,
})

export function AttendancePlaceMap({
  latitude,
  longitude,
  label,
  compact = false,
  workplaceLatitude,
  workplaceLongitude,
  radiusMeters,
  checkoutLatitude,
  checkoutLongitude,
  checkoutLabel,
}: {
  latitude?: number | null
  longitude?: number | null
  label?: string | null
  compact?: boolean
  workplaceLatitude?: number | null
  workplaceLongitude?: number | null
  radiusMeters?: number | null
  checkoutLatitude?: number | null
  checkoutLongitude?: number | null
  checkoutLabel?: string | null
}) {
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!host.current || latitude == null || longitude == null) return
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return
    const map = L.map(host.current, {
      zoomControl: false,
      attributionControl: !compact,
      dragging: true,
      scrollWheelZoom: false,
    }).setView([latitude, longitude], 18)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    }).addTo(map)
    const marker = L.marker([latitude, longitude], { icon: pinIcon }).addTo(map)
    if (label) {
      const popup = marker.bindPopup(label, { autoClose: false, closeOnClick: false })
      if (!compact) popup.openPopup()
    }
    const checkoutMoved =
      checkoutLatitude != null &&
      checkoutLongitude != null &&
      (Math.abs(checkoutLatitude - latitude) > 0.00015 || Math.abs(checkoutLongitude - longitude) > 0.00015)
    if (checkoutMoved && checkoutLatitude != null && checkoutLongitude != null) {
      const checkout = L.circleMarker([checkoutLatitude, checkoutLongitude], {
        radius: 7,
        weight: 2,
        color: '#ffffff',
        fillColor: '#1f8a46',
        fillOpacity: 1,
      }).addTo(map)
      if (checkoutLabel) checkout.bindPopup(checkoutLabel)
      map.fitBounds(L.latLngBounds([latitude, longitude], [checkoutLatitude, checkoutLongitude]).pad(0.15))
    }
    if (
      workplaceLatitude != null &&
      workplaceLongitude != null &&
      radiusMeters != null &&
      radiusMeters > 0
    ) {
      const circle = L.circle([workplaceLatitude, workplaceLongitude], {
        radius: radiusMeters,
        color: '#17375e',
        weight: 1,
        fillColor: '#17375e',
        fillOpacity: 0.08,
      }).addTo(map)
      map.fitBounds(circle.getBounds().extend([latitude, longitude]), { padding: [24, 24] })
    }
    mapRef.current = map
    const timer = window.setTimeout(() => map.invalidateSize(), 80)
    return () => {
      window.clearTimeout(timer)
      map.remove()
      mapRef.current = null
    }
  }, [latitude, longitude, label, compact, workplaceLatitude, workplaceLongitude, radiusMeters, checkoutLatitude, checkoutLongitude, checkoutLabel])

  if (latitude == null || longitude == null) return null

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[#eceae6] ${compact ? '' : 'mt-2'}`}>
      {label && !compact ? (
        <p className="bg-[#f8f7f4] px-3 py-2 text-xs font-medium text-navy">{label}</p>
      ) : null}
      <div ref={host} className={compact ? 'h-36 w-full' : 'h-40 w-full'} />
    </div>
  )
}

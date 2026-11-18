import { useEffect, useRef } from 'react'
import { hrApi } from '../../api'

const INTERVAL_MS = 60_000

function readCoords(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 },
    )
  })
}

export function useShiftLocationPing(companyId?: string | null, employeeId?: string | null) {
  const sending = useRef(false)

  useEffect(() => {
    if (!companyId || !employeeId) return
    let cancelled = false

    async function send() {
      if (cancelled || sending.current) return
      sending.current = true
      try {
        const today = await hrApi.todayAttendance(companyId!, employeeId!)
        const open = Boolean(
          (today.data as { open_attendance?: { check_in_at?: string | null } | null } | undefined)
            ?.open_attendance,
        )
        if (!open || cancelled) return
        const coords = await readCoords()
        if (!coords || cancelled) return
        await hrApi.pingAttendanceLocation(companyId!, employeeId!, coords)
      } catch {
        // Not checked in, or location denied — admins keep the last known pin.
      } finally {
        sending.current = false
      }
    }

    void send()
    const id = window.setInterval(() => void send(), INTERVAL_MS)
    const onFocus = () => void send()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [companyId, employeeId])
}

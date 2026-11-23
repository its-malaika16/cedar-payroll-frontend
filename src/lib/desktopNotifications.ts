import { useEffect, useRef } from 'react'

type DesktopNotice = {
  id: unknown
  title?: string
  body?: string
  is_read?: boolean
  type?: string
}

/**
 * Desktop alerts are for notifications that arrive while the page is open.
 * The list already on screen when the site loads is the inbox, not a new
 * alert, so a refresh does not pop the same banners again.
 */
export function useDesktopNotifications(
  items: DesktopNotice[] | undefined,
  allowedTypes: readonly string[],
) {
  const primed = useRef(false)
  const seen = useRef(new Set<string>())
  const allowedKey = allowedTypes.join('|')

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    void Notification.requestPermission()
  }, [])

  useEffect(() => {
    if (!items) return
    const allowed = new Set(allowedKey ? allowedKey.split('|') : [])
    if (!primed.current) {
      primed.current = true
      for (const item of items) {
        const id = String(item.id ?? '')
        if (id) seen.current.add(id)
      }
      return
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    for (const item of items) {
      const id = String(item.id ?? '')
      if (!id || seen.current.has(id) || item.is_read) continue
      seen.current.add(id)
      if (!allowed.has(item.type ?? '')) continue
      new Notification(item.title || 'Cedar Payroll', {
        body: item.body || '',
        tag: `cedar-${id}`,
      })
    }
  }, [allowedKey, items])
}

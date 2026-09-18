export const LEAVE_TYPES = [
  { id: 'Annual Leave', color: '#3b82f6' },
  { id: 'Sick Leave', color: '#d32027' },
  { id: 'Holiday', color: '#22c55e' },
  { id: 'Authorised Absence', color: '#f59e0b' },
  { id: 'Unauthorised Absence', color: '#ea580c' },
  { id: 'Maternity Leave', color: '#ec4899' },
  { id: 'Paternity Leave', color: '#17375e' },
  { id: 'Parental Leave', color: '#8b5cf6' },
  { id: 'Compassionate Leave', color: '#f9a8d4' },
  { id: "Carer's Leave", color: '#84cc16' },
  { id: 'Study Leave', color: '#0f766e' },
  { id: 'Other', color: '#111827' },
] as const

export function leaveTypeColor(type?: string | null) {
  const match = LEAVE_TYPES.find((item) => item.id.toLowerCase() === String(type ?? '').trim().toLowerCase())
  return match?.color ?? '#64748b'
}

export function formatLeaveRange(start?: string | null, end?: string | null) {
  if (!start) return '—'
  const from = new Date(start)
  const to = end ? new Date(end) : from
  const same = from.toDateString() === to.toDateString()
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (same) return fmt(from)
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}–${to.getDate()} ${to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  }
  return `${fmt(from)} – ${fmt(to)}`
}

export const EMPLOYEE_LEAVE_TYPES = [
  'Annual leave',
  'SSP leave',
  'SMP leave',
  'SPP leave',
  'Sick leave',
  'Unpaid leave',
  'Maternity leave',
  'Paternity leave',
  'Compassionate leave',
  'Other',
] as const

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type LeaveItem = {
  id?: unknown
  request_code?: string
  leave_type?: string
  start_date?: string
  end_date?: string
  status?: string
  reason?: string | null
  rejection_reason?: string | null
  duration_kind?: string | null
  duration_label?: string
  partial_period?: string | null
  attachment_name?: string | null
  days?: number
  source?: string
  assigned_by_admin?: boolean
  created_at?: string
  reviewed_at?: string | null
}

export type LeaveBalance = {
  annual?: { remaining_weeks?: number; entitled_weeks?: number }
  ssp?: { remaining_weeks?: number; entitled_weeks?: number }
  smp?: { remaining_weeks?: number; entitled_weeks?: number }
  spp?: { remaining_weeks?: number; entitled_weeks?: number }
}

export function leaveStatus(value?: string): LeaveStatus {
  const next = String(value ?? '').toUpperCase()
  if (next === 'APPROVED' || next === 'REJECTED' || next === 'CANCELLED') return next
  return 'PENDING'
}

export function statusMeta(status: LeaveStatus) {
  return {
    PENDING: { label: 'Pending', className: 'bg-[#fff4e5] text-[#c2782a]', dot: 'bg-[#e2a334]' },
    APPROVED: { label: 'Approved', className: 'bg-[#e7f6ec] text-[#1b7d4f]', dot: 'bg-[#22c55e]' },
    REJECTED: { label: 'Rejected', className: 'bg-[#fdecee] text-[#d32027]', dot: 'bg-[#d32027]' },
    CANCELLED: { label: 'Cancelled', className: 'bg-[#f3f1ec] text-muted', dot: 'bg-[#c5c5c5]' },
  }[status]
}

export function coversDate(item: LeaveItem, key: string) {
  const start = String(item.start_date ?? '').slice(0, 10)
  const end = String(item.end_date ?? start).slice(0, 10)
  return Boolean(start && start <= key && key <= end)
}

export function formatLeaveDay(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatLeaveDayLong(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' })
  return `${formatLeaveDay(value)} (${weekday})`
}

export function formatLeaveRangeShort(start?: string | null, end?: string | null) {
  if (!start) return '—'
  const from = new Date(start)
  const to = end ? new Date(end) : from
  if (Number.isNaN(from.getTime())) return String(start)
  if (from.toDateString() === to.toDateString()) {
    return from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} – ${to.getDate()} ${to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  }
  return `${formatLeaveDay(start)} – ${formatLeaveDay(end)}`
}

export function weekdayCount(start: string, end: string, partial = false) {
  if (partial) return 0.5
  const from = new Date(start)
  const to = new Date(end)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0
  let count = 0
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (cursor.getTime() <= last.getTime()) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export function weeksLabel(value?: number) {
  const safe = Number(value ?? 0)
  const shown = Number.isInteger(safe) ? String(safe) : safe.toFixed(1)
  return `${shown} weeks`
}

export function idOfLeave(item: LeaveItem) {
  return String(item.id ?? item.request_code ?? '')
}

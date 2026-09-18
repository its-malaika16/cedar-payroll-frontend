import { dateKey, parseDateKey } from './rotaDates'

const META_PREFIX = '__ROTA_META__:'

export type RotaEmployee = {
  id: string
  first_name?: string | null
  last_name?: string | null
  employee_code?: string | null
}

export type RotaShift = {
  id: string
  employee_id?: string | number | null
  shift_date: string
  start_time: string
  end_time: string
  role_name?: string | null
  location?: string | null
  notes?: string | null
  employees?: RotaEmployee | null
}

export type LeaveItem = {
  id: string
  employee_id?: string | number | null
  start_date: string
  end_date: string
  status: string
  leave_type?: string | null
}

export type ShiftMeta = {
  breakMinutes: number
  requireApproval: boolean
  notes: string
}

export function encodeShiftNotes(meta: ShiftMeta): string | undefined {
  const payload = JSON.stringify({
    breakMinutes: meta.breakMinutes || 0,
    requireApproval: Boolean(meta.requireApproval),
  })
  const notes = meta.notes.trim()
  return `${META_PREFIX}${payload}${notes ? `\n${notes}` : ''}`
}

export function decodeShiftNotes(raw?: string | null): ShiftMeta {
  if (!raw) return { breakMinutes: 0, requireApproval: false, notes: '' }
  if (!raw.startsWith(META_PREFIX)) {
    return { breakMinutes: 0, requireApproval: false, notes: raw }
  }
  const rest = raw.slice(META_PREFIX.length)
  const newline = rest.indexOf('\n')
  const json = newline === -1 ? rest : rest.slice(0, newline)
  const notes = newline === -1 ? '' : rest.slice(newline + 1)
  try {
    const parsed = JSON.parse(json) as { breakMinutes?: number; requireApproval?: boolean }
    return {
      breakMinutes: Number(parsed.breakMinutes) || 0,
      requireApproval: Boolean(parsed.requireApproval),
      notes,
    }
  } catch {
    return { breakMinutes: 0, requireApproval: false, notes: raw }
  }
}

function parseClock(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2] ?? 0)
  const meridiem = match[3]?.toLowerCase()
  if (minutes > 59 || hours > 23) return null
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (!meridiem && hours > 23) return null
  return hours * 60 + minutes
}

export function parseTimeRange(input: string): { startMinutes: number; endMinutes: number } | null {
  const parts = input.split(/\s*(?:-|–|—|to)\s*/i).filter(Boolean)
  if (parts.length < 2) return null
  const startMinutes = parseClock(parts[0])
  const endMinutes = parseClock(parts[1])
  if (startMinutes == null || endMinutes == null) return null
  return { startMinutes, endMinutes }
}

export function formatClock(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const meridiem = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${meridiem}`
}

export function formatTimeRange(start: string | Date, end: string | Date): string {
  const startDate = start instanceof Date ? start : new Date(start)
  const endDate = end instanceof Date ? end : new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return ''
  return `${formatClock(startDate)} - ${formatClock(endDate)}`
}

export function combineDateAndMinutes(key: string, minutes: number): Date {
  const date = parseDateKey(key)
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return date
}

export function durationLabel(start: string | Date, end: string | Date, breakMinutes = 0): string {
  const startDate = start instanceof Date ? start : new Date(start)
  const endDate = end instanceof Date ? end : new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return ''
  const hours = (endDate.getTime() - startDate.getTime()) / 36e5 - breakMinutes / 60
  const rounded = Math.max(0, Math.round(hours * 10) / 10)
  return Number.isInteger(rounded) ? `${rounded} hr` : `${rounded} hr`
}

export function shiftDateKey(shift: RotaShift): string {
  return String(shift.shift_date ?? '').slice(0, 10)
}

export function leaveCoversDate(leave: LeaveItem, key: string): boolean {
  const start = String(leave.start_date ?? '').slice(0, 10)
  const end = String(leave.end_date ?? '').slice(0, 10)
  return Boolean(start && end && key >= start && key <= end)
}

export function isApprovedLeave(leave: LeaveItem): boolean {
  const status = String(leave.status ?? '').toUpperCase()
  return status === 'APPROVED' || status === 'CALENDAR'
}

const CALENDAR_LEAVE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual leave',
  UNPAID: 'Unpaid leave',
  SICK: 'Sick leave',
  PARENTING: 'Parenting leave',
  MATERNITY: 'Maternity leave',
  PATERNITY: 'Paternity leave',
  ABSENT: 'Absent',
  ON_STRIKE: 'On strike',
  CUSTOM: 'Custom leave',
}

export function calendarLeaveLabel(dayType?: string | null, customLabel?: string | null): string {
  if (dayType === 'CUSTOM' && customLabel?.trim()) return customLabel.trim()
  return CALENDAR_LEAVE_LABELS[String(dayType ?? '').toUpperCase()] || 'On Leave'
}

export function isCalendarLeaveType(dayType?: string | null): boolean {
  const value = String(dayType ?? '').toUpperCase()
  return Boolean(value) && value !== 'WORKING' && value !== 'NON_WORKING'
}

export function employeeIdOf(value: { employee_id?: string | number | null; id?: string | number } | string | number | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value.employee_id != null && value.employee_id !== '') return String(value.employee_id)
  if (value.id != null) return String(value.id)
  return ''
}

export function hoursBetween(start: string | Date, end: string | Date, breakMinutes = 0): number {
  const startDate = start instanceof Date ? start : new Date(start)
  const endDate = end instanceof Date ? end : new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0
  return Math.max(0, (endDate.getTime() - startDate.getTime()) / 36e5 - breakMinutes / 60)
}

export function inRange(key: string, start: Date, end: Date): boolean {
  const from = dateKey(start)
  const to = dateKey(end)
  return key >= from && key <= to
}

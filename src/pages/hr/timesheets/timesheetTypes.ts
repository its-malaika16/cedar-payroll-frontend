export type TimesheetStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'PROCESSED'

export type TimesheetEmployee = {
  id: string
  first_name?: string | null
  last_name?: string | null
  employee_code?: string | null
}

export type TimesheetDay = {
  date: string
  entry_id?: string | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  scheduled_hours: number
  clock_in?: string | null
  clock_out?: string | null
  break_minutes: number
  worked_hours: number
  overtime_hours: number
}

export type TimesheetRow = {
  employee: TimesheetEmployee
  timesheet_id: string | null
  status: TimesheetStatus
  period_start: string
  period_end: string
  scheduled_hours: number
  break_minutes: number
  worked_hours: number
  overtime_hours: number
}

export type TimesheetOverview = {
  counts: {
    pending_review: number
    changes_requested: number
    approved: number
    processed: number
    total: number
  }
  rows: TimesheetRow[]
}

export type TimesheetDetail = TimesheetRow & {
  basic_rate?: number
  days: TimesheetDay[]
}

export function formatHours(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function formatBreak(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function statusLabel(status: TimesheetStatus): string {
  if (status === 'REJECTED') return 'Changes Requested'
  if (status === 'APPROVED') return 'Approved'
  if (status === 'PROCESSING') return 'Processing'
  if (status === 'PROCESSED') return 'Processed'
  return 'Pending Review'
}

export function canApprove(status: TimesheetStatus) {
  return status === 'SUBMITTED' || status === 'DRAFT'
}

export function canSend(status: TimesheetStatus) {
  return status === 'APPROVED' || status === 'PROCESSED'
}

export function canEdit(status: TimesheetStatus) {
  return status === 'SUBMITTED' || status === 'DRAFT' || status === 'REJECTED' || status === 'APPROVED'
}

export function canReopen(status: TimesheetStatus) {
  return status === 'APPROVED' || status === 'PROCESSED'
}

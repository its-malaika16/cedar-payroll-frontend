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
  paid_break?: boolean
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

export function resolveClockOut(
  clockIn: string | null | undefined,
  clockOut: string | null | undefined,
  scheduledEnd?: string | null,
): string | null | undefined {
  if (!clockIn || !clockOut) return clockOut
  const start = new Date(clockIn)
  const end = new Date(clockOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return clockOut
  if (end.getTime() >= start.getTime()) return clockOut
  const plus12 = new Date(end.getTime() + 12 * 3_600_000)
  const overnight = new Date(end.getTime() + 24 * 3_600_000)
  const scheduled = scheduledEnd ? new Date(scheduledEnd) : null
  if (scheduled && !Number.isNaN(scheduled.getTime()) && plus12.getTime() > start.getTime()) {
    const scheduledMs =
      scheduled.getTime() > start.getTime()
        ? scheduled.getTime() - start.getTime()
        : scheduled.getTime() + 24 * 3_600_000 - start.getTime()
    const err12 = Math.abs(plus12.getTime() - start.getTime() - scheduledMs)
    const err24 = Math.abs(overnight.getTime() - start.getTime() - scheduledMs)
    if (err12 <= err24) return plus12.toISOString()
  }
  return overnight.toISOString()
}

export function hoursFromClocks(
  clockIn: string | null | undefined,
  clockOut: string | null | undefined,
  breakMinutes = 0,
  paidBreak = false,
  scheduledEnd?: string | null,
) {
  const resolvedOut = resolveClockOut(clockIn, clockOut, scheduledEnd)
  if (!clockIn || !resolvedOut) return { clock_out: clockOut ?? null, worked_hours: 0 }
  const start = new Date(clockIn)
  const end = new Date(resolvedOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { clock_out: clockOut ?? null, worked_hours: 0 }
  }
  const unpaid = paidBreak ? 0 : (Number(breakMinutes) || 0) / 60
  const worked = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000 - unpaid)
  return {
    clock_out: resolvedOut,
    worked_hours: Math.round(worked * 100) / 100,
  }
}

export function formatHours(hours: number): string {
  const totalMinutes = Math.max(0, Math.round((Number(hours) || 0) * 60))
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
  return status === 'SUBMITTED' || status === 'DRAFT' || status === 'REJECTED'
}

export function isTimesheetDirty(days: TimesheetDay[], baseline: TimesheetDay[] | null) {
  if (!baseline) return false
  if (days.length !== baseline.length) return true
  return days.some((day, index) => {
    const prev = baseline[index]
    return (
      (day.clock_in || '') !== (prev.clock_in || '') ||
      (day.clock_out || '') !== (prev.clock_out || '') ||
      Number(day.break_minutes || 0) !== Number(prev.break_minutes || 0)
    )
  })
}

export function canReopen(status: TimesheetStatus) {
  return status === 'APPROVED' || status === 'PROCESSED'
}

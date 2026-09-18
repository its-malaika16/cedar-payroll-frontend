export function idOf(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object' && 'id' in (value as object)) {
    return String((value as { id: unknown }).id)
  }
  return String(value)
}

export function money(value: unknown) {
  const amount = Number(value ?? 0)
  if (Number.isNaN(amount)) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('en-GB')
}

export function formatLongDate(value?: string | Date | null) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatNiNumber(value?: string | null) {
  const compact = String(value ?? '')
    .replace(/\s+/g, '')
    .toUpperCase()
  if (!compact) return '—'
  if (compact.length !== 9) return compact
  return `${compact.slice(0, 2)} ${compact.slice(2, 4)} ${compact.slice(4, 6)} ${compact.slice(6, 8)} ${compact.slice(8)}`
}

export function formatPayslipPeriod(
  start?: string | Date | null,
  end?: string | Date | null,
  payFrequency?: string | null,
) {
  if (!start && !end) return '—'
  const from = start instanceof Date ? start : start ? new Date(start) : null
  const to = end instanceof Date ? end : end ? new Date(end) : from
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return formatPeriodRange(start, end)
  }
  const frequency = String(payFrequency ?? '').toUpperCase()
  if (frequency === 'MONTHLY') {
    const day = to.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' })
    const month = to.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
    return `Month ending, ${day} ${month}`
  }
  const pad = (date: Date) => String(date.getUTCDate()).padStart(2, '0')
  const monthYear = to.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  if (from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear()) {
    return `${pad(from)}–${pad(to)} ${monthYear}`
  }
  const fromLabel = from.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `${fromLabel} – ${pad(to)} ${monthYear}`
}

export function formatPeriodRange(start?: string | Date | null, end?: string | Date | null) {
  const startLabel = formatLongDate(start)
  const endLabel = formatLongDate(end)
  if (startLabel === '—' && endLabel === '—') return '—'
  if (startLabel === '—') return endLabel
  if (endLabel === '—' || startLabel === endLabel) return startLabel

  const startDate = start instanceof Date ? start : start ? new Date(start) : null
  const endDate = end instanceof Date ? end : end ? new Date(end) : null
  if (
    startDate &&
    endDate &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    const startPart = startDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
    })
    return `${startPart} – ${endLabel}`
  }
  return `${startLabel} – ${endLabel}`
}

export function toDateInput(value?: string | null) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function fullName(
  first?: string | null,
  last?: string | null,
) {
  return [first, last].filter(Boolean).join(' ') || '—'
}

function starterLeaverRow(employee?: { starters_leavers?: unknown } | null) {
  const rows = employee?.starters_leavers
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row || typeof row !== 'object') return null
  return row as { start_date?: unknown; leave_date?: unknown }
}

function dateOnly(value?: string | Date | null | unknown) {
  if (value == null || value === '') return null
  const date = String(value).slice(0, 10)
  return date.length >= 10 ? date : null
}

export function employeeStartDate(
  employee?: { starters_leavers?: unknown } | null,
) {
  return dateOnly(starterLeaverRow(employee)?.start_date)
}

export function employeeLeaveDate(
  employee?: { starters_leavers?: unknown } | null,
) {
  return dateOnly(starterLeaverRow(employee)?.leave_date)
}

export function isEmployedInPeriod(
  startDate?: string | Date | null,
  leaveDate?: string | Date | null,
  periodStart?: string | Date | null,
  periodEnd?: string | Date | null,
) {
  const start = dateOnly(startDate)
  const leave = dateOnly(leaveDate)
  const periodFrom = dateOnly(periodStart)
  const periodTo = dateOnly(periodEnd)
  if (start && periodTo && start > periodTo) return false
  if (leave && periodFrom && leave < periodFrom) return false
  return true
}

export function pensionAppliesToPeriod(
  pension?: {
    is_enrolled?: unknown
    is_exempt?: unknown
    scheme_reference?: unknown
    enrolment_date?: unknown
  } | null,
  periodEnd?: string | Date | null,
) {
  if (!pension) return false
  if (!pension.is_enrolled || pension.is_exempt) return false
  if (String(pension.scheme_reference ?? '').toUpperCase() === 'EXTERNAL') return false
  const enrolledFrom = dateOnly(pension.enrolment_date)
  const end = dateOnly(periodEnd)
  if (enrolledFrom && end && enrolledFrom > end) return false
  return true
}

export function isEmployeeOnPayrollRun(
  employee?: { starters_leavers?: unknown } | null,
  run?: {
    period_start_date?: string | Date | null
    period_end_date?: string | Date | null
  } | null,
) {
  return isEmployedInPeriod(
    employeeStartDate(employee),
    employeeLeaveDate(employee),
    run?.period_start_date,
    run?.period_end_date,
  )
}

export function labelize(value?: string | null) {
  if (!value) return '—'
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function isWeek1Month1Basis(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

/** Payslip tax code with W1 (weekly) or M1 (monthly) when Week 1/Month 1 is set. */
export function formatTaxCodeWithBasis(
  taxCode: string | null | undefined,
  week1month1: unknown,
  payFrequency?: string | null,
) {
  const raw = String(taxCode ?? '').trim().toUpperCase()
  if (!raw) return '—'
  const compact = raw.replace(/\s+/g, '')
  const base = compact.replace(/[WM]1$/, '') || compact
  const spaced = base.replace(/^(\d+)([A-Z]+)$/i, '$1 $2')
  const flagged = isWeek1Month1Basis(week1month1) || /[WM]1$/.test(compact)
  if (!flagged) return spaced
  const freq = String(payFrequency ?? '').toUpperCase()
  const suffix =
    freq === 'MONTHLY' || freq === 'QUARTERLY' || freq === 'YEARLY' ? 'M1' : 'W1'
  return `${spaced} ${suffix}`
}

export function statusTone(status?: string | null) {
  const value = (status ?? '').toUpperCase()
  if (
    ['ACTIVE', 'APPROVED', 'COMPLETED', 'LOCKED', 'ACCEPTED', 'SUBMITTED', 'PAID', 'ON TIME', 'ON_TIME'].includes(
      value,
    )
  ) {
    return 'success'
  }
  if (['PENDING', 'DRAFT', 'PROCESSING', 'GENERATED', 'LATE', 'UPCOMING'].includes(value)) {
    return 'warning'
  }
  if (['REJECTED', 'FAILED', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'ABSENT'].includes(value)) {
    return 'danger'
  }
  return 'neutral'
}

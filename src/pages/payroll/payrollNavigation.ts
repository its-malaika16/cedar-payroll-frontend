import type { PayrollRun } from '../../types'

export function payrollListPath(options?: {
  scheduleId?: string | number | null
  period?: string | number | null
}) {
  const params = new URLSearchParams()
  if (options?.scheduleId) params.set('schedule', String(options.scheduleId))
  if (options?.period != null && options.period !== '') {
    params.set('period', String(options.period))
  }
  const query = params.toString()
  return query ? `/payroll/runs?${query}` : '/payroll/runs'
}

export function payrollListPathFromRun(run?: PayrollRun | null) {
  const scheduleId = run?.schedule_id ?? run?.payroll_schedules?.id
  return payrollListPath({
    scheduleId: scheduleId != null ? String(scheduleId) : undefined,
    period: run?.period_number != null ? String(run.period_number) : undefined,
  })
}

export function payslipReturnPath(from: unknown, fallback: string) {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return fallback
  }
  if (from.includes('/records/')) return fallback
  if (from === '/payroll/payslips' || from.startsWith('/payroll/payslips?')) return fallback
  return from
}

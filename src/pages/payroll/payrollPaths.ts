export function payrollRunsPath(runId?: string | null) {
  if (!runId) return '/payroll/runs'
  return `/payroll/runs?run=${encodeURIComponent(runId)}`
}

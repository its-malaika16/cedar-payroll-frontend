export function payslipProgress(status?: string | null, runLocked = false) {
  if ((status ?? '').toUpperCase() !== 'FINALISED') return null
  return runLocked ? 'tick' : 'star'
}

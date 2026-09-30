export function formSnapshot(value: unknown) {
  return JSON.stringify(value)
}

export function isFormDirty(current: unknown, baseline: unknown) {
  return formSnapshot(current) !== formSnapshot(baseline)
}

import { money } from '../../lib/format'
import type { EmployerDefaults, PayrollRecord } from '../../types'
import { resolveCompanyPayTypes } from '../payroll/companyPayTypes'
import { ADDITION_ITEMS } from '../payroll/payslipMenus'
import type { ReportFieldItem, ReportSpec } from './reportSpecs'

function labelKey(name: string) {
  return name.trim().toLowerCase().replace(/\.+$/, '')
}

function num(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function moneyOrDash(value: unknown) {
  if (value == null || value === '') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return '—'
  return money(amount)
}

export function payTypeFieldId(kind: 'addition' | 'deduction', name: string) {
  const slug = labelKey(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${kind === 'addition' ? 'ea' : 'ed'}_${slug || 'item'}`
}

function mappedAdditionAmount(record: PayrollRecord, name: string) {
  const key = labelKey(name)
  const item = ADDITION_ITEMS.find((entry) => labelKey(entry.label) === key)
  let amount = 0
  if (item?.field) amount += num(record[item.field])
  const fromLines = (record.pay_lines ?? []).reduce((sum, line) => {
    if (line.kind !== 'addition') return sum
    if (labelKey(line.label ?? '') !== key) return sum
    if (item?.field && num(record[item.field]) !== 0) return sum
    return sum + num(line.amount)
  }, 0)
  return amount + fromLines
}

export function employerPayTypeFieldValue(record: PayrollRecord | undefined, fieldId: string) {
  if (!fieldId.startsWith('ea_') && !fieldId.startsWith('ed_')) return null
  if (!record) return '—'
  if (fieldId.startsWith('ea_')) {
    const mapped = ADDITION_ITEMS.find((item) => payTypeFieldId('addition', item.label) === fieldId)
    if (mapped) return moneyOrDash(mappedAdditionAmount(record, mapped.label))
    const amount = (record.pay_lines ?? []).reduce((sum, line) => {
      if (line.kind !== 'addition') return sum
      if (payTypeFieldId('addition', line.label ?? '') !== fieldId) return sum
      return sum + num(line.amount)
    }, 0)
    return moneyOrDash(amount)
  }
  const fromLines = (record.deduction_lines ?? []).reduce((sum, line) => {
    if (payTypeFieldId('deduction', line.label ?? '') !== fieldId) return sum
    return sum + num(line.amount)
  }, 0)
  if (fromLines !== 0) return moneyOrDash(fromLines)
  if (fieldId === 'ed_salary_sacrifice') return moneyOrDash(record.salary_sacrifice_pension)
  if (fieldId === 'ed_holiday_adj') return moneyOrDash(record.holiday_adjustment)
  return moneyOrDash(0)
}

export function mergeEmployerItemFields(fields: ReportFieldItem[], defaults?: EmployerDefaults | null) {
  const payTypes = resolveCompanyPayTypes(defaults)
  const rest = fields.filter(
    (field) => field.category !== 'employer_additions' && field.category !== 'employer_deductions',
  )
  return [
    ...rest,
    ...payTypes.additions.map((item) => ({
      id: payTypeFieldId('addition', item.name),
      label: `${item.name} - Amount`,
      category: 'employer_additions',
    })),
    ...payTypes.deductions.map((item) => ({
      id: payTypeFieldId('deduction', item.name),
      label: `${item.name} - Amount`,
      category: 'employer_deductions',
    })),
  ]
}

export function specWithCompanyPayTypes<T extends ReportSpec>(spec: T, defaults?: EmployerDefaults | null): T {
  const hasEmployerItems = spec.groups.some((group) =>
    group.categories.some((category) => category.id === 'employer_additions' || category.id === 'employer_deductions'),
  )
  if (!hasEmployerItems) return spec
  return { ...spec, fields: mergeEmployerItemFields(spec.fields, defaults) }
}

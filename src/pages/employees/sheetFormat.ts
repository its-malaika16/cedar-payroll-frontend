import { formatDate, money } from '../../lib/format'
import type { FormPreview } from './formPreview'

export function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function dash(value?: string | null) {
  const text = (value ?? '').trim()
  return text ? esc(text) : '-'
}

export function sheetDate(value?: string | null) {
  if (!value) return '-'
  const formatted = formatDate(value)
  return formatted === '—' ? '-' : esc(formatted)
}

export function moneyWhole(value: unknown) {
  const amount = Math.round(Number(value ?? 0))
  if (Number.isNaN(amount)) return '-'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export { money }

export function employeeName(data: FormPreview) {
  return (
    data.employee?.display_name ||
    [data.employee?.first_name, data.employee?.last_name].filter(Boolean).join(' ') ||
    'Employee'
  )
}

export function addressLines(...parts: Array<string | null | undefined>) {
  return parts
    .flatMap((part) => String(part ?? '').split(','))
    .map((line) => line.trim())
    .filter(Boolean)
}

export function addressHtml(...parts: Array<string | null | undefined>) {
  const lines = addressLines(...parts)
  return lines.length ? lines.map((line) => esc(line)).join('<br>') : '-'
}

export function fieldHtml(label: string, value: string) {
  return `<p class="sheet-field"><span class="sheet-label">${esc(label)}</span><span class="sheet-value">${value}</span></p>`
}

export const SHEET_FIELD_CSS = `
.sheet-field { margin: 0 0 8px; }
.sheet-label { display: block; font-size: 9.5px; font-style: italic; color: #7a8794; }
.sheet-value { display: block; font-size: 11.5px; font-weight: 700; }
.sheet-card { border: 1px solid #d9d9d9; border-top: none; overflow: hidden; }
.sheet-card > h3 { margin: 0; background: #17375e; color: #fff; padding: 6px 10px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; text-align: center; }
.sheet-card-body { padding: 10px 12px 12px; }
`

export function slug(value: string) {
  return value.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
}

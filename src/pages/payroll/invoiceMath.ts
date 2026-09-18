export type InvoiceLineKind = 'HEADING' | 'ITEM'

export type InvoiceStatus = 'DRAFT' | 'APPROVED' | 'PAID'

export type InvoiceLine = {
  key: string
  id?: string
  employee_id?: string | null
  kind: InvoiceLineKind
  description: string
  amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
}

export type InvoiceRecord = {
  id: string
  invoice_number: string
  reference?: string | null
  contact_name?: string | null
  heading?: string | null
  issue_date?: string | null
  due_date?: string | null
  status: InvoiceStatus
  vat_rate: number
  subtotal: number
  vat_total: number
  total_due: number
  bank_sort_code?: string | null
  bank_account_number?: string | null
  bank_account_holder?: string | null
  bank_name?: string | null
  from_name?: string | null
  from_address?: string | null
  from_crn?: string | null
  bill_to_address?: string | null
  companies?: {
    company_name?: string | null
    trading_name?: string | null
  }
  lines?: InvoiceLine[]
}

export const DEFAULT_VAT_RATE = 20

export function roundMoney(value: unknown) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return 0
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function invoiceLineFromAmount(
  description: string,
  amount: unknown,
  taxRate = DEFAULT_VAT_RATE,
  extras: Partial<InvoiceLine> = {},
): InvoiceLine {
  const rounded = roundMoney(amount)
  const rate = roundMoney(taxRate) || DEFAULT_VAT_RATE
  return {
    key: extras.key ?? `row-${Math.random().toString(36).slice(2, 9)}`,
    id: extras.id,
    employee_id: extras.employee_id ?? null,
    kind: extras.kind ?? 'ITEM',
    description,
    amount: rounded,
    tax_rate: rate,
    tax_amount: roundMoney((rounded * rate) / 100),
    total_amount: rounded,
  }
}

export function headingLine(description: string, extras: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    key: extras.key ?? `row-${Math.random().toString(36).slice(2, 9)}`,
    id: extras.id,
    employee_id: null,
    kind: 'HEADING',
    description,
    amount: 0,
    tax_rate: DEFAULT_VAT_RATE,
    tax_amount: 0,
    total_amount: 0,
  }
}

export function invoiceTotals(lines: InvoiceLine[]) {
  const items = lines.filter((line) => line.kind === 'ITEM')
  const subtotal = roundMoney(items.reduce((sum, line) => sum + line.total_amount, 0))
  const vatTotal = roundMoney(items.reduce((sum, line) => sum + line.tax_amount, 0))
  return {
    subtotal,
    vatTotal,
    total: roundMoney(subtotal + vatTotal),
  }
}

export function mapApiLines(lines?: Array<Record<string, unknown>> | InvoiceLine[]) {
  return (lines ?? []).map((line, index) => {
    const kind = line.kind === 'HEADING' ? 'HEADING' : 'ITEM'
    if (kind === 'HEADING') {
      return headingLine(String(line.description ?? ''), {
        key: String(line.id ?? `heading-${index}`),
        id: line.id ? String(line.id) : undefined,
      })
    }
    return invoiceLineFromAmount(String(line.description ?? ''), line.amount, Number(line.tax_rate), {
      key: String(line.id ?? `item-${index}`),
      id: line.id ? String(line.id) : undefined,
      employee_id: line.employee_id ? String(line.employee_id) : null,
    })
  })
}

export function invoiceStatusLabel(status?: string | null) {
  if (status === 'PAID') return 'Paid'
  if (status === 'APPROVED') return 'Approved and unpaid'
  return 'Draft'
}

export function displayInvoiceNumber(value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.startsWith('#') ? raw : `#${raw}`
}

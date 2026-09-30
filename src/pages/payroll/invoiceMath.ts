export type InvoiceLineKind = 'HEADING' | 'ITEM'

export type InvoiceStatus = 'DRAFT' | 'APPROVED' | 'PAID'

export type InvoiceType = 'PAY' | 'EMPLOYER_ONCOST'

export type InvoiceLine = {
  key: string
  id?: string
  employee_id?: string | null
  kind: InvoiceLineKind
  description: string
  pay_amount: number
  taxable_additions: number
  net_pay_additions: number
  employer_nic: number
  employer_pension: number
  amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
}

export type InvoiceRecord = {
  id: string
  invoice_number: string
  invoice_type?: InvoiceType | null
  payroll_run_id?: string | null
  period_label?: string | null
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
  from_logo_path?: string | null
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

export function parseInvoiceType(value?: string | null): InvoiceType {
  return value === 'EMPLOYER_ONCOST' ? 'EMPLOYER_ONCOST' : 'PAY'
}

export function invoiceTypeLabel(value?: string | null) {
  return parseInvoiceType(value) === 'EMPLOYER_ONCOST' ? 'Employer NIC & pension' : 'Pay'
}

export function lineAmountForType(line: Partial<InvoiceLine>, type: InvoiceType) {
  if (type === 'EMPLOYER_ONCOST') {
    return roundMoney((line.employer_nic ?? 0) + (line.employer_pension ?? 0))
  }
  return roundMoney(
    (line.pay_amount ?? 0) + (line.taxable_additions ?? 0) + (line.net_pay_additions ?? 0),
  )
}

export function invoiceLineFromAmount(
  description: string,
  amount: unknown,
  taxRate = DEFAULT_VAT_RATE,
  extras: Partial<InvoiceLine> = {},
  type: InvoiceType = 'PAY',
): InvoiceLine {
  const rate = roundMoney(taxRate) || DEFAULT_VAT_RATE
  const given = roundMoney(amount)
  const next: InvoiceLine = {
    key: extras.key ?? `row-${Math.random().toString(36).slice(2, 9)}`,
    id: extras.id,
    employee_id: extras.employee_id ?? null,
    kind: extras.kind ?? 'ITEM',
    description,
    pay_amount: roundMoney(extras.pay_amount),
    taxable_additions: roundMoney(extras.taxable_additions),
    net_pay_additions: roundMoney(extras.net_pay_additions),
    employer_nic: roundMoney(extras.employer_nic),
    employer_pension: roundMoney(extras.employer_pension),
    amount: given,
    tax_rate: rate,
    tax_amount: 0,
    total_amount: 0,
  }
  return withLineTotals(next, type)
}

export function withLineTotals(line: InvoiceLine, type: InvoiceType): InvoiceLine {
  if (line.kind === 'HEADING') {
    return {
      ...line,
      pay_amount: 0,
      taxable_additions: 0,
      net_pay_additions: 0,
      employer_nic: 0,
      employer_pension: 0,
      amount: 0,
      tax_amount: 0,
      total_amount: 0,
    }
  }
  const cleaned: InvoiceLine = {
    ...line,
    pay_amount: type === 'PAY' ? roundMoney(line.pay_amount) : 0,
    taxable_additions: type === 'PAY' ? roundMoney(line.taxable_additions) : 0,
    net_pay_additions: type === 'PAY' ? roundMoney(line.net_pay_additions) : 0,
    employer_nic: type === 'EMPLOYER_ONCOST' ? roundMoney(line.employer_nic) : 0,
    employer_pension: type === 'EMPLOYER_ONCOST' ? roundMoney(line.employer_pension) : 0,
  }
  let amount = lineAmountForType(cleaned, type)
  if (amount === 0 && roundMoney(line.amount) > 0) {
    if (type === 'EMPLOYER_ONCOST') cleaned.employer_nic = roundMoney(line.amount)
    else cleaned.pay_amount = roundMoney(line.amount)
    amount = lineAmountForType(cleaned, type)
  }
  const rate = roundMoney(cleaned.tax_rate) || DEFAULT_VAT_RATE
  return {
    ...cleaned,
    amount,
    tax_rate: rate,
    tax_amount: roundMoney((amount * rate) / 100),
    total_amount: amount,
  }
}

export function headingLine(description: string, extras: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    key: extras.key ?? `row-${Math.random().toString(36).slice(2, 9)}`,
    id: extras.id,
    employee_id: null,
    kind: 'HEADING',
    description,
    pay_amount: 0,
    taxable_additions: 0,
    net_pay_additions: 0,
    employer_nic: 0,
    employer_pension: 0,
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

export function mapApiLines(
  lines?: Array<Record<string, unknown>> | InvoiceLine[],
  type: InvoiceType = 'PAY',
) {
  const mapped = (lines ?? []).map((line, index) => {
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
      pay_amount: Number(line.pay_amount ?? 0),
      taxable_additions: Number(line.taxable_additions ?? 0),
      net_pay_additions: Number(line.net_pay_additions ?? 0),
      employer_nic: Number(line.employer_nic ?? 0),
      employer_pension: Number(line.employer_pension ?? 0),
    }, type)
  })
  return sortInvoiceEmployeeLines(mapped)
}

export function sortInvoiceEmployeeLines(lines: InvoiceLine[]) {
  const headings = lines.filter((line) => line.kind === 'HEADING')
  const items = lines
    .filter((line) => line.kind !== 'HEADING')
    .sort((left, right) => compareInvoiceEmployeeLabel(left.description, right.description))
  return [...headings, ...items]
}

function compareInvoiceEmployeeLabel(left: string, right: string) {
  const leftKey = String(left ?? '').trim()
  const rightKey = String(right ?? '').trim()
  if (!leftKey && !rightKey) return 0
  if (!leftKey) return 1
  if (!rightKey) return -1
  return leftKey.localeCompare(rightKey, 'en-GB', { sensitivity: 'base' })
}

export function invoiceStatusLabel(status?: string | null) {
  if (status === 'PAID') return 'Paid'
  if (status === 'APPROVED') return 'Approved and unpaid'
  return 'Draft'
}

export function isInvoiceOverdue(status?: string | null, dueDate?: string | null) {
  if (status !== 'APPROVED' || !dueDate) return false
  const due = new Date(`${String(dueDate).slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(due.getTime())) return false
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return today > due.getTime()
}

export function invoiceBadgeStatus(status?: string | null, dueDate?: string | null) {
  return isInvoiceOverdue(status, dueDate) ? 'OVERDUE' : status ?? undefined
}

export function displayInvoiceNumber(value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.startsWith('#') ? raw : `#${raw}`
}

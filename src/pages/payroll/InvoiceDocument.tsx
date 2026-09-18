import { money } from '../../lib/format'
import type { InvoiceLine, InvoiceRecord } from './invoiceMath'
import { invoiceTotals } from './invoiceMath'

const NAVY = '#17375e'
const CREAM = '#f4f1ea'
const PALE = '#e8eef6'
const LABEL = '#5c6e82'

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function amount(value: unknown) {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function InvoiceDocument({
  invoice,
  lines,
  bank,
}: {
  invoice: InvoiceRecord
  lines: InvoiceLine[]
  bank?: {
    bank_sort_code?: string | null
    bank_account_number?: string | null
    bank_account_holder?: string | null
    bank_name?: string | null
  }
}) {
  const totals = invoiceTotals(lines)
  const vatRate = invoice.vat_rate || 20
  const billTo =
    invoice.contact_name ||
    invoice.companies?.trading_name ||
    invoice.companies?.company_name ||
    '—'
  const fromName = invoice.from_name || 'Cedar Payroll'
  const details = bank ?? invoice

  return (
    <div className="flex justify-center">
      <div>
        <p className="mb-3 text-[11px] font-medium tracking-[0.08em] print:hidden" style={{ color: LABEL }}>
          Invoice Document · A4
        </p>
        <article className="invoice-a4-page overflow-hidden bg-white shadow-[0_1px_8px_rgba(23,55,94,0.08)]">
          <div className="px-[14mm] py-7 text-white" style={{ backgroundColor: NAVY }}>
            <p className="text-[11px] font-semibold tracking-[0.16em]">CEDAR PAYROLL</p>
            <h2 className="mt-3 text-[32px] font-semibold leading-none">Tax Invoice</h2>
          </div>
          <div className="px-[14mm] pb-[14mm] pt-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.08em]" style={{ color: LABEL }}>
                  BILL TO
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: NAVY }}>
                  {billTo}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm" style={{ color: NAVY }}>
                  {invoice.bill_to_address || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.08em]" style={{ color: LABEL }}>
                  FROM
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: NAVY }}>
                  {fromName}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm" style={{ color: NAVY }}>
                  {invoice.from_address || '—'}
                </p>
                {invoice.from_crn ? (
                  <p className="mt-1 text-sm" style={{ color: NAVY }}>
                    CRN: {invoice.from_crn}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className="mt-6 grid gap-4 rounded-[12px] px-5 py-4 sm:grid-cols-4"
              style={{ backgroundColor: CREAM }}
            >
              {[
                ['Issue date', formatDate(invoice.issue_date)],
                ['Due date', formatDate(invoice.due_date)],
                ['Invoice number', invoice.invoice_number || '—'],
                ['Reference', invoice.reference || invoice.invoice_number || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold" style={{ color: LABEL }}>
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: NAVY }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-[10px] border border-[#d8dee8]">
              <div
                className="grid grid-cols-[minmax(0,1fr)_6.5rem_5rem_6.5rem_7rem] px-3 py-2.5 text-[10px] font-semibold"
                style={{ backgroundColor: CREAM, color: NAVY }}
              >
                <span>Employee Name</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Tax Rate</span>
                <span className="text-right">Tax Amount</span>
                <span className="text-right">Total amount</span>
              </div>
              {lines.map((line) =>
                line.kind === 'HEADING' ? (
                  <div
                    key={line.key}
                    className="px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: PALE, color: NAVY }}
                  >
                    {line.description}
                  </div>
                ) : (
                  <div
                    key={line.key}
                    className="grid grid-cols-[minmax(0,1fr)_6.5rem_5rem_6.5rem_7rem] border-t border-[#edf1f6] px-3 py-2 text-xs"
                    style={{ color: NAVY }}
                  >
                    <span>{line.description}</span>
                    <span className="text-right tabular-nums">{amount(line.amount)}</span>
                    <span className="text-right tabular-nums">{Number(line.tax_rate).toFixed(0)}%</span>
                    <span className="text-right tabular-nums">{amount(line.tax_amount)}</span>
                    <span className="text-right font-semibold tabular-nums">{amount(line.total_amount)}</span>
                  </div>
                ),
              )}
            </div>

            <div className="mt-6 ml-auto w-full max-w-[240px] space-y-2 text-xs" style={{ color: NAVY }}>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{amount(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total VAT {vatRate}%</span>
                <span className="tabular-nums">{amount(totals.vatTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{amount(totals.total)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Amount due</span>
                <span className="tabular-nums">{money(totals.total)}</span>
              </div>
            </div>

            <div className="mt-6 max-w-[280px] rounded-[8px] px-4 py-3 text-[11px]" style={{ backgroundColor: PALE, color: NAVY }}>
              <p className="font-semibold">Bank Details</p>
              <p className="mt-2">Sort Code: {details.bank_sort_code || '—'}</p>
              <p>Account Number: {details.bank_account_number || '—'}</p>
              <p>Account Holder: {details.bank_account_holder || '—'}</p>
              <p>Bank Name: {details.bank_name || '—'}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

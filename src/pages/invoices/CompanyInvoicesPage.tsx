import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus } from 'lucide-react'
import { companyInvoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Button, Card, EmptyState, Loading, PageHeader } from '../../components/ui'
import { money } from '../../lib/format'
import {
  FileChip,
  InvoiceAmount,
  MetaTile,
  StatusPill,
  invoiceIcons,
  prettyDate,
} from './InvoiceChrome'
import type { CompanyInvoice, CompanyInvoiceStatus } from './invoiceTypes'

type FilterKey = 'ALL' | CompanyInvoiceStatus

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'SENT', label: 'Sent' },
  { key: 'REASON_REQUESTED', label: 'Reason requested' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
]

export function CompanyInvoicesPage() {
  const auth = useAuth()
  const companyId = auth.companyId ?? ''
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const invoices = useQuery({
    queryKey: ['company-invoices', companyId],
    queryFn: () => companyInvoicesApi.list(companyId),
    enabled: Boolean(companyId),
  })

  const rows = ((invoices.data?.data ?? []) as CompanyInvoice[])
  const counts = useMemo(() => {
    const next: Record<string, number> = { ALL: rows.length }
    for (const row of rows) next[row.status] = (next[row.status] ?? 0) + 1
    return next
  }, [rows])
  const visible = rows.filter((item) => filter === 'ALL' || item.status === filter)
  const sentTotal = rows
    .filter((item) => item.status !== 'DRAFT')
    .reduce((total, item) => total + Number(item.amount ?? 0), 0)
  const paidTotal = rows
    .filter((item) => item.status === 'ACCEPTED')
    .reduce((total, item) => total + Number(item.amount ?? 0), 0)

  if (invoices.isLoading) return <Loading />

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Create a draft or send an invoice request to the bureau."
        actions={
          <Link to="/company-invoices/new">
            <Button>
              <Plus size={16} />
              New invoice
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <section className="rounded-[22px] bg-navy p-5 text-white sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">Sent to bureau</p>
          <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight">{money(sentTotal)}</p>
          <p className="mt-2 text-sm text-white/70">
            {counts.SENT ?? 0} waiting · {counts.ACCEPTED ?? 0} accepted
          </p>
        </section>
        <section className="rounded-[22px] bg-white p-5 shadow-[0_10px_28px_rgba(23,55,94,0.05)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Amount paid</p>
          <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-navy">{money(paidTotal)}</p>
          <p className="mt-2 text-sm text-muted">Accepted and paid by the bureau</p>
        </section>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count = counts[item.key] ?? 0
          if (item.key !== 'ALL' && count === 0) return null
          const active = filter === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                active ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-[#d9d9d9] hover:bg-cream'
              }`}
            >
              {item.label}
              <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-muted'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            title={rows.length === 0 ? 'No invoices yet' : 'Nothing in this view'}
            body={
              rows.length === 0
                ? 'Create an invoice, save it as a draft, then send it to the bureau when it is ready.'
                : 'Try another filter to see more invoices.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((invoice) => (
            <Link
              key={invoice.id}
              to={`/company-invoices/${invoice.id}`}
              className="block overflow-hidden rounded-[20px] border border-[#eceae6] bg-white shadow-[0_10px_28px_rgba(23,55,94,0.05)] transition hover:border-navy/20"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#f0efec] px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-navy">{invoice.title}</h2>
                  {invoice.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#5c6e82]">{invoice.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={invoice.status} />
                  <ChevronRight size={18} className="text-muted" />
                </div>
              </div>
              <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_200px]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetaTile icon={invoiceIcons.due} label="Due date" value={prettyDate(invoice.due_date)} />
                  <MetaTile icon={invoiceIcons.sent} label="Sent" value={prettyDate(invoice.sent_at)} />
                  {invoice.has_file ? (
                    <FileChip name={invoice.file_name || 'Attachment'} />
                  ) : (
                    <MetaTile icon={invoiceIcons.file} label="Attachment" value="None" />
                  )}
                </div>
                <div className="rounded-[16px] bg-[#f8f7f4] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Amount</p>
                  <div className="mt-2">
                    <InvoiceAmount value={invoice.amount} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, MessageSquareText, X } from 'lucide-react'
import { companyInvoicesApi } from '../../api'
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal'
import { Alert, Button, Card, EmptyState, Field, Loading, PageHeader, Textarea } from '../../components/ui'
import { money } from '../../lib/format'
import {
  FileChip,
  InvoiceAmount,
  MetaTile,
  StatusPill,
  invoiceIcons,
  invoiceInitials,
  prettyDate,
} from './InvoiceChrome'
import type { CompanyInvoice } from './invoiceTypes'

type FilterKey = 'AWAITING' | 'ACCEPTED' | 'REJECTED' | 'ALL'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'AWAITING', label: 'Awaiting review' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
]

function isAwaiting(invoice: CompanyInvoice) {
  return invoice.status === 'SENT' || invoice.status === 'REASON_REQUESTED' || invoice.status === 'REASON_SUBMITTED'
}

export function RequestedInvoicesPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [reasonFor, setReasonFor] = useState<CompanyInvoice | null>(null)
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState<CompanyInvoice | null>(null)
  const [filter, setFilter] = useState<FilterKey>('ALL')

  const invoices = useQuery({
    queryKey: ['requested-invoices'],
    queryFn: () => companyInvoicesApi.requested(),
  })

  const review = useMutation({
    mutationFn: (input: {
      companyId: string
      invoiceId: string
      action: 'ACCEPT' | 'REJECT' | 'REQUEST_REASON'
      note?: string
    }) =>
      companyInvoicesApi.review(input.companyId, input.invoiceId, {
        action: input.action,
        note: input.note,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['requested-invoices'] })
      setReasonFor(null)
      setNote('')
    },
    onError: (err: Error) => setError(err.message),
  })

  const rows = ((invoices.data?.data ?? []) as CompanyInvoice[])
  const counts = useMemo(
    () => ({
      AWAITING: rows.filter(isAwaiting).length,
      ACCEPTED: rows.filter((item) => item.status === 'ACCEPTED').length,
      REJECTED: rows.filter((item) => item.status === 'REJECTED').length,
      ALL: rows.length,
    }),
    [rows],
  )
  const visible = rows.filter((item) => {
    if (filter === 'ALL') return true
    if (filter === 'AWAITING') return isAwaiting(item)
    return item.status === filter
  })
  const awaitingTotal = rows.filter(isAwaiting).reduce((total, item) => total + Number(item.amount ?? 0), 0)

  if (invoices.isLoading) return <Loading />

  function canAskReason(invoice: CompanyInvoice) {
    return invoice.status === 'SENT' && !invoice.company_reason
  }

  return (
    <div>
      <PageHeader
        title="Requested Invoices"
        subtitle="Review invoice requests sent by companies."
      />

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-5 shadow-[0_8px_24px_rgba(23,55,94,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Awaiting review</p>
          <p className="mt-2 text-[28px] font-semibold leading-none text-navy">{counts.AWAITING}</p>
          <p className="mt-2 text-sm font-medium text-muted">{money(awaitingTotal)} still to decide</p>
        </Card>
        <Card className="p-5 shadow-[0_8px_24px_rgba(23,55,94,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Accepted</p>
          <p className="mt-2 text-[28px] font-semibold leading-none text-navy">{counts.ACCEPTED}</p>
          <p className="mt-2 text-sm font-medium text-muted">Paid by the bureau</p>
        </Card>
        <Card className="p-5 shadow-[0_8px_24px_rgba(23,55,94,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Rejected</p>
          <p className="mt-2 text-[28px] font-semibold leading-none text-navy">{counts.REJECTED}</p>
          <p className="mt-2 text-sm font-medium text-muted">Returned to the company</p>
        </Card>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => {
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
              <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-muted'}`}>{counts[item.key]}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            title={rows.length === 0 ? 'No requested invoices' : 'Nothing in this view'}
            body={
              rows.length === 0
                ? 'When a company sends an invoice, it will appear here.'
                : 'Try another filter to see more invoice requests.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((invoice) => (
            <article
              key={invoice.id}
              className="overflow-hidden rounded-[20px] border border-[#eceae6] bg-white shadow-[0_10px_28px_rgba(23,55,94,0.05)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#f0efec] px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                    {invoiceInitials(invoice.company_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted">{invoice.company_name || 'Company'}</p>
                    <h2 className="truncate text-lg font-semibold text-navy">{invoice.title}</h2>
                  </div>
                </div>
                <StatusPill status={invoice.status} />
              </div>

              <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  {invoice.description ? (
                    <p className="text-sm leading-6 text-[#5c6e82]">{invoice.description}</p>
                  ) : (
                    <p className="text-sm text-muted">No description provided.</p>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MetaTile icon={invoiceIcons.due} label="Due date" value={prettyDate(invoice.due_date)} />
                    <MetaTile icon={invoiceIcons.sent} label="Sent" value={prettyDate(invoice.sent_at)} />
                    <div>
                      {invoice.has_file ? (
                        <FileChip
                          name={invoice.file_name || 'Attachment'}
                          onClick={() => setPreview(invoice)}
                        />
                      ) : (
                        <MetaTile icon={invoiceIcons.file} label="Attachment" value="None" />
                      )}
                    </div>
                  </div>
                  {invoice.company_reason ? (
                    <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                        Company reason
                      </p>
                      <p className="mt-1 text-sm leading-6 text-navy">{invoice.company_reason}</p>
                    </div>
                  ) : null}
                  {invoice.status === 'REASON_REQUESTED' ? (
                    <p className="mt-3 text-sm font-medium text-amber-800">
                      Waiting for the company to explain this invoice.
                    </p>
                  ) : null}
                </div>
                <div className="rounded-[16px] bg-[#f8f7f4] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Amount to pay</p>
                  <div className="mt-2">
                    <InvoiceAmount value={invoice.amount} />
                  </div>
                </div>
              </div>

              {isAwaiting(invoice) ? (
                <div className="flex flex-wrap gap-2 border-t border-[#f0efec] bg-[#faf9f7] px-5 py-4 sm:px-6">
                  <Button
                    disabled={review.isPending}
                    onClick={() => {
                      setError(null)
                      review.mutate({
                        companyId: invoice.company_id,
                        invoiceId: invoice.id,
                        action: 'ACCEPT',
                      })
                    }}
                  >
                    <Check size={16} />
                    Accept
                  </Button>
                  <Button
                    variant="danger"
                    disabled={review.isPending}
                    onClick={() => {
                      setError(null)
                      review.mutate({
                        companyId: invoice.company_id,
                        invoiceId: invoice.id,
                        action: 'REJECT',
                      })
                    }}
                  >
                    <X size={16} />
                    Reject
                  </Button>
                  {canAskReason(invoice) ? (
                    <Button variant="secondary" disabled={review.isPending} onClick={() => setReasonFor(invoice)}>
                      <MessageSquareText size={16} />
                      Ask for a reason
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {reasonFor ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 px-4"
          role="presentation"
          onClick={() => setReasonFor(null)}
        >
          <div
            className="w-full max-w-lg rounded-[20px] bg-white p-6 shadow-xl"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-navy">Ask for a reason</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {reasonFor.company_name} will be emailed and can explain “{reasonFor.title}”.
            </p>
            <Field label="Note (optional)">
              <Textarea
                variant="outline"
                className="mt-1"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tell the company what you need clarified."
              />
            </Field>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReasonFor(null)}>
                Cancel
              </Button>
              <Button
                disabled={review.isPending}
                onClick={() => {
                  setError(null)
                  review.mutate({
                    companyId: reasonFor.company_id,
                    invoiceId: reasonFor.id,
                    action: 'REQUEST_REASON',
                    note: note.trim() || undefined,
                  })
                }}
              >
                Send request
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <DocumentPreviewModal
          title={preview.title}
          fileName={preview.file_name || 'attachment'}
          path={companyInvoicesApi.filePath(preview.company_id, preview.id)}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  )
}

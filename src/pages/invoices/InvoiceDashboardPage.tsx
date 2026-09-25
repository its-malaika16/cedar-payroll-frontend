import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { companyInvoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Button, Loading } from '../../components/ui'
import { money } from '../../lib/format'
import type { InvoiceDashboard } from './invoiceTypes'

const NAVY = '#17375e'
const RED = '#d32027'
const cardClass = 'rounded-[26px] bg-white p-5 sm:p-8'

type Slice = {
  label: string
  amount: number
  color: string
  pct: number
  start: number
}

function displayName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(' ') || 'User Name'
}

function toSlices(paid: number, outstanding: number): Slice[] {
  const parts = [
    { label: 'Amount paid', amount: Math.max(0, paid), color: NAVY },
    { label: 'Outstanding', amount: Math.max(0, outstanding), color: RED },
  ]
  const basis = parts.reduce((total, part) => total + part.amount, 0) || 1
  let start = 0
  return parts.map((part) => {
    const pct = (part.amount / basis) * 100
    const slice = { ...part, pct, start }
    start += pct
    return slice
  })
}

function donutBackground(slices: Slice[]) {
  const stops = slices.map((slice) => `${slice.color} ${slice.start}% ${slice.start + slice.pct}%`)
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

function isDarkSlice(color: string) {
  return color === NAVY || color === RED
}

export function InvoiceDashboardPage() {
  const auth = useAuth()
  const companyId = auth.companyId ?? ''
  const selectedCompany = auth.companies.find((company) => company.id === companyId)
  const greeting = `Welcome, ${displayName(auth.user?.first_name, auth.user?.last_name)}`
  const dashboard = useQuery({
    queryKey: ['company-invoice-dashboard', companyId],
    queryFn: () => companyInvoicesApi.dashboard(companyId),
    enabled: Boolean(companyId),
  })

  if (dashboard.isLoading) return <Loading />

  const stats = (dashboard.data?.data ?? {
    sent_count: 0,
    sent_total: 0,
    paid_count: 0,
    paid_total: 0,
    draft_count: 0,
    pending_count: 0,
    rejected_count: 0,
  }) as InvoiceDashboard

  const sent = Number(stats.sent_total ?? 0)
  const paid = Number(stats.paid_total ?? 0)
  const outstanding = Math.max(0, sent - paid)
  const slices = toSlices(paid, outstanding)
  const hasValues = sent > 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight text-navy sm:text-[32px] sm:leading-none">
            Dashboard
          </h1>
          <p className="mt-4 text-lg font-semibold text-navy sm:mt-5 sm:text-[22px]">{greeting}</p>
          {selectedCompany?.name ? (
            <p className="mt-2 text-base font-semibold text-navy">{selectedCompany.name}</p>
          ) : null}
        </div>
        <Link to="/company-invoices/new">
          <Button>
            <Plus size={16} />
            New invoice
          </Button>
        </Link>
      </div>

      <section className={`${cardClass} min-h-[415px]`}>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-navy">Invoice Breakdown</h2>
          <p className="mt-1 text-sm font-medium text-muted">
            {selectedCompany?.name ?? 'This company'}
            {' · '}
            invoices sent against amount paid
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-10 lg:justify-between">
          <div className="relative size-[min(260px,70vw)] shrink-0">
            <div
              className="size-full rounded-full"
              style={{
                background: hasValues ? donutBackground(slices) : NAVY,
              }}
            />
            <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white text-center">
              <p className="text-[22px] font-semibold text-navy">{money(sent)}</p>
              <p className="text-sm font-medium text-muted">Invoices sent</p>
            </div>
            {hasValues
              ? slices.map((slice) => {
                  if (slice.pct < 3) return null
                  const angle = ((slice.start + slice.pct / 2) / 100) * 2 * Math.PI - Math.PI / 2
                  const radius = 88
                  return (
                    <span
                      key={slice.label}
                      className="pointer-events-none absolute text-[11px] font-semibold"
                      style={{
                        left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                        top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                        color: isDarkSlice(slice.color) ? '#ffffff' : NAVY,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {slice.pct.toFixed(1)}%
                    </span>
                  )
                })
              : null}
          </div>
          <ul className="min-w-[250px] flex-1">
            {slices.map((slice, index) => (
              <li
                key={slice.label}
                className={`flex items-center gap-3 py-2.5 text-sm ${
                  index < slices.length - 1 ? 'border-b border-[#d9d9d9]' : ''
                }`}
              >
                <span className="size-6 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="flex-1 font-medium text-navy">{slice.label}</span>
                <span className="font-semibold text-navy">{money(slice.amount)}</span>
              </li>
            ))}
            <li className="flex items-center gap-3 border-t border-[#d9d9d9] py-2.5 text-sm">
              <span className="size-6 shrink-0" />
              <span className="flex-1 font-semibold text-navy">Invoices sent</span>
              <span className="font-semibold text-navy">{money(sent)}</span>
            </li>
          </ul>
        </div>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {[
          { label: 'Drafts', value: stats.draft_count },
          { label: 'Awaiting review', value: stats.pending_count },
          { label: 'Rejected', value: stats.rejected_count },
        ].map((item) => (
          <section key={item.label} className={cardClass}>
            <p className="text-sm font-semibold text-muted">{item.label}</p>
            <p className="mt-3 text-[32px] font-semibold leading-none text-navy">{item.value}</p>
          </section>
        ))}
      </div>

      <Link to="/company-invoices" className="mt-6 inline-flex text-sm font-semibold text-brand">
        View invoices →
      </Link>
    </div>
  )
}

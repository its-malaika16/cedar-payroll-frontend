import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { companyInvoicesApi, invoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Button, Loading } from '../../components/ui'
import { idOf, money } from '../../lib/format'
import type { CompanyInvoice } from './invoiceTypes'

const NAVY = '#17375e'
const RED = '#d32027'
const GREEN = '#1f6b4a'
const GREY = '#8a93a3'
const cardClass = 'rounded-[26px] bg-white p-5 sm:p-8'
const periodControl =
  'h-[38px] rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-xs font-medium text-navy outline-none'

type Slice = {
  label: string
  amount: number
  color: string
  pct: number
  start: number
}

type MonthOption = { key: string; label: string }

type BureauInvoice = {
  id: string
  status?: string | null
  total_due?: number | null
  issue_date?: string | null
  approved_at?: string | null
  created_at?: string | null
}

function displayName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(' ') || 'User Name'
}

function monthKey(value?: string | null) {
  const raw = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})/.exec(raw)
  if (match) return `${match[1]}-${match[2]}`
  const date = raw ? new Date(raw) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month) return key
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function collectMonths(keys: string[]): MonthOption[] {
  const unique = [...new Set(keys.filter(Boolean))].sort((left, right) => right.localeCompare(left))
  return [{ key: 'all', label: 'All time' }, ...unique.map((key) => ({ key, label: monthLabel(key) }))]
}

function inMonth(dateValue: string | null | undefined, selected: string) {
  if (selected === 'all') return true
  return monthKey(dateValue) === selected
}

function toSlices(parts: Array<{ label: string; amount: number; color: string }>): Slice[] {
  const basis = parts.reduce((total, part) => total + Math.max(0, part.amount), 0) || 1
  let start = 0
  return parts.map((part) => {
    const amount = Math.max(0, part.amount)
    const pct = (amount / basis) * 100
    const slice = { ...part, amount, pct, start }
    start += pct
    return slice
  })
}

function donutBackground(slices: Slice[]) {
  const stops = slices.map((slice) => `${slice.color} ${slice.start}% ${slice.start + slice.pct}%`)
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

function isDarkSlice(color: string) {
  return color === NAVY || color === RED || color === GREEN
}

function BreakdownCard({
  title,
  subtitle,
  totalLabel,
  total,
  slices,
  extras,
}: {
  title: string
  subtitle: string
  totalLabel: string
  total: number
  slices: Slice[]
  extras: Array<{ label: string; amount: number; color?: string }>
}) {
  const hasValues = total > 0
  return (
    <section className={`${cardClass} min-h-[415px]`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-navy">{title}</h2>
        <p className="mt-1 text-sm font-medium text-muted">{subtitle}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-10 lg:justify-between">
        <div className="relative size-[min(260px,70vw)] shrink-0">
          <div
            className="size-full rounded-full"
            style={{ background: hasValues ? donutBackground(slices) : NAVY }}
          />
          <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white text-center">
            <p className="text-[22px] font-semibold text-navy">{money(total)}</p>
            <p className="text-sm font-medium text-muted">{totalLabel}</p>
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
          {extras.map((item, index) => (
            <li
              key={item.label}
              className={`flex items-center gap-3 py-2.5 text-sm ${
                index < extras.length - 1 ? 'border-b border-[#d9d9d9]' : ''
              }`}
            >
              <span
                className="size-6 shrink-0 rounded-full"
                style={{ background: item.color ?? GREY }}
              />
              <span className="flex-1 font-medium text-navy">{item.label}</span>
              <span className="font-semibold text-navy">{money(item.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function InvoiceDashboardPage() {
  const auth = useAuth()
  const companyId = auth.companyId ?? ''
  const selectedCompany = auth.companies.find((company) => company.id === companyId)
  const greeting = `Welcome, ${displayName(auth.user?.first_name, auth.user?.last_name)}`
  const [month, setMonth] = useState('all')

  const bureauInvoices = useQuery({
    queryKey: ['invoices', companyId],
    queryFn: () => invoicesApi.list(companyId),
    enabled: Boolean(companyId),
  })
  const requestedInvoices = useQuery({
    queryKey: ['company-invoices', companyId],
    queryFn: () => companyInvoicesApi.list(companyId),
    enabled: Boolean(companyId),
  })

  const bureauRows = useMemo(
    () =>
      ((bureauInvoices.data?.data as BureauInvoice[] | undefined) ?? [])
        .map((item) => ({
          ...item,
          id: idOf(item),
          status: String(item.status ?? ''),
          total: Number(item.total_due ?? 0),
          date: item.issue_date || item.approved_at || item.created_at || '',
        }))
        .filter((item) => item.status === 'APPROVED' || item.status === 'PAID'),
    [bureauInvoices.data],
  )

  const requestRows = useMemo(
    () =>
      ((requestedInvoices.data?.data ?? []) as CompanyInvoice[]).map((item) => ({
        ...item,
        amount: Number(item.amount ?? 0),
        date: item.sent_at || item.created_at || item.due_date || '',
      })),
    [requestedInvoices.data],
  )

  const months = useMemo(
    () => collectMonths([...bureauRows.map((item) => monthKey(item.date)), ...requestRows.map((item) => monthKey(item.date))]),
    [bureauRows, requestRows],
  )

  const bureau = useMemo(() => {
    const rows = bureauRows.filter((item) => inMonth(item.date, month))
    const sent = rows.reduce((total, item) => total + item.total, 0)
    const paid = rows.filter((item) => item.status === 'PAID').reduce((total, item) => total + item.total, 0)
    const due = rows.filter((item) => item.status === 'APPROVED').reduce((total, item) => total + item.total, 0)
    return { sent, paid, due, slices: toSlices([
      { label: 'Amount already paid', amount: paid, color: GREEN },
      { label: 'Amount due', amount: due, color: RED },
    ]) }
  }, [bureauRows, month])

  const requested = useMemo(() => {
    const rows = requestRows.filter((item) => item.status !== 'DRAFT' && item.status !== 'REJECTED' && inMonth(item.date, month))
    const requestedTotal = rows.reduce((total, item) => total + item.amount, 0)
    const paid = rows.filter((item) => item.status === 'ACCEPTED').reduce((total, item) => total + item.amount, 0)
    const toPay = rows
      .filter((item) => item.status === 'SENT' || item.status === 'REASON_REQUESTED' || item.status === 'REASON_SUBMITTED')
      .reduce((total, item) => total + item.amount, 0)
    return {
      requested: requestedTotal,
      toPay,
      paid,
      drafts: requestRows.filter((item) => item.status === 'DRAFT' && inMonth(item.date, month)).length,
      pending: requestRows.filter(
        (item) =>
          inMonth(item.date, month) &&
          (item.status === 'SENT' || item.status === 'REASON_REQUESTED' || item.status === 'REASON_SUBMITTED'),
      ).length,
      rejected: requestRows.filter((item) => item.status === 'REJECTED' && inMonth(item.date, month)).length,
      slices: toSlices([
        { label: 'Amount paid', amount: paid, color: GREEN },
        { label: 'Amount to be paid', amount: toPay, color: RED },
      ]),
    }
  }, [requestRows, month])

  if (bureauInvoices.isLoading || requestedInvoices.isLoading) return <Loading />

  const companyName = selectedCompany?.name ?? 'This company'
  const periodLabel = months.find((item) => item.key === month)?.label ?? 'All time'

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
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            Period
            <select
              className={periodControl}
              value={months.some((item) => item.key === month) ? month : 'all'}
              onChange={(event) => setMonth(event.target.value)}
              aria-label="Filter invoices by month"
            >
              {months.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Link to="/company-invoices/new">
            <Button>
              <Plus size={16} />
              New request
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        <BreakdownCard
          title="Invoices from the bureau"
          subtitle={`${companyName} · ${periodLabel}`}
          totalLabel="Total sent"
          total={bureau.sent}
          slices={bureau.slices}
          extras={[
            { label: 'Total amount sent', amount: bureau.sent, color: NAVY },
            { label: 'Amount already paid', amount: bureau.paid, color: GREEN },
            { label: 'Amount due', amount: bureau.due, color: RED },
          ]}
        />
        <BreakdownCard
          title="Requested invoices"
          subtitle={`${companyName} · ${periodLabel}`}
          totalLabel="Amount requested"
          total={requested.requested}
          slices={requested.slices}
          extras={[
            { label: 'Amount requested', amount: requested.requested, color: NAVY },
            { label: 'Amount to be paid', amount: requested.toPay, color: RED },
            { label: 'Amount paid', amount: requested.paid, color: GREEN },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {[
          { label: 'Drafts', value: requested.drafts },
          { label: 'Awaiting review', value: requested.pending },
          { label: 'Rejected', value: requested.rejected },
        ].map((item) => (
          <section key={item.label} className={cardClass}>
            <p className="text-sm font-semibold text-muted">{item.label}</p>
            <p className="mt-3 text-[32px] font-semibold leading-none text-navy">{item.value}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-5">
        <Link to="/company-invoices" className="inline-flex text-sm font-semibold text-brand">
          Request Invoice →
        </Link>
        <Link to="/payroll/invoices" className="inline-flex text-sm font-semibold text-brand">
          View invoices →
        </Link>
      </div>
    </div>
  )
}

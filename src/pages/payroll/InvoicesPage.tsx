import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { invoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Badge, Button, Card, EmptyState, Loading } from '../../components/ui'
import { formatDate, idOf, money } from '../../lib/format'
import {
  displayInvoiceNumber,
  invoiceStatusLabel,
  type InvoiceRecord,
  type InvoiceStatus,
} from './invoiceMath'

const NAVY = '#17375e'
const BRAND = '#d32027'
type RangeKey = 'daily' | 'weekly' | 'monthly' | 'yearly'

function dateUTC(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function parseDay(value?: string | null) {
  if (!value) return null
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfWeek(date: Date) {
  const day = date.getUTCDay() || 7
  return addDays(date, 1 - day)
}

function taxYearStart(date: Date) {
  const year = date.getUTCMonth() > 3 || (date.getUTCMonth() === 3 && date.getUTCDate() >= 6)
    ? date.getUTCFullYear()
    : date.getUTCFullYear() - 1
  return new Date(Date.UTC(year, 3, 6))
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end
}

const PLOT_HEIGHT = 200
const PLOT_HEAD = 32
const CHART_POINTS = 10

type ChartBucket = {
  key: string
  label: string
  caption?: string
  detail: string
  start: Date
  end: Date
  current?: boolean
}

function utcLabel(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' })
}

function formatDay(date: Date) {
  return utcLabel(date, { day: 'numeric', month: 'short' })
}

function formatMonth(date: Date, includeYear: boolean) {
  return utcLabel(date, includeYear ? { month: 'short', year: '2-digit' } : { month: 'short' })
}

function taxYearLabel(start: Date, end: Date) {
  return `${start.getUTCFullYear()}/${String(end.getUTCFullYear()).slice(2)}`
}

function weekDetail(start: Date, end: Date) {
  const last = addDays(end, -1)
  const sameMonth = start.getUTCMonth() === last.getUTCMonth()
  if (sameMonth) {
    return `${start.getUTCDate()}–${last.getUTCDate()} ${utcLabel(start, { month: 'short', year: 'numeric' })}`
  }
  return `${formatDay(start)} – ${formatDay(last)} ${last.getUTCFullYear()}`
}

function bucketsFor(range: RangeKey, today: Date): ChartBucket[] {
  if (range === 'daily') {
    return Array.from({ length: CHART_POINTS }, (_, index) => {
      const start = addDays(today, index - (CHART_POINTS - 1))
      const end = addDays(start, 1)
      const current = index === CHART_POINTS - 1
      return {
        key: start.toISOString(),
        label: formatDay(start),
        caption: current ? 'Today' : utcLabel(start, { weekday: 'short' }),
        detail: utcLabel(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        start,
        end,
        current,
      }
    })
  }

  if (range === 'weekly') {
    const thisWeek = startOfWeek(today)
    return Array.from({ length: CHART_POINTS }, (_, index) => {
      const start = addDays(thisWeek, (index - (CHART_POINTS - 1)) * 7)
      const end = addDays(start, 7)
      const current = index === CHART_POINTS - 1
      return {
        key: start.toISOString(),
        label: formatDay(start),
        caption: current ? 'This week' : undefined,
        detail: weekDetail(start, end),
        start,
        end,
        current,
      }
    })
  }

  if (range === 'monthly') {
    return Array.from({ length: CHART_POINTS }, (_, index) => {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (CHART_POINTS - 1 - index), 1))
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
      const current = index === CHART_POINTS - 1
      const priorYear = start.getUTCFullYear() !== today.getUTCFullYear()
      return {
        key: start.toISOString(),
        label: formatMonth(start, priorYear),
        caption: current ? 'This month' : undefined,
        detail: utcLabel(start, { month: 'long', year: 'numeric' }),
        start,
        end,
        current,
      }
    })
  }

  const currentTax = taxYearStart(today)
  return Array.from({ length: CHART_POINTS }, (_, index) => {
    const start = new Date(Date.UTC(currentTax.getUTCFullYear() - (CHART_POINTS - 1 - index), 3, 6))
    const end = new Date(Date.UTC(start.getUTCFullYear() + 1, 3, 6))
    const current = index === CHART_POINTS - 1
    return {
      key: String(start.getUTCFullYear()),
      label: taxYearLabel(start, end),
      caption: current ? 'This year' : undefined,
      detail: `Tax year ${taxYearLabel(start, end)}`,
      start,
      end,
      current,
    }
  })
}

function compactMoney(value: number) {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`
  if (value >= 1000) return `£${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`
  return money(value)
}

function InvoiceChart({
  chart,
  scale,
  maxAmount,
}: {
  chart: Array<ChartBucket & { amount: number }>
  scale: number
  maxAmount: number
}) {
  const count = Math.max(chart.length, 1)

  return (
    <div className="min-w-0 w-full">
      <div className="flex gap-3">
        <div
          className="flex w-12 shrink-0 flex-col justify-between text-right text-[11px] font-medium text-[#8a93a3]"
          style={{ height: PLOT_HEIGHT, marginTop: PLOT_HEAD }}
        >
          <span>{compactMoney(maxAmount)}</span>
          <span>{compactMoney(maxAmount / 2)}</span>
          <span>£0</span>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: PLOT_HEIGHT + PLOT_HEAD }}>
          <div
            className="pointer-events-none absolute inset-x-0"
            style={{ top: PLOT_HEAD, height: PLOT_HEIGHT }}
          >
            <div className="absolute inset-x-0 top-0 border-t border-[#edf0f4]" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#edf0f4]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-[#dfe5ee]" />
          </div>
          <div
            className="absolute inset-x-0 bottom-0 grid items-end"
            style={{
              height: PLOT_HEIGHT,
              gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            }}
          >
            {chart.map((bucket, index) => {
              const hasValue = bucket.amount > 0
              const height = hasValue
                ? Math.max(10, Math.round((bucket.amount / scale) * (PLOT_HEIGHT - 8)))
                : 0
              const tall = height >= 48
              const tooltipAlign =
                index >= count - 2 ? 'left-auto right-0 translate-x-0' : 'left-1/2 -translate-x-1/2'
              return (
                <div key={bucket.key} className="group relative flex h-full items-end justify-center px-1">
                  <div
                    className="relative z-10 w-[70%] max-w-[72px]"
                    style={{ height: height || 6 }}
                  >
                    <div
                      className={`pointer-events-none absolute bottom-full z-20 mb-2 hidden min-w-[132px] rounded-[12px] bg-navy px-3 py-2 text-center group-hover:block ${tooltipAlign}`}
                    >
                      <p className="text-sm font-semibold text-white">{money(bucket.amount)}</p>
                      <p className="mt-0.5 text-[11px] text-white/70">{bucket.detail}</p>
                    </div>
                    <div
                      className="relative h-full w-full"
                      style={{
                        borderRadius: hasValue ? '12px 12px 4px 4px' : 4,
                        background: hasValue
                          ? bucket.current
                            ? `linear-gradient(180deg, #3b6ea8 0%, ${NAVY} 100%)`
                            : `linear-gradient(180deg, #5b7fa6 0%, #2a4a70 100%)`
                          : '#e4eaf2',
                      }}
                    >
                      {hasValue && tall ? (
                        <p className="absolute inset-x-0 top-2 text-center text-[11px] font-semibold text-white">
                          {compactMoney(bucket.amount)}
                        </p>
                      ) : null}
                    </div>
                    {hasValue && !tall ? (
                      <p className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[11px] font-semibold text-navy">
                        {compactMoney(bucket.amount)}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <div className="w-12 shrink-0" />
        <div
          className="grid min-w-0 flex-1"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {chart.map((bucket) => (
            <div key={`${bucket.key}-label`} className="px-0.5 text-center">
              {bucket.caption ? (
                <p className="text-[10px] leading-tight text-[#8a93a3]">{bucket.caption}</p>
              ) : (
                <p className="h-[14px]" />
              )}
              <p
                className={`mt-0.5 text-xs leading-tight ${
                  bucket.current ? 'font-semibold text-navy' : 'font-medium text-[#5c6e82]'
                }`}
              >
                {bucket.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function periodCopy(range: RangeKey) {
  if (range === 'daily') return 'today'
  if (range === 'weekly') return 'this week'
  if (range === 'monthly') return 'this month'
  return 'this year'
}

function invoiceTime(item: { issue_date?: string | null }) {
  return parseDay(item.issue_date)?.getTime() ?? 0
}

function sortRecentInvoices<T extends { issue_date?: string | null; invoice_number?: string | null }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const byDate = invoiceTime(right) - invoiceTime(left)
    if (byDate !== 0) return byDate
    return displayInvoiceNumber(right.invoice_number).localeCompare(
      displayInvoiceNumber(left.invoice_number),
    )
  })
}

function InvoiceRow({
  item,
  onView,
}: {
  item: {
    id: string
    invoice_number: string
    issue_date?: string | null
    status: InvoiceStatus
    total_due: number
  }
  onView: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div>
        <p className="font-semibold text-navy">{displayInvoiceNumber(item.invoice_number)}</p>
        <p className="text-sm text-muted">{formatDate(item.issue_date)}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge status={item.status}>{invoiceStatusLabel(item.status)}</Badge>
        <p className="font-semibold text-navy">{money(item.total_due)}</p>
        <Button variant="secondary" onClick={onView}>
          View
        </Button>
      </div>
    </div>
  )
}

export function InvoicesPage() {
  const { companyId, isBureauAdmin, isSuperAdmin, isCompanyAdmin } = useAuth()
  const navigate = useNavigate()
  const canManage = isBureauAdmin || isSuperAdmin
  const [range, setRange] = useState<RangeKey>('weekly')
  const [listOpen, setListOpen] = useState(false)
  const today = useMemo(() => dateUTC(new Date()), [])

  const invoices = useQuery({
    queryKey: ['invoices', companyId],
    queryFn: () => invoicesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const list = sortRecentInvoices(
    ((invoices.data?.data as InvoiceRecord[] | undefined) ?? [])
      .map((item) => ({
        ...item,
        id: idOf(item),
        status: (item.status ?? 'DRAFT') as InvoiceStatus,
        total_due: Number(item.total_due ?? 0),
      }))
      .filter((item) => !isCompanyAdmin || item.status === 'APPROVED' || item.status === 'PAID'),
  )
  const recent = list.slice(0, 5)

  const buckets = useMemo(() => bucketsFor(range, today), [range, today])
  const chart = buckets.map((bucket) => ({
    ...bucket,
    amount: list
      .filter((item) => {
        const day = parseDay(item.issue_date)
        return day ? inRange(day, bucket.start, bucket.end) : false
      })
      .reduce((sum, item) => sum + item.total_due, 0),
  }))
  const maxAmount = Math.max(...chart.map((item) => item.amount), 0)
  const scale = maxAmount || 1
  const currentBucket = buckets[buckets.length - 1]
  const awaiting = list.filter((item) => item.status === 'APPROVED')
  const paid = list.filter((item) => item.status === 'PAID')
  const drafts = list.filter((item) => item.status === 'DRAFT')
  const createdInPeriod = list.filter((item) => {
    const day = parseDay(item.issue_date)
    return day ? inRange(day, currentBucket.start, currentBucket.end) : false
  }).length

  if (listOpen) {
    return (
      <div>
        <p className="text-sm font-semibold text-[#607080]">
          Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; <span className="text-navy">Invoices</span>
        </p>
        <button
          type="button"
          onClick={() => setListOpen(false)}
          className="mt-3 flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          All invoices
        </button>
        <Card className="mt-6">
          {invoices.isLoading ? (
            <Loading />
          ) : list.length === 0 ? (
            <EmptyState title="No invoices" body="Approved invoices will appear here." />
          ) : (
            <div className="divide-y divide-[#eceae6]">
              {list.map((item) => (
                <InvoiceRow
                  key={item.id}
                  item={item}
                  onView={() => navigate(`/payroll/invoices/${item.id}`)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#607080]">
            Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; <span className="text-navy">Invoices</span>
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-none text-navy">Invoices</h1>
        </div>
        <div className="flex h-[42px] rounded-[12px] bg-[#eceae6] p-1">
          {([
            ['daily', 'Daily'],
            ['weekly', 'Weekly'],
            ['monthly', 'Monthly'],
            ['yearly', 'Yearly'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`min-w-[76px] rounded-[10px] px-4 text-sm font-semibold ${
                range === key ? 'bg-navy text-white' : 'text-[#8a93a3]'
              }`}
              onClick={() => setRange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[16px] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.06)]">
        {invoices.isLoading ? (
          <Loading />
        ) : (
          <>
            <h2 className="text-xl font-semibold text-navy">Invoices owed to you</h2>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-sm text-muted">Awaiting payment</p>
                <p className="mt-1 text-[32px] font-semibold leading-none" style={{ color: BRAND }}>
                  {money(awaiting.reduce((sum, item) => sum + item.total_due, 0))}
                </p>
                <p className="mt-2 text-sm font-medium" style={{ color: BRAND }}>
                  {awaiting.length} awaiting payment
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted">Paid</p>
                <p className="mt-1 text-[32px] font-semibold leading-none" style={{ color: NAVY }}>
                  {money(paid.reduce((sum, item) => sum + item.total_due, 0))}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {paid.length} of {paid.length + awaiting.length} paid
                </p>
              </div>
            </div>
            <div className="mt-8">
              <InvoiceChart chart={chart} scale={scale} maxAmount={maxAmount} />
            </div>

            {canManage ? (
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{drafts.length} draft{drafts.length === 1 ? '' : 's'}</p>
                <p className="font-semibold text-navy">{money(drafts.reduce((sum, item) => sum + item.total_due, 0))}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted">0 awaiting approval</p>
                <p className="font-semibold text-navy">{money(0)}</p>
              </div>
            </div>
            ) : null}

            <div className="mt-5 rounded-[10px] bg-[#eef3fb] px-4 py-3 text-sm text-navy">
              {createdInPeriod} invoice{createdInPeriod === 1 ? '' : 's'} created {periodCopy(range)}.
            </div>

            <div className="mt-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <Button variant="secondary" onClick={() => setListOpen(true)}>
                  View all invoices
                </Button>
                {canManage ? (
                  <Button onClick={() => navigate('/payroll/invoices/new')}>New invoice</Button>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-[12px] border border-[#eceae6]">
                {recent.length === 0 ? (
                  <EmptyState title="No invoices" body="Approved invoices will appear here." />
                ) : (
                  <div className="divide-y divide-[#eceae6]">
                    {recent.map((item) => (
                      <InvoiceRow
                        key={item.id}
                        item={item}
                        onView={() => navigate(`/payroll/invoices/${item.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

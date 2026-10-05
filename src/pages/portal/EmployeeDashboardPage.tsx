import { Link } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CreditCard, UserRound } from 'lucide-react'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Loading } from '../../components/ui'
import { fullName, money } from '../../lib/format'
import type { EmployeePortalDashboard } from '../../types'
import { PayslipPreviewModal } from '../payroll/PayslipPreviewModal'

const SLICE_COLORS = {
  additions: '#17375e',
  deductions: '#d32027',
  tax: '#3d5572',
  nic: '#8a9bb0',
  pension: '#d4d4d4',
  takeHome: '#f3f0ea',
} as const

function utcDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatShortDate(value?: string | Date | null, withYear = true) {
  const date = utcDate(value)
  if (!date) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  })
}

function weekEndingLabel(value?: string | null, frequency?: string | null) {
  if (!value) return 'Latest finalised pay'
  const kind = String(frequency ?? '').toUpperCase().includes('MONTH')
    ? 'Month ending'
    : 'Week ending'
  return `${kind} ${formatShortDate(value, false)}`
}

function shiftDayLabel(value?: string | null) {
  const date = utcDate(value)
  if (!date) return 'No upcoming shift'
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    timeZone: 'UTC',
  })
}

function shiftTimeLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return '—'
  const from = new Date(start)
  const to = new Date(end)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '—'
  const format = (date: Date) =>
    date
      .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
      .toLowerCase()
      .replace(' ', '')
  return `${format(from)} - ${format(to)}`
}

function payrollStatus(value?: string | null) {
  const status = String(value ?? '').toLowerCase()
  if (!status) return 'not scheduled'
  if (status === 'completed' || status === 'locked') return 'finalised'
  return status
}

type Slice = { label: string; amount: number; color: string; pct: number; start: number }

function toSlices(breakdown: EmployeePortalDashboard['breakdown']): Slice[] {
  const parts = [
    { label: 'Total Additions', amount: breakdown.additions, color: SLICE_COLORS.additions },
    { label: 'Total Deductions', amount: breakdown.deductions, color: SLICE_COLORS.deductions },
    { label: 'Tax', amount: breakdown.tax, color: SLICE_COLORS.tax },
    { label: 'Employee NIC', amount: breakdown.employee_nic, color: SLICE_COLORS.nic },
    { label: 'Employee Pension', amount: breakdown.employee_pension, color: SLICE_COLORS.pension },
    { label: 'Take home pay', amount: breakdown.take_home, color: SLICE_COLORS.takeHome },
  ]
  const basis = parts.reduce((total, part) => total + Math.max(0, part.amount), 0) || 1
  let start = 0
  return parts.map((part) => {
    const pct = (Math.max(0, part.amount) / basis) * 100
    const slice = { ...part, pct, start }
    start += pct
    return slice
  })
}

function ChartTip({
  title,
  value,
  align = 'center',
}: {
  title: string
  value: string
  align?: 'center' | 'left' | 'right'
}) {
  const shift =
    align === 'left' ? 'translate-x-0' : align === 'right' ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <div
      className={`pointer-events-none absolute z-20 mb-2 min-w-[120px] -translate-y-full rounded-[12px] bg-navy px-3 py-2 text-center shadow-sm ${shift}`}
    >
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/70">{title}</p>
    </div>
  )
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

function donutPath(startPct: number, pct: number, cx: number, cy: number, outer: number, inner: number) {
  if (pct <= 0) return ''
  const startAngle = (startPct / 100) * 360 - 90
  const endAngle = ((startPct + pct) / 100) * 360 - 90
  const large = pct > 50 ? 1 : 0
  const os = polar(cx, cy, outer, startAngle)
  const oe = polar(cx, cy, outer, endAngle)
  const is = polar(cx, cy, inner, startAngle)
  const ie = polar(cx, cy, inner, endAngle)
  return `M ${os.x} ${os.y} A ${outer} ${outer} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${inner} ${inner} 0 ${large} 0 ${is.x} ${is.y} Z`
}

function PayrollBreakdown({ slices, takeHome }: { slices: Slice[]; takeHome: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const size = 188
  const cx = size / 2
  const cy = size / 2
  const outer = 94
  const inner = 52
  const active = hover != null ? slices[hover] : null
  const midPct = active ? active.start + active.pct / 2 : 0
  const tip = polar(cx, cy, (outer + inner) / 2, (midPct / 100) * 360 - 90)

  return (
    <div className="grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)]" onMouseLeave={() => setHover(null)}>
      <div className="relative mx-auto size-[188px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full" role="img" aria-label="Payroll breakdown">
          {slices.map((slice, index) => {
            const path = donutPath(slice.start, slice.pct, cx, cy, outer, inner)
            if (!path) return null
            return (
              <path
                key={slice.label}
                d={path}
                fill={slice.color}
                opacity={hover == null || hover === index ? 1 : 0.35}
                className="cursor-pointer"
                onMouseEnter={() => setHover(index)}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-[42px] flex flex-col items-center justify-center rounded-full bg-white text-center">
          <p className="text-[11px] text-muted">{active ? active.label : 'Take home pay'}</p>
          <p className="text-lg font-semibold text-navy">{money(active ? active.amount : takeHome)}</p>
        </div>
        {active ? (
          <div className="pointer-events-none absolute z-20" style={{ left: tip.x, top: tip.y }}>
            <ChartTip
              title={active.label}
              value={money(active.amount)}
              align={tip.x < cx - 20 ? 'left' : tip.x > cx + 20 ? 'right' : 'center'}
            />
          </div>
        ) : null}
      </div>
      <ul className="space-y-3">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            className={`flex cursor-pointer items-center justify-between text-sm ${
              hover != null && hover !== index ? 'opacity-40' : ''
            }`}
            onMouseEnter={() => setHover(index)}
          >
            <span className="flex items-center gap-3 text-navy">
              <span className="size-3 rounded-full" style={{ background: slice.color }} />
              {slice.label}
            </span>
            <span className="font-semibold text-navy">{money(slice.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function paySeriesMeta(frequency?: string | null) {
  switch (String(frequency ?? '').toUpperCase()) {
    case 'WEEKLY':
      return { title: 'Weekly pay', unit: 'Week' }
    case 'FORTNIGHTLY':
      return { title: 'Fortnightly pay', unit: 'Fortnight' }
    case 'FOUR_WEEKLY':
      return { title: '4-weekly pay', unit: 'Period' }
    default:
      return { title: 'Monthly pay', unit: 'Month' }
  }
}

function axisLabelStep(count: number) {
  if (count <= 14) return 2
  if (count <= 26) return 4
  return 8
}

function PaySeriesChart({
  points,
  unit,
}: {
  points: Array<{ period: number; amount: number }>
  unit: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 520
  const height = 220
  const pad = { top: 16, right: 16, bottom: 28, left: 48 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(...points.map((point) => point.amount), 1)
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const step = axisLabelStep(points.length)
  const coords = points.map((point, index) => {
    const x = pad.left + (index / Math.max(points.length - 1, 1)) * innerW
    const y = pad.top + innerH - (point.amount / max) * innerH
    return { ...point, x, y }
  })
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ')
  const active = hover != null ? coords[hover] : null

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label={`${unit} pay`}>
        {ticks.map((tick) => {
          const y = pad.top + innerH - (tick / max) * innerH
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#eceae6" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-[#8a93a0] text-[10px]">
                {Math.round(tick).toLocaleString('en-GB')}
              </text>
            </g>
          )
        })}
        <polyline fill="none" stroke="#17375e" strokeWidth="2" points={line} />
        {coords.map((point, index) => {
          const prev = coords[index - 1]
          const next = coords[index + 1]
          const left = prev ? (prev.x + point.x) / 2 : pad.left
          const right = next ? (next.x + point.x) / 2 : width - pad.right
          return (
            <g key={`${point.period}-${index}`}>
              <rect
                x={left}
                y={pad.top}
                width={Math.max(right - left, 8)}
                height={innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHover(index)}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={hover === index ? 5.5 : 3.5}
                fill="#17375e"
                className="pointer-events-none"
              />
            </g>
          )
        })}
        {coords
          .filter((point, index) => {
            const first = coords[0]?.period ?? 1
            return (
              index === 0 ||
              index === coords.length - 1 ||
              (point.period - first) % step === 0
            )
          })
          .map((point) => (
            <text
              key={`label-${point.period}-${point.x}`}
              x={point.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-[#8a93a0] text-[10px]"
            >
              {unit} {point.period}
            </text>
          ))}
      </svg>
      {active ? (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: `${(active.x / width) * 100}%`,
            top: `${(active.y / height) * 100}%`,
          }}
        >
          <ChartTip
            title={`${unit} ${active.period}`}
            value={money(active.amount)}
            align={active.x > width * 0.8 ? 'right' : active.x < width * 0.2 ? 'left' : 'center'}
          />
        </div>
      ) : null}
    </div>
  )
}

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy text-white">
      {children}
    </span>
  )
}

export function EmployeeDashboardPage() {
  const { companyId, currentEmployee, user, companies } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const company = companies.find((item) => item.id === companyId)
  const query = useQuery({
    queryKey: ['employee-dashboard', companyId, employeeId],
    queryFn: () => employeesApi.portalDashboard(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const data = query.data?.data
  const name = fullName(data?.first_name ?? user?.first_name, data?.last_name ?? user?.last_name) || 'there'
  const slices = data ? toSlices(data.breakdown) : []
  const [previewOpen, setPreviewOpen] = useState(false)
  const latestRunId = data?.latest_run_id ? String(data.latest_run_id) : ''
  const latestRecordId = data?.latest_record_id ? String(data.latest_record_id) : ''
  const taxYear = data?.tax_year ?? new Date().getFullYear()
  const chartFrequency = data?.pay_frequency ?? data?.latest_pay_frequency
  const chartMeta = paySeriesMeta(chartFrequency)
  const chartPoints =
    data?.pay_series ??
    data?.monthly_pay?.map((item) => ({ period: item.month, amount: item.amount })) ??
    Array.from({ length: 12 }, (_, index) => ({ period: index + 1, amount: 0 }))

  if (query.isLoading) return <Loading />

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-none text-navy">Dashboard</h1>
      <p className="mt-3 text-lg font-medium text-navy">Welcome, {name}</p>
      <p className="mt-1 text-sm text-muted">{company?.name || 'Your company'}</p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-[24px] bg-white px-7 py-6">
          <div className="flex items-start gap-5">
            <StatIcon>
              <CreditCard size={22} />
            </StatIcon>
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy">Latest Take-home pay</p>
              <p className="mt-2 text-[28px] leading-none font-semibold text-navy">
                {money(data?.latest_take_home ?? 0)}
              </p>
              <p className="mt-2 text-xs text-muted">
                {data?.latest_pay_date
                  ? `Paid on ${formatShortDate(data.latest_pay_date)}`
                  : 'No finalised payslip yet'}
              </p>
              {latestRunId && latestRecordId ? (
                <button
                  type="button"
                  className="mt-3 inline-block text-xs font-semibold text-navy"
                  onClick={() => setPreviewOpen(true)}
                >
                  View Payslip →
                </button>
              ) : (
                <Link to="/portal/payslips" className="mt-3 inline-block text-xs font-semibold text-navy">
                  View Payslip →
                </Link>
              )}
            </div>
          </div>
        </article>

        <article className="rounded-[24px] bg-white px-7 py-6">
          <div className="flex items-start gap-5">
            <StatIcon>
              <UserRound size={22} />
            </StatIcon>
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy">Leave Remaining</p>
              <p className="mt-2 text-[28px] leading-none font-semibold text-navy">
                {data?.leave.days_remaining ?? 0} Days
              </p>
              <p className="mt-2 text-xs text-muted">of {data?.leave.days_entitled ?? 28} days</p>
              <Link to="/portal/leave" className="mt-3 inline-block text-xs font-semibold text-navy">
                Request Leave →
              </Link>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] bg-white px-7 py-6">
          <div className="flex items-start gap-5">
            <StatIcon>
              <CalendarDays size={22} />
            </StatIcon>
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy">Next Payroll Date</p>
              <p className="mt-2 text-[28px] leading-none font-semibold text-navy">
                {data?.next_payroll?.pay_date
                  ? formatShortDate(data.next_payroll.pay_date)
                  : 'Not set'}
              </p>
              <p className="mt-2 text-xs text-muted">
                status: {payrollStatus(data?.next_payroll?.status)}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className="rounded-[24px] bg-white p-7">
          <h2 className="text-lg font-semibold text-navy">Payroll Breakdown</h2>
          <p className="text-sm text-muted">
            {weekEndingLabel(data?.latest_period_end, data?.latest_pay_frequency)}
          </p>
          <div className="mt-6">
            <PayrollBreakdown slices={slices} takeHome={data?.breakdown.take_home ?? 0} />
          </div>
        </article>

        <article className="overflow-visible rounded-[24px] bg-white p-7">
          <h2 className="text-lg font-semibold text-navy">{chartMeta.title}</h2>
          <p className="text-sm text-muted">
            Tax Year {taxYear}-{taxYear + 1}
          </p>
          <div className="mt-4">
            <PaySeriesChart points={chartPoints} unit={chartMeta.unit} />
          </div>
        </article>
      </div>

      <article className="mt-5 rounded-[24px] bg-white px-7 py-6">
        <h2 className="text-lg font-semibold text-navy">Next Assigned Shift</h2>
        {data?.next_shift ? (
          <div className="mt-3">
            <p className="flex flex-wrap items-center gap-3 text-sm font-medium text-navy">
              <span>{shiftDayLabel(data.next_shift.shift_date)}</span>
              <span className="size-1.5 rounded-full bg-navy" />
              <span>{formatShortDate(data.next_shift.shift_date)}</span>
            </p>
            <p className="mt-1 text-sm text-navy">
              {shiftTimeLabel(data.next_shift.start_time, data.next_shift.end_time)}
              {data.next_shift.location ? ` · ${data.next_shift.location}` : ''}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No published shift is assigned yet.</p>
        )}
      </article>
      {previewOpen && latestRunId && latestRecordId ? (
        <PayslipPreviewModal
          runId={latestRunId}
          recordId={latestRecordId}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  )
}

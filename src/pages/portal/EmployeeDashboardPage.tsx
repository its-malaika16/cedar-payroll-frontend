import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CreditCard, UserRound } from 'lucide-react'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Loading } from '../../components/ui'
import { formatLongDate, fullName, money } from '../../lib/format'
import type { EmployeePortalDashboard } from '../../types'

const SLICE_COLORS = {
  additions: '#17375e',
  deductions: '#d32027',
  tax: '#3d5572',
  nic: '#8a9bb0',
  pension: '#c5cdd6',
  takeHome: '#e8e4dc',
} as const

function weekEndingLabel(value?: string | null) {
  if (!value) return 'Latest finalised pay'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Latest finalised pay'
  return `Week ending ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })}`
}

function shiftDayLabel(value?: string | null) {
  if (!value) return 'No upcoming shift'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No upcoming shift'
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
    date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${format(from)} - ${format(to)}`.toLowerCase()
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

function donutBackground(slices: Slice[]) {
  const stops = slices.map((slice) => `${slice.color} ${slice.start}% ${slice.start + slice.pct}%`)
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

function MonthlyPayChart({ points }: { points: Array<{ month: number; amount: number }> }) {
  const width = 520
  const height = 220
  const pad = { top: 16, right: 12, bottom: 28, left: 44 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(...points.map((point) => point.amount), 1)
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const coords = points.map((point, index) => {
    const x = pad.left + (index / Math.max(points.length - 1, 1)) * innerW
    const y = pad.top + innerH - (point.amount / max) * innerH
    return { ...point, x, y }
  })
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Monthly pay">
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
      {coords.map((point) => (
        <circle key={point.month} cx={point.x} cy={point.y} r="3.5" fill="#17375e" />
      ))}
      {coords
        .filter((point) => point.month % 2 === 1)
        .map((point) => (
          <text
            key={`label-${point.month}`}
            x={point.x}
            y={height - 6}
            textAnchor="middle"
            className="fill-[#8a93a0] text-[10px]"
          >
            Month {point.month}
          </text>
        ))}
    </svg>
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
  })
  const data = query.data?.data
  const name = fullName(data?.first_name ?? user?.first_name, data?.last_name ?? user?.last_name) || 'there'
  const slices = data ? toSlices(data.breakdown) : []
  const payslipTo =
    data?.latest_run_id && data.latest_record_id
      ? `/portal/payslips/${data.latest_run_id}/${data.latest_record_id}`
      : '/portal/payslips'

  if (query.isLoading) return <Loading />

  return (
    <div>
      <h1 className="text-[26px] font-semibold text-navy sm:text-[32px]">Dashboard</h1>
      <p className="mt-1 text-lg font-medium text-navy">Welcome, {name}</p>
      <p className="text-sm text-muted">{company?.name || 'Your company'}</p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-[20px] bg-white px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#d9d9d9] text-navy">
              <CreditCard size={20} />
            </span>
            <div>
              <p className="text-sm font-medium text-navy">Latest Take-home pay</p>
              <p className="mt-1 text-[28px] leading-none font-semibold text-navy">
                {money(data?.latest_take_home ?? 0)}
              </p>
              <p className="mt-2 text-xs text-muted">
                {data?.latest_pay_date ? `Paid on ${formatLongDate(data.latest_pay_date)}` : 'No finalised payslip yet'}
              </p>
              <Link to={payslipTo} className="mt-3 inline-block text-xs font-semibold text-navy">
                View Payslip →
              </Link>
            </div>
          </div>
        </article>

        <article className="rounded-[20px] bg-white px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#d9d9d9] text-navy">
              <UserRound size={20} />
            </span>
            <div>
              <p className="text-sm font-medium text-navy">Leave Remaining</p>
              <p className="mt-1 text-[28px] leading-none font-semibold text-navy">
                {data?.leave.days_remaining ?? 0} Days
              </p>
              <p className="mt-2 text-xs text-muted">
                of {data?.leave.days_entitled ?? 28} days
              </p>
              <Link to="/portal/leave" className="mt-3 inline-block text-xs font-semibold text-navy">
                Request Leave →
              </Link>
            </div>
          </div>
        </article>

        <article className="rounded-[20px] bg-white px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#d9d9d9] text-navy">
              <CalendarDays size={20} />
            </span>
            <div>
              <p className="text-sm font-medium text-navy">Next Payroll Date</p>
              <p className="mt-1 text-[28px] leading-none font-semibold text-navy">
                {data?.next_payroll?.pay_date
                  ? new Date(data.next_payroll.pay_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })
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
        <article className="rounded-[20px] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy">Payroll Breakdown</h2>
              <p className="text-sm text-muted">{weekEndingLabel(data?.latest_period_end)}</p>
            </div>
          </div>
          <div className="mt-6 grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex justify-center">
              <div
                className="relative size-[188px] rounded-full"
                style={{ background: donutBackground(slices) }}
              >
                <div className="absolute inset-[38px] flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-[11px] text-muted">Take home pay</p>
                  <p className="text-lg font-semibold text-navy">{money(data?.breakdown.take_home ?? 0)}</p>
                </div>
              </div>
            </div>
            <ul className="space-y-3">
              {slices.map((slice) => (
                <li key={slice.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-3 text-navy">
                    <span className="size-3 rounded-full" style={{ background: slice.color }} />
                    {slice.label}
                  </span>
                  <span className="font-semibold text-navy">{money(slice.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="rounded-[20px] bg-white p-6">
          <h2 className="text-lg font-semibold text-navy">Monthly pay</h2>
          <p className="text-sm text-muted">
            Tax Year {data?.tax_year ?? new Date().getFullYear()} -{' '}
            {String((data?.tax_year ?? new Date().getFullYear()) + 1).slice(-2)}
          </p>
          <div className="mt-4">
            <MonthlyPayChart points={data?.monthly_pay ?? Array.from({ length: 12 }, (_, index) => ({ month: index + 1, amount: 0 }))} />
          </div>
        </article>
      </div>

      <article className="mt-5 rounded-[20px] bg-white px-6 py-5">
        <h2 className="text-lg font-semibold text-navy">Next Assigned Shift</h2>
        {data?.next_shift ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-navy">
            <span className="font-medium">{shiftDayLabel(data.next_shift.shift_date)}</span>
            <span className="size-1.5 rounded-full bg-navy" />
            <span>{formatLongDate(data.next_shift.shift_date)}</span>
            <span className="w-full text-muted sm:w-auto">
              {shiftTimeLabel(data.next_shift.start_time, data.next_shift.end_time)}
              {data.next_shift.location ? ` · ${data.next_shift.location}` : ''}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No published shift is assigned yet.</p>
        )}
      </article>
    </div>
  )
}

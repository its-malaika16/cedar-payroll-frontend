import { useQuery } from '@tanstack/react-query'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Card, EmptyState, Loading, PageHeader } from '../../components/ui'
import { PortalSwitchBanner } from '../../components/PortalSwitcher'
import { formatDate, formatPayslipPeriod, money } from '../../lib/format'
import type { PayrollRecord } from '../../types'

const SLICE_COLORS = {
  net: '#17375e',
  tax: '#d32027',
  employeeNic: '#3d5572',
  employeeNest: '#8a9bb0',
} as const

type Slice = { label: string; amount: number; color: string; pct: number; start: number }

function toSlices(record: PayrollRecord): Slice[] {
  const parts = [
    { label: 'Take-home pay', amount: Number(record.take_home_pay ?? record.net_pay ?? 0), color: SLICE_COLORS.net },
    { label: 'Tax (PAYE)', amount: Number(record.tax ?? 0), color: SLICE_COLORS.tax },
    { label: 'Employee NIC', amount: Number(record.employee_nic ?? 0), color: SLICE_COLORS.employeeNic },
    { label: 'Employee pension', amount: Number(record.employee_pension ?? 0), color: SLICE_COLORS.employeeNest },
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

export function EmployeeDashboardPage() {
  const { companyId, currentEmployee, user, companies } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const company = companies.find((item) => item.id === companyId)
  const query = useQuery({
    queryKey: ['latest-payroll', companyId, employeeId],
    queryFn: () => employeesApi.latestPayroll(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const record = (query.data?.data as (PayrollRecord & {
    payroll_runs?: {
      period_start_date?: string
      period_end_date?: string
      pay_date?: string
      pay_frequency?: string
    }
  }) | null | undefined) ?? null
  const run = record?.payroll_runs
  const slices = record ? toSlices(record) : []
  const greeting = `Hello, ${[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'there'}`

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting}. Here is your latest finalised payroll.`}
      />
      <PortalSwitchBanner variant="employee" />
      {query.isLoading ? (
        <Loading />
      ) : !record ? (
        <Card className="p-8">
          <EmptyState
            title="No payroll yet"
            body="When your employer finalises a pay period, the breakdown and dates will appear here."
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-6 md:p-8">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Pay period</p>
            <h2 className="mt-2 text-2xl font-semibold text-navy">
              {formatPayslipPeriod(run?.period_start_date, run?.period_end_date, run?.pay_frequency)}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Pay date {formatDate(run?.pay_date)}
              {company?.name ? ` · ${company.name}` : ''}
            </p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ['Gross pay', record.gross_pay],
                ['Tax', record.tax],
                ['Employee NIC', record.employee_nic],
                ['Employee pension', record.employee_pension],
                ['Net pay', record.net_pay],
                ['Take-home pay', record.take_home_pay],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-[14px] bg-[#f4f7fb] px-4 py-3">
                  <dt className="text-xs font-medium text-muted">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-navy">{money(value)}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6">
            <div
              className="relative size-44 rounded-full"
              style={{ background: donutBackground(slices) }}
            >
              <div className="absolute inset-6 flex items-center justify-center rounded-full bg-white">
                <div className="text-center">
                  <p className="text-[11px] font-medium text-muted">Take-home</p>
                  <p className="text-sm font-semibold text-navy">{money(record.take_home_pay ?? record.net_pay)}</p>
                </div>
              </div>
            </div>
            <ul className="mt-6 w-full space-y-2">
              {slices.map((slice) => (
                <li key={slice.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-navy">
                    <span className="size-2.5 rounded-full" style={{ background: slice.color }} />
                    {slice.label}
                  </span>
                  <span className="font-semibold text-navy">{money(slice.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}

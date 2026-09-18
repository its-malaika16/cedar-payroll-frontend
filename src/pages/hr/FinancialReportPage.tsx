import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Card, Loading } from '../../components/ui'
import { money } from '../../lib/format'
import { HrCrumbs, HrTitle } from './HrChrome'

type Summary = {
  sample?: boolean
  company_name?: string
  totals?: {
    employees: number
    total_hours: number
    total_cost: number
    leave_requests: number
    attendance_hours: number
    avg_cost_per_hour: number
  }
  by_month?: { month: number; label: string; hours: number; cost: number }[]
  by_employee?: { name: string; hours: number; cost: number }[]
}

const DEMO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DEMO_COST = [42, 48, 51, 39, 55, 61, 58, 47, 53, 49, 44, 38]
const DEMO_HOURS = [310, 340, 360, 290, 380, 410, 395, 330, 355, 345, 320, 280]
const SLICES = [
  { label: 'Wages', color: '#17375e', share: 0.62 },
  { label: 'Employer NI', color: '#d32027', share: 0.14 },
  { label: 'Pension', color: '#3d5572', share: 0.11 },
  { label: 'Leave cover', color: '#8a9bb0', share: 0.08 },
  { label: 'Overtime', color: '#c5cdd6', share: 0.05 },
]

function Donut({ total }: { total: number }) {
  const radius = 58
  const circ = 2 * Math.PI * radius
  let offset = 0
  return (
    <svg viewBox="0 0 160 160" className="size-[180px]">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#eef2f6" strokeWidth="22" />
      {SLICES.map((slice) => {
        const length = circ * slice.share
        const dash = `${length} ${circ - length}`
        const node = (
          <circle
            key={slice.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth="22"
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          />
        )
        offset += length
        return node
      })}
      <text x="80" y="76" textAnchor="middle" className="fill-navy" fontSize="11" fontWeight="600">
        Labour
      </text>
      <text x="80" y="94" textAnchor="middle" className="fill-navy" fontSize="13" fontWeight="700">
        {money(total)}
      </text>
    </svg>
  )
}

export function FinancialReportPage() {
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const summaryQuery = useQuery({
    queryKey: ['hr-financial-summary', companyId],
    queryFn: () => hrApi.financialSummary(companyId!),
    enabled: Boolean(companyId),
  })

  const summary = summaryQuery.data?.data as Summary | undefined
  const sample = Boolean(summary?.sample)
  const months = summary?.by_month?.length
    ? summary.by_month
    : DEMO_MONTHS.map((label, index) => ({
        month: index + 1,
        label,
        hours: DEMO_HOURS[index],
        cost: DEMO_COST[index] * 1000,
      }))
  const displayMonths = sample
    ? DEMO_MONTHS.map((label, index) => ({
        month: index + 1,
        label,
        hours: DEMO_HOURS[index],
        cost: DEMO_COST[index] * 1000,
      }))
    : months
  const maxCost = Math.max(...displayMonths.map((item) => item.cost), 1)
  const totalCost = sample
    ? displayMonths.reduce((sum, item) => sum + item.cost, 0)
    : summary?.totals?.total_cost || displayMonths.reduce((sum, item) => sum + item.cost, 0)
  const totalHours = sample
    ? displayMonths.reduce((sum, item) => sum + item.hours, 0)
    : summary?.totals?.total_hours || 0
  const people = summary?.by_employee?.length
    ? summary.by_employee
    : [
        { name: 'Front of house', hours: 820, cost: 18600 },
        { name: 'Kitchen', hours: 740, cost: 16840 },
        { name: 'Management', hours: 310, cost: 12400 },
        { name: 'Cleaning', hours: 190, cost: 4120 },
      ]
  const maxPerson = Math.max(...people.map((item) => item.cost), 1)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <HrCrumbs items={[{ label: 'HR', to: '/hr' }, { label: 'Financial Report' }]} />
      <div className="mb-5">
        <HrTitle title="Financial Report" onBack={() => navigate('/hr')} />
        <p className="mt-2 text-sm text-muted">
          Hours, labour cost, and visual spend across the year.
        </p>
      </div>
      {sample ? (
        <p className="mb-4 rounded-[12px] bg-[#e7f1f8] px-4 py-2 text-sm text-navy">
          Showing a visual preview until approved timesheets and rates are available.
        </p>
      ) : null}

      {summaryQuery.isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold text-muted">Labour cost</p>
              <p className="mt-2 text-2xl font-semibold text-navy">{money(totalCost)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold text-muted">Hours</p>
              <p className="mt-2 text-2xl font-semibold text-navy">{Math.round(totalHours).toLocaleString('en-GB')}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold text-muted">Headcount</p>
              <p className="mt-2 text-2xl font-semibold text-navy">{summary?.totals?.employees ?? '—'}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold text-muted">Leave approved</p>
              <p className="mt-2 text-2xl font-semibold text-navy">{summary?.totals?.leave_requests ?? 0}</p>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold text-navy">Monthly labour cost</h2>
              <div className="flex h-48 items-end gap-2">
                {displayMonths.map((item) => (
                  <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className="w-full rounded-t-[8px] bg-navy"
                      style={{ height: `${Math.max(8, (item.cost / maxCost) * 100)}%` }}
                      title={money(item.cost)}
                    />
                    <span className="text-[10px] font-semibold text-muted">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="flex flex-wrap items-center gap-6 p-5">
              <Donut total={totalCost} />
              <ul className="space-y-2 text-sm">
                {SLICES.map((slice) => (
                  <li key={slice.label} className="flex items-center gap-2 text-navy">
                    <span className="size-2.5 rounded-full" style={{ background: slice.color }} />
                    {slice.label}
                    <span className="ml-auto font-semibold">{Math.round(slice.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-base font-semibold text-navy">Cost by team</h2>
            <div className="space-y-3">
              {people.map((item) => (
                <div key={item.name}>
                  <div className="mb-1 flex justify-between text-sm text-navy">
                    <span>{item.name}</span>
                    <span className="font-semibold">{money(item.cost)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-cream">
                    <div
                      className="h-full rounded-full bg-[#d32027]"
                      style={{ width: `${Math.max(6, (item.cost / maxPerson) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

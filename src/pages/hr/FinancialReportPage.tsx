import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Card, Loading } from '../../components/ui'
import { money } from '../../lib/format'
import { HrCrumbs, HrTitle } from './HrChrome'

type MoneySlice = { label: string; amount: number; color?: string }
type NamedCost = { name: string; staff_cost: number; people?: number; gross_pay?: number }

type Summary = {
  company_name?: string
  tax_year?: string
  has_payroll?: boolean
  totals?: {
    staff_cost: number
    gross_pay: number
    basic_pay: number
    overtime: number
    bonus: number
    holiday_pay: number
    statutory_pay: number
    employer_ni: number
    employer_ni_class1a: number
    employer_pension: number
    employee_pension: number
    tax: number
    employee_ni: number
    student_loan: number
    net_pay: number
    hmrc_due: number
    pension_due: number
    payslips: number
    people_paid: number
    employees: number
    leave_requests: number
    leave_days: number
    timesheet_hours: number
    attendance_hours: number
  }
  composition?: MoneySlice[]
  pay_mix?: MoneySlice[]
  by_month?: { month: number; label: string; staff_cost: number; gross_pay: number; hmrc: number }[]
  by_department?: NamedCost[]
  by_schedule?: NamedCost[]
  by_employee?: NamedCost[]
  invoices?: { count: number; raised: number; paid: number; outstanding: number }
}

function Donut({ slices, total }: { slices: MoneySlice[]; total: number }) {
  const radius = 58
  const circ = 2 * Math.PI * radius
  let offset = 0
  if (!slices.length || total <= 0) {
    return (
      <svg viewBox="0 0 160 160" className="size-[180px]">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#eef2f6" strokeWidth="22" />
        <text x="80" y="76" textAnchor="middle" className="fill-navy" fontSize="11" fontWeight="600">
          Staff cost
        </text>
        <text x="80" y="94" textAnchor="middle" className="fill-navy" fontSize="13" fontWeight="700">
          {money(0)}
        </text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 160 160" className="size-[180px]">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#eef2f6" strokeWidth="22" />
      {slices.map((slice) => {
        const length = circ * (slice.amount / total)
        const dash = `${length} ${circ - length}`
        const node = (
          <circle
            key={slice.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={slice.color || '#17375e'}
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
        Staff cost
      </text>
      <text x="80" y="94" textAnchor="middle" className="fill-navy" fontSize="13" fontWeight="700">
        {money(total)}
      </text>
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-navy">{value}</p>
    </Card>
  )
}

function CostList({
  title,
  rows,
  empty,
}: {
  title: string
  rows: NamedCost[]
  empty: string
}) {
  const max = Math.max(...rows.map((item) => item.staff_cost), 1)
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-base font-semibold text-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.name}>
              <div className="mb-1 flex justify-between gap-3 text-sm text-navy">
                <span className="min-w-0 truncate">
                  {item.name}
                  {typeof item.people === 'number' ? (
                    <span className="text-muted"> · {item.people}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-semibold">{money(item.staff_cost)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full bg-[#d32027]"
                  style={{ width: `${Math.max(6, (item.staff_cost / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
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
  const totals = summary?.totals
  const months = summary?.by_month ?? []
  const maxMonth = Math.max(...months.map((item) => item.staff_cost), 1)
  const composition = summary?.composition ?? []
  const compositionTotal = composition.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <HrCrumbs items={[{ label: 'HR', to: '/hr' }, { label: 'Financial Report' }]} />
      <div className="mb-5">
        <HrTitle title="Financial Report" onBack={() => navigate('/hr')} />
        <p className="mt-2 text-sm text-muted">
          Staff cost, HMRC, pension, and spend by department for tax year {summary?.tax_year ?? '2026/27'}.
          Finalised payslips only.
        </p>
      </div>

      {summaryQuery.isLoading ? (
        <Loading />
      ) : (
        <>
          {!summary?.has_payroll ? (
            <p className="mb-4 rounded-[12px] bg-[#e7f1f8] px-4 py-2 text-sm text-navy">
              No finalised payroll in this tax year yet. Totals will appear once payslips are marked as done.
            </p>
          ) : null}

          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="Staff cost" value={money(totals?.staff_cost)} />
            <Stat label="Due to HMRC" value={money(totals?.hmrc_due)} />
            <Stat label="Due to pension" value={money(totals?.pension_due)} />
            <Stat label="Net pay" value={money(totals?.net_pay)} />
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="Gross pay" value={money(totals?.gross_pay)} />
            <Stat label="Employer NI" value={money(totals?.employer_ni)} />
            <Stat label="Employer pension" value={money(totals?.employer_pension)} />
            <Stat
              label="People paid"
              value={`${totals?.people_paid ?? 0} / ${totals?.employees ?? 0}`}
            />
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold text-navy">Monthly staff cost</h2>
              <div className="flex h-48 items-end gap-2">
                {months.map((item) => (
                  <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className="w-full rounded-t-[8px] bg-navy"
                      style={{ height: `${Math.max(8, (item.staff_cost / maxMonth) * 100)}%` }}
                      title={`${item.label}: ${money(item.staff_cost)}`}
                    />
                    <span className="text-[10px] font-semibold text-muted">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="flex flex-wrap items-center gap-6 p-5">
              <Donut slices={composition} total={totals?.staff_cost || compositionTotal} />
              <ul className="min-w-[160px] space-y-2 text-sm">
                {(composition.length
                  ? composition
                  : [
                      { label: 'Gross pay', amount: 0, color: '#17375e' },
                      { label: 'Employer NI', amount: 0, color: '#d32027' },
                      { label: 'Employer pension', amount: 0, color: '#3d5572' },
                    ]
                ).map((slice) => (
                  <li key={slice.label} className="flex items-center gap-2 text-navy">
                    <span className="size-2.5 rounded-full" style={{ background: slice.color }} />
                    <span className="flex-1">{slice.label}</span>
                    <span className="font-semibold">{money(slice.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold text-navy">How pay is made up</h2>
              {(summary?.pay_mix ?? []).length === 0 ? (
                <p className="text-sm text-muted">No pay mix until payroll is finalised.</p>
              ) : (
                <ul className="space-y-2 text-sm text-navy">
                  {(summary?.pay_mix ?? []).map((item) => (
                    <li key={item.label} className="flex justify-between gap-3 border-b border-[#f0eee9] py-2 last:border-0">
                      <span>{item.label}</span>
                      <span className="font-semibold">{money(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold text-navy">HMRC and pension</h2>
              <ul className="space-y-2 text-sm text-navy">
                {[
                  ['PAYE tax', totals?.tax],
                  ['Employee NI', totals?.employee_ni],
                  ['Employer NI', totals?.employer_ni],
                  ['Student loan', totals?.student_loan],
                  ['Employee pension', totals?.employee_pension],
                  ['Employer pension', totals?.employer_pension],
                ].map(([label, amount]) => (
                  <li key={String(label)} className="flex justify-between gap-3 border-b border-[#f0eee9] py-2 last:border-0">
                    <span>{label}</span>
                    <span className="font-semibold">{money(amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <CostList
              title="Cost by department"
              rows={summary?.by_department ?? []}
              empty="No department costs yet."
            />
            <CostList
              title="Cost by pay schedule"
              rows={summary?.by_schedule ?? []}
              empty="No pay schedule costs yet."
            />
          </div>

          <div className="mb-4">
            <CostList
              title="Highest staff cost"
              rows={summary?.by_employee ?? []}
              empty="No employee costs yet."
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold text-navy">Payroll invoices</h2>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted">Raised</p>
                  <p className="mt-1 font-semibold text-navy">{money(summary?.invoices?.raised)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Paid</p>
                  <p className="mt-1 font-semibold text-navy">{money(summary?.invoices?.paid)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Outstanding</p>
                  <p className="mt-1 font-semibold text-navy">{money(summary?.invoices?.outstanding)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold text-navy">HR alongside payroll</h2>
              <ul className="space-y-2 text-sm text-navy">
                <li className="flex justify-between gap-3">
                  <span>Approved leave</span>
                  <span className="font-semibold">
                    {totals?.leave_requests ?? 0} ({totals?.leave_days ?? 0} days)
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Approved timesheet hours</span>
                  <span className="font-semibold">
                    {Math.round(totals?.timesheet_hours ?? 0).toLocaleString('en-GB')}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Attendance hours</span>
                  <span className="font-semibold">
                    {Math.round(totals?.attendance_hours ?? 0).toLocaleString('en-GB')}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Finalised payslips</span>
                  <span className="font-semibold">{totals?.payslips ?? 0}</span>
                </li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

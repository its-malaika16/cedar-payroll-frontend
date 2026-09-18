import { money } from '../../lib/format'
import type { PayslipViewModel } from './payslipViewModel'

const NAVY = '#17375e'
const PALE = '#e8eef6'
const LABEL = '#5c6e82'

function hours(value?: number | null) {
  if (value == null || value === 0) return ''
  return value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.08em]" style={{ color: LABEL }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: NAVY }}>
        {value || '—'}
      </p>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
        highlight ? 'text-white' : ''
      }`}
      style={{ backgroundColor: highlight ? NAVY : '#ffffff', color: highlight ? '#ffffff' : NAVY }}
    >
      <span className={highlight ? 'font-semibold' : ''}>{label}</span>
      <span className="font-semibold tabular-nums">{money(value)}</span>
    </div>
  )
}

export function PayslipDocument({ model }: { model: PayslipViewModel }) {
  const employerLine = [model.companyName, model.payeReference ? `Paye ref ${model.payeReference}` : '']
    .filter(Boolean)
    .join(' - ')

  return (
    <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_8px_rgba(23,55,94,0.08)]">
      <div className="px-8 pb-8 pt-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[28px] font-semibold leading-none" style={{ color: NAVY }}>
            Payslip
          </h2>
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-[0.08em]" style={{ color: NAVY }}>
              NET PAY
            </p>
            <p className="mt-1 text-[28px] font-semibold leading-none" style={{ color: NAVY }}>
              {money(model.netPay)}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <InfoField label="EMPLOYEE" value={model.employeeName} />
          <InfoField label="DEPARTMENT" value={model.department} />
          <InfoField label="PAY PERIOD" value={model.payPeriod} />
          <InfoField label="NI NUMBER" value={model.niNumber} />
          <InfoField label="ADDRESS" value={model.address} />
          <InfoField label="TAX CODE" value={model.taxCode} />
        </div>

        <section className="mt-8 overflow-hidden rounded-[8px]">
          <div className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white" style={{ backgroundColor: NAVY }}>
            EARNINGS
          </div>
          <div className="bg-white">
            <div
              className="grid grid-cols-[minmax(0,1fr)_7rem_6.5rem_7rem] px-4 py-2 text-[10px] font-semibold tracking-[0.06em]"
              style={{ color: NAVY }}
            >
              <span>DESCRIPTION</span>
              <span className="text-right">HOURS / UNITS</span>
              <span className="text-right">RATE</span>
              <span className="text-right">AMOUNT</span>
            </div>
            {model.earnings.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: NAVY }}>
                No earnings this period
              </div>
            ) : (
              model.earnings.map((line, index) => (
                <div
                  key={`${line.description}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_7rem_6.5rem_7rem] items-center px-4 py-2.5 text-sm"
                  style={{ color: NAVY }}
                >
                  <span>{line.description}</span>
                  <span className="text-right tabular-nums">{hours(line.hours)}</span>
                  <span className="text-right tabular-nums">{line.rate ? money(line.rate) : ''}</span>
                  <span className="text-right font-semibold tabular-nums">{money(line.amount)}</span>
                </div>
              ))
            )}
            <div
              className="grid grid-cols-[minmax(0,1fr)_7rem_6.5rem_7rem] border-t px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: PALE, borderColor: NAVY, color: NAVY }}
            >
              <span>TOTAL EARNINGS</span>
              <span />
              <span />
              <span className="text-right tabular-nums">{money(model.totalEarnings)}</span>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[8px]">
          <div className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white" style={{ backgroundColor: NAVY }}>
            DEDUCTIONS
          </div>
          <div className="bg-white">
            <div
              className="grid grid-cols-[minmax(0,1fr)_7rem] px-4 py-2 text-[10px] font-semibold tracking-[0.06em]"
              style={{ color: NAVY }}
            >
              <span>DESCRIPTION</span>
              <span className="text-right">AMOUNT</span>
            </div>
            {model.deductions.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: NAVY }}>
                No deductions this period
              </div>
            ) : (
              model.deductions.map((line, index) => (
                <div
                  key={`${line.description}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_7rem] items-center px-4 py-2.5 text-sm"
                  style={{ color: NAVY }}
                >
                  <span>{line.description}</span>
                  <span className="text-right font-semibold tabular-nums">{money(line.amount)}</span>
                </div>
              ))
            )}
            <div
              className="grid grid-cols-[minmax(0,1fr)_7rem] border-t px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: PALE, borderColor: NAVY, color: NAVY }}
            >
              <span>TOTAL DEDUCTIONS</span>
              <span className="text-right tabular-nums">{money(model.totalDeductions)}</span>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
            <div className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-white" style={{ backgroundColor: NAVY }}>
              YEAR TO DATE (YTD)
            </div>
            <SummaryRow label="Taxable Pay" value={model.ytd.taxablePay} />
            <SummaryRow label="Tax Paid" value={model.ytd.taxPaid} />
            <SummaryRow label="Employee NI" value={model.ytd.employeeNi} />
            <SummaryRow label="Employer NI" value={model.ytd.employerNi} />
            <SummaryRow label="Pension Contributions" value={model.ytd.pension} />
          </section>
          <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
            <div className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-white" style={{ backgroundColor: NAVY }}>
              THIS PAY PERIOD
            </div>
            <SummaryRow label="Taxable Gross Pay" value={model.period.taxableGross} />
            <SummaryRow label="Tax Paid" value={model.period.taxPaid} />
            <SummaryRow label="Employee NI" value={model.period.employeeNi} />
            <SummaryRow label="Employer NI" value={model.period.employerNi} />
            <SummaryRow label="NET PAY" value={model.period.netPay} highlight />
          </section>
        </div>

        {employerLine ? (
          <p className="mt-8 text-center text-sm font-semibold" style={{ color: NAVY }}>
            {employerLine}
          </p>
        ) : null}
      </div>
    </div>
  )
}

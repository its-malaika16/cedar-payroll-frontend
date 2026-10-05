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
      className={`flex items-center justify-between px-4 py-2.5 text-sm`}
      style={{
        backgroundColor: highlight ? PALE : '#ffffff',
        color: NAVY,
      }}
    >
      <span className={highlight ? 'font-semibold' : ''}>{label}</span>
      <span className="font-semibold tabular-nums">{money(value)}</span>
    </div>
  )
}

export function PayslipDocument({ model }: { model: PayslipViewModel }) {
  const display = model.display
  const employerLine = [model.companyName, model.payeReference ? `Paye ref ${model.payeReference}` : '']
    .filter(Boolean)
    .join(' - ')
  const periodLines = [
    display.periodEndDate ? model.payslipFor : '',
    display.periodNumber && model.periodNumber ? `Pay period ${model.periodNumber}` : '',
    display.taxWeekEndDate ? model.payslipFor.replace('Payslip for ', 'Tax week ending ') : '',
    display.taxWeekNumber && model.taxWeekNumber ? `Tax week ${model.taxWeekNumber}` : '',
    display.taxMonthEndDate ? model.payslipFor.replace('Payslip for ', 'Tax month ending ') : '',
    display.taxMonthNumber && model.taxMonthNumber ? `Tax month ${model.taxMonthNumber}` : '',
    display.paymentDate && model.paymentDate ? `Payment date ${model.paymentDate}` : '',
  ].filter(Boolean)
  const infoFields = [
    display.employeeAddress ? { label: 'ADDRESS', value: model.address } : null,
    display.employeeDepartment ? { label: 'DEPARTMENT', value: model.department } : null,
    { label: 'TAX CODE', value: model.taxCode },
    { label: 'NI NUMBER', value: model.niNumber },
    display.employeeWorksNumber && model.worksNumber
      ? { label: 'WORKS NUMBER', value: model.worksNumber }
      : null,
    display.employeeDob && model.dateOfBirth ? { label: 'DATE OF BIRTH', value: model.dateOfBirth } : null,
    display.employeeGender && model.gender ? { label: 'GENDER', value: model.gender } : null,
    display.employeeDirector ? { label: 'DIRECTOR', value: model.director } : null,
    display.employeeNiTable && model.niTable ? { label: 'NI TABLE', value: model.niTable } : null,
    display.employeeStudentLoanPlan && model.studentLoanPlan
      ? { label: 'STUDENT LOAN', value: model.studentLoanPlan }
      : null,
    display.employeeStartDate && model.startDate ? { label: 'START DATE', value: model.startDate } : null,
    display.employeeLeaveDate && model.leaveDate ? { label: 'LEAVE DATE', value: model.leaveDate } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item))

  return (
    <div className="bg-white" style={{ minHeight: '297mm' }}>
      <div className="box-border px-[12mm] py-[12mm]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold leading-none" style={{ color: NAVY }}>
              {model.employeeName && model.employeeName !== '—'
                ? model.employeeName
                : 'Payslip'}
            </h2>
            {periodLines.map((line) => (
              <p key={line} className="mt-2 text-[15px] font-medium leading-snug" style={{ color: NAVY }}>
                {line}
              </p>
            ))}
          </div>
          {display.netPay ? (
            <div className="text-right">
              <p className="text-[11px] font-semibold tracking-[0.08em]" style={{ color: NAVY }}>
                NET PAY
              </p>
              <p className="mt-1 text-[28px] font-semibold leading-none" style={{ color: NAVY }}>
                {money(model.netPay)}
              </p>
            </div>
          ) : null}
        </div>

        <section className="mt-8 overflow-hidden rounded-[8px] border border-[#e4e7ec]">
          <div className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-white" style={{ backgroundColor: NAVY }}>
            PERSONAL INFORMATION
          </div>
          <div className="grid gap-x-8 gap-y-5 px-4 py-4 sm:grid-cols-2">
            {infoFields.map((field) => (
              <InfoField key={field.label} label={field.label} value={field.value} />
            ))}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[8px]">
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
            {display.employerNiYtd ? <SummaryRow label="Employer NI" value={model.ytd.employerNi} /> : null}
            <SummaryRow label="Student Loan" value={model.ytd.studentLoan} />
            <SummaryRow label="Pension Contributions" value={model.ytd.pension} />
            {display.employerPensionYtd ? (
              <SummaryRow label="Employer Pension" value={model.employerPensionYtd} />
            ) : null}
            {display.statutoryPayYtd ? <SummaryRow label="Statutory Pay" value={model.statutoryPayYtd} /> : null}
          </section>
          <section className="overflow-hidden rounded-[8px] border border-[#e4e7ec]">
            <div className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-white" style={{ backgroundColor: NAVY }}>
              THIS PAY PERIOD
            </div>
            <SummaryRow label="Taxable Gross Pay" value={model.period.taxableGross} />
            <SummaryRow label="Tax Paid" value={model.period.taxPaid} />
            <SummaryRow label="Employee NI" value={model.period.employeeNi} />
            {display.employerNi ? <SummaryRow label="Employer NI" value={model.period.employerNi} /> : null}
            {display.employerPension ? (
              <SummaryRow label="Employer Pension" value={model.period.employerPension} />
            ) : null}
            {display.netPay ? <SummaryRow label="NET PAY" value={model.period.netPay} highlight /> : null}
          </section>
        </div>

        {display.notes && model.notes ? (
          <p className="mt-5 text-sm" style={{ color: NAVY }}>
            Notes: {model.notes}
          </p>
        ) : null}

        {employerLine ? (
          <p className="mt-8 text-center text-sm font-semibold" style={{ color: NAVY }}>
            {employerLine}
          </p>
        ) : null}
        {display.employerAddress && model.employerAddress ? (
          <p className="mt-2 text-center text-xs" style={{ color: NAVY }}>
            {model.employerAddress}
          </p>
        ) : null}
      </div>
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, User } from 'lucide-react'
import { rtiApi } from '../../../api'
import { Alert, Button, Loading, Select } from '../../../components/ui'
import { formatDate, formatLongDate, money } from '../../../lib/format'
import type {
  AdditionalFpsPayload,
  EpsPayload,
  FpsEmployee,
  FpsPayload,
  RtiEmployer,
  RtiSubmission,
} from './rtiTypes'
import { LATE_REPORTING_REASONS, SUBMISSION_TYPE_SHORT, isRtiEditable } from './rtiTypes'

function isAfterPayDate(payDate?: string | Date | null) {
  if (!payDate) return false
  const date = payDate instanceof Date ? payDate : new Date(payDate)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  const pay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return now > pay
}

function timestamp(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.toLocaleDateString('en-GB')} at ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function PersonBadge() {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e9eef6] text-navy">
      <User size={22} strokeWidth={1.8} />
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#eee] py-2 last:border-0">
      <span className="text-sm font-medium text-navy/70">{label}</span>
      <span className="text-right text-sm font-semibold text-navy">{value ?? '—'}</span>
    </div>
  )
}

function SectionCard({
  title,
  icon = true,
  children,
  className = '',
}: {
  title: string
  icon?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[16px] border border-[#d9d9d9]/80 bg-white p-6 ${className}`}>
      <div className="mb-3 flex items-center gap-3">
        {icon ? <PersonBadge /> : null}
        <h3 className="text-lg font-semibold text-navy">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StatusTimeline({ submission }: { submission: RtiSubmission }) {
  // Enforce display order: created < submitted < accepted/rejected
  const created = submission.created_at ? new Date(submission.created_at) : null
  const submittedRaw = submission.submitted_at ? new Date(submission.submitted_at) : null
  const outcomeRaw =
    submission.status === 'REJECTED'
      ? submission.rejected_at
        ? new Date(submission.rejected_at)
        : null
      : submission.accepted_at
        ? new Date(submission.accepted_at)
        : null

  const submitted =
    created && submittedRaw && submittedRaw.getTime() <= created.getTime()
      ? new Date(created.getTime() + 60_000)
      : submittedRaw

  const outcome =
    submitted && outcomeRaw && outcomeRaw.getTime() <= submitted.getTime()
      ? new Date(submitted.getTime() + 60_000)
      : created && !submitted && outcomeRaw && outcomeRaw.getTime() <= created.getTime()
        ? new Date(created.getTime() + 120_000)
        : outcomeRaw

  return (
    <div className="w-full max-w-[360px] rounded-[16px] border border-[#d9d9d9]/80 bg-white p-5">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee] py-2.5">
        <span className="text-sm font-semibold text-navy">Created</span>
        <span className="text-sm font-medium text-navy/70">
          {timestamp(created?.toISOString())}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 border-b border-[#eee] py-2.5">
        <span className="text-sm font-semibold text-navy">Sent to HMRC</span>
        <span className="text-sm font-medium text-navy/70">
          {timestamp(submitted?.toISOString())}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 py-2.5">
        <span className="text-sm font-semibold text-navy">
          {submission.status === 'REJECTED' ? 'Rejected by HMRC' : 'Accepted by HMRC'}
        </span>
        <span className="text-sm font-medium text-navy/70">
          {timestamp(outcome?.toISOString())}
        </span>
      </div>
    </div>
  )
}

function EmployerCard({ employer }: { employer: RtiEmployer }) {
  return (
    <SectionCard title="Employer Details">
      <div className="pl-[60px]">
        <DetailRow label="Name" value={employer.company_name} />
        <DetailRow label="PAYE Reference" value={employer.paye_reference} />
        <DetailRow label="Accounts Office Reference" value={employer.accounts_office_reference} />
      </div>
    </SectionCard>
  )
}

function frequencyPeriod(freq?: string | null) {
  const value = (freq ?? '').toUpperCase()
  if (value.includes('WEEK')) return 'week'
  if (value.includes('MONTH')) return 'month'
  if (value.includes('FORTNIGHT')) return 'fortnight'
  if (value.includes('QUARTER')) return 'quarter'
  return 'period'
}

function EmployeeCard({
  employee,
  showLateReason = false,
}: {
  employee: FpsEmployee
  showLateReason?: boolean
}) {
  const seq = String(employee.sequence).padStart(2, '0')
  return (
    <div className="rounded-[16px] border border-[#d9d9d9]/80 bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        <PersonBadge />
        <h3 className="text-lg font-semibold text-navy">
          Employee {seq} - {employee.full_name}
        </h3>
      </div>
      <div className="pl-[60px]">
        <h4 className="mb-2 text-sm font-semibold text-navy">Employee Details</h4>
        <DetailRow label="National Insurance number" value={employee.ni_number} />
        <DetailRow label="Address line 1" value={employee.address_line_1} />
        <DetailRow label="Address line 2" value={employee.address_line_2} />
        <DetailRow label="Postcode" value={employee.postcode} />
        <DetailRow label="Date of birth" value={formatDate(employee.dob)} />
        <DetailRow label="Gender" value={employee.gender} />
        <DetailRow label="Payroll ID" value={employee.payroll_id} />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[12px] border border-[#eee] bg-cream/40 p-4">
            <h4 className="mb-2 text-sm font-semibold text-navy">Payment</h4>
            <DetailRow label="Payment frequency" value={employee.payment?.pay_frequency} />
            <DetailRow label="Payment date" value={formatDate(employee.payment?.pay_date)} />
            <DetailRow
              label="Number of periods covered"
              value={employee.payment?.periods_covered ?? 1}
            />
            <DetailRow
              label="HMRC month number"
              value={employee.payment?.hmrc_month ?? '—'}
            />
            {showLateReason ? (
              <DetailRow
                label="Late reporting reason"
                value={employee.late_reporting_reason || 'No reason provided'}
              />
            ) : null}
            <DetailRow
              label="Contracted hours per week"
              value={employee.payment?.contracted_hours_per_week}
            />
            <DetailRow label="Tax code" value={employee.payment?.tax_code} />
            <DetailRow label="Taxable pay" value={money(employee.payment?.taxable_pay)} />
            <DetailRow label="Employer NICs" value={money(employee.payment?.employer_nic)} />
            <DetailRow label="Employee NICs" value={money(employee.payment?.employee_nic)} />
          </div>
          <div className="rounded-[12px] border border-[#eee] bg-cream/40 p-4">
            <h4 className="mb-2 text-sm font-semibold text-navy">Year to date</h4>
            <DetailRow label="Taxable pay" value={money(employee.year_to_date?.taxable_pay)} />
            <DetailRow label="Tax" value={money(employee.year_to_date?.tax)} />
            <DetailRow
              label="Employee Pension contribution"
              value={money(employee.year_to_date?.employee_pension ?? 0)}
            />
          </div>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-navy">
            NI Letters and Values (Year to Date)
          </h4>
          <div className="overflow-x-auto rounded-[12px] border border-[#eee]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-cream text-xs font-semibold text-navy/70">
                <tr>
                  <th className="px-3 py-2">Table</th>
                  <th className="px-3 py-2">Gross earnings</th>
                  <th className="px-3 py-2">At LEL</th>
                  <th className="px-3 py-2">From LEL to PT</th>
                  <th className="px-3 py-2">From PT to UEL</th>
                  <th className="px-3 py-2">Employer NICs</th>
                  <th className="px-3 py-2">Employee NICs</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-semibold text-navy">
                  <td className="px-3 py-2">
                    {employee.ni_values?.table ?? employee.payment?.ni_category ?? '—'}
                  </td>
                  <td className="px-3 py-2">{money(employee.ni_values?.gross_earnings)}</td>
                  <td className="px-3 py-2">{money(employee.ni_values?.at_lel)}</td>
                  <td className="px-3 py-2">{money(employee.ni_values?.lel_to_pt)}</td>
                  <td className="px-3 py-2">{money(employee.ni_values?.pt_to_uel)}</td>
                  <td className="px-3 py-2">{money(employee.ni_values?.employer_nics)}</td>
                  <td className="px-3 py-2">{money(employee.ni_values?.employee_nics)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function FpsDetail({
  submission,
  payload,
  lateReason,
}: {
  submission: RtiSubmission
  payload: FpsPayload
  lateReason?: string | null
}) {
  const period = frequencyPeriod(payload.period.pay_frequency)
  const scheduleName = payload.period.schedule_name
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-[360px]">
          <h2 className="text-4xl font-bold text-navy">FPS</h2>
          <p className="mt-3 text-sm font-medium text-navy/70">
            Contains the details of {payload.employee_count} employee
            {payload.employee_count === 1 ? '' : 's'} paid on{' '}
            {formatLongDate(payload.period.pay_date)}, for the {period} ending{' '}
            {formatLongDate(payload.period.period_end_date)}
            {scheduleName ? ` on the ${scheduleName} schedule` : ''}.
          </p>
          {submission.status === 'DRAFT' ? (
            <p className="mt-2 text-xs font-semibold text-navy/55">
              Draft — more employees can be added as their payslips are finalised.
            </p>
          ) : null}
          {payload.final_submission_for_year ? (
            <p className="mt-2 text-xs font-semibold text-brand">
              Final submission for the tax year
            </p>
          ) : null}
          {lateReason ? (
            <p className="mt-2 text-xs font-medium text-navy/70">
              Late reporting reason: {lateReason}
            </p>
          ) : null}
        </div>
        <StatusTimeline submission={submission} />
      </div>

      <EmployerCard employer={payload.employer} />

      {payload.employees.map((employee) => (
        <EmployeeCard key={employee.employee_id} employee={employee} />
      ))}
    </div>
  )
}

function epsTimestamp(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  return `${day} @ ${time}`
}

function formatPaye(value?: string | null) {
  if (!value) return '—'
  return value.replace(/\s*\/\s*/, ' / ')
}

function EpsRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-[#d9d9d9] py-3 sm:grid-cols-[minmax(220px,38%)_1fr] sm:items-baseline sm:gap-8">
      <span className="text-sm italic text-navy/55">{label}</span>
      <span className="text-sm font-bold text-navy">{value ?? '—'}</span>
    </div>
  )
}

function EpsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="pt-2">
      <h3 className="border-b border-[#d9d9d9] pb-3 text-xl font-semibold text-navy">{title}</h3>
      <div>{children}</div>
    </section>
  )
}

function EpsDetail({ submission, payload }: { submission: RtiSubmission; payload: EpsPayload }) {
  const d = payload.declarations
  const transactionId =
    payload.transaction_id || submission.hmrc_submission_id || '—'
  const stamp = submission.submitted_at ?? submission.created_at

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-4xl font-bold text-navy">EPS</h2>
        <p className="mt-3 text-sm font-medium text-navy/70">
          Employer Payment Summary for tax year {payload.tax_year_start}/{payload.tax_year_end}.
        </p>
      </div>

      <div className="rounded-[16px] border border-[#d9d9d9]/80 bg-white px-8 py-6">
        <EpsSection title="Employer Details">
          <EpsRow label="Name" value={payload.employer.company_name} />
          <EpsRow label="PAYE Reference" value={formatPaye(payload.employer.paye_reference)} />
          <EpsRow
            label="Accounts Office Reference"
            value={payload.employer.accounts_office_reference}
          />
        </EpsSection>

        {d.no_payment.included ? (
          <EpsSection title="No Payment">
            <EpsRow label="No employees paid this period" value="Yes" />
            <EpsRow label="No payment from date" value={formatLongDate(d.no_payment.start_date)} />
            <EpsRow label="No payment to date" value={formatLongDate(d.no_payment.end_date)} />
          </EpsSection>
        ) : null}

        {d.inactivity.included ? (
          <EpsSection title="Period of Inactivity">
            <EpsRow
              label="Period of inactivity from date"
              value={formatLongDate(d.inactivity.start_date)}
            />
            <EpsRow
              label="Period of inactivity to date"
              value={formatLongDate(d.inactivity.end_date)}
            />
          </EpsSection>
        ) : null}

        {d.employment_allowance.included ? (
          <EpsSection title="Employment Allowance">
            <EpsRow
              label="Indication"
              value={
                d.employment_allowance.eligible
                  ? 'Employer is eligible for Employment Allowance'
                  : 'Employer is not eligible for Employment Allowance'
              }
            />
          </EpsSection>
        ) : null}

        {d.recoverable_amounts.included ? (
          <EpsSection title="Recoverable Amounts">
            <EpsRow label="Year to date recoverable amounts" value="Included" />
            <EpsRow
              label="Tax period"
              value={formatLongDate(d.recoverable_amounts.tax_period)}
            />
          </EpsSection>
        ) : null}

        {d.final_submission.included ? (
          <EpsSection title="Final Submission">
            <EpsRow label="Final submission for year" value="Yes" />
            {d.final_submission.scheme_ceased ? (
              <EpsRow
                label="Date PAYE scheme ceased"
                value={formatLongDate(d.final_submission.scheme_ceased_date)}
              />
            ) : null}
          </EpsSection>
        ) : null}

        <EpsSection title="Submission Information">
          <EpsRow label="Transaction ID" value={transactionId} />
          <EpsRow label="Timestamp" value={epsTimestamp(stamp)} />
        </EpsSection>
      </div>
    </div>
  )
}

function AdditionalFpsDetail({
  submission,
  payload,
}: {
  submission: RtiSubmission
  payload: AdditionalFpsPayload
}) {
  const period = frequencyPeriod(payload.period?.pay_frequency)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-[360px]">
          <h2 className="text-4xl font-bold text-navy">Additional FPS</h2>
          <p className="mt-3 text-sm font-medium text-navy/70">
            Contains the details of {payload.employee_count} employee
            {payload.employee_count === 1 ? '' : 's'}
            {payload.period?.pay_date
              ? ` paid on ${formatLongDate(payload.period.pay_date)}, for the ${period} ending ${formatLongDate(payload.period.period_end_date)}`
              : ` for tax year ${payload.tax_year_start}/${payload.tax_year_end}`}
            .
          </p>
        </div>
        <StatusTimeline submission={submission} />
      </div>

      <EmployerCard employer={payload.employer} />

      {payload.employees.map((employee) => (
        <EmployeeCard key={employee.employee_id} employee={employee} showLateReason />
      ))}
    </div>
  )
}

export function SubmissionDetail({
  companyId,
  submissionId,
  canSubmit,
  canDelete,
  onDelete,
}: {
  companyId: string
  submissionId: string
  canSubmit: boolean
  canDelete?: boolean
  onDelete?: () => void
}) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['rti', companyId, submissionId],
    queryFn: () => rtiApi.get(companyId, submissionId),
    enabled: Boolean(companyId && submissionId),
  })

  const submit = useMutation({
    mutationFn: (late_reporting_reason?: string) =>
      rtiApi.submit(companyId, submissionId, { late_reporting_reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['rti', companyId, submissionId] })
    },
  })
  const saveReason = useMutation({
    mutationFn: (late_reporting_reason: string) =>
      rtiApi.update(companyId, submissionId, { late_reporting_reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['rti', companyId, submissionId] })
    },
  })

  const submission = query.data?.data as RtiSubmission | undefined
  const fpsPayload = submission?.payload?.kind === 'FPS' ? submission.payload : null
  const [lateReason, setLateReason] = useState('')

  useEffect(() => {
    setLateReason(fpsPayload?.late_submission?.reason ?? '')
  }, [fpsPayload?.late_submission?.reason, submissionId])

  if (query.isLoading) return <Loading />
  if (query.isError) {
    return (
      <Alert>
        {query.error instanceof Error ? query.error.message : 'Could not load submission'}
      </Alert>
    )
  }

  if (!submission) return <Alert>Submission not found</Alert>

  const payload = submission.payload
  const shortLabel = SUBMISSION_TYPE_SHORT[submission.submission_type]
  const editable = isRtiEditable(submission.status)
  const lateRequired = Boolean(
    fpsPayload && isAfterPayDate(fpsPayload.period.pay_date),
  )
  const canSend =
    canSubmit &&
    editable &&
    (!lateRequired || Boolean(lateReason.trim()))

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
          RTI &nbsp;›&nbsp; {shortLabel}
        </p>
        <div className="flex items-center gap-3">
          {submission.status === 'ACCEPTED' ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> Accepted by HMRC
            </span>
          ) : null}
          {submission.status === 'SUBMITTED' ? (
            <span className="text-sm font-semibold text-amber-700">Sent to HMRC</span>
          ) : null}
          {submission.status === 'REJECTED' ? (
            <span className="text-sm font-semibold text-brand">Rejected by HMRC</span>
          ) : null}
          {canSubmit && editable ? (
            <Button
              onClick={() => submit.mutate(lateReason.trim() || undefined)}
              disabled={submit.isPending || !canSend}
            >
              {submit.isPending ? 'Submitting…' : 'Submit to HMRC'}
            </Button>
          ) : null}
          {canDelete && editable && onDelete ? (
            <Button variant="danger" type="button" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {submit.isError ? (
        <Alert>
          {submit.error instanceof Error ? submit.error.message : 'Could not submit'}
        </Alert>
      ) : null}
      {saveReason.isError ? (
        <Alert>
          {saveReason.error instanceof Error
            ? saveReason.error.message
            : 'Could not save the late reporting reason'}
        </Alert>
      ) : null}

      {lateRequired && editable ? (
        <div className="rounded-[16px] border border-[#d9d9d9]/80 bg-white p-6">
          <h3 className="text-lg font-semibold text-navy">Late reporting reason</h3>
          <p className="mt-2 text-sm text-navy/70">
            The pay date for this schedule has passed. HMRC requires a reason before this FPS can
            be submitted.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-sm font-medium text-navy">
              Reason
              <Select
                value={lateReason}
                onChange={(event) => setLateReason(event.target.value)}
              >
                <option value="">Select a reason</option>
                {LATE_REPORTING_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </Select>
            </label>
            <Button
              onClick={() => saveReason.mutate(lateReason)}
              disabled={saveReason.isPending || !lateReason.trim()}
            >
              {saveReason.isPending ? 'Saving…' : 'Save reason'}
            </Button>
          </div>
        </div>
      ) : null}

      {submission.status === 'REJECTED' && submission.response_message ? (
        <Alert>HMRC rejected this submission: {submission.response_message}</Alert>
      ) : null}

      {!payload ? (
        <Alert tone="info">
          This submission was generated before detailed data was stored, so there is nothing to
          preview. Generate a new submission to see full details.
        </Alert>
      ) : payload.kind === 'FPS' ? (
        <FpsDetail
          submission={submission}
          payload={payload}
          lateReason={payload.late_submission?.reason}
        />
      ) : payload.kind === 'EPS' ? (
        <EpsDetail submission={submission} payload={payload} />
      ) : (
        <AdditionalFpsDetail submission={submission} payload={payload} />
      )}
    </div>
  )
}

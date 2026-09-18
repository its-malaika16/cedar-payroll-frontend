import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Ban, CalendarDays, ChevronLeft, CircleAlert, UserX } from 'lucide-react'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Loading } from '../../components/ui'
import { formatDate, formatLongDate } from '../../lib/format'
import type { PensionAssessment } from '../../types'

type View = 'home' | 'enrol' | 'optout' | 'cease' | 'switch'
type SchemeKind = 'COMPANY' | 'EXTERNAL'
type AssessmentKind = 'ELIGIBLE' | 'OPT_IN'

const ASSESSMENT_OPTIONS: { value: AssessmentKind; label: string }[] = [
  { value: 'ELIGIBLE', label: 'Enrol in scheme as eligible job holder' },
  { value: 'OPT_IN', label: 'Opt-in to scheme as non-eligible job holder' },
]

const TAX_RELIEF = [
  {
    value: 'NO_TAX_RELIEF',
    label: 'No tax relief',
    description: 'Employee is not entitled to tax relief, a full contribution is deducted.',
  },
  {
    value: 'RELIEF_AT_SOURCE',
    label: 'Relief at source',
    description:
      'Employee contribution is deducted after taking tax and National Insurance. Pension provider adds tax relief to the pension pot at the basic rate. The amount on the payslip is the contribution only, not including tax relief.',
  },
] as const

export function EmployeePensionPage() {
  const { companyId } = useAuth()
  const { employeeId } = useParams()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('home')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCriteria, setShowCriteria] = useState(false)
  const [enrolmentDate, setEnrolmentDate] = useState('')
  const [taxMethod, setTaxMethod] = useState('RELIEF_AT_SOURCE')
  const [schemeKind, setSchemeKind] = useState<SchemeKind>('COMPANY')
  const [assessmentKind, setAssessmentKind] = useState<AssessmentKind>('ELIGIBLE')
  const [optOutDate, setOptOutDate] = useState('')
  const [optOutReference, setOptOutReference] = useState('')
  const [refund, setRefund] = useState(true)
  const [cessationDate, setCessationDate] = useState('')
  const [alreadyEnrolled, setAlreadyEnrolled] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['employee-pension', companyId, employeeId],
    queryFn: () => employeesApi.assessPension(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })

  const data = query.data?.data as PensionAssessment | undefined

  useEffect(() => {
    setView('home')
    setError(null)
    setShowCriteria(false)
    setAlreadyEnrolled(null)
    setAssessmentKind('ELIGIBLE')
  }, [employeeId])

  useEffect(() => {
    if (!data) return
    setEnrolmentDate(data.enrolment?.enrolment_date || data.default_enrolment_date)
    setOptOutDate(data.default_enrolment_date)
    setCessationDate(data.period_end)
    setTaxMethod(data.enrolment?.tax_method === 'NO_TAX_RELIEF' ? 'NO_TAX_RELIEF' : 'RELIEF_AT_SOURCE')
    setSchemeKind(data.enrolment?.managed_externally ? 'EXTERNAL' : 'COMPANY')
  }, [data])

  const name = data?.employee.name ?? 'This employee'
  const object = data?.pronouns.object ?? 'them'
  const possessive = data?.pronouns.possessive ?? 'their'

  async function run(action: () => Promise<{ message: string }>) {
    if (!companyId || !employeeId) return
    setError(null)
    setSaving(true)
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['employee-pension', companyId, employeeId] })
      await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
      setView('home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update pension')
    } finally {
      setSaving(false)
    }
  }

  function currentSchemeKind(): SchemeKind {
    return data?.enrolment?.managed_externally ? 'EXTERNAL' : 'COMPANY'
  }

  function confirmSchemeChange(next: SchemeKind) {
    if (data?.enrolment?.is_enrolled && currentSchemeKind() === next) {
      const group =
        next === 'EXTERNAL'
          ? '[Enrolled in other qualifying scheme]'
          : data.enrolment.group_name || data.company_scheme.group_name
      setAlreadyEnrolled(`${name} is already enrolled in the scheme (${group}).`)
      return false
    }
    return true
  }

  if (!employeeId) {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center">
        <p className="text-[32px] font-medium text-muted">Select an employee</p>
      </div>
    )
  }

  if (query.isLoading || !data) {
    return query.isLoading ? <Loading /> : <Alert>Could not load pension assessment</Alert>
  }

  const enrolled = data.status === 'enrolled' || data.status === 'switched'
  const showEnrolCards = data.status === 'eligible' || data.status === 'reenrol_due'

  return (
    <div className="pb-8">
      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <h2 className="text-[22px] font-semibold text-navy">
        {name} . {monthEnding(data.period_end, data.period_label)}
      </h2>

      {view === 'enrol' ? (
        <EnrolPanel
          data={data}
          name={name}
          object={object}
          enrolmentDate={enrolmentDate}
          taxMethod={taxMethod}
          schemeKind={schemeKind}
          assessmentKind={assessmentKind}
          saving={saving}
          showCriteria={showCriteria}
          onToggleCriteria={() => setShowCriteria((open) => !open)}
          onDate={setEnrolmentDate}
          onTax={setTaxMethod}
          onScheme={setSchemeKind}
          onAssessment={setAssessmentKind}
          onCancel={() => setView('home')}
          onContinue={() => {
            if (data.enrolment?.is_enrolled && !confirmSchemeChange(schemeKind)) return
            void run(() =>
              employeesApi.enrolPension(companyId!, employeeId, {
                enrolment_date: enrolmentDate,
                tax_method: taxMethod,
                scheme_kind: schemeKind,
              }),
            )
          }}
        />
      ) : view === 'optout' ? (
        <>
          <StatusCard title="Enrolled">
            {name} is enrolled in a qualifying pension scheme. You must keep making contributions on {possessive}{' '}
            behalf.
          </StatusCard>
          <EnrolmentDetails data={data} />
          <ActionPanel
            title="Opt out of auto enrolment"
            intro="Select this option if you or your pension provider receive an opt-out notice. Further contributions will stop and the employee will be removed from pension enrolment."
            onCancel={() => setView('home')}
            onContinue={() =>
              run(() =>
                employeesApi.optOutPension(companyId!, employeeId, {
                  opt_out_date: optOutDate,
                  opt_out_reference: optOutReference || undefined,
                  refund,
                }),
              )
            }
            saving={saving}
          >
            <label className="flex items-start gap-3 text-sm text-navy">
              <input
                type="checkbox"
                checked={refund}
                onChange={(event) => setRefund(event.target.checked)}
                className="mt-1 size-4 accent-navy"
              />
              <span>
                Refund — Create an addition on {name}’s month {data.tax_month} payslip to refund contributions to date
                (check with your pension provider if unsure)
              </span>
            </label>
            <FieldRow label="Opt-out date">
              <DateField value={optOutDate} onChange={setOptOutDate} />
            </FieldRow>
            <FieldRow label="Opt-out reference">
              <input
                value={optOutReference}
                onChange={(event) => setOptOutReference(event.target.value)}
                placeholder="Enter reference only if employee has given you a paper opt out form"
                className={inputClass}
              />
            </FieldRow>
          </ActionPanel>
        </>
      ) : view === 'cease' ? (
        <>
          <StatusCard title="Enrolled">
            {name} is enrolled in a qualifying pension scheme. You must keep making contributions on {possessive}{' '}
            behalf.
          </StatusCard>
          <EnrolmentDetails data={data} />
          <ActionPanel
            title="Cease active membership"
            intro="Ceasing active membership will stop any further pension deductions."
            onCancel={() => setView('home')}
            onContinue={() =>
              run(() =>
                employeesApi.ceasePension(companyId!, employeeId, {
                  cessation_date: cessationDate,
                }),
              )
            }
            saving={saving}
          >
            <FieldRow label="Cessation date">
              <DateField value={cessationDate} onChange={setCessationDate} />
            </FieldRow>
          </ActionPanel>
        </>
      ) : view === 'switch' ? (
        <>
          <StatusCard title={data.status === 'switched' ? 'Switched' : 'Enrolled'}>
            {name} is enrolled in a qualifying pension scheme. You must keep making contributions on {possessive}{' '}
            behalf.
          </StatusCard>
          <ActionPanel
            title="Switch to a different pension scheme"
            onCancel={() => setView('home')}
            onContinue={() => {
              if (!confirmSchemeChange(schemeKind)) return
              void run(() =>
                employeesApi.switchPension(companyId!, employeeId, {
                  enrolment_date: enrolmentDate,
                  tax_method: taxMethod,
                  scheme_kind: schemeKind,
                }),
              )
            }}
            saving={saving}
          >
            <SchemeFields
              data={data}
              enrolmentDate={enrolmentDate}
              schemeKind={schemeKind}
              taxMethod={taxMethod}
              onDate={setEnrolmentDate}
              onScheme={setSchemeKind}
              onTax={setTaxMethod}
            />
          </ActionPanel>
        </>
      ) : enrolled ? (
        <EnrolledHome
          data={data}
          name={name}
          onOptOut={() => setView('optout')}
          onCease={() => setView('cease')}
          onSwitch={() => setView('switch')}
        />
      ) : showEnrolCards ? (
        <EligibleHome
          data={data}
          name={name}
          object={object}
          showCriteria={showCriteria}
          onToggleCriteria={() => setShowCriteria((open) => !open)}
          onEnrol={() => setView('enrol')}
          onPostpone={() => run(() => employeesApi.postponePension(companyId!, employeeId, { months: 3 }))}
          onExempt={() => run(() => employeesApi.exemptPension(companyId!, employeeId))}
        />
      ) : (
        <StatusHome
          data={data}
          name={name}
          object={object}
          showCriteria={showCriteria}
          onToggleCriteria={() => setShowCriteria((open) => !open)}
          onStart={() => setView('enrol')}
        />
      )}

      {alreadyEnrolled ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="w-full max-w-md rounded-[10px] bg-white p-6 text-center shadow-lg">
            <CircleAlert className="mx-auto text-brand" size={36} />
            <p className="mt-4 text-sm font-medium text-navy">{alreadyEnrolled}</p>
            <button
              type="button"
              className="mt-5 rounded-[8px] bg-navy px-6 py-2 text-sm font-medium text-white"
              onClick={() => setAlreadyEnrolled(null)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EnrolledHome({
  data,
  name,
  onOptOut,
  onCease,
  onSwitch,
}: {
  data: PensionAssessment
  name: string
  onOptOut: () => void
  onCease: () => void
  onSwitch: () => void
}) {
  const switched = data.status === 'switched' || data.enrolment?.managed_externally
  return (
    <>
      <StatusCard title={switched ? 'Switched' : 'Enrolled'}>
        {name} is enrolled in a qualifying pension scheme.
        {switched
          ? ' If you receive a valid opt-out notice, you may be required to refund any contributions paid.'
          : ' Employee (5%) and employer (3%) contributions are calculated on qualifying earnings only when pay is above the £10,000 trigger; otherwise pension amounts are zero.'}
      </StatusCard>
      <EnrolmentDetails data={data} />
      <Card title="Available Actions">
        <div className="grid gap-4 md:grid-cols-3">
          <ActionTile
            icon={<UserX size={22} />}
            title="Opt out of auto enrolment"
            body="Select this option if you or your pension provider receive an opt-out notice."
            action="Opt out"
            onClick={onOptOut}
          />
          <ActionTile
            icon={<Ban size={22} />}
            title="Cease active membership"
            body="Stop pension deductions for this employee."
            action="Cease membership"
            onClick={onCease}
          />
          <ActionTile
            icon={<ArrowLeftRight size={22} />}
            title="Switch to a different scheme"
            body="Switch the employee to a different scheme."
            action="Switch scheme"
            onClick={onSwitch}
          />
        </div>
      </Card>
    </>
  )
}

function EligibleHome({
  data,
  name,
  object,
  showCriteria,
  onToggleCriteria,
  onEnrol,
  onPostpone,
  onExempt,
}: {
  data: PensionAssessment
  name: string
  object: string
  showCriteria: boolean
  onToggleCriteria: () => void
  onEnrol: () => void
  onPostpone: () => void
  onExempt: () => void
}) {
  return (
    <>
      <StatusCard title="It’s enrolment time.">
        {data.reasons.earnings ? (
          <>
            {name} is an{' '}
            <button type="button" className="font-semibold text-navy underline-offset-2 hover:underline" onClick={onToggleCriteria}>
              eligible jobholder
            </button>
            . You must enrol {object} into a qualifying scheme and make contributions on {data.pronouns.possessive} behalf.
          </>
        ) : (
          <>
            {name} can be enrolled in a qualifying scheme.{' '}
            <button type="button" className="font-semibold text-navy underline-offset-2 hover:underline" onClick={onToggleCriteria}>
              Pension contributions
            </button>{' '}
            of 5% (employee) and 3% (employer) are calculated only when pay is above the £10,000 trigger. Below that, pension amounts are zero.
          </>
        )}
        {data.status === 'reenrol_due'
          ? ` Three years have passed since the last opt-out. You must automatically re-enrol ${object}.`
          : ''}
      </StatusCard>
      {showCriteria ? <CriteriaPanel data={data} /> : null}
      <Card title="Available Actions">
        <div className="grid gap-4 md:grid-cols-3">
          <ActionTile
            title="Enrol in a qualifying scheme"
            body="Select this option to choose a pension scheme in which to enrol this employee."
            action="Enrol"
            solid
            onClick={onEnrol}
          />
          <ActionTile
            title="Postpone assessment"
            body="Select this option to defer assessment of this employee for up to three months."
            action="Postpone"
            onClick={onPostpone}
          />
          <ActionTile
            title="Mark as exempt from enrolment"
            body="Select this option if the employee is exempt or otherwise excluded from automatic enrolment."
            action="Exempt"
            onClick={onExempt}
          />
        </div>
      </Card>
    </>
  )
}

function StatusHome({
  data,
  name,
  object,
  showCriteria,
  onToggleCriteria,
  onStart,
}: {
  data: PensionAssessment
  name: string
  object: string
  showCriteria: boolean
  onToggleCriteria: () => void
  onStart: () => void
}) {
  if (data.status === 'opted_out') {
    return (
      <>
        <StatusCard title="Opted Out">
          {name} is opted out of pension scheme contributions.
          <p className="mt-3 text-sm text-[#607080]">Opt-out Date: {formatDate(data.enrolment?.opt_out_date)}</p>
        </StatusCard>
        <ReassessCard onStart={onStart} />
      </>
    )
  }
  if (data.status === 'ceased') {
    return (
      <>
        <StatusCard title="Ceased membership">
          {name} is no longer enrolled in a pension scheme.
          <p className="mt-3 text-sm text-[#607080]">Cessation Date: {formatDate(data.enrolment?.cessation_date)}</p>
        </StatusCard>
        <ReassessCard onStart={onStart} />
      </>
    )
  }

  const title =
    data.status === 'postponed'
      ? 'Assessment postponed'
      : data.status === 'exempt'
        ? 'Exempt from enrolment'
        : 'Not an eligible jobholder'
  const body =
    data.status === 'postponed'
      ? `${name}’s assessment is postponed until ${formatLongDate(data.enrolment?.postponement_end_date)}. Pension contributions will not be calculated until you enrol ${object}.`
      : data.status === 'exempt'
        ? `${name} is marked as exempt or otherwise excluded from automatic enrolment. Pension contributions are not calculated.`
        : `${name} is not an eligible jobholder, so you are not required to auto-enrol ${object}. Pension contributions are not calculated on the payslip.`

  return (
    <>
      <StatusCard title={title}>{body}</StatusCard>
      {data.status === 'not_eligible' ? (
        <button type="button" className="mt-3 text-sm font-medium text-navy underline-offset-2 hover:underline" onClick={onToggleCriteria}>
          View eligibility criteria
        </button>
      ) : null}
      {showCriteria ? <CriteriaPanel data={data} /> : null}
      {data.status === 'postponed' || data.status === 'exempt' ? <ReassessCard onStart={onStart} /> : null}
    </>
  )
}

function EnrolPanel({
  data,
  name,
  object,
  enrolmentDate,
  taxMethod,
  schemeKind,
  assessmentKind,
  saving,
  showCriteria,
  onToggleCriteria,
  onDate,
  onTax,
  onScheme,
  onAssessment,
  onCancel,
  onContinue,
}: {
  data: PensionAssessment
  name: string
  object: string
  enrolmentDate: string
  taxMethod: string
  schemeKind: SchemeKind
  assessmentKind: AssessmentKind
  saving: boolean
  showCriteria: boolean
  onToggleCriteria: () => void
  onDate: (value: string) => void
  onTax: (value: string) => void
  onScheme: (value: SchemeKind) => void
  onAssessment: (value: AssessmentKind) => void
  onCancel: () => void
  onContinue: () => void
}) {
  return (
    <>
      <StatusCard title="It’s enrolment time.">
        {data.reasons.earnings ? (
          <>
            {name} is an{' '}
            <button type="button" className="font-semibold text-navy underline-offset-2 hover:underline" onClick={onToggleCriteria}>
              eligible jobholder
            </button>
            . You must enrol {object} into a qualifying scheme and make contributions on {data.pronouns.possessive} behalf.
          </>
        ) : (
          <>
            {name} can be enrolled in a qualifying scheme.{' '}
            <button type="button" className="font-semibold text-navy underline-offset-2 hover:underline" onClick={onToggleCriteria}>
              Pension contributions
            </button>{' '}
            of 5% (employee) and 3% (employer) are calculated only when pay is above the £10,000 trigger. Below that, pension amounts are zero.
          </>
        )}
      </StatusCard>
      {showCriteria ? <CriteriaPanel data={data} /> : null}
      <ActionPanel
        title="Enrol in a qualifying scheme"
        onCancel={onCancel}
        onContinue={onContinue}
        saving={saving}
      >
        <FieldRow label="Assessment">
          <select
            className={inputClass}
            value={assessmentKind}
            onChange={(event) => onAssessment(event.target.value as AssessmentKind)}
          >
            {ASSESSMENT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FieldRow>
        <SchemeFields
          data={data}
          enrolmentDate={enrolmentDate}
          schemeKind={schemeKind}
          taxMethod={taxMethod}
          onDate={onDate}
          onScheme={onScheme}
          onTax={onTax}
          showHelp
        />
      </ActionPanel>
    </>
  )
}

function EnrolmentDetails({ data }: { data: PensionAssessment }) {
  const enrolment = data.enrolment
  const external = enrolment?.managed_externally
  return (
    <Card title="Enrolment Details">
      <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
        <Detail label="Enrolment Date" value={formatDate(enrolment?.enrolment_date)} />
        {external ? (
          <Detail label="Pension scheme provider" value="[Enrolled in other qualifying scheme]" />
        ) : (
          <>
            <Detail
              label="Employer reference"
              value={enrolment?.scheme_reference || data.company_scheme.employer_id || '—'}
            />
            <Detail
              label="Pension scheme provider"
              value={enrolment?.provider_name || data.company_scheme.provider_name}
            />
            <Detail label="Group name" value={enrolment?.group_name || data.company_scheme.group_name} />
          </>
        )}
      </dl>
    </Card>
  )
}

function SchemeFields({
  data,
  enrolmentDate,
  schemeKind,
  taxMethod,
  onDate,
  onScheme,
  onTax,
  showHelp = false,
}: {
  data: PensionAssessment
  enrolmentDate: string
  schemeKind: SchemeKind
  taxMethod: string
  onDate: (value: string) => void
  onScheme: (value: SchemeKind) => void
  onTax: (value: string) => void
  showHelp?: boolean
}) {
  const companyLabel = data.company_scheme.provider_name || 'NEST'
  const selectedRelief = TAX_RELIEF.find((item) => item.value === taxMethod) ?? TAX_RELIEF[1]
  return (
    <>
      <FieldRow label="Enrolment date">
        <DateField value={enrolmentDate} onChange={onDate} />
      </FieldRow>
      {showHelp ? (
        <p className="text-xs leading-relaxed text-[#607080]">
          If the employee is becoming a member of the selected scheme for the first time, this will typically be your
          duties start (or deferral) date, the employee’s 16th/22nd birthday, the employee’s start date, or the start of
          the current pay period.
        </p>
      ) : null}
      <FieldRow label="Scheme">
        <select
          className={inputClass}
          value={schemeKind}
          onChange={(event) => onScheme(event.target.value as SchemeKind)}
        >
          <option value="COMPANY">{companyLabel}</option>
          <option value="EXTERNAL">Employee is enrolled in another qualifying pension scheme</option>
        </select>
      </FieldRow>
      <p className="text-xs leading-relaxed text-[#607080]">
        {schemeKind === 'EXTERNAL'
          ? 'Select this option to indicate that you are managing the auto enrolment requirements yourself for this employee, e.g. using a traditional pension scheme. Cedar Payroll will not calculate or validate any contributions.'
          : 'Select an option below to enrol this employee into one of the auto-enrolment qualifying schemes that you have set up in Cedar Payroll. Cedar Payroll will automatically manage contributions.'}
      </p>
      {schemeKind === 'COMPANY' ? (
        <>
          <FieldRow label="Tax relief">
            <select className={inputClass} value={taxMethod} onChange={(event) => onTax(event.target.value)}>
              {TAX_RELIEF.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </FieldRow>
          <p className="text-xs leading-relaxed text-[#607080]">{selectedRelief.description}</p>
        </>
      ) : null}
    </>
  )
}

function ReassessCard({ onStart }: { onStart: () => void }) {
  return (
    <Card title="Available Actions">
      <div className="mx-auto max-w-md rounded-[10px] border border-[#d9d9d9] px-6 py-6 text-center">
        <p className="text-base font-semibold text-navy">Reassess for enrolment</p>
        <p className="mt-2 text-sm text-[#607080]">
          Select this option to restart the enrolment process for this employee in the current pay period.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-4 rounded-[8px] border border-navy px-5 py-2 text-sm font-medium text-navy"
        >
          Start
        </button>
      </div>
    </Card>
  )
}

function CriteriaPanel({ data }: { data: PensionAssessment }) {
  const items = [
    ['Worker', data.criteria.worker, data.reasons.worker],
    ['Aged 22 or over', data.criteria.age, data.reasons.age],
    [
      'Pension calculated above the £10,000 trigger',
      data.criteria.earnings,
      data.reasons.earnings,
    ],
    ['Usually work in the UK', data.criteria.uk, data.reasons.uk],
  ] as const
  return (
    <Card title="Eligibility criteria">
      <p className="text-sm text-[#607080]">
        Enrol if the worker, age and UK rules are met. Pension amounts are calculated only when pay is above the
        earnings trigger.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-navy">
        {items.map(([label, text, ok]) => (
          <li key={label} className="flex gap-2">
            <span className={ok ? 'text-emerald-600' : 'text-brand'}>{ok ? '✓' : '✗'}</span>
            <span>
              {text}
              {label === 'Pension calculated above the £10,000 trigger'
                ? ` Current annual earnings: £${data.annual_earnings.toLocaleString('en-GB')}.`
                : ''}
              {label.startsWith('Age') && data.age !== null ? ` Age now: ${data.age}.` : ''}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function StatusCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[10px] border border-[#d9d9d9] bg-white px-6 py-5">
      <h3 className="text-[28px] leading-none font-semibold text-navy">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-[#607080]">{children}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[10px] border border-[#d9d9d9] bg-white px-6 py-5">
      <h3 className="mb-4 text-lg font-semibold text-navy">{title}</h3>
      {children}
    </div>
  )
}

function ActionPanel({
  title,
  intro,
  children,
  saving,
  onCancel,
  onContinue,
}: {
  title: string
  intro?: string
  children: ReactNode
  saving: boolean
  onCancel: () => void
  onContinue: () => void
}) {
  return (
    <div className="mt-4 rounded-[10px] border border-[#d9d9d9] bg-white px-6 py-5">
      <button type="button" onClick={onCancel} className="mb-3 flex items-center gap-1 text-sm font-semibold text-navy">
        <ChevronLeft size={16} />
        {title}
      </button>
      {intro ? <p className="mb-4 text-sm text-[#607080]">{intro}</p> : null}
      <div className="space-y-4">{children}</div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[8px] border border-[#d9d9d9] px-5 py-2 text-sm font-medium text-navy"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onContinue}
          className="rounded-[8px] bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Continue &gt;
        </button>
      </div>
    </div>
  )
}

function ActionTile({
  icon,
  title,
  body,
  action,
  onClick,
  solid = false,
}: {
  icon?: ReactNode
  title: string
  body: string
  action: string
  onClick: () => void
  solid?: boolean
}) {
  return (
    <div className="flex flex-col rounded-[10px] border border-[#d9d9d9] px-4 py-4">
      {icon ? <span className="mb-3 text-navy">{icon}</span> : null}
      <h4 className="text-sm font-semibold text-navy">{title}</h4>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-[#607080]">{body}</p>
      <button
        type="button"
        onClick={onClick}
        className={`mt-4 self-start rounded-[8px] px-3 py-1.5 text-sm font-medium ${
          solid ? 'bg-navy text-white' : 'border border-navy text-navy'
        }`}
      >
        {action}
      </button>
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-[#9b9a9a]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-navy">{value || '—'}</dd>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
      <span className="text-sm text-[#607080]">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'h-11 w-full rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none focus:border-navy'

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pr-10`} />
      <CalendarDays size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9b9a9a]" />
    </div>
  )
}

function monthEnding(periodEnd?: string | null, fallback?: string) {
  if (!periodEnd) return fallback ?? ''
  const date = new Date(periodEnd)
  if (Number.isNaN(date.getTime())) return fallback ?? periodEnd
  return `Month Ending ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`
}

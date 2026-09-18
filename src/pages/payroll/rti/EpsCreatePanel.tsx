import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { rtiApi } from '../../../api'
import { Alert, Button } from '../../../components/ui'
import { EMPLOYMENT_ALLOWANCE_OPTIONS } from './rtiTypes'
import { idOf } from '../../../lib/format'
import {
  inactivityEndOptions,
  inactivityStartOptions,
  isFutureIsoDate,
  noPaymentEndOptions,
  noPaymentStartOptions,
} from './epsTaxDates'

const fieldClass =
  'h-11 w-full appearance-none rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none focus:border-navy'

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        className="size-[18px] shrink-0 rounded-[3px] border-[#d9d9d9] accent-navy"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-semibold text-navy">{label}</span>
    </label>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-navy/55">{children}</span>
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs font-medium leading-5 text-navy/45">{children}</p>
}

function DateField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} pr-16 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-navy/45">
        <CalendarDays size={16} />
        <ChevronDown size={14} />
      </span>
    </div>
  )
}

function SelectField({
  value,
  onChange,
  children,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} pr-9 disabled:bg-cream`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/45"
      />
    </div>
  )
}

function CessationConfirmModal({
  onNo,
  onYes,
}: {
  onNo: () => void
  onYes: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[520px] rounded-[16px] bg-white shadow-xl">
        <div className="flex items-start gap-4 p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
            ?
          </span>
          <div>
            <h3 className="text-lg font-semibold text-navy">
              The selected scheme cessation date is after the current date. Do you want to continue?
            </h3>
            <p className="mt-2 text-sm font-medium text-navy/55">
              HMRC will only accept an EPS submission in which the scheme cessation date is on or
              before the current date.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#eee] px-6 py-4">
          <Button variant="secondary" onClick={onNo}>
            No
          </Button>
          <Button onClick={onYes}>Yes</Button>
        </div>
      </div>
    </div>
  )
}

export function EpsCreatePanel({
  companyId,
  onCancel,
  onCreated,
}: {
  companyId: string
  onCancel: () => void
  onCreated: (id: string) => void
}) {
  const queryClient = useQueryClient()

  const inactivityStarts = useMemo(() => inactivityStartOptions(), [])
  const noPaymentStarts = useMemo(() => noPaymentStartOptions(), [])

  const [recoverable, setRecoverable] = useState(true)
  const [recoverablePeriod, setRecoverablePeriod] = useState('')

  const [employmentAllowance, setEmploymentAllowance] = useState(true)
  const [eligible, setEligible] = useState('true')

  const [inactivity, setInactivity] = useState(false)
  const [inactivityStart, setInactivityStart] = useState(inactivityStarts[0]?.value ?? '')
  const [inactivityEnd, setInactivityEnd] = useState('')

  const [noPayment, setNoPayment] = useState(false)
  const [noPaymentStart, setNoPaymentStart] = useState(
    noPaymentStarts[noPaymentStarts.length - 1]?.value ?? '',
  )
  const [noPaymentEnd, setNoPaymentEnd] = useState('')

  const [finalSubmission, setFinalSubmission] = useState(false)
  const [schemeCeased, setSchemeCeased] = useState(false)
  const [schemeCeasedDate, setSchemeCeasedDate] = useState('')
  const [cessationPrompt, setCessationPrompt] = useState(false)

  const inactivityEnds = useMemo(
    () => inactivityEndOptions(inactivityStart),
    [inactivityStart],
  )
  const noPaymentEnds = useMemo(
    () => noPaymentEndOptions(noPaymentStart),
    [noPaymentStart],
  )

  useEffect(() => {
    if (inactivityEnds.length && !inactivityEnds.some((o) => o.value === inactivityEnd)) {
      setInactivityEnd(inactivityEnds[0].value)
    }
  }, [inactivityEnds, inactivityEnd])

  useEffect(() => {
    if (noPaymentEnds.length && !noPaymentEnds.some((o) => o.value === noPaymentEnd)) {
      setNoPaymentEnd(noPaymentEnds[noPaymentEnds.length - 1].value)
    }
  }, [noPaymentEnds, noPaymentEnd])

  const taxPeriods = useQuery({
    queryKey: ['rti-eps-tax-periods', companyId],
    queryFn: () => rtiApi.epsTaxPeriods(companyId),
    enabled: Boolean(companyId),
  })

  const periodOptions =
    (
      taxPeriods.data?.data as
        | { selected?: string; periods?: { value: string; label: string }[] }
        | undefined
    )?.periods ?? []
  const selectedPeriod =
    (taxPeriods.data?.data as { selected?: string } | undefined)?.selected ?? ''

  useEffect(() => {
    if (!recoverablePeriod && selectedPeriod) {
      setRecoverablePeriod(selectedPeriod)
    }
  }, [recoverablePeriod, selectedPeriod])

  const anySelected =
    recoverable || employmentAllowance || inactivity || noPayment || finalSubmission

  const create = useMutation({
    mutationFn: () =>
      rtiApi.generateEps(companyId, {
        include_recoverable: recoverable,
        recoverable_tax_period: recoverable ? recoverablePeriod || undefined : undefined,
        include_employment_allowance: employmentAllowance,
        employment_allowance_eligible: employmentAllowance ? eligible === 'true' : undefined,
        include_inactivity: inactivity,
        inactivity_start_date: inactivity && inactivityStart ? inactivityStart : undefined,
        inactivity_end_date: inactivity && inactivityEnd ? inactivityEnd : undefined,
        include_no_payment: noPayment,
        no_payment_start_date: noPayment && noPaymentStart ? noPaymentStart : undefined,
        no_payment_end_date: noPayment && noPaymentEnd ? noPaymentEnd : undefined,
        include_final_submission: finalSubmission,
        scheme_ceased: finalSubmission ? schemeCeased : undefined,
        scheme_ceased_date:
          finalSubmission && schemeCeased && schemeCeasedDate ? schemeCeasedDate : undefined,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      onCreated(idOf(result.data))
    },
  })

  function tryCreate() {
    if (
      finalSubmission &&
      schemeCeased &&
      schemeCeasedDate &&
      isFutureIsoDate(schemeCeasedDate)
    ) {
      setCessationPrompt(true)
      return
    }
    create.mutate()
  }

  return (
    <div className="space-y-5 pb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
        RTI &nbsp;›&nbsp; Employer Summary EPS
      </p>
      <div>
        <h2 className="text-[32px] font-semibold leading-none text-navy">
          Create Employer Payment Summary
        </h2>
        <p className="mt-2 text-sm font-medium text-navy/55">
          Select which declarations to include in the submission.
        </p>
      </div>

      {create.isError ? (
        <Alert>
          {create.error instanceof Error ? create.error.message : 'Could not create EPS'}
        </Alert>
      ) : null}

      <div className="divide-y divide-[#e6e6e6] rounded-[16px] border border-[#d9d9d9]/80 bg-white px-8 py-2">
        <div className="grid gap-8 py-7 md:grid-cols-2">
          <div className="space-y-3">
            <Checkbox
              checked={recoverable}
              onChange={setRecoverable}
              label="Include year to date recoverable amounts"
            />
            {recoverable ? (
              <div>
                <FieldLabel>Use amounts from tax period</FieldLabel>
                <SelectField value={recoverablePeriod} onChange={setRecoverablePeriod}>
                  {periodOptions.length === 0 ? (
                    <option value="">Loading periods…</option>
                  ) : (
                    periodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  )}
                </SelectField>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <Checkbox
              checked={employmentAllowance}
              onChange={setEmploymentAllowance}
              label="Include Employment Allowance indicator"
            />
            {employmentAllowance ? (
              <div>
                <FieldLabel>Employment Allowance eligibility</FieldLabel>
                <SelectField value={eligible} onChange={setEligible}>
                  {EMPLOYMENT_ALLOWANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 py-7">
          <Checkbox
            checked={inactivity}
            onChange={setInactivity}
            label="Include period of inactivity declaration"
          />
          {inactivity ? (
            <div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <FieldLabel>Period of inactivity start date</FieldLabel>
                  <SelectField value={inactivityStart} onChange={setInactivityStart}>
                    {inactivityStarts.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div>
                  <FieldLabel>Period of inactivity end date</FieldLabel>
                  <SelectField value={inactivityEnd} onChange={setInactivityEnd}>
                    {inactivityEnds.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
              <Hint>
                Future tax months only. Start must be the 6th and end the 5th, for 1 to 12 months.
                Use “no payment for period” for the current or a past tax month.
              </Hint>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 py-7">
          <Checkbox
            checked={noPayment}
            onChange={setNoPayment}
            label="Include declaration of no payment for period"
          />
          {noPayment ? (
            <div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <FieldLabel>No payment period start date</FieldLabel>
                  <SelectField value={noPaymentStart} onChange={setNoPaymentStart}>
                    {noPaymentStarts.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div>
                  <FieldLabel>No payment period end date</FieldLabel>
                  <SelectField value={noPaymentEnd} onChange={setNoPaymentEnd}>
                    {noPaymentEnds.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
              <Hint>
                Past or current tax months only (6th to 5th). Send the EPS by the 19th of the
                following tax month. Future inactivity belongs in the period of inactivity
                declaration.
              </Hint>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 py-7">
          <Checkbox
            checked={finalSubmission}
            onChange={setFinalSubmission}
            label="Include final submission indicator"
          />
          {finalSubmission ? (
            <div className="space-y-4">
              <Checkbox
                checked={schemeCeased}
                onChange={setSchemeCeased}
                label="Indicate that PAYE scheme has ceased"
              />
              {schemeCeased ? (
                <div className="max-w-[50%]">
                  <FieldLabel>Date PAYE scheme ceased</FieldLabel>
                  <DateField value={schemeCeasedDate} onChange={setSchemeCeasedDate} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button onClick={tryCreate} disabled={!anySelected || create.isPending}>
          {create.isPending ? 'Creating…' : 'Create'}
        </Button>
      </div>

      {cessationPrompt ? (
        <CessationConfirmModal
          onNo={() => setCessationPrompt(false)}
          onYes={() => {
            setCessationPrompt(false)
            create.mutate()
          }}
        />
      ) : null}
    </div>
  )
}

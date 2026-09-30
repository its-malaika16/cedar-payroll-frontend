import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, ChevronLeft, Trash2, User } from 'lucide-react'
import { invoicesApi, payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { formatPeriodRange, idOf } from '../../lib/format'
import type { PayrollRun, PayrollSchedule } from '../../types'
import { InvoiceDeleteDialog } from './InvoiceViewPage'
import {
  defaultPeriodKey,
  findRunForPeriod,
  runScheduleId,
} from './PayslipPeriodSwitcher'
import {
  FREQUENCY_META,
  asPayFrequency,
  hmrcPeriodLabel,
  periodsFromSavedSchedule,
} from './scheduleWizard/payDateRules'
import {
  displayInvoiceNumber,
  headingLine,
  invoiceLineFromAmount,
  invoiceTotals,
  invoiceTypeLabel,
  mapApiLines,
  parseInvoiceType,
  sortInvoiceEmployeeLines,
  withLineTotals,
  type InvoiceLine,
  type InvoiceRecord,
  type InvoiceType,
} from './invoiceMath'

const NAVY = '#17375e'
const fieldClass =
  'h-[42px] w-full min-w-0 overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white px-3 text-sm font-medium text-navy outline-none placeholder:text-[#9b9a9a] focus:border-navy'

function asRecord(value: unknown) {
  return (value ?? {}) as Record<string, unknown>
}

function scheduleLabel(schedule: PayrollSchedule, all: PayrollSchedule[]) {
  const frequency = FREQUENCY_META[asPayFrequency(schedule.pay_frequency)].title
  const name = schedule.schedule_name?.trim()
  const duplicates = all.filter((item) => item.pay_frequency === schedule.pay_frequency).length > 1
  if (name && duplicates) return `${name} · ${frequency}`
  return name || frequency
}

function headingForPeriod(date: Date, type: InvoiceType) {
  const month = date.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
  const year = date.getUTCFullYear()
  return type === 'EMPLOYER_ONCOST'
    ? `Employer NIC and pension for ${month} ${year}`
    : `Pay for ${month} ${year}`
}

function formatFieldDate(value: string) {
  if (!value) return ''
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function InvoiceInput({
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className="relative min-w-0">
      {icon ? (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#8a93a3]">
          {icon}
        </span>
      ) : null}
      <input className={`${fieldClass} truncate ${icon ? 'pl-9' : ''} ${className}`} {...props} />
    </div>
  )
}

function DateField({
  value,
  onChange,
  placeholder,
  disabled,
  min,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  min?: string
}) {
  const label = formatFieldDate(value)

  return (
    <div className="relative min-w-0">
      <div className={`${fieldClass} pointer-events-none flex items-center gap-2`}>
        <CalendarDays size={15} className="shrink-0 text-[#8a93a3]" />
        <span className={`min-w-0 truncate ${label ? 'text-navy' : 'text-[#9b9a9a]'}`}>
          {label || placeholder}
        </span>
      </div>
      <input
        type="date"
        value={value}
        min={min || undefined}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 z-10 min-w-0 cursor-pointer opacity-0 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
    </div>
  )
}

export function InvoiceEditorPage() {
  const { invoiceId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, isBureauAdmin, isSuperAdmin } = useAuth()
  const canEdit = isBureauAdmin || isSuperAdmin
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [contact, setContact] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [reference, setReference] = useState('')
  const [heading, setHeading] = useState('')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('PAY')
  const [payrollRunId, setPayrollRunId] = useState('')
  const [scheduleId, setScheduleId] = useState('')
  const [periodKey, setPeriodKey] = useState('')
  const [sourceTouched, setSourceTouched] = useState(false)
  const [periodLabel, setPeriodLabel] = useState('')
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [bank, setBank] = useState({
    bank_sort_code: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_name: '',
  })
  const [addOpen, setAddOpen] = useState(false)
  const [headingOpen, setHeadingOpen] = useState(false)
  const [savedId, setSavedId] = useState(invoiceId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dirty, setDirty] = useState(!invoiceId)
  const metaApplied = useRef(false)

  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId && canEdit),
  })
  const runsQuery = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId && canEdit),
  })
  const scheduleList = ((schedulesQuery.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const runList = (runsQuery.data?.data ?? []) as PayrollRun[]
  const selectedSchedule =
    scheduleList.find((schedule) => idOf(schedule) === scheduleId) ?? scheduleList[0]
  const selectedScheduleId = selectedSchedule ? idOf(selectedSchedule) : ''
  const schedulePeriods = useMemo(
    () => (selectedSchedule ? periodsFromSavedSchedule(selectedSchedule).periods : []),
    [selectedSchedule],
  )
  const selectedPeriod = schedulePeriods.find((period) => String(period.number) === periodKey)
  const selectedRun = findRunForPeriod(
    runList,
    selectedScheduleId,
    periodKey,
    selectedPeriod?.start,
  )
  const selectedRunId = selectedRun ? idOf(selectedRun) : ''

  const metaQuery = useQuery({
    queryKey: ['invoice-defaults-meta', companyId],
    queryFn: () => invoicesApi.defaults(companyId!, 'PAY'),
    enabled: Boolean(companyId && canEdit && !invoiceId),
  })
  const defaultsQuery = useQuery({
    queryKey: ['invoice-defaults', companyId, invoiceType, selectedRunId || 'none'],
    queryFn: () => invoicesApi.defaults(companyId!, invoiceType, selectedRunId || undefined),
    enabled: Boolean(
      companyId &&
        canEdit &&
        selectedScheduleId &&
        periodKey &&
        (!invoiceId || sourceTouched) &&
        selectedRunId,
    ),
  })
  const invoiceQuery = useQuery({
    queryKey: ['invoice', companyId, invoiceId],
    queryFn: () => invoicesApi.get(companyId!, invoiceId),
    enabled: Boolean(companyId && invoiceId),
  })

  useEffect(() => {
    if (!scheduleList.length) return
    if (runsQuery.isLoading) return
    if (invoiceId && !invoiceQuery.data) return
    if (scheduleId && periodKey) return
    if (payrollRunId) {
      const run = runList.find((item) => idOf(item) === payrollRunId)
      if (run) {
        setScheduleId(runScheduleId(run))
        setPeriodKey(String(run.period_number ?? ''))
        return
      }
    }
    if (invoiceId) return
    const nextId = idOf(scheduleList[0])
    setScheduleId(nextId)
    setPeriodKey(
      defaultPeriodKey(periodsFromSavedSchedule(scheduleList[0]).periods, runList, nextId),
    )
  }, [scheduleList, runList, invoiceId, invoiceQuery.data, payrollRunId, scheduleId, periodKey, runsQuery.isLoading])

  function applyMeta(record: Record<string, unknown>) {
    setContact(String(record.contact_name ?? ''))
    const issue = String(record.issue_date ?? '').slice(0, 10)
    const due = String(record.due_date ?? '').slice(0, 10)
    setIssueDate(issue)
    setDueDate(due && issue && due < issue ? issue : due)
    setInvoiceNumber(String(record.invoice_number ?? ''))
    setReference(String(record.reference ?? ''))
    setBank({
      bank_sort_code: String(record.bank_sort_code ?? ''),
      bank_account_number: String(record.bank_account_number ?? ''),
      bank_account_holder: String(record.bank_account_holder ?? ''),
      bank_name: String(record.bank_name ?? ''),
    })
  }

  function applyLines(record: Record<string, unknown>, type = invoiceType) {
    const nextType = parseInvoiceType(String(record.invoice_type ?? type))
    setHeading(String(record.heading ?? ''))
    setPayrollRunId(record.payroll_run_id ? String(record.payroll_run_id) : '')
    setPeriodLabel(String(record.period_label ?? ''))
    setLines(mapApiLines(record.lines as Array<Record<string, unknown>> | undefined, nextType))
  }

  useEffect(() => {
    if (!invoiceId || !invoiceQuery.data?.data) return
    const record = asRecord(invoiceQuery.data.data)
    applyMeta(record)
    applyLines(record)
    setInvoiceType(parseInvoiceType(String(record.invoice_type ?? 'PAY')))
    setPayrollRunId(record.payroll_run_id ? String(record.payroll_run_id) : '')
    setDirty(false)
  }, [invoiceQuery.data, invoiceId])

  useEffect(() => {
    if (invoiceId || metaApplied.current || !metaQuery.data?.data) return
    applyMeta(asRecord(metaQuery.data.data))
    metaApplied.current = true
  }, [metaQuery.data, invoiceId])

  useEffect(() => {
    if (invoiceId && !sourceTouched) return
    if (!defaultsQuery.data?.data) return
    applyLines(asRecord(defaultsQuery.data.data))
  }, [defaultsQuery.data, invoiceId, sourceTouched])

  useEffect(() => {
    if (invoiceId && !sourceTouched) return
    if (schedulesQuery.isLoading || runsQuery.isLoading) return
    if (selectedRunId || !periodKey || !selectedPeriod) return
    const heading = headingForPeriod(selectedPeriod.end, invoiceType)
    setPayrollRunId('')
    setPeriodLabel(formatPeriodRange(selectedPeriod.start, selectedPeriod.end))
    setHeading(heading)
    setLines([headingLine(heading)])
  }, [
    invoiceId,
    sourceTouched,
    selectedRunId,
    periodKey,
    selectedPeriod,
    invoiceType,
    schedulesQuery.isLoading,
    runsQuery.isLoading,
  ])

  const totals = useMemo(() => invoiceTotals(lines), [lines])
  const displayLines = useMemo(() => sortInvoiceEmployeeLines(lines), [lines])
  const employerInvoice = invoiceType === 'EMPLOYER_ONCOST'
  const lineGrid = employerInvoice
    ? 'grid-cols-[minmax(11rem,1.3fr)_8.5rem_8rem_6.5rem_7.5rem_8rem_2.75rem]'
    : 'grid-cols-[minmax(12rem,1.5fr)_7.5rem_7.5rem_8rem_8.5rem_2.75rem]'
  const loading =
    schedulesQuery.isLoading ||
    (invoiceId ? invoiceQuery.isLoading : metaQuery.isLoading) ||
    (Boolean(selectedRunId) && !invoiceId && defaultsQuery.isLoading && !defaultsQuery.data)
  const status = String(asRecord(invoiceQuery.data?.data).status ?? 'DRAFT')
  const locked = Boolean(invoiceId) && status !== 'DRAFT'

  function changeSchedule(nextId: string) {
    setDirty(true)
    setSourceTouched(true)
    setScheduleId(nextId)
    const schedule = scheduleList.find((item) => idOf(item) === nextId)
    if (!schedule) return
    setPeriodKey(
      defaultPeriodKey(periodsFromSavedSchedule(schedule).periods, runList, nextId),
    )
  }

  function changePeriod(nextKey: string) {
    setDirty(true)
    setSourceTouched(true)
    setPeriodKey(nextKey)
  }

  function updateLine(key: string, patch: Partial<InvoiceLine>) {
    setDirty(true)
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line
        return withLineTotals({ ...line, ...patch }, invoiceType)
      }),
    )
  }

  function payload() {
    return {
      invoice_type: invoiceType,
      payroll_run_id: selectedRunId || payrollRunId || null,
      contact_name: contact,
      issue_date: issueDate || undefined,
      due_date: dueDate || null,
      reference,
      heading,
      ...bank,
      lines: sortInvoiceEmployeeLines(lines).map((line) => ({
        id: line.id,
        employee_id: line.employee_id,
        kind: line.kind,
        description: line.description,
        pay_amount: line.pay_amount,
        taxable_additions: line.taxable_additions,
        net_pay_additions: line.net_pay_additions,
        employer_nic: line.employer_nic,
        employer_pension: line.employer_pension,
        amount: line.amount,
        tax_rate: line.tax_rate,
      })),
    }
  }

  async function saveDraft() {
    if (!companyId) return ''
    if (dueDate && issueDate && dueDate < issueDate) {
      setError('Due date must be on or after the issue date')
      return ''
    }
    setError(null)
    setBusy(true)
    try {
      const result = savedId
        ? await invoicesApi.update(companyId, savedId, payload())
        : await invoicesApi.create(companyId, payload())
      const id = idOf(result.data as InvoiceRecord)
      setSavedId(id)
      setDirty(false)
      void queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['invoice', companyId, id] })
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save invoice')
      return ''
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    const id = await saveDraft()
    if (!id || !companyId) return
    setBusy(true)
    try {
      await invoicesApi.approve(companyId, id)
      void queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
      navigate(`/payroll/invoices/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve invoice')
    } finally {
      setBusy(false)
    }
  }

  async function removeInvoice() {
    if (!companyId || !savedId) return
    setError(null)
    setBusy(true)
    try {
      await invoicesApi.remove(companyId, savedId)
      void queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
      void queryClient.removeQueries({ queryKey: ['invoice', companyId, savedId] })
      navigate('/payroll/invoices')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete invoice')
      setBusy(false)
    }
  }

  if (!canEdit) {
    return <Alert>Only a bureau admin can create invoices.</Alert>
  }
  if (loading) return <Loading />

  return (
    <div className="pb-8">
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; Invoices &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">{invoiceId ? displayInvoiceNumber(invoiceNumber) : 'New Invoice'}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/payroll/invoices')}
          className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          {invoiceId ? 'Edit Invoice' : 'New Invoice'}
        </button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy || locked || (!dirty && Boolean(savedId))} onClick={() => void saveDraft()}>
            Save draft
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void saveDraft().then((id) => id && navigate(`/payroll/invoices/${id}`))}>
            View invoice
          </Button>
          <Button disabled={busy || locked} onClick={() => void approve()}>
            Approve invoice
          </Button>
          {savedId ? (
            <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>
      {error && !confirmDelete ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 rounded-[16px] border border-[#e6e3dc] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.06)]">
        <div className="mb-5 flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-navy">Invoice type</p>
            <div className="flex h-[42px] rounded-[12px] bg-[#eceae6] p-1">
              {([
                ['PAY', 'Pay'],
                ['EMPLOYER_ONCOST', 'Employer NIC & pension'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={locked}
                  className={`rounded-[10px] px-4 text-sm font-semibold disabled:opacity-60 ${
                    invoiceType === key ? 'bg-navy text-white' : 'text-[#8a93a3]'
                  }`}
                  onClick={() => {
                    setSourceTouched(true)
                    setInvoiceType(key)
                    setDirty(true)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="min-w-[180px] flex-1">
            <span className="mb-1.5 block text-sm font-medium text-navy">Schedule</span>
            <select
              className={fieldClass}
              value={selectedScheduleId}
              disabled={locked || scheduleList.length === 0}
              onChange={(event) => changeSchedule(event.target.value)}
            >
              {scheduleList.length === 0 ? (
                <option value="">No schedules</option>
              ) : (
                scheduleList.map((schedule) => (
                  <option key={idOf(schedule)} value={idOf(schedule)}>
                    {scheduleLabel(schedule, scheduleList)}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="min-w-[240px] flex-[1.3]">
            <span className="mb-1.5 block text-sm font-medium text-navy">Pay period</span>
            <select
              className={fieldClass}
              value={periodKey}
              disabled={locked || schedulePeriods.length === 0}
              onChange={(event) => changePeriod(event.target.value)}
            >
              {schedulePeriods.length === 0 ? (
                <option value="">No pay periods</option>
              ) : (
                schedulePeriods.map((period) => (
                  <option key={period.number} value={String(period.number)}>
                    {formatPeriodRange(period.start, period.end)}
                    {selectedSchedule
                      ? ` (${hmrcPeriodLabel(selectedSchedule.pay_frequency, period)})`
                      : ''}
                  </option>
                ))
              )}
            </select>
          </label>
          <p className="w-full text-sm text-muted">
            {selectedRunId
              ? `Figures from payroll ${periodLabel || formatPeriodRange(selectedPeriod?.start, selectedPeriod?.end)}. You can change any amount.`
              : periodKey
                ? 'No payroll figures for this period yet. You can still enter amounts.'
                : 'Select a schedule and pay period to load payroll figures.'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,1fr)]">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-navy">Contact</span>
            <InvoiceInput
              icon={<User size={15} />}
              value={contact}
              disabled={locked}
              placeholder="Search or select contact..."
              onChange={(e) => {
                setDirty(true)
                setContact(e.target.value)
              }}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-navy">Issue date</span>
            <DateField
              value={issueDate}
              disabled={locked}
              placeholder="Select date"
              onChange={(next) => {
                setDirty(true)
                setIssueDate(next)
                if (dueDate && next && dueDate < next) setDueDate(next)
              }}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-navy">Due date</span>
            <DateField
              value={dueDate}
              min={issueDate}
              disabled={locked}
              placeholder="Select date"
              onChange={(next) => {
                setDirty(true)
                setDueDate(next)
              }}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-navy">Invoice number</span>
            <InvoiceInput value={displayInvoiceNumber(invoiceNumber)} readOnly />
          </label>
          <label className="block min-w-0 sm:col-span-2 xl:col-span-1">
            <span className="mb-1.5 block text-sm font-medium text-navy">Reference</span>
            <InvoiceInput
              value={reference}
              disabled={locked}
              placeholder="Add reference"
              onChange={(e) => {
                setDirty(true)
                setReference(e.target.value)
              }}
            />
          </label>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-sm font-medium text-navy">Description</p>
          <div className="relative inline-block">
            <button
              type="button"
              className="flex h-[38px] items-center gap-2 rounded-[10px] border border-navy bg-white px-3 text-sm font-medium text-navy"
              disabled={locked}
              onClick={() => setHeadingOpen((open) => !open)}
            >
              Heading
              <ChevronDown size={14} />
            </button>
            {headingOpen ? (
              <div className="absolute z-20 mt-1 w-56 rounded-[10px] border border-[#d9d9d9] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-navy hover:bg-cream"
                  onClick={() => {
                    setDirty(true)
                    setLines((current) => [
                      headingLine(heading || invoiceTypeLabel(invoiceType)),
                      ...current.filter((line) => line.kind !== 'HEADING'),
                    ])
                    setHeadingOpen(false)
                  }}
                >
                  Insert heading row
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[12px] border border-[#eceae6]">
          <div className={employerInvoice ? 'min-w-[56rem]' : 'min-w-[48rem]'}>
          <div className={`grid ${lineGrid} bg-[#f7f5f1] px-4 py-3 text-[12px] font-semibold text-navy`}>
            <span>Employee Name</span>
            {employerInvoice ? (
              <>
                <span className="text-center">Employer Pension</span>
                <span className="text-center">Employer NIC</span>
              </>
            ) : (
              <span className="text-center">Amount</span>
            )}
            <span className="text-center">Tax Rate</span>
            <span className="text-center">Tax Amount</span>
            <span className="text-center">Total Amount</span>
            <span />
          </div>
          <div className="max-h-[min(420px,46vh)] overflow-y-auto">
            {displayLines.map((line) => (
              <div
                key={line.key}
                className={`grid ${lineGrid} items-center gap-2 border-t border-[#f0eeea] px-4 py-2.5`}
              >
                <InvoiceInput
                  value={line.description}
                  disabled={locked}
                  onChange={(e) => {
                    if (line.kind === 'HEADING') setHeading(e.target.value)
                    updateLine(line.key, { description: e.target.value })
                  }}
                />
                {line.kind === 'HEADING' ? (
                  <>
                    <span />
                    {employerInvoice ? <span /> : null}
                    <span />
                    <span />
                    <span />
                  </>
                ) : (
                  <>
                    {employerInvoice ? (
                      <>
                        <InvoiceInput
                          className="text-right"
                          inputMode="decimal"
                          value={line.employer_pension === 0 ? '' : String(line.employer_pension)}
                          placeholder="0.00"
                          disabled={locked}
                          onChange={(e) => updateLine(line.key, { employer_pension: Number(e.target.value) || 0 })}
                        />
                        <InvoiceInput
                          className="text-right"
                          inputMode="decimal"
                          value={line.employer_nic === 0 ? '' : String(line.employer_nic)}
                          placeholder="0.00"
                          disabled={locked}
                          onChange={(e) => updateLine(line.key, { employer_nic: Number(e.target.value) || 0 })}
                        />
                      </>
                    ) : (
                      <InvoiceInput
                        className="text-right"
                        inputMode="decimal"
                        value={line.amount === 0 ? '' : String(line.amount)}
                        placeholder="0.00"
                        disabled={locked}
                        onChange={(e) =>
                          updateLine(line.key, {
                            pay_amount: Number(e.target.value) || 0,
                            taxable_additions: 0,
                            net_pay_additions: 0,
                            amount: Number(e.target.value) || 0,
                          })
                        }
                      />
                    )}
                    <InvoiceInput className="text-center" value="20%" readOnly />
                    <InvoiceInput className="text-right" value={line.tax_amount.toFixed(2)} readOnly />
                    <InvoiceInput className="text-right" value={line.total_amount.toFixed(2)} readOnly />
                  </>
                )}
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center text-[#9b9a9a] hover:text-brand disabled:opacity-40"
                  disabled={locked}
                  onClick={() => {
                    setDirty(true)
                    setLines((current) => current.filter((item) => item.key !== line.key))
                  }}
                  aria-label="Delete row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex max-w-[220px] justify-between text-sm text-navy">
            <span>Subtotal</span>
            <span className="font-semibold tabular-nums">{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex max-w-[220px] justify-between text-sm text-navy">
            <span>Total VAT</span>
            <span className="font-semibold tabular-nums">{totals.vatTotal.toFixed(2)}</span>
          </div>
          <div className="relative inline-block">
            <button
              type="button"
              className="flex h-[38px] items-center gap-2 rounded-[10px] border border-navy bg-white px-3 text-sm font-medium text-navy"
              disabled={locked}
              onClick={() => setAddOpen((open) => !open)}
            >
              Add row
              <ChevronDown size={14} />
            </button>
            {addOpen ? (
              <div className="absolute bottom-full z-20 mb-1 w-48 rounded-[10px] border border-[#d9d9d9] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-navy hover:bg-cream"
                  onClick={() => {
                    setDirty(true)
                    setLines((current) => [...current, invoiceLineFromAmount('', 0, 20, {}, invoiceType)])
                    setAddOpen(false)
                  }}
                >
                  Employee row
                </button>
                <button
                  type="button"
                  className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-navy hover:bg-cream"
                  onClick={() => {
                    setDirty(true)
                    setLines((current) => [...current, headingLine('Heading')])
                    setAddOpen(false)
                  }}
                >
                  Heading
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t border-[#eceae6] pt-6 md:grid-cols-4">
          <p className="text-sm font-semibold md:col-span-4" style={{ color: NAVY }}>
            Bank details
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Sort code</span>
            <InvoiceInput value={bank.bank_sort_code} onChange={(e) => {
              setDirty(true)
              setBank((current) => ({ ...current, bank_sort_code: e.target.value }))
            }} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Account number</span>
            <InvoiceInput value={bank.bank_account_number} onChange={(e) => {
              setDirty(true)
              setBank((current) => ({ ...current, bank_account_number: e.target.value }))
            }} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Account holder</span>
            <InvoiceInput value={bank.bank_account_holder} onChange={(e) => {
              setDirty(true)
              setBank((current) => ({ ...current, bank_account_holder: e.target.value }))
            }} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Bank name</span>
            <InvoiceInput value={bank.bank_name} onChange={(e) => {
              setDirty(true)
              setBank((current) => ({ ...current, bank_name: e.target.value }))
            }} />
          </label>
        </div>
        {locked ? (
          <p className="mt-3 text-sm text-muted">Line items are locked after approval. Bank details can still be updated.</p>
        ) : null}
      </div>
      {confirmDelete && savedId ? (
        <InvoiceDeleteDialog
          invoiceNumber={displayInvoiceNumber(invoiceNumber)}
          deleting={busy}
          error={error}
          onKeep={() => {
            if (!busy) setConfirmDelete(false)
          }}
          onDelete={() => void removeInvoice()}
        />
      ) : null}
    </div>
  )
}

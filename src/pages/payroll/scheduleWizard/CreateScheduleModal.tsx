import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Info, X } from 'lucide-react'
import { employeesApi, payrollApi } from '../../../api'
import { Alert } from '../../../components/ui'
import { fullName, idOf } from '../../../lib/format'
import { taxYearStartDate } from '../../../lib/hmrcTaxCalendar'
import type { Employee, PayrollSchedule } from '../../../types'
import {
  FREQUENCY_META,
  WEEKDAYS,
  applyPayDateRule,
  buildSchedulePreview,
  calendarEndFromParts,
  dateKey,
  defaultFirstPeriodEnd,
  firstPayDateInvalid,
  formatPreviewDate,
  hmrcPeriodLabel,
  isCalendarFrequency,
  isWeeklyFrequency,
  monthDayOptions,
  monthYearOptions,
  parseDateKey,
  payDateNeedsCount,
  payDateNeedsWeekday,
  payDateRuleGroups,
  taxYearLabel,
  type PayDateRule,
  type PayFrequency,
} from './payDateRules'

const fieldClass =
  'h-11 w-full appearance-none rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none placeholder:text-muted focus:border-navy'
const ghostBtn =
  'inline-flex h-10 items-center justify-center gap-1 rounded-[8px] border border-navy px-4 text-sm font-medium text-navy hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40'
const primaryBtn =
  'inline-flex h-10 items-center justify-center gap-1 rounded-[8px] bg-navy px-4 text-sm font-medium text-white hover:bg-navy-mid disabled:cursor-not-allowed disabled:bg-[#d9d9d9]'

type Step = 'configure' | 'preview' | 'assign'

function uniqueName(base: string, existing: string[]): string {
  const taken = new Set(existing.map((name) => name.trim().toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  let index = 2
  while (taken.has(`${base} (${index})`.toLowerCase())) index += 1
  return `${base} (${index})`
}

function employmentOf(employee: Employee): Record<string, unknown> {
  const details = employee.employment_details
  if (Array.isArray(details)) return (details[0] ?? {}) as Record<string, unknown>
  return (details ?? {}) as Record<string, unknown>
}

function PayDateSelect({
  value,
  groups,
  onChange,
}: {
  value: string
  groups: { label: string; options: { value: string; label: string }[] }[]
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected =
    groups.flatMap((group) => group.options).find((option) => option.value === value)?.label ??
    'Select'

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`${fieldClass} flex items-center justify-between gap-2 text-left ${open ? 'border-navy' : ''}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected}</span>
        <ChevronDown size={16} className="shrink-0 text-navy" />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-[8px] border border-[#d9d9d9] bg-white py-1 shadow-lg">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {group.label}
              </p>
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`block w-full px-3 py-1.5 text-left text-sm ${
                    option.value === value ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
                  }`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CreateScheduleModal({
  companyId,
  frequency,
  existingNames,
  onClose,
  onCreated,
}: {
  companyId: string
  frequency: PayFrequency
  existingNames: string[]
  onClose: () => void
  onCreated: (schedule: PayrollSchedule) => void
}) {
  const meta = FREQUENCY_META[frequency]
  const calendar = isCalendarFrequency(frequency)
  const defaultEnd = defaultFirstPeriodEnd(frequency)
  const monthOptions = useMemo(() => monthYearOptions(), [])

  const [step, setStep] = useState<Step>('configure')
  const [firstEndKey, setFirstEndKey] = useState(dateKey(defaultEnd))
  const [monthDay, setMonthDay] = useState<'last' | string>('last')
  const [monthYear, setMonthYear] = useState(`${defaultEnd.getFullYear()}-${defaultEnd.getMonth()}`)
  const [ruleKey, setRuleKey] = useState('period_end')
  const [count, setCount] = useState(1)
  const [weekday, setWeekday] = useState(5)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showRestriction, setShowRestriction] = useState(false)
  const [createdSchedule, setCreatedSchedule] = useState<PayrollSchedule | null>(null)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [savingAssign, setSavingAssign] = useState(false)

  const firstEnd = useMemo(() => {
    if (!calendar) return parseDateKey(firstEndKey)
    const [year, month] = monthYear.split('-').map(Number)
    return calendarEndFromParts(monthDay === 'last' ? 'last' : Number(monthDay) || 1, year, month)
  }, [calendar, firstEndKey, monthDay, monthYear])

  const rule: PayDateRule = useMemo(
    () => ({ key: ruleKey, count: Math.max(1, count), weekday }),
    [ruleKey, count, weekday],
  )

  const preview = useMemo(
    () =>
      buildSchedulePreview({
        frequency,
        firstEnd,
        rule,
        monthDay: monthDay === 'last' ? 'last' : Number(monthDay) || 1,
      }),
    [frequency, firstEnd, rule, monthDay],
  )

  const taxYearStart = taxYearStartDate(preview.taxYear)
  const invalidFirstPay = firstPayDateInvalid(preview.periods, preview.taxYear)
  const groups = useMemo(() => payDateRuleGroups(meta.unit), [meta.unit])

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId),
    enabled: Boolean(companyId) && step === 'assign',
  })
  const employees = (employeesQuery.data?.data ?? []) as Employee[]

  const create = useMutation({
    mutationFn: () => {
      const first = preview.periods[0]
      if (!first) throw new Error('Could not build the schedule preview')
      const scheduleName = uniqueName(name.trim() || meta.title, existingNames)
      return payrollApi.createSchedule(companyId, {
        schedule_name: scheduleName,
        pay_frequency: frequency,
        first_period_start_date: dateKey(first.start),
        first_pay_date: dateKey(first.payDate),
      })
    },
    onSuccess: (result) => {
      const schedule = result.data
      setCreatedSchedule(schedule)
      setStep('assign')
      onCreated(schedule)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Could not create the schedule')
    },
  })

  function goPreview() {
    setError(null)
    setStep('preview')
    setShowRestriction(invalidFirstPay)
  }

  function goAssign() {
    setError(null)
    if (invalidFirstPay) {
      setShowRestriction(true)
      return
    }
    create.mutate()
  }

  async function assignSelected() {
    if (!createdSchedule) return
    setSavingAssign(true)
    setError(null)
    try {
      const scheduleId = idOf(createdSchedule)
      const toAssign = selectedEmployees.filter((employeeId) => {
        const employee = employees.find((item) => idOf(item) === employeeId)
        const current = String(employmentOf(employee).pay_schedule_id ?? '')
        return !current || current === scheduleId
      })
      if (toAssign.length === 0) {
        setError('Select employees who are not already on another schedule. Use Switch Employee(s) Payment Schedule to move them.')
        return
      }
      await Promise.all(
        toAssign.map((employeeId) =>
          employeesApi.updateEmployment(companyId, employeeId, {
            pay_schedule_id: scheduleId,
            pay_schedule_request: null,
            status: 'Active',
          }),
        ),
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign employees')
    } finally {
      setSavingAssign(false)
    }
  }

  const startLabel = `${meta.unit.charAt(0).toUpperCase()}${meta.unit.slice(1)} starts`
  const endLabel = `${meta.unit.charAt(0).toUpperCase()}${meta.unit.slice(1)} ends`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4 py-6">
      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[16px] bg-cream shadow-xl ${
          step === 'configure' ? 'max-w-[560px]' : 'max-w-[760px]'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e6e4df] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-navy">Create New {meta.title} Pay Schedule</h2>
            <p className="mt-1 text-sm text-navy/65">
              {step === 'configure'
                ? 'Select how the pay periods and pay dates of the schedule should be organised.'
                : step === 'preview'
                  ? 'Below is a preview of your schedule. Please ensure the week start and end dates are correct. Pay dates are defaults – they can be changed as you process payroll.'
                  : 'Choose which employees should use this pay schedule. You can also assign people later from their employment record.'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-navy/60 hover:bg-white hover:text-navy"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          {step === 'configure' ? (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm italic text-navy">
                  The first {meta.unit} of the schedule should end on
                </p>
                {calendar ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className={`${fieldClass} max-w-[140px]`}
                      value={monthDay}
                      onChange={(e) => setMonthDay(e.target.value)}
                    >
                      {monthDayOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-navy">of</span>
                    <select
                      className={`${fieldClass} max-w-[220px]`}
                      value={monthYear}
                      onChange={(e) => setMonthYear(e.target.value)}
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <label className="relative block">
                    <input
                      type="date"
                      className={`${fieldClass} pr-10`}
                      value={firstEndKey}
                      onChange={(e) => setFirstEndKey(e.target.value)}
                    />
                    <CalendarDays
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy/50"
                    />
                  </label>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm italic text-navy">
                  By default, the pay date for each {meta.unit} should be
                </p>
                <PayDateSelect value={ruleKey} groups={groups} onChange={setRuleKey} />
                {payDateNeedsWeekday(ruleKey) || payDateNeedsCount(ruleKey) ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {payDateNeedsWeekday(ruleKey) ? (
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-navy/70">Week day</span>
                        <select
                          className={fieldClass}
                          value={weekday}
                          onChange={(e) => setWeekday(Number(e.target.value))}
                        >
                          {WEEKDAYS.map((day) => (
                            <option key={day.id} value={day.id}>
                              {day.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {payDateNeedsCount(ruleKey) ? (
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-navy/70">
                          {ruleKey.startsWith('days_') ? 'Number of days' : 'Number of weekdays'}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={28}
                          className={fieldClass}
                          value={count}
                          onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-navy/55">
                  Example pay date for the first {meta.unit}: {formatPreviewDate(applyPayDateRule(firstEnd, rule))}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium italic text-navy">Name</p>
                <input
                  className={fieldClass}
                  value={name}
                  placeholder="Optional"
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="mt-2 text-xs text-navy/55">
                  If you intend on having more than one {meta.adjective} pay schedule, it is recommended
                  that you provide each with a unique identifiable name.
                </p>
              </div>
            </div>
          ) : null}

          {step === 'preview' ? (
            <div className="overflow-hidden rounded-[10px] border border-[#e6e4df] bg-white">
              <div className="max-h-[52vh] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-navy text-xs font-semibold uppercase tracking-[0.12em] text-white">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">{isWeeklyFrequency(frequency) ? 'Tax week' : 'Tax month'}</th>
                      <th className="px-4 py-3">{startLabel}</th>
                      <th className="px-4 py-3">{endLabel}</th>
                      <th className="px-4 py-3">Default pay date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee]">
                    {preview.periods.map((period) => {
                      const invalid = period.payDate < taxYearStart
                      return (
                        <tr key={period.number} className="text-navy">
                          <td className="px-4 py-2.5">{period.number}</td>
                          <td className="px-4 py-2.5">{hmrcPeriodLabel(frequency, period)}</td>
                          <td className="px-4 py-2.5">{formatPreviewDate(period.start)}</td>
                          <td className="px-4 py-2.5">{formatPreviewDate(period.end)}</td>
                          <td className={`px-4 py-2.5 ${invalid ? 'font-semibold text-brand' : ''}`}>
                            {formatPreviewDate(period.payDate)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === 'assign' && createdSchedule ? (
            <div>
              <p className="mb-3 text-sm text-navy/70">
                {createdSchedule.schedule_name} · {meta.title}
              </p>
              {employeesQuery.isLoading ? (
                <p className="text-sm text-muted">Loading employees…</p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-navy/70">
                  No employees yet. You can assign this schedule later from an employee record.
                </p>
              ) : (
                <div className="max-h-[48vh] space-y-1 overflow-auto rounded-[10px] border border-[#e6e4df] bg-white p-2">
                  {employees.map((employee) => {
                    const employeeId = idOf(employee)
                    const current = String(employmentOf(employee).pay_schedule_id ?? '')
                    const alreadyAssigned = Boolean(current) && current !== idOf(createdSchedule)
                    return (
                      <label
                        key={employeeId}
                        className={`flex items-center gap-3 rounded-[8px] px-3 py-2 ${
                          alreadyAssigned ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-cream'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-navy"
                          disabled={alreadyAssigned}
                          checked={selectedEmployees.includes(employeeId)}
                          onChange={(e) =>
                            setSelectedEmployees((currentIds) =>
                              e.target.checked
                                ? [...currentIds, employeeId]
                                : currentIds.filter((id) => id !== employeeId),
                            )
                          }
                        />
                        <span className="text-sm font-medium text-navy">
                          {fullName(employee.first_name, employee.last_name)}
                        </span>
                        {alreadyAssigned ? (
                          <span className="text-xs text-muted">
                            Already on a schedule — use Switch Employee(s) Payment Schedule
                          </span>
                        ) : null}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e6e4df] bg-white px-6 py-4">
          <button type="button" className={ghostBtn} onClick={onClose}>
            {step === 'assign' ? 'Skip for now' : 'Cancel'}
          </button>
          {step === 'preview' ? (
            <button type="button" className={ghostBtn} onClick={() => setStep('configure')}>
              <ChevronLeft size={16} />
              Back
            </button>
          ) : null}
          {step === 'configure' ? (
            <button type="button" className={primaryBtn} onClick={goPreview}>
              Preview
              <ChevronRight size={16} />
            </button>
          ) : null}
          {step === 'preview' ? (
            <button
              type="button"
              className={primaryBtn}
              onClick={goAssign}
              disabled={create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Assign Employees'}
              {create.isPending ? null : <ChevronRight size={16} />}
            </button>
          ) : null}
          {step === 'assign' ? (
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void assignSelected()}
              disabled={savingAssign || selectedEmployees.length === 0}
            >
              {savingAssign ? 'Saving…' : `Assign ${selectedEmployees.length || ''}`.trim()}
            </button>
          ) : null}
        </div>
      </div>

      {showRestriction ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-navy/35 px-4">
          <div className="w-full max-w-[440px] rounded-[16px] bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                <Info size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-navy">
                  The {meta.adjective} pay schedule has a first pay date before the start of the{' '}
                  {taxYearLabel(preview.taxYear)} tax year.
                </h3>
                <p className="mt-2 text-sm text-navy/70">
                  This is not allowed. You must go back and fix the schedule before you can continue.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" className={primaryBtn} onClick={() => setShowRestriction(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

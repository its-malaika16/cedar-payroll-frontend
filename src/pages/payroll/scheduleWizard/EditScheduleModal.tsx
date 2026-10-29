import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { payrollApi } from '../../../api'
import { Alert, Button } from '../../../components/ui'
import { idOf, labelize } from '../../../lib/format'
import type { PayrollSchedule } from '../../../types'
import { PayDateSelect } from './CreateScheduleModal'
import {
  FREQUENCY_META,
  WEEKDAYS,
  applyPayDateRule,
  asPayFrequency,
  dateKey,
  formatPreviewDate,
  isCalendarFrequency,
  monthDayOptions,
  monthYearOptions,
  payDateNeedsCount,
  payDateNeedsWeekday,
  payDateRuleGroups,
  periodEndFromStart,
  periodsFromSavedSchedule,
  type PayDateRule,
  type PayFrequency,
} from './payDateRules'

const fieldClass =
  'h-11 w-full appearance-none rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none placeholder:text-muted focus:border-navy'
const lockedFieldClass = `${fieldClass} cursor-not-allowed bg-[#f1efef] text-navy/70`

function isoDate(value?: string | null) {
  return String(value ?? '').slice(0, 10)
}

function ruleFromSchedule(schedule: PayrollSchedule): PayDateRule {
  const preview = periodsFromSavedSchedule(schedule)
  const first = preview.periods[0]
  if (!first) return { key: 'period_end', count: 1, weekday: 5 }
  const startUtc = Date.UTC(first.end.getFullYear(), first.end.getMonth(), first.end.getDate())
  const payUtc = Date.UTC(
    first.payDate.getFullYear(),
    first.payDate.getMonth(),
    first.payDate.getDate(),
  )
  const offset = Math.round((payUtc - startUtc) / 86_400_000)
  if (offset === 0) return { key: 'period_end', count: 1, weekday: first.payDate.getDay() }
  if (offset < 0) return { key: 'days_before', count: Math.abs(offset), weekday: 5 }
  return { key: 'days_after', count: offset, weekday: 5 }
}

export function EditScheduleModal({
  companyId,
  schedules,
  onClose,
  onSaved,
}: {
  companyId: string
  schedules: PayrollSchedule[]
  onClose: () => void
  onSaved: () => void
}) {
  const [scheduleId, setScheduleId] = useState(schedules.length === 1 ? idOf(schedules[0]) : '')
  const selected = schedules.find((schedule) => idOf(schedule) === scheduleId)
  const frequency: PayFrequency | null = selected
    ? asPayFrequency(selected.pay_frequency)
    : null
  const meta = frequency ? FREQUENCY_META[frequency] : null
  const calendar = frequency ? isCalendarFrequency(frequency) : false

  const firstEnd = useMemo(() => {
    if (!selected || !frequency) return null
    const start = isoDate(selected.first_period_start_date)
    if (!start) return null
    const [year, month, day] = start.split('-').map(Number)
    return periodEndFromStart(new Date(year, (month || 1) - 1, day || 1), frequency)
  }, [selected, frequency])

  const [ruleKey, setRuleKey] = useState('period_end')
  const [count, setCount] = useState(1)
  const [weekday, setWeekday] = useState(5)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selected) {
      setName('')
      setRuleKey('period_end')
      setCount(1)
      setWeekday(5)
      return
    }
    setName(selected.schedule_name ?? '')
    const inferred = ruleFromSchedule(selected)
    setRuleKey(inferred.key)
    setCount(inferred.count)
    setWeekday(inferred.weekday)
    setError(null)
  }, [selected])

  const monthDay = firstEnd
    ? firstEnd.getDate() === new Date(firstEnd.getFullYear(), firstEnd.getMonth() + 1, 0).getDate()
      ? 'last'
      : String(firstEnd.getDate())
    : 'last'
  const monthYear = firstEnd ? `${firstEnd.getFullYear()}-${firstEnd.getMonth()}` : ''
  const monthOptions = useMemo(() => {
    const options = monthYearOptions()
    if (firstEnd) {
      const key = `${firstEnd.getFullYear()}-${firstEnd.getMonth()}`
      if (!options.some((option) => option.value === key)) {
        options.unshift({
          value: key,
          label: firstEnd.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          year: firstEnd.getFullYear(),
          month: firstEnd.getMonth(),
        })
      }
    }
    return options
  }, [firstEnd])

  const groups = useMemo(
    () => (meta ? payDateRuleGroups(meta.unit) : []),
    [meta],
  )
  const rule: PayDateRule = useMemo(
    () => ({ key: ruleKey, count: Math.max(1, count), weekday }),
    [ruleKey, count, weekday],
  )
  const examplePay = firstEnd ? applyPayDateRule(firstEnd, rule) : null

  const save = useMutation({
    mutationFn: () => {
      if (!selected || !firstEnd || !frequency) {
        throw new Error('Select a schedule to edit')
      }
      const scheduleName = name.trim() || selected.schedule_name
      return payrollApi.updateSchedule(companyId, idOf(selected), {
        schedule_name: scheduleName,
        first_pay_date: dateKey(applyPayDateRule(firstEnd, rule)),
      })
    },
    onSuccess: () => onSaved(),
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Could not update the schedule')
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[16px] bg-cream shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e6e4df] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-navy">Edit Pay Schedule</h2>
            <p className="mt-1 text-sm text-navy/65">
              Select how the pay periods and pay dates of the schedule should be organised. (The
              first {meta?.unit ?? 'period'} end date cannot be changed once the schedule has been
              created.)
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

          {schedules.length === 0 ? (
            <p className="text-sm text-navy/70">There are no pay schedules to edit.</p>
          ) : (
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-navy">Schedule</span>
                <select
                  className={fieldClass}
                  value={scheduleId}
                  onChange={(event) => setScheduleId(event.target.value)}
                >
                  <option value="">Select a schedule</option>
                  {schedules.map((schedule) => (
                    <option key={idOf(schedule)} value={idOf(schedule)}>
                      {schedule.schedule_name} · {labelize(schedule.pay_frequency)}
                    </option>
                  ))}
                </select>
              </label>

              {selected && meta && firstEnd ? (
                <>
                  <div>
                    <p className="mb-2 text-sm italic text-navy">
                      The first {meta.unit} of the schedule should end on
                    </p>
                    {calendar ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select className={`${lockedFieldClass} max-w-[140px]`} value={monthDay} disabled>
                          {monthDayOptions().map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-navy">of</span>
                        <select
                          className={`${lockedFieldClass} max-w-[220px]`}
                          value={monthYear}
                          disabled
                        >
                          {monthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <input
                        type="date"
                        className={lockedFieldClass}
                        value={dateKey(firstEnd)}
                        disabled
                        readOnly
                      />
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
                            <span className="mb-1 block text-xs font-medium text-navy/70">
                              Week day
                            </span>
                            <select
                              className={fieldClass}
                              value={weekday}
                              onChange={(event) => setWeekday(Number(event.target.value))}
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
                              {ruleKey.startsWith('days_')
                                ? 'Number of days'
                                : 'Number of weekdays'}
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={28}
                              className={fieldClass}
                              value={count}
                              onChange={(event) =>
                                setCount(Math.max(1, Number(event.target.value) || 1))
                              }
                            />
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                    {examplePay ? (
                      <p className="mt-2 text-xs text-navy/55">
                        Example pay date for the first {meta.unit}: {formatPreviewDate(examplePay)}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium italic text-navy">Name</p>
                    <input
                      className={fieldClass}
                      value={name}
                      placeholder="Optional"
                      onChange={(event) => setName(event.target.value)}
                    />
                    <p className="mt-2 text-xs text-navy/55">
                      If you intend on having more than one {meta.adjective} pay schedule, it is
                      recommended that you provide each with a unique identifiable name.
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e6e4df] bg-white px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

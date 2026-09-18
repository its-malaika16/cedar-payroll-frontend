import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarDays, GripVertical, User, X } from 'lucide-react'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, Loading } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import { taxWeekEndDate, weeksInTaxYear } from '../../lib/hmrcTaxCalendar'
import type { Employee, PayrollRecord, PayrollRun, PayrollSchedule } from '../../types'
import {
  EMPLOYEE_PERIOD_DEFAULT,
  PERIOD_MODES,
  readReportDraft,
  writeReportDraft,
  type AnalysisReportDraft,
} from './employeeDetailsState'
import { HMRC_SCHEDULES, type HmrcSchedule } from './hmrcFields'
import { generateHmrcPeriods, hmrcYears } from './hmrcPeriods'
import {
  clampedRangeValue,
  isSchedulePeriodMode,
  latestPeriodChoice,
  periodGrain,
  periodSelectLabel,
  rangePatchFromChoice,
  scheduleIdFromMode,
  scheduleLabel,
  scheduleOptionValue,
  selectedPeriodChoices,
  selectedRangeValue,
  TAX_PERIOD_OPTIONS,
  taxYearSequenceNumber,
} from './periodSelection'
import type { ReportSpec, AnalysisBuilderKind } from './reportSpecs'
import { isHmrcKind, specFor } from './reportSpecs'

const box =
  'w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 py-2.5 text-sm text-navy outline-none'

function isLockedPayroll(status?: string | null) {
  const value = (status ?? '').toUpperCase()
  return value === 'LOCKED' || value === 'COMPLETED'
}

function latestLockedRun(runs: PayrollRun[], scheduleId?: string) {
  const locked = runs.filter((run) => isLockedPayroll(run.status))
  const scoped = scheduleId ? locked.filter((run) => String(run.schedule_id) === scheduleId) : locked
  return scoped[0]
}

function employeesFromRun(run: PayrollRun | undefined, companyId: string): Employee[] {
  const records = (run?.payroll_records ?? []) as PayrollRecord[]
  const seen = new Set<string>()
  const people: Employee[] = []
  for (const record of records) {
    const nested = record.employees
    const id = nested ? idOf(nested) : String(record.employee_id ?? '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    people.push(
      nested ?? {
        id,
        company_id: companyId,
        first_name: null,
        last_name: null,
      },
    )
  }
  return people.sort((a, b) =>
    fullName(a.first_name, a.last_name).localeCompare(fullName(b.first_name, b.last_name), 'en-GB'),
  )
}

function StepCard({
  step,
  title,
  children,
  className = '',
}: {
  step: number
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`flex min-h-[300px] flex-col overflow-hidden ${className}`}>
      <div className="border-b border-[#eceae6] px-5 py-3">
        <h2 className="text-base font-semibold text-navy">
          {step}. {title}
        </h2>
      </div>
      <div className="min-h-0 flex-1 p-5">{children}</div>
    </Card>
  )
}

export function ReportBuilderPage({ kind }: { kind: AnalysisBuilderKind }) {
  const spec = specFor(kind) as ReportSpec
  const hmrcLayout = spec.layout === 'hmrc' || isHmrcKind(kind)
  const periodModes = spec.periodModes ?? PERIOD_MODES
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<AnalysisReportDraft>(() =>
    readReportDraft(kind, spec.defaultName, spec.defaultFieldIds, hmrcLayout ? periodModes[0] : EMPLOYEE_PERIOD_DEFAULT),
  )
  const [categoryId, setCategoryId] = useState(
    spec.defaultCategoryId ?? spec.groups[0]?.categories[0]?.id ?? '',
  )
  const [dragId, setDragId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId) && !hmrcLayout,
  })
  const runsQuery = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId) && !hmrcLayout,
  })
  const payrollSchedules = ((schedulesQuery.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const employeeGrain = periodGrain(draft, payrollSchedules)
  const periodPicker = useMemo(
    () => selectedPeriodChoices(draft, payrollSchedules),
    [draft.periodMode, draft.scheduleId, draft.taxYear, payrollSchedules],
  )
  const fromPeriodValue = clampedRangeValue(draft, periodPicker.choices, periodPicker.grain, 'from')
  const toPeriodValue = clampedRangeValue(draft, periodPicker.choices, periodPicker.grain, 'to')
  const selectedScheduleId = isSchedulePeriodMode(draft.periodMode)
    ? draft.scheduleId || scheduleIdFromMode(draft.periodMode)
    : ''
  const lockedRun = useMemo(
    () => latestLockedRun((runsQuery.data?.data ?? []) as PayrollRun[], selectedScheduleId || undefined),
    [runsQuery.data, selectedScheduleId],
  )
  const lockedRunQuery = useQuery({
    queryKey: ['payroll-run', companyId, lockedRun ? idOf(lockedRun) : ''],
    queryFn: () => payrollApi.getRun(companyId!, idOf(lockedRun!)),
    enabled: Boolean(companyId) && !hmrcLayout && Boolean(lockedRun),
  })
  const people = useMemo(
    () => employeesFromRun(lockedRunQuery.data?.data as PayrollRun | undefined, companyId ?? ''),
    [lockedRunQuery.data, companyId],
  )
  const hmrcPeriods = useMemo(
    () => generateHmrcPeriods(hmrcYears(draft.taxYear, draft.periodMode), draft.schedule ?? 'tax-months'),
    [draft.taxYear, draft.periodMode, draft.schedule],
  )

  useEffect(() => {
    const next = readReportDraft(
      kind,
      spec.defaultName,
      spec.defaultFieldIds,
      hmrcLayout ? (spec.periodModes?.[0] ?? PERIOD_MODES[0]) : EMPLOYEE_PERIOD_DEFAULT,
    )
    setDraft(next)
    setCategoryId(spec.defaultCategoryId ?? spec.groups[0]?.categories[0]?.id ?? '')
  }, [kind, spec])

  useEffect(() => {
    writeReportDraft(draft)
  }, [draft])

  useEffect(() => {
    if (hmrcLayout || people.length === 0) return
    const ids = people.map((person) => idOf(person))
    if (draft.employeeScope === 'all') {
      if (ids.every((id) => draft.selectedEmployeeIds.includes(id)) && ids.length === draft.selectedEmployeeIds.length) {
        return
      }
      setDraft((current) => ({ ...current, selectedEmployeeIds: ids }))
      return
    }
    const kept = draft.selectedEmployeeIds.filter((id) => ids.includes(id))
    if (kept.length === draft.selectedEmployeeIds.length) return
    setDraft((current) => ({
      ...current,
      selectedEmployeeIds: kept,
      employeeScope: kept.length === ids.length ? 'all' : 'selected',
    }))
  }, [draft.employeeScope, draft.selectedEmployeeIds, hmrcLayout, people])

  useEffect(() => {
    if (hmrcLayout || periodPicker.choices.length === 0) return
    setDraft((current) => {
      const from = clampedRangeValue(current, periodPicker.choices, periodPicker.grain, 'from')
      const to = clampedRangeValue(current, periodPicker.choices, periodPicker.grain, 'to')
      if (from === '' || to === '') return current
      if (
        from === selectedRangeValue(current, periodPicker.grain, 'from') &&
        to === selectedRangeValue(current, periodPicker.grain, 'to')
      ) {
        return current
      }
      const fromChoice = periodPicker.choices.find((choice) => choice.value === from)
      const toChoice = periodPicker.choices.find((choice) => choice.value === to)
      if (!fromChoice || !toChoice) return current
      return {
        ...current,
        ...rangePatchFromChoice(periodPicker.grain, fromChoice, 'from'),
        ...rangePatchFromChoice(periodPicker.grain, toChoice, 'to'),
      }
    })
  }, [hmrcLayout, periodPicker])

  useEffect(() => {
    if (!hmrcLayout) return
    const ids = hmrcPeriods.map((period) => period.id)
    setDraft((current) => {
      if (current.selectedPeriodIds.length > 0) return current
      return { ...current, selectedPeriodIds: ids }
    })
  }, [hmrcLayout, hmrcPeriods])

  const categoryFields = spec.fields.filter((field) => field.category === categoryId)
  const selectedFields = draft.selectedFieldIds
    .map((id) => spec.fields.find((field) => field.id === id))
    .filter(Boolean)
  const weeks = Array.from({ length: weeksInTaxYear(draft.taxYear) }, (_, index) => index + 1)
  const allCategoryChecked = categoryFields.every((field) => draft.selectedFieldIds.includes(field.id))

  function patch(update: Partial<AnalysisReportDraft>) {
    setDraft((current) => ({ ...current, ...update }))
  }

  function toggleEmployee(id: string) {
    const selected = draft.selectedEmployeeIds.includes(id)
      ? draft.selectedEmployeeIds.filter((item) => item !== id)
      : [...draft.selectedEmployeeIds, id]
    patch({
      selectedEmployeeIds: selected,
      employeeScope: selected.length === people.length ? 'all' : 'selected',
    })
  }

  function toggleField(id: string) {
    if (draft.selectedFieldIds.includes(id)) {
      patch({ selectedFieldIds: draft.selectedFieldIds.filter((item) => item !== id) })
      return
    }
    patch({ selectedFieldIds: [...draft.selectedFieldIds, id] })
  }

  function toggleCategoryAll() {
    if (allCategoryChecked) {
      const remove = new Set(categoryFields.map((field) => field.id))
      patch({ selectedFieldIds: draft.selectedFieldIds.filter((id) => !remove.has(id)) })
      return
    }
    const next = [...draft.selectedFieldIds]
    for (const field of categoryFields) {
      if (!next.includes(field.id)) next.push(field.id)
    }
    patch({ selectedFieldIds: next })
  }

  function dropField(targetId: string) {
    if (!dragId || dragId === targetId) return
    const ids = [...draft.selectedFieldIds]
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    ids.splice(from, 1)
    ids.splice(to, 0, dragId)
    patch({ selectedFieldIds: ids })
    setDragId(null)
  }

  function changePeriodMode(value: string) {
    const scheduleId = scheduleIdFromMode(value)
    const nextDraft = {
      ...draft,
      periodMode: value,
      scheduleId: scheduleId || undefined,
    }
    const picker = selectedPeriodChoices(nextDraft, payrollSchedules)
    const latest = latestPeriodChoice(picker.choices)
    patch({
      periodMode: value,
      scheduleId: scheduleId || undefined,
      selectedPeriodIds: hmrcLayout ? [] : draft.selectedPeriodIds,
      ...(latest ? rangePatchFromChoice(picker.grain, latest) : {}),
    })
  }

  function changePeriodRange(which: 'from' | 'to', value: number) {
    if (employeeGrain === 'year') {
      if (which === 'from') {
        patch({ fromYear: value, taxYear: Math.max(value, draft.taxYear) })
        return
      }
      patch({ taxYear: value, fromYear: Math.min(draft.fromYear ?? value, value) })
      return
    }
    if (employeeGrain === 'months') {
      if (which === 'from') {
        patch({ fromMonth: value, toMonth: Math.max(value, draft.toMonth ?? value) })
        return
      }
      patch({ toMonth: value, fromMonth: Math.min(draft.fromMonth ?? value, value) })
      return
    }
    if (which === 'from') {
      patch({ fromWeek: value, toWeek: Math.max(value, draft.toWeek) })
      return
    }
    patch({ toWeek: value, fromWeek: Math.min(draft.fromWeek, value) })
  }

  function togglePeriod(id: string) {
    const selected = draft.selectedPeriodIds.includes(id)
      ? draft.selectedPeriodIds.filter((item) => item !== id)
      : [...draft.selectedPeriodIds, id]
    patch({ selectedPeriodIds: selected })
  }

  function run() {
    if (hmrcLayout && draft.selectedPeriodIds.length === 0) {
      setError('Select at least one HMRC payment period.')
      return
    }
    if (!hmrcLayout && draft.selectedEmployeeIds.length === 0) {
      setError('Select at least one employee.')
      return
    }
    if (draft.selectedFieldIds.length === 0) {
      setError('Select at least one column.')
      return
    }
    setError(null)
    writeReportDraft(draft)
    navigate(`/payroll/reports/${kind}/preview`)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <p className="mb-3 text-sm text-muted">
        <Link to="/payroll/reports" className="hover:text-navy">
          Analysis
        </Link>
        <span> &gt; {spec.generateCrumb}</span>
      </p>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('/payroll/reports')} aria-label="Back">
            <ArrowLeft size={22} className="text-navy" />
          </button>
          <h1 className="text-[32px] font-semibold leading-none text-navy">{spec.title}</h1>
        </div>
        <Button onClick={run}>
          Run Report
          <ArrowRight size={16} />
        </Button>
      </div>
      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <StepCard step={1} title="Settings">
          <div className="grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-navy">Report Name</span>
              <input className={box} value={draft.reportName} onChange={(event) => patch({ reportName: event.target.value })} />
            </label>
            {hmrcLayout ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-navy">Schedule</span>
                <select
                  className={box}
                  value={draft.schedule ?? 'tax-months'}
                  onChange={(event) => patch({ schedule: event.target.value as HmrcSchedule, selectedPeriodIds: [] })}
                >
                  {HMRC_SCHEDULES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-navy">Employees</span>
                  <select
                    className={box}
                    value={draft.employeeScope}
                    onChange={(event) => {
                      const scope = event.target.value as 'all' | 'selected'
                      patch({
                        employeeScope: scope,
                        selectedEmployeeIds: scope === 'all' ? people.map((person) => idOf(person)) : draft.selectedEmployeeIds,
                      })
                    }}
                  >
                    <option value="all">All Employees</option>
                    <option value="selected">Selected Employees</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-navy">Schedule</span>
                  <select className={box} value={draft.periodMode} onChange={(event) => changePeriodMode(event.target.value)}>
                    {payrollSchedules.length > 0 ? (
                      <optgroup label="Schedules">
                        {payrollSchedules.map((schedule) => (
                          <option key={idOf(schedule)} value={scheduleOptionValue(idOf(schedule))}>
                            {scheduleLabel(schedule, payrollSchedules)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    <optgroup label="Tax periods">
                      {TAX_PERIOD_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              </>
            )}
            <div>
              <span className="mb-2 block text-sm font-medium text-navy">Periods</span>
              {hmrcLayout ? (
                <>
                  <select
                    className={`${box} mb-3`}
                    value={draft.periodMode}
                    onChange={(event) => changePeriodMode(event.target.value)}
                  >
                    {periodModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3">
                    <select className={box} value={draft.fromWeek} onChange={(event) => patch({ fromWeek: Number(event.target.value) })}>
                      {weeks.map((week) => (
                        <option key={week} value={week}>
                          From Tax Week {week} (ending {taxWeekEndDate(draft.taxYear, week).toLocaleDateString('en-GB')})
                        </option>
                      ))}
                    </select>
                    <select className={box} value={draft.toWeek} onChange={(event) => patch({ toWeek: Number(event.target.value) })}>
                      {weeks.map((week) => (
                        <option key={week} value={week}>
                          To Tax Week {week} (ending {taxWeekEndDate(draft.taxYear, week).toLocaleDateString('en-GB')})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : periodPicker.choices.length === 0 ? (
                <p className="text-sm text-muted">No completed periods are available for this schedule yet.</p>
              ) : (
                <div className="grid gap-3">
                  <select
                    className={box}
                    value={fromPeriodValue}
                    onChange={(event) => changePeriodRange('from', Number(event.target.value))}
                  >
                    {periodPicker.choices.map((choice) => (
                      <option key={`from-${choice.value}`} value={choice.value}>
                        {periodSelectLabel(
                          'From',
                          periodPicker.noun,
                          periodPicker.grain === 'year' ? taxYearSequenceNumber(choice.value) : choice.value,
                          choice.end,
                        )}
                      </option>
                    ))}
                  </select>
                  <select
                    className={box}
                    value={toPeriodValue}
                    onChange={(event) => changePeriodRange('to', Number(event.target.value))}
                  >
                    {periodPicker.choices.map((choice) => (
                      <option key={`to-${choice.value}`} value={choice.value}>
                        {periodSelectLabel(
                          'To',
                          periodPicker.noun,
                          periodPicker.grain === 'year' ? taxYearSequenceNumber(choice.value) : choice.value,
                          choice.end,
                        )}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </StepCard>

        {hmrcLayout ? (
          <StepCard step={2} title="HMRC Payments">
            <div className="flex h-[240px] flex-col overflow-hidden rounded-[10px] border border-[#eceae6]">
              <div className="flex items-center gap-3 border-b border-[#eceae6] px-3 py-2 text-sm font-semibold text-navy">
                <input
                  type="checkbox"
                  className="accent-navy"
                  checked={hmrcPeriods.length > 0 && draft.selectedPeriodIds.length === hmrcPeriods.length}
                  onChange={(event) =>
                    patch({
                      selectedPeriodIds: event.target.checked ? hmrcPeriods.map((period) => period.id) : [],
                    })
                  }
                />
                HMRC Payments
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {hmrcPeriods.map((period) => (
                  <label
                    key={period.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-[#f3f1ec] px-3 py-2.5 text-sm text-navy last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      className="accent-navy"
                      checked={draft.selectedPeriodIds.includes(period.id)}
                      onChange={() => togglePeriod(period.id)}
                    />
                    <CalendarDays size={16} className="shrink-0 text-navy" />
                    {period.label}
                  </label>
                ))}
              </div>
            </div>
          </StepCard>
        ) : (
          <StepCard step={2} title="Preview Employees">
          {runsQuery.isLoading || lockedRunQuery.isLoading ? (
            <Loading />
          ) : people.length === 0 ? (
            <p className="text-sm text-muted">
              No employees from a locked payroll yet. Lock a payroll run to preview them here.
            </p>
          ) : (
            <div className="flex h-[240px] flex-col overflow-hidden rounded-[10px] border border-[#eceae6]">
              <div className="flex items-center gap-3 border-b border-[#eceae6] px-3 py-2 text-sm font-semibold text-navy">
                <input
                  type="checkbox"
                  className="accent-navy"
                  checked={people.length > 0 && draft.selectedEmployeeIds.length === people.length}
                  onChange={(event) =>
                    patch({
                      employeeScope: event.target.checked ? 'all' : 'selected',
                      selectedEmployeeIds: event.target.checked ? people.map((person) => idOf(person)) : [],
                    })
                  }
                />
                Employees
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {people.map((person) => {
                  const id = idOf(person)
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-3 border-b border-[#f3f1ec] px-3 py-2.5 text-sm text-navy last:border-b-0">
                      <input
                        type="checkbox"
                        className="accent-navy"
                        checked={draft.selectedEmployeeIds.includes(id)}
                        onChange={() => toggleEmployee(id)}
                      />
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
                        <User size={14} />
                      </span>
                      {fullName(person.first_name, person.last_name)}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          </StepCard>
        )}

        <StepCard step={3} title="Select Information">
          {spec.selectHint ? <p className="mb-3 text-sm text-muted">{spec.selectHint}</p> : null}
          <div className="flex min-h-[240px] overflow-hidden rounded-[10px] border border-[#eceae6]">
            <div className="w-48 shrink-0 overflow-y-auto border-r border-[#eceae6] p-2">
              {spec.groups.map((group) => (
                <div key={group.label ?? 'main'} className="mb-3 last:mb-0">
                  {group.label ? (
                    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                  ) : null}
                  {group.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={`block w-full rounded-[8px] px-3 py-2 text-left text-sm ${
                        categoryId === category.id ? 'bg-[#eaf3fb] font-semibold text-navy' : 'text-navy hover:bg-cream'
                      }`}
                      onClick={() => setCategoryId(category.id)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy">
                  {spec.groups.flatMap((group) => group.categories).find((item) => item.id === categoryId)?.label}
                </p>
                <button type="button" className="text-sm font-semibold text-[#3d7eb8]" onClick={toggleCategoryAll}>
                  Select All
                </button>
              </div>
              <div className="grid gap-2">
                {categoryFields.map((field) => (
                  <label key={field.id} className="flex cursor-pointer items-center gap-2 text-sm text-navy">
                    <input
                      type="checkbox"
                      className="accent-navy"
                      checked={draft.selectedFieldIds.includes(field.id)}
                      onChange={() => toggleField(field.id)}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </StepCard>

        <StepCard step={4} title="Selected Columns">
          <p className="mb-3 text-sm text-muted">Drag to reorder or remove</p>
          <div className="grid gap-2">
            {selectedFields.length === 0 ? (
              <p className="text-sm text-muted">No columns selected.</p>
            ) : (
              selectedFields.map((field) => (
                <div
                  key={field!.id}
                  draggable
                  onDragStart={() => setDragId(field!.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropField(field!.id)}
                  className="flex cursor-grab items-center gap-2 rounded-[10px] border border-[#eceae6] bg-white px-3 py-2.5 text-sm font-semibold text-navy"
                >
                  <GripVertical size={16} className="text-muted" />
                  <span className="flex-1">{field!.label}</span>
                  <button type="button" aria-label={`Remove ${field!.label}`} onClick={() => toggleField(field!.id)}>
                    <X size={16} className="text-muted" />
                  </button>
                </div>
              ))
            )}
          </div>
        </StepCard>
      </div>
    </div>
  )
}

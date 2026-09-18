import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Loading } from '../../components/ui'
import { fullName, idOf, money } from '../../lib/format'
import type { CalendarDay, CalendarEntitlement, CalendarPayImpact, Employee } from '../../types'

const DAY_TYPES = [
  { value: 'PARENTING', label: 'Parenting Leave', short: 'Parenting Leave', color: '#4aa3df', key: 'parenting' },
  { value: 'MATERNITY', label: 'Maternity leave (SMP)', short: 'Maternity leave', color: '#c45ba8', key: 'maternity' },
  { value: 'PATERNITY', label: 'Paternity leave (SPP)', short: 'Paternity leave', color: '#2a9d8f', key: 'paternity' },
  { value: 'NON_WORKING', label: 'Non-working day', short: 'Non-working day', color: '#b7a8d4', key: 'non_working' },
  { value: 'WORKING', label: 'Working day', short: 'Working day', color: '#3cb46e', key: 'working' },
  { value: 'ANNUAL', label: 'Annual leave', short: 'Annual day', color: '#e6c84a', key: 'annual' },
  { value: 'UNPAID', label: 'Unpaid leave', short: 'Unpaid leave', color: '#e0893a', key: 'unpaid' },
  { value: 'SICK', label: 'Sick leave (SSP)', short: 'Sick leave', color: '#e24b4b', key: 'sick' },
  { value: 'ABSENT', label: 'Absent', short: 'Absent', color: '#e07aa8', key: 'absent' },
  { value: 'ON_STRIKE', label: 'On strike', short: 'On strike', color: '#3d3d8c', key: 'on_strike' },
] as const

const MONTH_LEAVE_LINES = [
  ['annual', 'Annual leave'],
  ['unpaid', 'Unpaid leave'],
  ['sick', 'Sick leave (SSP)'],
  ['maternity', 'Maternity leave (SMP)'],
  ['paternity', 'Paternity leave (SPP)'],
  ['absent', 'Absent'],
  ['on_strike', 'On strike'],
  ['parenting', 'Parenting leave'],
  ['custom', 'Custom leave'],
] as const

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function toKey(date: Date) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate())
}

function fromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      key: toKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    }
  })
}

function keysBetween(a: string, b: string) {
  const start = fromKey(a <= b ? a : b)
  const end = fromKey(a <= b ? b : a)
  const keys: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    keys.push(toKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

function formatLong(key: string) {
  const date = fromKey(key)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRemaining(weeks?: number, days?: number, fallbackWeeks = 0) {
  const remainingWeeks = weeks ?? fallbackWeeks
  const remainingDays = days
  const weekLabel = Number.isInteger(remainingWeeks)
    ? String(remainingWeeks)
    : remainingWeeks.toFixed(1)
  if (remainingDays == null) return `${weekLabel} weeks`
  return `${weekLabel} weeks (${remainingDays} day${remainingDays === 1 ? '' : 's'})`
}

function missingPayDetails(entitlement?: CalendarEntitlement, impact?: CalendarPayImpact) {
  return Number(entitlement?.awe ?? impact?.awe ?? 0) <= 0
}

function remainingLabel(
  kind: 'ssp' | 'smp' | 'spp',
  entitlement?: CalendarEntitlement,
  impact?: CalendarPayImpact,
) {
  if (missingPayDetails(entitlement, impact) && kind !== 'ssp') {
    return 'Needs pay details'
  }
  const balance = entitlement?.[kind]
  if (balance && balance.qualifies === false) return 'Not eligible'
  if (kind === 'ssp') {
    return formatRemaining(entitlement?.ssp?.weeks_remaining, entitlement?.ssp?.days_remaining, 28)
  }
  if (kind === 'smp') {
    return formatRemaining(entitlement?.smp?.weeks_remaining, entitlement?.smp?.days_remaining, 39)
  }
  return formatRemaining(entitlement?.spp?.weeks_remaining, entitlement?.spp?.days_remaining, 2)
}

function colorFor(type?: string | null) {
  return DAY_TYPES.find((item) => item.value === type)?.color ?? '#607080'
}

export function EmployeeCalendarPage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [view, setView] = useState<'month' | 'year'>('month')
  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const drag = useRef<{ start: string; additive: boolean } | null>(null)

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const employees = (employeesQuery.data?.data ?? []) as Employee[]

  useEffect(() => {
    if (employeeId || employees.length === 0) return
    navigate(`/employees/calendar/${idOf(employees[0])}`, { replace: true })
  }, [employeeId, employees, navigate])

  const range = useMemo(() => {
    if (view === 'year') {
      return {
        from: dateKey(cursor.getFullYear(), 0, 1),
        to: dateKey(cursor.getFullYear(), 11, 31),
      }
    }
    const grid = monthGrid(cursor.getFullYear(), cursor.getMonth())
    return { from: grid[0].key, to: grid[grid.length - 1].key }
  }, [cursor, view])

  const daysQuery = useQuery({
    queryKey: ['employee-calendar', companyId, employeeId, range.from, range.to],
    queryFn: () => employeesApi.calendar(companyId!, employeeId!, range.from, range.to),
    enabled: Boolean(companyId && employeeId),
  })
  const entitlementQuery = useQuery({
    queryKey: ['employee-calendar-entitlement', companyId, employeeId, selected[selected.length - 1]],
    queryFn: () =>
      employeesApi.calendarEntitlement(
        companyId!,
        employeeId!,
        selected[selected.length - 1] || toKey(new Date()),
      ),
    enabled: Boolean(companyId && employeeId),
  })
  const monthFrom = dateKey(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthTo = dateKey(
    cursor.getFullYear(),
    cursor.getMonth(),
    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate(),
  )
  const impactQuery = useQuery({
    queryKey: ['employee-calendar-impact', companyId, employeeId, monthFrom, monthTo],
    queryFn: () => employeesApi.calendarPayImpact(companyId!, employeeId!, monthFrom, monthTo),
    enabled: Boolean(companyId && employeeId),
  })

  const daysByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>()
    for (const day of (daysQuery.data?.data ?? []) as CalendarDay[]) {
      map.set(day.date.slice(0, 10), day)
    }
    return map
  }, [daysQuery.data])

  useEffect(() => {
    if (!selected.length) {
      setNotes('')
      return
    }
    const last = daysByDate.get(selected[selected.length - 1])
    setNotes(last?.notes ?? '')
  }, [selected, daysByDate])

  const employee = employees.find((item) => idOf(item) === employeeId)
  const employeeName = fullName(employee?.first_name, employee?.last_name)
  const entitlement = entitlementQuery.data?.data as CalendarEntitlement | undefined
  const impact = impactQuery.data?.data as CalendarPayImpact | undefined
  const selectedSet = new Set(selected)
  const selectedCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of selected) {
      const type = daysByDate.get(key)?.day_type
      if (!type) continue
      counts[type] = (counts[type] ?? 0) + 1
    }
    return counts
  }, [selected, daysByDate])

  function onDayMouseDown(key: string, event: MouseEvent) {
    event.preventDefault()
    drag.current = { start: key, additive: event.ctrlKey || event.metaKey }
    if (drag.current.additive) {
      setSelected((current) =>
        current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
      )
    } else {
      setSelected([key])
    }
  }

  function onDayMouseEnter(key: string) {
    if (!drag.current) return
    const rangeKeys = keysBetween(drag.current.start, key)
    if (drag.current.additive) {
      setSelected((current) => Array.from(new Set([...current, ...rangeKeys])))
    } else {
      setSelected(rangeKeys)
    }
  }

  useEffect(() => {
    function stopDrag() {
      drag.current = null
    }
    window.addEventListener('mouseup', stopDrag)
    return () => window.removeEventListener('mouseup', stopDrag)
  }, [])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['employee-calendar', companyId, employeeId] })
    await queryClient.invalidateQueries({
      queryKey: ['employee-calendar-entitlement', companyId, employeeId],
    })
    await queryClient.invalidateQueries({
      queryKey: ['employee-calendar-impact', companyId, employeeId],
    })
  }

  async function assign(dayType: string, label?: string) {
    if (!companyId || !employeeId || selected.length === 0) return
    const already = selected.every((key) => daysByDate.get(key)?.day_type === dayType)
    setError(null)
    try {
      if (already && dayType !== 'CUSTOM') {
        await employeesApi.clearCalendar(companyId, employeeId, selected)
      } else {
        await employeesApi.assignCalendar(companyId, employeeId, {
          dates: selected,
          day_type: dayType,
          custom_label: label,
          notes: notes.trim() || undefined,
        })
      }
      setCustomOpen(false)
      setCustomLabel('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update calendar')
    }
  }

  async function saveNotes() {
    if (!companyId || !employeeId || selected.length === 0) return
    const hasRows = selected.some((key) => daysByDate.has(key))
    if (!hasRows) return
    try {
      await employeesApi.updateCalendarNotes(companyId, employeeId, selected, notes)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save notes')
    }
  }

  function renderMonth(year: number, month: number, compact = false) {
    const cells = monthGrid(year, month)
    return (
      <div className={compact ? '' : 'overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white'}>
        <div className={`grid grid-cols-7 ${compact ? 'text-[9px]' : 'text-[11px]'} font-semibold text-[#607080]`}>
          {WEEKDAYS.map((day) => (
            <div key={day} className={`${compact ? 'py-1' : 'py-2'} text-center`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const assigned = daysByDate.get(cell.key)
            const isSelected = selectedSet.has(cell.key)
            const leaveColor = assigned ? colorFor(assigned.day_type) : null
            const leaveLabel = assigned
              ? DAY_TYPES.find((item) => item.value === assigned.day_type)?.short ||
                assigned.custom_label ||
                'Leave'
              : null
            return (
              <button
                key={cell.key}
                type="button"
                onMouseDown={(event) => onDayMouseDown(cell.key, event)}
                onMouseEnter={() => onDayMouseEnter(cell.key)}
                className={`relative select-none border border-[#ececec] text-left ${
                  compact ? 'h-[34px] px-1 pt-0.5' : 'min-h-[72px] px-2 pt-1.5'
                } ${isSelected ? 'ring-1 ring-inset ring-navy' : ''}`}
                style={{
                  backgroundColor: leaveColor
                    ? `${leaveColor}${isSelected ? '55' : '33'}`
                    : isSelected
                      ? '#f0f5fe'
                      : '#ffffff',
                  boxShadow: leaveColor ? `inset 4px 0 0 ${leaveColor}` : undefined,
                }}
              >
                <span
                  className={`inline-flex items-center gap-1 ${
                    compact ? 'text-[10px]' : 'text-sm'
                  } font-medium ${cell.inMonth ? 'text-navy' : 'text-[#c0c0c0]'} ${
                    isSelected && !compact
                      ? 'size-7 justify-center rounded-full bg-navy text-white'
                      : ''
                  }`}
                >
                  {cell.day}
                  {assigned && compact ? (
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: leaveColor ?? '#607080' }}
                    />
                  ) : null}
                </span>
                {assigned && !compact ? (
                  <span
                    className="mt-1 block truncate text-[10px] font-semibold"
                    style={{ color: leaveColor ?? '#17375e' }}
                  >
                    {leaveLabel}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center">
        <p className="text-[32px] font-medium text-muted">Select an employee</p>
      </div>
    )
  }

  return (
    <div className="select-none pb-16" onMouseLeave={() => (drag.current = null)}>
      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[32px] leading-none font-semibold text-navy">
            {employeeName === '—' ? 'Employee Name' : employeeName}
          </h2>
          <p className="mt-1 text-xl font-semibold text-navy">Calendar</p>
        </div>
        <p className="max-w-[360px] text-right text-[11px] leading-snug text-[#607080]">
          Select a day, or click and drag to select a series of days. Hold down the ctrl key
          (Windows) or command key (Mac) to make multiple selections.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] border border-[#d9d9d9] bg-white px-4 py-3">
        {DAY_TYPES.map((item) => (
          <span key={item.value} className="flex items-center gap-2 text-xs font-medium text-navy">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <section className="mt-4 rounded-[10px] border border-[#d9d9d9] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-[#d9d9d9] text-navy"
              onClick={() =>
                setCursor((current) => addMonths(current, view === 'year' ? -12 : -1))
              }
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-[#d9d9d9] text-navy"
              onClick={() =>
                setCursor((current) => addMonths(current, view === 'year' ? 12 : 1))
              }
            >
              <ChevronRight size={18} />
            </button>
            <p className="text-lg font-semibold text-navy">
              {view === 'year'
                ? String(cursor.getFullYear())
                : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}
            </p>
          </div>
          <div className="flex overflow-hidden rounded-[8px] border border-[#d9d9d9]">
            <button
              type="button"
              className={`px-4 py-2 text-xs font-semibold ${
                view === 'month' ? 'bg-[#ececec] text-navy' : 'bg-white text-[#607080]'
              }`}
              onClick={() => setView('month')}
            >
              Month Overview
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-xs font-semibold ${
                view === 'year' ? 'bg-[#ececec] text-navy' : 'bg-white text-[#607080]'
              }`}
              onClick={() => setView('year')}
            >
              Year Overview
            </button>
          </div>
        </div>

        {daysQuery.isLoading ? (
          <Loading />
        ) : view === 'month' ? (
          renderMonth(cursor.getFullYear(), cursor.getMonth())
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {MONTHS.map((name, month) => (
              <div key={name}>
                <p className="mb-2 text-sm font-semibold text-navy">
                  {name} {cursor.getFullYear()}
                </p>
                {renderMonth(cursor.getFullYear(), month, true)}
              </div>
            ))}
          </div>
        )}
      </section>

      {selected.length ? (
        <section className="mt-4 rounded-[10px] border border-[#d9d9d9] bg-white p-5">
          <h3 className="text-lg font-semibold text-navy">
            {selected.length === 1
              ? formatLong(selected[0])
              : `${formatLong(selected[0])} – ${formatLong(selected[selected.length - 1])}`}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {DAY_TYPES.map((item) => {
              const active = selected.every((key) => daysByDate.get(key)?.day_type === item.value)
              const unit = Number(impact?.units?.[item.value] ?? 0)
              const preview = unit * selected.length
              const effect = impact?.effects?.[item.value]
              return (
              <button
                key={item.value}
                type="button"
                title={effect?.label}
                className={`inline-flex h-[46px] items-center gap-1.5 rounded-[6px] border px-3 text-xs font-medium hover:bg-[#f0f5fe] ${
                  active ? 'border-navy bg-[#f0f5fe] text-navy' : 'border-[#d9d9d9] bg-white text-navy'
                }`}
                onClick={() => assign(item.value)}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <Plus size={12} />
                <span className="text-left">
                  <span className="block leading-tight">{item.short}</span>
                  <span className="block text-[10px] font-semibold text-[#607080]">
                    {effect?.kind === 'deduct' ? '−' : ''}
                    {money(preview)}
                    {effect?.kind === 'ssp' ? ' SSP' : ''}
                    {effect?.kind === 'smp' ? ' SMP' : ''}
                    {effect?.kind === 'spp' ? ' SPP' : ''}
                  </span>
                </span>
              </button>
              )
            })}
            <button
              type="button"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[6px] border border-[#d9d9d9] bg-white px-3 text-xs font-medium text-navy hover:bg-[#f0f5fe]"
              onClick={() => setCustomOpen(true)}
            >
              <Plus size={12} />
              Add custom leave
            </button>
          </div>
          {customOpen ? (
            <div className="mt-3 flex max-w-[420px] gap-2">
              <input
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                placeholder="Custom leave name"
                className="h-[35px] flex-1 rounded-[6px] border border-[#d9d9d9] px-3 text-xs text-navy outline-none"
              />
              <button
                type="button"
                className="h-[35px] rounded-[6px] bg-navy px-3 text-xs font-semibold text-white"
                onClick={() => assign('CUSTOM', customLabel.trim())}
              >
                Save
              </button>
            </div>
          ) : null}
          {impact ? (
            <div className="mt-4 rounded-[8px] border border-[#d9d9d9] bg-[#f8f7f4] px-4 py-3">
              <p className="text-sm font-semibold text-navy">Amount for {selected.length} selected day{selected.length === 1 ? '' : 's'}</p>
              <p className="mt-1 text-[11px] text-[#607080]">
                {Number(impact.daily_rate) === 0 && Number(impact.awe ?? 0) === 0 ? (
                  <>
                    This employee has no salary, hourly rate or daily rate on their record, so average
                    weekly earnings cannot be calculated. HMRC SSP, SMP and SPP are based on those
                    earnings, which is why the amounts are £0.00. Add pay details on the employee
                    record, then return here to see the statutory rates and remaining leave.
                  </>
                ) : (
                  <>
                    Daily rate {money(impact.daily_rate)}. Average weekly earnings{' '}
                    {money(impact.awe ?? 0)} ({impact.tax_year ?? '2026/27'} HMRC rates). Sick leave
                    pays the lower of 80% of AWE or {money(impact.ssp_weekly)} a week (
                    {money(impact.ssp_daily)} a qualifying day, no waiting days). Maternity pay is
                    90% of AWE for 6 weeks, then the lower of {money(impact.smp_weekly_standard ?? 0)}{' '}
                    and 90% of AWE for up to 33 more weeks. Paternity pay is the lower of{' '}
                    {money(impact.spp_weekly ?? 0)} and 90% of AWE for up to 2 weeks. Statutory leave
                    replaces contractual pay on qualifying days and is added on the payroll record
                    and payslip.
                  </>
                )}
              </p>
              {Object.keys(selectedCounts).length ? (
                <ul className="mt-3 space-y-1 text-sm text-navy">
                  {DAY_TYPES.filter((item) => selectedCounts[item.value]).map((item) => (
                    <li key={item.value} className="flex justify-between gap-4">
                      <span>
                        {item.label}
                        <span className="ml-2 text-[11px] text-[#607080]">
                          {selectedCounts[item.value]} day{selectedCounts[item.value] === 1 ? '' : 's'}
                          {' · '}
                          {impact.effects[item.value]?.label}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {money((impact.units[item.value] ?? 0) * selectedCounts[item.value])}
                      </span>
                    </li>
                  ))}
                  {selectedCounts.CUSTOM ? (
                    <li className="flex justify-between gap-4">
                      <span>
                        Custom leave
                        <span className="ml-2 text-[11px] text-[#607080]">
                          {selectedCounts.CUSTOM} day{selectedCounts.CUSTOM === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {money((impact.units.CUSTOM ?? 0) * selectedCounts.CUSTOM)}
                      </span>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[#607080]">Choose a leave type above to apply it to the selection.</p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-navy">
            Pay on payroll & payslip
            {` · ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}
          </h3>
          {impact && MONTH_LEAVE_LINES.some(([key]) => Number(impact.days[key] ?? 0) > 0) ? (
            <ul className="space-y-1.5 text-sm text-navy">
              {MONTH_LEAVE_LINES.filter(([key]) => Number(impact.days[key] ?? 0) > 0).map(
                ([key, label]) => (
                  <li key={key} className="flex justify-between gap-3">
                    <span>
                      {label}
                      <span className="ml-2 text-[11px] text-[#607080]">
                        {impact.days[key]} day{Number(impact.days[key]) === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{money(impact.amounts[key])}</span>
                  </li>
                ),
              )}
              <li className="mt-2 flex justify-between border-t border-[#d9d9d9] pt-2 font-semibold">
                <span>Deducted from basic pay</span>
                <span className="tabular-nums">{money(impact.total_deduction)}</span>
              </li>
              {Number(impact.sick_pay) > 0 ? (
                <li className="flex justify-between text-[#607080]">
                  <span>Statutory sick pay added</span>
                  <span className="tabular-nums">{money(impact.sick_pay)}</span>
                </li>
              ) : null}
              {Number(impact.maternity_pay) > 0 ? (
                <li className="flex justify-between text-[#607080]">
                  <span>Statutory maternity pay added</span>
                  <span className="tabular-nums">{money(impact.maternity_pay)}</span>
                </li>
              ) : null}
              {Number(impact.paternity_pay) > 0 ? (
                <li className="flex justify-between text-[#607080]">
                  <span>Statutory paternity pay added</span>
                  <span className="tabular-nums">{money(impact.paternity_pay)}</span>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-xs leading-relaxed text-[#607080]">
              Leave assigned in this month is calculated here and applied to the open payroll run and
              payslip for the same period.
            </p>
          )}
        </section>
        <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-navy">
            Leave remaining
            {selected.length ? ` to ${formatLong(selected[selected.length - 1])}` : ''}
          </h3>
          <dl className="space-y-1 text-sm text-navy">
            <div className="flex justify-between">
              <dt>Annual leave entitled</dt>
              <dd className="font-semibold">{entitlement?.days_entitled ?? 28}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Annual leave used</dt>
              <dd className="font-semibold">{entitlement?.days_used ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Annual leave remaining</dt>
              <dd className="font-semibold">{entitlement?.days_remaining ?? 28}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-[#d9d9d9] pt-2">
              <dt>SSP remaining</dt>
              <dd className="font-semibold tabular-nums">
                {remainingLabel('ssp', entitlement, impact)}
              </dd>
            </div>
            <div className="flex justify-between text-[11px] text-[#607080]">
              <dt>SSP rate</dt>
              <dd>
                {missingPayDetails(entitlement, impact)
                  ? 'Needs pay details to calculate 80% of AWE'
                  : `${money(entitlement?.ssp?.weekly_rate ?? impact?.ssp_weekly ?? 0)} a week · ${money(entitlement?.ssp?.daily_rate ?? impact?.ssp_daily ?? 0)} a day`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>SMP remaining</dt>
              <dd className="font-semibold tabular-nums">
                {remainingLabel('smp', entitlement, impact)}
              </dd>
            </div>
            <div className="flex justify-between text-[11px] text-[#607080]">
              <dt>SMP rate</dt>
              <dd>
                {missingPayDetails(entitlement, impact)
                  ? 'Needs pay details'
                  : `6 weeks at ${money(entitlement?.smp?.higher_weekly ?? impact?.smp_weekly_higher ?? 0)}, then ${money(entitlement?.smp?.standard_weekly ?? impact?.smp_weekly_standard ?? 0)}`}
              </dd>
            </div>
            {entitlement?.smp?.reason ? (
              <p className="text-[11px] leading-snug text-[#607080]">{entitlement.smp.reason}</p>
            ) : null}
            <div className="flex justify-between">
              <dt>SPP remaining</dt>
              <dd className="font-semibold tabular-nums">
                {remainingLabel('spp', entitlement, impact)}
              </dd>
            </div>
            <div className="flex justify-between text-[11px] text-[#607080]">
              <dt>SPP rate</dt>
              <dd>
                {missingPayDetails(entitlement, impact)
                  ? 'Needs pay details'
                  : `${money(entitlement?.spp?.weekly_rate ?? impact?.spp_weekly ?? 0)} a week`}
              </dd>
            </div>
            {entitlement?.spp?.reason && entitlement.spp.reason !== entitlement.smp?.reason ? (
              <p className="text-[11px] leading-snug text-[#607080]">{entitlement.spp.reason}</p>
            ) : null}
          </dl>
        </section>
        <section className="rounded-[10px] border border-[#d9d9d9] bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-navy">Add notes</h3>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => void saveNotes()}
            placeholder="Enter notes"
            disabled={selected.length === 0}
            className="min-h-[96px] w-full resize-y rounded-[8px] border border-[#d9d9d9] px-3 py-2 text-xs text-navy outline-none placeholder:text-muted"
          />
        </section>
      </div>
    </div>
  )
}

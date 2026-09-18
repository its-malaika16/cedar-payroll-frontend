import { useMemo, type ReactNode } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatPeriodRange, idOf } from '../../lib/format'
import type { PayrollRun, PayrollSchedule } from '../../types'
import {
  FREQUENCY_META,
  asPayFrequency,
  dateKey,
  hmrcPeriodLabel,
  periodsFromSavedSchedule,
} from './scheduleWizard/payDateRules'
import {
  menuItemClass,
  menuItemSelectedClass,
  menuPanel,
  useMenuOpen,
} from './CreateSendMenu'

export const periodBtn =
  'flex h-[38px] items-center gap-2 rounded-[6px] border border-[#9b9a9a] bg-white px-3 text-[11px] font-medium text-navy disabled:opacity-40'

type PeriodOption = { key: string; label: string; date: Date }

function scheduleLabel(schedule: PayrollSchedule, all: PayrollSchedule[]) {
  const frequency = FREQUENCY_META[asPayFrequency(schedule.pay_frequency)].title
  const name = schedule.schedule_name?.trim()
  const duplicates = all.filter((item) => item.pay_frequency === schedule.pay_frequency).length > 1
  if (name && duplicates) return `${name} · ${frequency}`
  return name || frequency
}

export function runScheduleId(run: PayrollRun) {
  return String(run.schedule_id ?? run.payroll_schedules?.id ?? '')
}

export function findRunForPeriod(
  runs: PayrollRun[],
  scheduleId: string,
  periodKey: string,
  periodStart?: Date,
) {
  return runs.find((run) => {
    if (runScheduleId(run) !== scheduleId) return false
    if (String(run.period_number) === periodKey) return true
    const start = String(run.period_start_date ?? '').slice(0, 10)
    return Boolean(periodStart && start === dateKey(periodStart))
  })
}

function PeriodMenu({
  value,
  options,
  onChange,
  leading,
  triggerClass,
  panelClass,
  disabled,
}: {
  value: string
  options: PeriodOption[]
  onChange: (key: string) => void
  leading?: ReactNode
  triggerClass?: string
  panelClass?: string
  disabled?: boolean
}) {
  const { ref, open, setOpen } = useMenuOpen()
  const selected = options.find((item) => item.key === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`${periodBtn} ${triggerClass ?? ''}`}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((current) => !current)}
      >
        {leading}
        <span className="truncate">{selected?.label ?? 'Select'}</span>
        <ChevronRight size={12} className="ml-auto shrink-0 rotate-90" />
      </button>
      {open ? (
        <div className={`${menuPanel} left-0 max-h-[220px] overflow-y-auto ${panelClass ?? 'min-w-full'}`}>
          {options.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === value ? menuItemSelectedClass : menuItemClass}
              onClick={() => {
                onChange(item.key)
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function PayslipPeriodSwitcher({
  schedules,
  scheduleId,
  periodKey,
  onScheduleChange,
  onPeriodChange,
  disabled,
}: {
  schedules: PayrollSchedule[]
  scheduleId: string
  periodKey: string
  onScheduleChange: (scheduleId: string) => void
  onPeriodChange: (periodKey: string) => void
  disabled?: boolean
}) {
  const selectedSchedule =
    schedules.find((schedule) => idOf(schedule) === scheduleId) ?? schedules[0]
  const selectedScheduleId = selectedSchedule ? idOf(selectedSchedule) : ''
  const schedulePeriods = useMemo(
    () => (selectedSchedule ? periodsFromSavedSchedule(selectedSchedule).periods : []),
    [selectedSchedule],
  )
  const scheduleOptions = useMemo<PeriodOption[]>(
    () =>
      schedules.map((schedule) => ({
        key: idOf(schedule),
        label: scheduleLabel(schedule, schedules),
        date: new Date(schedule.first_period_start_date),
      })),
    [schedules],
  )
  const periodOptions = useMemo<PeriodOption[]>(
    () =>
      schedulePeriods.map((period) => ({
        key: String(period.number),
        date: period.start,
        label: `${formatPeriodRange(period.start, period.end)} (${hmrcPeriodLabel(selectedSchedule?.pay_frequency, period)})`,
      })),
    [schedulePeriods, selectedSchedule],
  )
  const selectedKey = periodOptions.some((item) => item.key === periodKey)
    ? periodKey
    : periodOptions[0]?.key ?? ''
  const periodIndex = Math.max(
    0,
    periodOptions.findIndex((item) => item.key === selectedKey),
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={periodBtn}
        disabled={disabled || periodIndex <= 0 || periodOptions.length === 0}
        onClick={() => onPeriodChange(periodOptions[periodIndex - 1]?.key ?? selectedKey)}
      >
        <ChevronLeft size={12} />
        Previous Period
      </button>
      <PeriodMenu
        value={selectedScheduleId}
        options={scheduleOptions}
        onChange={onScheduleChange}
        disabled={disabled}
        triggerClass="min-w-[150px] max-w-[220px]"
        panelClass="w-[240px]"
      />
      <PeriodMenu
        value={selectedKey}
        options={periodOptions}
        onChange={onPeriodChange}
        disabled={disabled}
        leading={<CalendarDays size={16} className="shrink-0" />}
        triggerClass="min-w-[280px] max-w-[420px]"
        panelClass="w-[380px]"
      />
      <button
        type="button"
        className={periodBtn}
        disabled={disabled || periodIndex >= periodOptions.length - 1 || periodOptions.length === 0}
        onClick={() => onPeriodChange(periodOptions[periodIndex + 1]?.key ?? selectedKey)}
      >
        Next Period
        <ChevronRight size={12} />
      </button>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  FileText,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react'
import { payrollApi, timesheetsApi } from '../../../api'
import { useAuth } from '../../../auth/AuthContext'
import { Alert, Button, Loading } from '../../../components/ui'
import { formatPeriodRange, fullName, idOf } from '../../../lib/format'
import type { PayrollSchedule } from '../../../types'
import { parseDateKey } from '../rota/rotaDates'
import { formatClock, formatTimeRange } from '../rota/rotaModel'
import { StatCard } from './TimesheetStatusBadge'
import {
  adjacentTimesheetPeriod,
  pickPaySchedule,
  timesheetPeriodFromSchedule,
  timesheetsListSearch,
  writeTimesheetSelection,
} from './timesheetPeriod'
import {
  canApprove,
  canEdit,
  canReopen,
  canSend,
  formatBreak,
  formatHours,
  hoursFromClocks,
  isTimesheetDirty,
  type TimesheetDay,
  type TimesheetDetail,
} from './timesheetTypes'

function toTimeInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function fromTimeInput(day: string, time: string) {
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  const date = parseDateKey(day)
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date.toISOString()
}

function TimesheetClockField({
  day,
  value,
  onChange,
  ariaLabel,
}: {
  day: string
  value?: string | null
  onChange: (iso: string | null) => void
  ariaLabel: string
}) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const display = value ? formatClock(new Date(value)) : ''

  function openPicker() {
    const picker = pickerRef.current
    if (!picker) return
    if (typeof picker.showPicker === 'function') picker.showPicker()
    else picker.click()
  }

  return (
    <div className="relative w-[148px]">
      <button
        type="button"
        className="flex h-10 w-full items-center rounded-[8px] border border-[#d9d9d9] bg-white px-3 pr-10 text-left text-sm text-navy outline-none hover:border-navy/40 focus:border-navy"
        aria-label={ariaLabel}
        onClick={openPicker}
      >
        <span className={display ? 'truncate' : 'text-muted'}>{display || '—'}</span>
      </button>
      <Clock size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/40" />
      <input
        ref={pickerRef}
        type="time"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={toTimeInput(value)}
        onChange={(event) => onChange(fromTimeInput(day, event.target.value))}
      />
    </div>
  )
}

function dayLabel(value: string) {
  const date = parseDateKey(value)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function TimesheetDetailPage({ mode }: { mode: 'review' | 'edit' }) {
  const { employeeId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const params = new URLSearchParams(location.search)
  const scheduleId = params.get('schedule')
  const schedules = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const paySchedule = pickPaySchedule(
    ((schedules.data?.data ?? []) as PayrollSchedule[]),
    scheduleId,
  )
  const fallback = timesheetPeriodFromSchedule(paySchedule)
  const from = params.get('from') || fallback.from
  const to = params.get('to') || fallback.to
  const periodStart = parseDateKey(from)
  const periodEnd = parseDateKey(to)
  const selectedScheduleId = paySchedule ? idOf(paySchedule) : ''
  const selectedPeriodKey = params.get('period') || fallback.periodKey
  const listPath = timesheetsListSearch({
    scheduleId: scheduleId || selectedScheduleId,
    periodKey: selectedPeriodKey,
    from,
    to,
  })
  const requestEdit = mode === 'edit'
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<TimesheetDay[]>([])
  const [daysBaseline, setDaysBaseline] = useState<TimesheetDay[] | null>(null)

  const detail = useQuery({
    queryKey: ['timesheet-detail', companyId, employeeId, from, to],
    queryFn: () => timesheetsApi.detail(companyId!, employeeId, from, to),
    enabled: Boolean(companyId && employeeId),
  })

  const sheet = detail.data?.data as TimesheetDetail | undefined
  const sheetKey = `${sheet?.timesheet_id ?? 'none'}:${employeeId}:${from}:${to}`
  const hasDays = Boolean(sheet?.days)
  const locked = Boolean(sheet && !canEdit(sheet.status))
  const editing = requestEdit && !locked

  useEffect(() => {
    if (companyId && scheduleId) {
      writeTimesheetSelection(companyId, scheduleId, selectedPeriodKey)
    }
  }, [companyId, scheduleId, selectedPeriodKey])

  useEffect(() => {
    if (!sheet?.days) return
    setDays(sheet.days)
    setDaysBaseline(sheet.days)
  }, [sheetKey, hasDays])

  useEffect(() => {
    if (!requestEdit || !sheet || canEdit(sheet.status)) return
    const search = new URLSearchParams({ from, to })
    if (selectedScheduleId) search.set('schedule', selectedScheduleId)
    if (selectedPeriodKey) search.set('period', selectedPeriodKey)
    navigate(`/timesheets/${employeeId}?${search.toString()}`, { replace: true })
  }, [requestEdit, sheet, employeeId, from, to, selectedScheduleId, selectedPeriodKey, navigate])

  const totals = useMemo(() => {
    return {
      scheduled_hours: days.reduce((sum, day) => sum + day.scheduled_hours, 0),
      worked_hours: days.reduce((sum, day) => sum + day.worked_hours, 0),
      overtime_hours: days.reduce((sum, day) => sum + day.overtime_hours, 0),
    }
  }, [days])

  function patchDay(index: number, patch: Partial<TimesheetDay>) {
    setDays((current) => {
      const next = [...current]
      const day = { ...next[index], ...patch }
      const computed = hoursFromClocks(
        day.clock_in,
        day.clock_out,
        day.break_minutes,
        day.paid_break,
        day.scheduled_end,
      )
      day.clock_out = computed.clock_out
      day.worked_hours = computed.worked_hours
      day.overtime_hours = Math.max(0, Math.round((day.worked_hours - day.scheduled_hours) * 100) / 100)
      next[index] = day
      return next
    })
  }

  async function persist(nextDays = days) {
    if (!companyId || !sheet) return sheet?.timesheet_id ?? null
    if (!canEdit(sheet.status)) return sheet.timesheet_id
    let timesheetId = sheet.timesheet_id
    if (!timesheetId) {
      const created = await timesheetsApi.ensure(companyId, {
        employee_id: employeeId,
        period_start: from,
        period_end: to,
      })
      timesheetId = idOf(created.data)
    }
        await timesheetsApi.update(companyId, timesheetId, {
      entries: nextDays.map((day) => ({
        work_date: day.date,
        start_time: day.clock_in || null,
        end_time: day.clock_out || null,
        break_minutes: Math.round(Number(day.break_minutes) || 0),
        hours: Number(day.worked_hours) || 0,
      })),
    })
    await queryClient.invalidateQueries({ queryKey: ['timesheet-detail', companyId, employeeId, from, to] })
    await queryClient.invalidateQueries({ queryKey: ['timesheets', companyId] })
    return timesheetId
  }

  const save = useMutation({
    mutationFn: async () => persist(),
    onSuccess: async () => {
      setError(null)
      const refreshed = await queryClient.fetchQuery({
        queryKey: ['timesheet-detail', companyId, employeeId, from, to],
        queryFn: () => timesheetsApi.detail(companyId!, employeeId, from, to),
      })
      const nextDays = (refreshed.data as TimesheetDetail | undefined)?.days
      if (nextDays) {
        setDays(nextDays)
        setDaysBaseline(nextDays)
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save timesheet'),
  })

  const act = useMutation({
    mutationFn: async (action: 'approve' | 'send' | 'changes' | 'reopen') => {
      const timesheetId = await persist()
      if (!timesheetId || !companyId) throw new Error('Timesheet could not be saved')
      if (action === 'approve') await timesheetsApi.review(companyId, timesheetId, { status: 'APPROVED' })
      if (action === 'send') await timesheetsApi.sendToPayroll(companyId, timesheetId)
      if (action === 'reopen') await timesheetsApi.reopen(companyId, timesheetId)
      if (action === 'changes') {
        await timesheetsApi.review(companyId, timesheetId, {
          status: 'REJECTED',
          rejection_reason: 'Changes requested',
        })
      }
    },
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['timesheets', companyId] })
      navigate(listPath)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Action failed'),
  })

  function shiftPeriod(direction: number) {
    const next = adjacentTimesheetPeriod(paySchedule, from, to, direction)
    if (!next) return
    const search = new URLSearchParams({ from: next.from, to: next.to })
    if (selectedScheduleId) search.set('schedule', selectedScheduleId)
    if (next.periodKey) search.set('period', next.periodKey)
    navigate(`${location.pathname}?${search.toString()}`)
  }

  if (detail.isLoading) return <Loading />
  if (!sheet) {
    return <Alert>Timesheet not found.</Alert>
  }

  const status = sheet.status
  const name = fullName(sheet.employee.first_name, sheet.employee.last_name)

  const reviewSearch = new URLSearchParams({ from, to })
  if (selectedScheduleId) reviewSearch.set('schedule', selectedScheduleId)
  if (selectedPeriodKey) reviewSearch.set('period', selectedPeriodKey)
  const reviewPath = `/timesheets/${employeeId}?${reviewSearch.toString()}`

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
        <Link to={listPath} className="hover:underline">
          Timesheets
        </Link>
        {' > '}
        Review
        {editing ? ' > Edit' : ''}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 text-[32px] font-semibold leading-none text-navy"
          onClick={() => navigate(editing ? reviewPath : listPath)}
          aria-label="Back"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          {name} Timesheet
        </button>
      </div>
      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Clock3 size={18} />} label="Scheduled Hours" value={formatHours(totals.scheduled_hours)} />
        <StatCard icon={<Check size={18} />} label="Worked Hours" value={formatHours(totals.worked_hours)} />
        <StatCard icon={<FileText size={18} />} label="Overtime Hours" value={formatHours(totals.overtime_hours)} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-[16px] border border-[#e4e2dd] bg-white">
        <div className="flex items-center justify-center gap-2 border-b border-[#eceae6] px-4 py-3 text-sm font-semibold text-navy">
          <CalendarDays size={16} className="text-navy/60" />
          <button type="button" className="rounded p-1 hover:bg-cream" onClick={() => shiftPeriod(-1)} aria-label="Previous period">
            <ChevronLeft size={18} />
          </button>
          <span>{formatPeriodRange(periodStart, periodEnd)}</span>
          <button type="button" className="rounded p-1 hover:bg-cream" onClick={() => shiftPeriod(1)} aria-label="Next period">
            <ChevronRight size={18} />
          </button>
        </div>
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-[#eceae6] bg-[#f7f6f3] text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Scheduled Shift</th>
              <th className="px-4 py-3">Clock In</th>
              <th className="px-4 py-3">Clock Out</th>
              <th className="px-4 py-3">Break</th>
              <th className="px-4 py-3">Total Hours</th>
              <th className="px-4 py-3">Overtime</th>
              {editing ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee]">
            {days.map((day, index) => (
              <tr key={day.date}>
                <td className="px-4 py-3 font-medium text-navy">{dayLabel(day.date)}</td>
                <td className="px-4 py-3 text-navy/80">
                  {day.scheduled_start && day.scheduled_end
                    ? formatTimeRange(day.scheduled_start, day.scheduled_end)
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {editing ? (
                    <TimesheetClockField
                      day={day.date}
                      value={day.clock_in}
                      ariaLabel={`Clock in ${dayLabel(day.date)}`}
                      onChange={(clock_in) => patchDay(index, { clock_in })}
                    />
                  ) : day.clock_in ? (
                    formatClock(new Date(day.clock_in))
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing ? (
                    <TimesheetClockField
                      day={day.date}
                      value={day.clock_out}
                      ariaLabel={`Clock out ${dayLabel(day.date)}`}
                      onChange={(clock_out) => patchDay(index, { clock_out })}
                    />
                  ) : day.clock_out ? (
                    formatClock(new Date(day.clock_out))
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      className="h-10 w-[88px] rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none focus:border-navy"
                      value={day.break_minutes}
                      onChange={(event) =>
                        patchDay(index, { break_minutes: Number(event.target.value) || 0 })
                      }
                    />
                  ) : (
                    formatBreak(day.break_minutes)
                  )}
                </td>
                <td className="px-4 py-3 text-navy/80">{formatHours(day.worked_hours)}</td>
                <td className="px-4 py-3 text-navy/80">{formatHours(day.overtime_hours)}</td>
                {editing ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-brand"
                      aria-label="Clear day"
                      onClick={() =>
                        patchDay(index, {
                          clock_in: null,
                          clock_out: null,
                          break_minutes: 0,
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {editing ? (
          <Button
            variant="secondary"
            onClick={() => save.mutate()}
            disabled={save.isPending || !isTimesheetDirty(days, daysBaseline)}
          >
            Save changes
          </Button>
        ) : canEdit(status) ? (
          <Link to={`/timesheets/${employeeId}/edit?from=${from}&to=${to}${selectedScheduleId ? `&schedule=${selectedScheduleId}` : ''}`}>
            <Button variant="secondary">
              <Pencil size={16} />
              Change / Edit
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" disabled title="Reopen this timesheet before making changes">
            <Pencil size={16} />
            Change / Edit
          </Button>
        )}
        {editing ? null : canSend(status) ? (
          <Button variant="secondary" onClick={() => act.mutate('send')} disabled={act.isPending}>
            <Send size={16} />
            Send to Payroll
          </Button>
        ) : null}
        {editing ? null : canReopen(status) ? (
          <Button variant="secondary" onClick={() => act.mutate('reopen')} disabled={act.isPending}>
            Reopen
          </Button>
        ) : null}
        {canApprove(status) ? (
          <Button onClick={() => act.mutate('approve')} disabled={act.isPending}>
            <Check size={16} />
            Approve Timesheet
          </Button>
        ) : null}
      </div>
    </div>
  )
}

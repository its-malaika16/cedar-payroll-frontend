import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
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
import { adjacentTimesheetPeriod, pickPaySchedule, timesheetPeriodFromSchedule } from './timesheetPeriod'
import {
  canApprove,
  canEdit,
  canSend,
  formatBreak,
  formatHours,
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
  const editing = mode === 'edit'
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<TimesheetDay[]>([])

  const detail = useQuery({
    queryKey: ['timesheet-detail', companyId, employeeId, from, to],
    queryFn: () => timesheetsApi.detail(companyId!, employeeId, from, to),
    enabled: Boolean(companyId && employeeId),
  })

  const sheet = detail.data?.data as TimesheetDetail | undefined

  useEffect(() => {
    if (sheet?.days) setDays(sheet.days)
  }, [sheet])

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
      const start = day.clock_in ? new Date(day.clock_in) : null
      const end = day.clock_out ? new Date(day.clock_out) : null
      const worked =
        start && end
          ? Math.max(0, (end.getTime() - start.getTime()) / 3_600_000 - (day.break_minutes || 0) / 60)
          : 0
      day.worked_hours = Math.round(worked * 100) / 100
      day.overtime_hours = Math.max(0, Math.round((day.worked_hours - day.scheduled_hours) * 100) / 100)
      next[index] = day
      return next
    })
  }

  async function persist(nextDays = days) {
    if (!companyId || !sheet) return sheet?.timesheet_id ?? null
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
        start_time: day.clock_in || undefined,
        end_time: day.clock_out || undefined,
        break_minutes: day.break_minutes,
        hours: day.worked_hours > 0 ? day.worked_hours : day.scheduled_hours,
      })),
    })
    await queryClient.invalidateQueries({ queryKey: ['timesheet-detail', companyId, employeeId, from, to] })
    await queryClient.invalidateQueries({ queryKey: ['timesheets', companyId] })
    return timesheetId
  }

  const save = useMutation({
    mutationFn: async () => persist(),
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save timesheet'),
  })

  const act = useMutation({
    mutationFn: async (action: 'approve' | 'send' | 'changes') => {
      const timesheetId = await persist()
      if (!timesheetId || !companyId) throw new Error('Timesheet could not be saved')
      if (action === 'approve') await timesheetsApi.review(companyId, timesheetId, { status: 'APPROVED' })
      if (action === 'send') await timesheetsApi.sendToPayroll(companyId, timesheetId)
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
      navigate('/timesheets')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Action failed'),
  })

  function shiftPeriod(direction: number) {
    const next = adjacentTimesheetPeriod(paySchedule, from, to, direction)
    if (!next) return
    const search = new URLSearchParams({ from: next.from, to: next.to })
    if (selectedScheduleId) search.set('schedule', selectedScheduleId)
    navigate(`${location.pathname}?${search.toString()}`)
  }

  if (detail.isLoading) return <Loading />
  if (!sheet) {
    return <Alert>Timesheet not found.</Alert>
  }

  const status = sheet.status
  const name = fullName(sheet.employee.first_name, sheet.employee.last_name)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
        <Link to="/timesheets" className="hover:underline">
          Timesheets
        </Link>
        {' > '}
        Review
        {editing ? ' > Edit' : ''}
      </p>
      <h1 className="mt-3 text-[32px] font-semibold text-navy">{name} Timesheet</h1>
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
        <table className="w-full min-w-[980px] text-left text-sm">
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
                    <label className="relative block">
                      <input
                        type="time"
                        className="h-10 w-[118px] rounded-[8px] border border-[#d9d9d9] bg-white px-2 pr-8 text-sm text-navy"
                        value={toTimeInput(day.clock_in)}
                        onChange={(event) =>
                          patchDay(index, { clock_in: fromTimeInput(day.date, event.target.value) })
                        }
                      />
                      <Pencil size={12} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-navy/40" />
                    </label>
                  ) : day.clock_in ? (
                    formatClock(new Date(day.clock_in))
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing ? (
                    <label className="relative block">
                      <input
                        type="time"
                        className="h-10 w-[118px] rounded-[8px] border border-[#d9d9d9] bg-white px-2 pr-8 text-sm text-navy"
                        value={toTimeInput(day.clock_out)}
                        onChange={(event) =>
                          patchDay(index, { clock_out: fromTimeInput(day.date, event.target.value) })
                        }
                      />
                      <Pencil size={12} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-navy/40" />
                    </label>
                  ) : day.clock_out ? (
                    formatClock(new Date(day.clock_out))
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing ? (
                    <label className="relative block">
                      <input
                        type="number"
                        min={0}
                        className="h-10 w-[88px] rounded-[8px] border border-[#d9d9d9] bg-white px-2 pr-8 text-sm text-navy"
                        value={day.break_minutes}
                        onChange={(event) =>
                          patchDay(index, { break_minutes: Number(event.target.value) || 0 })
                        }
                      />
                      <Pencil size={12} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-navy/40" />
                    </label>
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
          <Button variant="secondary" onClick={() => save.mutate()} disabled={save.isPending}>
            Save changes
          </Button>
        ) : canEdit(status) ? (
          <Link to={`/timesheets/${employeeId}/edit?from=${from}&to=${to}${selectedScheduleId ? `&schedule=${selectedScheduleId}` : ''}`}>
            <Button variant="secondary">
              <Pencil size={16} />
              Change / Edit
            </Button>
          </Link>
        ) : null}
        {canSend(status) ? (
          <Button variant="secondary" onClick={() => act.mutate('send')} disabled={act.isPending}>
            <Send size={16} />
            Send to Payroll
          </Button>
        ) : null}
        {canApprove(status) || editing ? (
          <Button onClick={() => act.mutate('approve')} disabled={act.isPending}>
            <Check size={16} />
            Approve Timesheet
          </Button>
        ) : null}
      </div>
    </div>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogOut,
  Plus,
  Send,
  User,
  CalendarPlus,
} from 'lucide-react'
import { employeesApi, hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading, PageHeader } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { CalendarDay, Employee } from '../../types'
import { RotaMonthGrid, RotaWeekGrid } from './rota/RotaGrid'
import type { ShiftAction } from './rota/ShiftCard'
import { ShiftModal, formFromShift, selectedEmployeeIds, shiftPayload, type ShiftFormValue, type ShiftModalMode } from './rota/ShiftModal'
import {
  addDays,
  dateKey,
  formatMonthLabel,
  formatWeekRange,
  startOfWeek,
  weekDays,
  weeksInMonth,
} from './rota/rotaDates'
import {
  calendarLeaveLabel,
  decodeShiftNotes,
  employeeIdOf,
  hoursBetween,
  isApprovedLeave,
  leaveCoversDate,
  shiftDateKey,
  type LeaveItem,
  type RotaShift,
} from './rota/rotaModel'

type ViewMode = 'week' | 'month'

function jobTitleOf(employee: Employee): string | null {
  const details = Array.isArray(employee.employment_details)
    ? employee.employment_details[0]
    : employee.employment_details
  if (!details || typeof details !== 'object') return null
  const title = (details as { job_title?: string }).job_title
  return title?.trim() || null
}

function StatCard({
  icon,
  label,
  value,
  period,
}: {
  icon: ReactNode
  label: string
  value: string
  period: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[16px] border border-[#e4e2dd] bg-white px-5 py-4">
      <span className="mt-0.5 flex size-9 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-navy">{value}</p>
        <p className="text-xs text-muted">{period}</p>
      </div>
    </div>
  )
}

export function ShiftsPage() {
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<{
    mode: ShiftModalMode
    initial: Partial<ShiftFormValue>
    shiftId?: string
  } | null>(null)

  const weekStart = startOfWeek(anchor)
  const weekDaysList = useMemo(() => weekDays(weekStart), [weekStart])
  const monthWeeks = useMemo(() => weeksInMonth(anchor), [anchor])
  const monthLast = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const visibleDays = view === 'week' ? weekDaysList : monthWeeks.flat()
  const rangeStart = view === 'week' ? weekStart : new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const rangeFrom = dateKey(rangeStart)
  const rangeTo = dateKey(view === 'week' ? addDays(weekStart, 6) : monthLast)
  const periodLabel = view === 'week' ? 'This week' : 'This month'
  const rangeLabel = view === 'week' ? formatWeekRange(weekStart) : formatMonthLabel(anchor)

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const shiftsQuery = useQuery({
    queryKey: ['shifts', companyId],
    queryFn: () => hrApi.shifts(companyId!),
    enabled: Boolean(companyId),
  })
  const leaveQuery = useQuery({
    queryKey: ['leave', companyId],
    queryFn: () => hrApi.leaveAll(companyId!),
    enabled: Boolean(companyId),
  })
  const calendarLeaveQuery = useQuery({
    queryKey: ['calendar-leave', companyId, rangeFrom, rangeTo],
    queryFn: () => employeesApi.companyCalendarLeave(companyId!, rangeFrom, rangeTo),
    enabled: Boolean(companyId && rangeFrom && rangeTo),
  })
  const rotaStatusQuery = useQuery({
    queryKey: ['rota-status', companyId, rangeFrom, rangeTo],
    queryFn: () => hrApi.rotaStatus(companyId!, rangeFrom, rangeTo),
    enabled: Boolean(companyId && rangeFrom && rangeTo),
  })

  const people = useMemo(() => {
    const list = (employeesQuery.data?.data ?? []) as Employee[]
    return [...list].sort((left, right) =>
      fullName(left.first_name, left.last_name).localeCompare(
        fullName(right.first_name, right.last_name),
        'en-GB',
        { sensitivity: 'base' },
      ),
    )
  }, [employeesQuery.data])
  const shifts = ((shiftsQuery.data?.data as RotaShift[] | undefined) ?? []).map((shift) => ({
    ...shift,
    id: idOf(shift),
    employee_id: shift.employee_id == null || shift.employee_id === '' ? null : String(shift.employee_id),
  }))
  const leave = useMemo(() => {
    const fromRequests = ((leaveQuery.data?.data as LeaveItem[] | undefined) ?? []).map((item) => ({
      ...item,
      id: idOf(item),
      employee_id: item.employee_id == null ? '' : String(item.employee_id),
    }))
    const fromCalendar = ((calendarLeaveQuery.data?.data as CalendarDay[] | undefined) ?? []).map((day) => ({
      id: `calendar:${day.id}`,
      employee_id: day.employee_id == null ? '' : String(day.employee_id),
      start_date: String(day.date ?? '').slice(0, 10),
      end_date: String(day.date ?? '').slice(0, 10),
      status: 'CALENDAR',
      leave_type: calendarLeaveLabel(day.day_type, day.custom_label),
    }))
    return [...fromRequests, ...fromCalendar]
  }, [leaveQuery.data, calendarLeaveQuery.data])

  const roles = useMemo(() => {
    const fromShifts = shifts.map((shift) => shift.role_name?.trim()).filter(Boolean) as string[]
    const fromJobs = people.map(jobTitleOf).filter(Boolean) as string[]
    return [...new Set(['Administrator', ...fromJobs, ...fromShifts])]
  }, [people, shifts])

  const stats = useMemo(() => {
    if (!rangeStart) {
      return { scheduled: 0, hours: 0, open: 0, leaveCount: 0 }
    }
    const days =
      view === 'month'
        ? visibleDays.filter((day) => dateKey(day) >= rangeFrom && dateKey(day) <= rangeTo)
        : weekDaysList
    const inPeriod = shifts.filter((shift) => {
      const key = shiftDateKey(shift)
      return days.some((day) => dateKey(day) === key)
    })
    const assigned = inPeriod.filter((shift) => shift.employee_id)
    const scheduledIds = new Set(assigned.map((shift) => String(shift.employee_id)))
    const hours = assigned.reduce((total, shift) => {
      const meta = decodeShiftNotes(shift.notes)
      return total + hoursBetween(shift.start_time, shift.end_time, meta.breakMinutes)
    }, 0)
    const leaveIds = new Set(
      leave
        .filter((item) => isApprovedLeave(item))
        .filter((item) => days.some((day) => leaveCoversDate(item, dateKey(day))))
        .map((item) => employeeIdOf(item))
        .filter(Boolean),
    )
    return {
      scheduled: scheduledIds.size,
      hours: Math.round(hours),
      open: inPeriod.filter((shift) => !shift.employee_id).length,
      leaveCount: leaveIds.size,
    }
  }, [shifts, leave, rangeFrom, rangeTo, view, visibleDays, weekDaysList])

  function openCreate(employeeId: string | null, date: Date) {
    const person = people.find((item) => idOf(item) === employeeId)
    setError(null)
    setModal({
      mode: 'create',
      initial: {
        employee_id: employeeId ?? '',
        date: dateKey(date),
        time: '9:00 am - 5:00 pm',
        role: person ? jobTitleOf(person) ?? '' : '',
      },
    })
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['shifts', companyId] })
    await queryClient.invalidateQueries({ queryKey: ['rota-status', companyId] })
  }

  async function saveForm(form: ShiftFormValue) {
    if (!companyId || !modal) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload = shiftPayload(form)
      if (modal.mode === 'create') {
        const employeeIds = selectedEmployeeIds(form)
        const body = {
          shift_date: payload.shift_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          role_name: payload.role_name,
          notes: payload.notes,
        }
        if (employeeIds.length === 0) {
          await hrApi.createShift(companyId, null, body)
        } else {
          for (const employeeId of employeeIds) {
            await hrApi.createShift(companyId, employeeId, body)
          }
        }
      } else if (modal.shiftId) {
        const body: Record<string, unknown> = {
          shift_date: payload.shift_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          role_name: payload.role_name,
          notes: payload.notes,
        }
        if (modal.mode !== 'move') body.employee_id = payload.employee_id
        await hrApi.updateShift(companyId, modal.shiftId, body)
      }
      setModal(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save shift')
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(shift: RotaShift, action: ShiftAction) {
    if (!companyId) return
    setError(null)
    setNotice(null)
    try {
      if (action === 'edit') {
        setModal({ mode: 'edit', initial: formFromShift(shift), shiftId: idOf(shift) })
        return
      }
      if (action === 'move') {
        setModal({ mode: 'move', initial: formFromShift(shift), shiftId: idOf(shift) })
        return
      }
      if (action === 'delete') {
        if (!window.confirm('Delete this shift?')) return
        await hrApi.deleteShift(companyId, idOf(shift))
        await refresh()
        return
      }
      if (action === 'open') {
        await hrApi.updateShift(companyId, idOf(shift), { employee_id: '' })
        await refresh()
        return
      }
      if (action === 'duplicate') {
        const payload = shiftPayload(formFromShift(shift))
        await hrApi.createShift(companyId, null, {
          shift_date: payload.shift_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          role_name: payload.role_name,
          notes: payload.notes,
        })
        await refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update shift')
    }
  }

  async function publish() {
    if (!companyId || !rangeFrom || !rangeTo) return
    setError(null)
    try {
      const result = await hrApi.publishRota(companyId, rangeFrom, rangeTo)
      setNotice(result.message)
      await queryClient.invalidateQueries({ queryKey: ['rota-status', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish rota')
    }
  }

  const loading = employeesQuery.isLoading || shiftsQuery.isLoading
  const rotaStatus = rotaStatusQuery.data?.data as
    | { published?: boolean; dirty?: boolean; published_at?: string | null }
    | undefined
  const needsRepublish = Boolean(rotaStatus?.dirty)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Rota"
        subtitle="Assign shifts, then publish so the team can see their rota."
        actions={
          <>
            <Button onClick={() => openCreate(null, rangeStart)}>
              <Plus size={16} />
              Add Shift
            </Button>
            <Link to="/hr/leave">
              <Button variant="secondary">
                <LogOut size={16} />
                Leave
              </Button>
            </Link>
            <Link to="/hr/attendance">
              <Button variant="secondary">
                <CheckSquare size={16} />
                Attendance
              </Button>
            </Link>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {needsRepublish ? (
        <div className="mb-4">
          <Alert tone="warning" className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Shifts have changed since this rota was published. Publish again so employees can see
              the updates. Only staff whose shifts changed will be notified.
            </span>
            <Button type="button" onClick={() => void publish()}>
              <Send size={16} />
              Publish Rota
            </Button>
          </Alert>
        </div>
      ) : notice || rotaStatus?.published ? (
        <div className="mb-4">
          <Alert tone="success">
            {notice || 'Rota published for the selected period.'}
          </Alert>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<User size={18} />} label="Employees Scheduled" value={String(stats.scheduled)} period={periodLabel} />
        <StatCard
          icon={<Clock3 size={18} />}
          label="Scheduled Hours"
          value={`${stats.hours.toLocaleString('en-GB')} hrs`}
          period={periodLabel}
        />
        <StatCard icon={<CalendarPlus size={18} />} label="Open Shifts" value={String(stats.open)} period={periodLabel} />
        <StatCard icon={<LogOut size={18} />} label="On Leave" value={String(stats.leaveCount)} period={periodLabel} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-[10px] border border-[#d9d9d9] bg-white p-1 text-sm font-semibold">
          <button
            type="button"
            className={`rounded-[8px] px-3 py-1.5 ${view === 'week' ? 'bg-navy text-white' : 'text-navy'}`}
            onClick={() => {
              setView('week')
              setAnchor(startOfWeek(anchor))
            }}
          >
            Week Overview
          </button>
          <button
            type="button"
            className={`rounded-[8px] px-3 py-1.5 ${view === 'month' ? 'bg-navy text-white' : 'text-navy'}`}
            onClick={() => {
              setView('month')
              setAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
            }}
          >
            Month Overview
          </button>
        </div>
        <div className="inline-flex h-[38px] items-center gap-1 rounded-[6px] border border-[#9b9a9a] bg-white px-1 text-navy">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-[6px] hover:bg-cream"
            aria-label="Previous"
            onClick={() =>
              setAnchor((current) =>
                view === 'week' ? addDays(current, -7) : new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[160px] px-2 text-center text-[11px] font-semibold">{rangeLabel}</span>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-[6px] hover:bg-cream"
            aria-label="Next"
            onClick={() =>
              setAnchor((current) =>
                view === 'week' ? addDays(current, 7) : new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="ml-auto">
          <Button variant="secondary" onClick={() => void publish()}>
            <Send size={16} />
            Publish Rota
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[16px] border border-[#e4e2dd] bg-white">
        {loading ? (
          <Loading />
        ) : view === 'week' ? (
          <RotaWeekGrid
            days={weekDaysList}
            employees={people}
            shifts={shifts}
            leave={leave}
            onAdd={openCreate}
            onAction={(shift, action) => void handleAction(shift, action)}
          />
        ) : (
          <RotaMonthGrid
            weeks={monthWeeks}
            month={anchor.getMonth()}
            year={anchor.getFullYear()}
            employees={people}
            shifts={shifts}
            leave={leave}
            inRange={(day) =>
              day.getMonth() === anchor.getMonth() && day.getFullYear() === anchor.getFullYear()
            }
            onAdd={openCreate}
            onAction={(shift, action) => void handleAction(shift, action)}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-5 text-xs font-medium text-navy/70">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#3d7eb8]" />
          Scheduled Shift
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#e08a2c]" />
          Open Shift
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#c24747]" />
          On Leave
        </span>
      </div>

      {modal ? (
        <ShiftModal
          mode={modal.mode}
          people={people}
          roles={roles}
          initial={modal.initial}
          saving={saving}
          error={error}
          onClose={() => {
            setModal(null)
            setError(null)
          }}
          onSubmit={saveForm}
        />
      ) : null}
    </div>
  )
}

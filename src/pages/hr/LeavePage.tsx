import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, User } from 'lucide-react'
import { employeesApi, hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, ConfirmDialog, Loading } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { Employee, LeavePayQuote } from '../../types'
import { isWorkingDay, workingDaysFromEmployee } from '../../lib/workingDays'
import { dateKey, formatMonthLabel, weeksInMonth } from './rota/rotaDates'
import { formatLeaveRange, LEAVE_TYPES, leaveTypeColor } from './leaveTypes'
import { HrCrumbs, HrTitle, RequestsButton } from './HrChrome'
import { AddLeaveModal } from './AddLeaveModal'

type LeaveItem = {
  id?: unknown
  employee_id?: unknown
  leave_type?: string
  start_date?: string
  end_date?: string
  status?: string
  is_paid?: boolean
  days?: number
  employees?: { first_name?: string | null; last_name?: string | null }
  parts?: LeaveItem[]
}

function hoursLabel(value?: number) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value} hours`
}

function coversDate(item: LeaveItem, key: string) {
  const start = String(item.start_date ?? '').slice(0, 10)
  const end = String(item.end_date ?? start).slice(0, 10)
  return start && start <= key && key <= end
}

function fromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function leaveDay(value?: string) {
  return String(value ?? '').slice(0, 10)
}

function leaveGroupKey(type?: string) {
  const value = String(type ?? '').trim().toLowerCase()
  if (value.includes('maternity') || value.includes('smp')) return 'maternity'
  if (value.includes('paternity') || value.includes('spp')) return 'paternity'
  if (value.includes('sick') || value.includes('ssp')) return 'sick'
  if (value.includes('annual') || value.includes('holiday')) return 'annual'
  if (value.includes('parental') || value.includes('parenting')) return 'parental'
  return value
}

function hasWeekdayGap(from: string, to: string) {
  if (!from || !to || to <= from) return false
  const cursor = fromKey(from)
  cursor.setDate(cursor.getDate() + 1)
  const until = fromKey(to)
  while (cursor.getTime() < until.getTime()) {
    const weekday = cursor.getDay()
    if (weekday !== 0 && weekday !== 6) return true
    cursor.setDate(cursor.getDate() + 1)
  }
  return false
}

function groupSameLeave(items: LeaveItem[]) {
  const buckets = new Map<string, LeaveItem[]>()
  for (const item of items) {
    const start = leaveDay(item.start_date)
    const end = leaveDay(item.end_date) || start
    const key = [
      String(item.employee_id ?? ''),
      leaveGroupKey(item.leave_type),
      item.is_paid === false ? 'unpaid' : 'paid',
    ].join('|')
    const list = buckets.get(key) ?? []
    list.push({
      ...item,
      start_date: start,
      end_date: end,
      days: Number(item.days ?? 0),
      parts: [item],
    })
    buckets.set(key, list)
  }

  const spells: LeaveItem[] = []
  for (const list of buckets.values()) {
    list.sort((left, right) => leaveDay(left.start_date).localeCompare(leaveDay(right.start_date)))
    for (const item of list) {
      const current = spells[spells.length - 1]
      const sameGroup =
        current &&
        String(current.employee_id ?? '') === String(item.employee_id ?? '') &&
        leaveGroupKey(current.leave_type) === leaveGroupKey(item.leave_type) &&
        (current.is_paid === false) === (item.is_paid === false)
      if (sameGroup && !hasWeekdayGap(leaveDay(current.end_date), leaveDay(item.start_date))) {
        if (leaveDay(item.end_date) > leaveDay(current.end_date)) {
          current.end_date = item.end_date
        }
        current.days = Number(current.days ?? 0) + Number(item.days ?? 0)
        current.parts = [...(current.parts ?? []), ...(item.parts ?? [item])]
        continue
      }
      spells.push(item)
    }
  }

  return spells.sort((left, right) => leaveDay(left.start_date).localeCompare(leaveDay(right.start_date)))
}

function keysBetween(from: string, to: string) {
  const start = fromKey(from <= to ? from : to)
  const end = fromKey(from <= to ? to : from)
  const keys: string[] = []
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    keys.push(dateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

export function LeavePage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'year'>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [modal, setModal] = useState<{ start?: string; end?: string } | null>(null)
  const [pendingRemove, setPendingRemove] = useState<LeaveItem | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const drag = useRef<{ start: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [quoteKeys, setQuoteKeys] = useState({
    employee_id: employeeId ?? '',
    leave_type: 'Annual Leave',
    start_date: '',
    end_date: '',
    is_paid: true,
  })
  const handleQuoteKeys = useCallback((keys: typeof quoteKeys) => {
    setQuoteKeys(keys)
  }, [])

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const leaveQuery = useQuery({
    queryKey: ['leave', companyId],
    queryFn: () => hrApi.leaveAll(companyId!),
    enabled: Boolean(companyId),
  })
  const balanceQuery = useQuery({
    queryKey: ['leave-balance', companyId, employeeId],
    queryFn: () => hrApi.leaveBalance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })

  const quoteQuery = useQuery({
    queryKey: [
      'leave-pay-quote',
      companyId,
      quoteKeys.employee_id,
      quoteKeys.leave_type,
      quoteKeys.start_date,
      quoteKeys.end_date,
      quoteKeys.is_paid,
    ],
    queryFn: () =>
      hrApi.quoteLeavePay(companyId!, quoteKeys.employee_id, {
        leave_type: quoteKeys.leave_type,
        start_date: quoteKeys.start_date,
        end_date: quoteKeys.end_date || quoteKeys.start_date,
      }),
    enabled: Boolean(
      modal &&
        quoteKeys.is_paid &&
        companyId &&
        quoteKeys.employee_id &&
        quoteKeys.leave_type &&
        quoteKeys.start_date &&
        quoteKeys.end_date,
    ),
  })
  const quote = quoteQuery.data?.data as LeavePayQuote | undefined

  const people = (employeesQuery.data?.data ?? []) as Employee[]
  const leave = ((leaveQuery.data?.data as LeaveItem[] | undefined) ?? []).map((item) => ({
    ...item,
    id: idOf(item),
    employee_id: String(item.employee_id ?? idOf(item.employees) ?? ''),
  }))
  const selected = people.find((person) => idOf(person) === employeeId)
  const workingDays = workingDaysFromEmployee(selected)
  const pickedSet = new Set(picked)

  function beginPick(key: string, event: MouseEvent) {
    event.preventDefault()
    drag.current = { start: key }
    setPicked([key])
  }

  function movePick(key: string) {
    if (!drag.current) return
    setPicked(keysBetween(drag.current.start, key))
  }

  useEffect(() => {
    function endPick() {
      if (!drag.current) return
      drag.current = null
      setPicked((current) => {
        if (current.length === 0) return current
        const sorted = [...current].sort()
        setModal({ start: sorted[0], end: sorted[sorted.length - 1] })
        return current
      })
    }
    window.addEventListener('mouseup', endPick)
    return () => window.removeEventListener('mouseup', endPick)
  }, [])
  const filtered = people
    .filter((person) =>
      fullName(person.first_name, person.last_name).toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((left, right) =>
      fullName(left.first_name, left.last_name).localeCompare(
        fullName(right.first_name, right.last_name),
        'en-GB',
        { sensitivity: 'base' },
      ),
    )
  const personLeave = leave.filter((item) => item.employee_id === employeeId)
  const approvedLeave = personLeave.filter((item) => String(item.status ?? '').toUpperCase() === 'APPROVED')
  const assignedLeave = groupSameLeave(approvedLeave)
  const calendarLeave = approvedLeave
  const todayKey = dateKey(new Date())
  const upcoming = groupSameLeave(
    leave.filter((item) => {
      if (String(item.status ?? '').toUpperCase() !== 'APPROVED') return false
      const end = leaveDay(item.end_date) || leaveDay(item.start_date)
      return Boolean(end && end >= todayKey)
    }),
  )
  const balance = balanceQuery.data?.data as
    | { hours_entitled?: number; hours_used?: number; hours_remaining?: number }
    | undefined

  const year = anchor.getFullYear()
  const monthWeeks = useMemo(() => weeksInMonth(anchor), [anchor])
  const monthCounts = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const start = new Date(year, index, 1)
      const end = new Date(year, index + 1, 0)
      const startKey = dateKey(start)
      const endKey = dateKey(end)
      let count = 0
      for (const item of assignedLeave) {
        const from = String(item.start_date ?? '').slice(0, 10)
        const to = String(item.end_date ?? from).slice(0, 10)
        if (from && to >= startKey && from <= endKey) count += 1
      }
      return count
    })
  }, [assignedLeave, year])

  async function refreshLeave() {
    await queryClient.invalidateQueries({ queryKey: ['leave', companyId] })
    await queryClient.invalidateQueries({ queryKey: ['leave-upcoming', companyId] })
    await queryClient.invalidateQueries({ queryKey: ['leave-balance', companyId] })
  }

  async function removeLeave(item: LeaveItem) {
    if (!companyId) return
    const parts = item.parts?.length ? item.parts : item.id ? [item] : []
    if (parts.length === 0) return
    try {
      setError(null)
      for (const part of parts) {
        if (!part.id) continue
        await hrApi.removeLeave(companyId, String(part.id))
      }
      setPendingRemove(null)
      await refreshLeave()
    } catch (err) {
      setPendingRemove(null)
      setError(err instanceof Error ? err.message : 'Could not remove leave')
    }
  }

  async function submitLeave(payload: {
    employee_ids: string[]
    leave_type: string
    start_date: string
    end_date: string
    is_paid: boolean
    paid_per_day?: number
    reason: string
  }) {
    if (!companyId) return
    setSaving(true)
    try {
      setError(null)
      const result = await hrApi.addLeave(companyId, {
        employee_id: payload.employee_ids[0],
        employee_ids: payload.employee_ids,
        leave_type: payload.leave_type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        is_paid: payload.is_paid,
        ...(payload.is_paid && payload.paid_per_day != null ? { paid_per_day: payload.paid_per_day } : {}),
        reason: payload.reason.trim() || null,
      })
      const failures = (result as { errors?: { message?: string }[] }).errors ?? []
      if (failures.length > 0) {
        setError(result.message || failures.map((item) => item.message).join(' '))
      }
      setModal(null)
      setPicked([])
      await refreshLeave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add leave')
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <HrCrumbs
        items={[
          { label: 'HR', to: '/hr' },
          { label: 'Leave', to: '/hr/leave' },
          ...(selected ? [{ label: fullName(selected.first_name, selected.last_name) }] : []),
        ]}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <HrTitle
          title={selected ? fullName(selected.first_name, selected.last_name) : 'Leave'}
          onBack={() => navigate(selected ? '/hr/leave' : '/hr')}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setError(null)
              setPicked([])
              setModal({})
            }}
          >
            <Plus size={16} />
            Add Leave
          </Button>
          <RequestsButton
            count={leave.filter((item) => String(item.status ?? '').toUpperCase() === 'PENDING').length}
          />
        </div>
      </div>
      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 overflow-visible lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)] lg:overflow-hidden">
        <Card className="flex max-h-64 min-h-0 flex-col overflow-hidden p-4 lg:max-h-none">
          <h2 className="mb-3 text-sm font-semibold text-navy">All Employees</h2>
          <label className="relative mb-3 block">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              className="h-10 w-full rounded-[10px] border border-[#d9d9d9] bg-white pl-9 pr-3 text-sm text-navy outline-none"
              placeholder="Search Employee..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {employeesQuery.isLoading ? (
              <Loading />
            ) : (
              filtered.map((person) => {
                const id = idOf(person)
                const active = id === employeeId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/hr/leave/${id}`)}
                    className={`mb-1 flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm ${
                      active ? 'bg-[#e7f1f8] font-semibold text-navy' : 'text-navy hover:bg-cream'
                    }`}
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
                      <User size={14} />
                    </span>
                    {fullName(person.first_name, person.last_name)}
                  </button>
                )
              })
            )}
          </div>
        </Card>

        <div className="min-h-0 overflow-y-auto">
          {!selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-navy">Upcoming Leave</h2>
                <span className="text-sm font-semibold text-navy/70">View All</span>
              </div>
              {leaveQuery.isLoading ? (
                <Loading />
              ) : upcoming.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted">No upcoming leave yet.</Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {upcoming.slice(0, 8).map((item) => {
                    const person = people.find((entry) => idOf(entry) === String(item.employee_id))
                    return (
                    <button
                      key={`${item.employee_id}-${leaveGroupKey(item.leave_type)}-${item.is_paid === false ? 'unpaid' : 'paid'}`}
                      type="button"
                      onClick={() => navigate(`/hr/leave/${item.employee_id}`)}
                      className="rounded-[16px] border border-[#e6e4df] bg-white p-4 text-left"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
                        <User size={14} />
                      </span>
                      <p className="mt-3 font-semibold text-navy">
                        {fullName(
                          item.employees?.first_name ?? person?.first_name,
                          item.employees?.last_name ?? person?.last_name,
                        )}
                      </p>
                      <p className="mt-1 text-sm text-muted">{item.leave_type}</p>
                      <p className="text-sm text-navy">{formatLeaveRange(item.start_date, item.end_date)}</p>
                      <span className="mt-2 inline-flex rounded-full bg-[#f0efec] px-2 py-0.5 text-xs font-semibold text-navy">
                        {item.is_paid === false ? 'Unpaid' : 'Paid'}
                      </span>
                    </button>
                    )
                  })}
                </div>
              )}
              <Card className="flex min-h-[220px] items-center justify-center p-8 text-sm text-muted">
                Select an employee to view Leave details
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="p-5">
                  <p className="text-xs font-semibold text-muted">Holiday Allowance</p>
                  <p className="mt-2 text-2xl font-semibold text-navy">{hoursLabel(balance?.hours_entitled)}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs font-semibold text-muted">Holiday Used</p>
                  <p className="mt-2 text-2xl font-semibold text-navy">
                    {balance?.hours_used ? hoursLabel(balance.hours_used) : '—'}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs font-semibold text-muted">Holiday Remaining</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3b82f6]">{hoursLabel(balance?.hours_remaining)}</p>
                </Card>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {LEAVE_TYPES.map((type) => (
                  <span key={type.id} className="flex items-center gap-1.5 text-xs font-medium text-navy">
                    <span className="size-2.5 rounded-full" style={{ background: type.color }} />
                    {type.id}
                  </span>
                ))}
              </div>

              <Card className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-[8px] hover:bg-cream"
                      aria-label="Previous"
                      onClick={() =>
                        setAnchor((current) =>
                          view === 'month'
                            ? new Date(current.getFullYear(), current.getMonth() - 1, 1)
                            : new Date(current.getFullYear() - 1, current.getMonth(), 1),
                        )
                      }
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="min-w-[10rem] text-center">
                      {view === 'month' ? formatMonthLabel(anchor) : `${year} (This Year)`}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-[8px] hover:bg-cream"
                      aria-label="Next"
                      onClick={() =>
                        setAnchor((current) =>
                          view === 'month'
                            ? new Date(current.getFullYear(), current.getMonth() + 1, 1)
                            : new Date(current.getFullYear() + 1, current.getMonth(), 1),
                        )
                      }
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="inline-flex self-start rounded-[10px] border border-[#d9d9d9] bg-white p-1 text-sm font-semibold sm:self-auto">
                    <button
                      type="button"
                      className={`rounded-[8px] px-3 py-1.5 ${view === 'month' ? 'bg-navy text-white' : 'text-navy'}`}
                      onClick={() => setView('month')}
                    >
                      Month Overview
                    </button>
                    <button
                      type="button"
                      className={`rounded-[8px] px-3 py-1.5 ${view === 'year' ? 'bg-navy text-white' : 'text-navy'}`}
                      onClick={() => setView('year')}
                    >
                      Year Overview
                    </button>
                  </div>
                </div>

                {view === 'month' ? (
                  <div className="overflow-x-auto">
                    <p className="mb-2 text-xs text-muted">Click a day or drag across dates to assign leave.</p>
                    <div className="min-w-[640px] select-none overflow-hidden rounded-[12px] border border-[#eceae6]">
                      <div className="grid grid-cols-7 bg-[#f7f6f3] text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className="border-r border-[#eceae6] px-2 py-2 last:border-r-0">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {monthWeeks.flat().map((day) => {
                          const key = dateKey(day)
                          const outside = day.getMonth() !== anchor.getMonth()
                          const today = !outside && key === dateKey(new Date())
                          const off = !isWorkingDay(day, workingDays)
                          const match = calendarLeave.find((item) => coversDate(item, key))
                          const selectedDay = pickedSet.has(key)
                          return (
                            <div
                              key={key}
                              onMouseDown={(event) => beginPick(key, event)}
                              onMouseEnter={() => movePick(key)}
                              className={`min-h-[76px] cursor-pointer border-t border-r border-[#eceae6] p-1.5 [&:nth-child(7n)]:border-r-0 ${
                                selectedDay
                                  ? 'bg-[#dceaf6] text-navy'
                                  : outside
                                    ? 'bg-[#fbfaf8] text-[#c5c5c5]'
                                    : off
                                      ? 'bg-[#f7f6f3] text-navy/70'
                                      : 'bg-white text-navy'
                              }`}
                              style={
                                match && !outside && !selectedDay
                                  ? { background: `${leaveTypeColor(match.leave_type)}33` }
                                  : undefined
                              }
                            >
                              <p
                                className={`flex size-6 items-center justify-center text-xs font-semibold ${
                                  today ? 'rounded-full bg-navy text-white' : ''
                                }`}
                              >
                                {day.getDate()}
                              </p>
                              {match?.leave_type && !outside ? (
                                <p
                                  className="mt-1 truncate text-[10px] font-medium leading-tight text-navy"
                                  title={match.leave_type}
                                >
                                  {match.leave_type}
                                </p>
                              ) : off && !outside && !match ? (
                                <p className="mt-1 text-[10px] font-medium text-[#9b9a9a]">Day off</p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                    {monthCounts.map((count, index) => (
                      <div key={index} className="rounded-[12px] bg-cream px-3 py-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {new Date(year, index, 1).toLocaleDateString('en-GB', { month: 'short' })}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-navy">{count || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-navy">Assigned leave</h3>
                {assignedLeave.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">No leave assigned yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-[#eceae6]">
                    {assignedLeave.map((item) => (
                      <li key={String(item.id)} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: leaveTypeColor(item.leave_type) }}
                            />
                            {item.leave_type || 'Leave'}
                          </p>
                          <p className="mt-0.5 text-sm text-muted">
                            {formatLeaveRange(item.start_date, item.end_date)}
                            {item.days ? ` · ${item.days} day${item.days === 1 ? '' : 's'}` : ''}
                            {item.is_paid === false ? ' · Unpaid' : ' · Paid'}
                          </p>
                        </div>
                        <Button variant="secondary" onClick={() => setPendingRemove(item)}>
                          <Trash2 size={14} />
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {pendingRemove ? (
        <ConfirmDialog
          title="Remove this leave?"
          message={`Remove ${pendingRemove.leave_type || 'leave'} from ${formatLeaveRange(pendingRemove.start_date, pendingRemove.end_date)}?`}
          confirmLabel="Remove"
          danger
          onClose={() => setPendingRemove(null)}
          onConfirm={() => void removeLeave(pendingRemove)}
        />
      ) : null}

      {modal ? (
        <AddLeaveModal
          people={people}
          initialEmployeeId={employeeId}
          initialStartDate={modal.start}
          initialEndDate={modal.end}
          quote={quote}
          quoting={quoteQuery.isFetching}
          submitting={saving}
          error={error}
          onClose={() => {
            setModal(null)
            setPicked([])
            setError(null)
          }}
          onQuoteKeys={handleQuoteKeys}
          onSubmit={submitLeave}
        />
      ) : null}
    </div>
  )
}

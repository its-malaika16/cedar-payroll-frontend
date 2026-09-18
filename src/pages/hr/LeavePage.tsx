import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Search, User } from 'lucide-react'
import { employeesApi, hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, Loading } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { Employee } from '../../types'
import { addDays, dateKey, formatMonthLabel, weeksInMonth } from './rota/rotaDates'
import { formatLeaveRange, LEAVE_TYPES, leaveTypeColor } from './leaveTypes'
import { HrCrumbs, HrTitle, RequestsButton } from './HrChrome'

type LeaveItem = {
  id?: unknown
  employee_id?: unknown
  leave_type?: string
  start_date?: string
  end_date?: string
  status?: string
  is_paid?: boolean
  employees?: { first_name?: string | null; last_name?: string | null }
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

export function LeavePage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'year'>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    employee_id: employeeId ?? '',
    leave_type: 'Annual Leave',
    start_date: '',
    end_date: '',
    is_paid: true,
    reason: '',
  })

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
  const upcomingQuery = useQuery({
    queryKey: ['leave-upcoming', companyId],
    queryFn: () => hrApi.upcomingLeave(companyId!),
    enabled: Boolean(companyId) && !employeeId,
  })
  const balanceQuery = useQuery({
    queryKey: ['leave-balance', companyId, employeeId],
    queryFn: () => hrApi.leaveBalance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })

  const people = (employeesQuery.data?.data ?? []) as Employee[]
  const leave = ((leaveQuery.data?.data as LeaveItem[] | undefined) ?? []).map((item) => ({
    ...item,
    id: idOf(item),
    employee_id: String(item.employee_id ?? idOf(item.employees) ?? ''),
  }))
  const upcoming = ((upcomingQuery.data?.data as LeaveItem[] | undefined) ?? []).map((item) => ({
    ...item,
    id: idOf(item),
    employee_id: String(item.employee_id ?? ''),
  }))
  const selected = people.find((person) => idOf(person) === employeeId)
  const filtered = people.filter((person) =>
    fullName(person.first_name, person.last_name).toLowerCase().includes(search.trim().toLowerCase()),
  )
  const personLeave = leave.filter((item) => item.employee_id === employeeId)
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
      for (const item of personLeave) {
        const from = String(item.start_date ?? '').slice(0, 10)
        const to = String(item.end_date ?? from).slice(0, 10)
        if (from && to >= startKey && from <= endKey) count += 1
      }
      return count
    })
  }, [personLeave, year])

  async function submitLeave() {
    if (!companyId || !form.employee_id || !form.start_date || !form.end_date) return
    try {
      setError(null)
      await hrApi.addLeave(companyId, form)
      setModal(false)
      await queryClient.invalidateQueries({ queryKey: ['leave', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['leave-upcoming', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['leave-balance', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add leave')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <HrCrumbs
        items={[
          { label: 'HR', to: '/hr' },
          { label: 'Leave', to: '/hr/leave' },
          ...(selected ? [{ label: fullName(selected.first_name, selected.last_name) }] : []),
        ]}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <HrTitle
          title={selected ? fullName(selected.first_name, selected.last_name) : 'Leave'}
          onBack={() => navigate(selected ? '/hr/leave' : '/hr')}
        />
        <div className="flex flex-wrap items-center gap-2">
          {selected ? (
            <Button
              onClick={() => {
                setForm((current) => ({ ...current, employee_id: employeeId ?? current.employee_id }))
                setModal(true)
              }}
            >
              <Plus size={16} />
              Add Leave
            </Button>
          ) : null}
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

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden p-4">
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
              {upcomingQuery.isLoading ? (
                <Loading />
              ) : upcoming.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted">No upcoming leave yet.</Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {upcoming.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/hr/leave/${item.employee_id}`)}
                      className="rounded-[16px] border border-[#e6e4df] bg-white p-4 text-left"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
                        <User size={14} />
                      </span>
                      <p className="mt-3 font-semibold text-navy">
                        {fullName(item.employees?.first_name, item.employees?.last_name)}
                      </p>
                      <p className="mt-1 text-sm text-muted">{item.leave_type}</p>
                      <p className="text-sm text-navy">{formatLeaveRange(item.start_date, item.end_date)}</p>
                      <span className="mt-2 inline-flex rounded-full bg-[#f0efec] px-2 py-0.5 text-xs font-semibold text-navy">
                        {item.is_paid === false ? 'Unpaid' : 'Paid'}
                      </span>
                    </button>
                  ))}
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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <button type="button" onClick={() => setAnchor(addDays(anchor, view === 'month' ? -30 : -365))}>
                      <ChevronLeft size={18} />
                    </button>
                    <span>{view === 'month' ? formatMonthLabel(anchor) : `${year} (This Year)`}</span>
                    <button type="button" onClick={() => setAnchor(addDays(anchor, view === 'month' ? 30 : 365))}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="inline-flex rounded-[10px] border border-[#d9d9d9] bg-white p-1 text-sm font-semibold">
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
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="py-2 font-semibold text-muted">
                        {day}
                      </div>
                    ))}
                    {monthWeeks.flat().map((day) => {
                      const key = dateKey(day)
                      const outside = day.getMonth() !== anchor.getMonth()
                      const match = personLeave.find((item) => coversDate(item, key))
                      return (
                        <div
                          key={key}
                          className={`min-h-[54px] rounded-[8px] p-1 ${outside ? 'text-muted/40' : 'text-navy'}`}
                          style={match ? { background: `${leaveTypeColor(match.leave_type)}22` } : undefined}
                        >
                          {day.getDate()}
                        </div>
                      )
                    })}
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
            </div>
          )}
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 p-4">
          <Card className="w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold text-navy">+ Add Leave</h2>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-navy">Select Employee(s)</span>
              <select
                className="w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 py-2.5 text-sm"
                value={form.employee_id}
                onChange={(event) => setForm({ ...form, employee_id: event.target.value })}
              >
                <option value="">Select employee</option>
                {people.map((person) => (
                  <option key={idOf(person)} value={idOf(person)}>
                    {fullName(person.first_name, person.last_name)}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-4 mb-2 text-sm font-medium text-navy">Leave Type</p>
            <div className="flex flex-wrap gap-2">
              {LEAVE_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({ ...form, leave_type: type.id })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${
                    form.leave_type === type.id ? 'ring-2 ring-offset-2 ring-navy' : 'opacity-90'
                  }`}
                  style={{ background: type.color }}
                >
                  {type.id}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-navy">Start Date</span>
                <input
                  type="date"
                  className="w-full rounded-[10px] border border-[#d9d9d9] px-3 py-2.5 text-sm"
                  value={form.start_date}
                  onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-navy">Leave Date</span>
                <input
                  type="date"
                  className="w-full rounded-[10px] border border-[#d9d9d9] px-3 py-2.5 text-sm"
                  value={form.end_date}
                  onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                />
              </label>
            </div>
            <p className="mt-4 mb-2 text-sm font-medium text-navy">Leave is</p>
            <div className="flex gap-4 text-sm text-navy">
              <label className="flex items-center gap-2">
                <input type="radio" checked={form.is_paid} onChange={() => setForm({ ...form, is_paid: true })} />
                Paid
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={!form.is_paid} onChange={() => setForm({ ...form, is_paid: false })} />
                Unpaid
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-navy">Notes (optional)</span>
              <textarea
                className="min-h-20 w-full rounded-[10px] border border-[#d9d9d9] px-3 py-2 text-sm"
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitLeave()}>Add Leave</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

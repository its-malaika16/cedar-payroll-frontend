import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { employeesApi, hrApi, payrollApi, payslipsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Loading,
  PageHeader,
  Select,
  Table,
  Textarea,
} from '../../components/ui'
import { formatDate, formatLongDate, formatPayslipPeriod, idOf } from '../../lib/format'
import { dateKey, daysInPeriod } from '../hr/rota/rotaDates'
import {
  adjacentTimesheetPeriod,
  pickPaySchedule,
  timesheetPeriodFromSchedule,
} from '../hr/timesheets/timesheetPeriod'
import { formatTimeRange, shiftDateKey, type RotaShift } from '../hr/rota/rotaModel'
import { ComplianceDocumentsPanel } from '../hr/compliance/ComplianceDocumentsPanel'
import type { ComplianceFile } from '../hr/compliance/documentTypes'
import type { Employee, PayrollSchedule } from '../../types'

const LEAVE_TYPES = [
  'Annual leave',
  'Unpaid leave',
  'Sick leave',
  'Maternity leave',
  'Paternity leave',
  'Compassionate leave',
  'Other',
]

function formatStamp(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatClock(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function hoursWorked(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return null
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
}

function toLocalInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function PortalAttendancePage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['attendance', companyId, employeeId],
    queryFn: () => hrApi.attendance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const today = useQuery({
    queryKey: ['attendance-today', companyId, employeeId],
    queryFn: () => hrApi.todayAttendance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
    refetchInterval: 30_000,
  })
  const shiftsQuery = useQuery({
    queryKey: ['my-shifts', companyId, employeeId],
    queryFn: () => hrApi.myShifts(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const list = (query.data?.data as Record<string, unknown>[] | undefined) ?? []
  const shifts = (shiftsQuery.data?.data as RotaShift[] | undefined) ?? []
  const todayKey = dateKey(new Date())
  const todayData = today.data?.data as
    | {
        shift?: { start_time: string; end_time: string; role_name?: string | null } | null
        can_check_in?: boolean
        can_check_out?: boolean
        late?: boolean
        late_label?: string | null
        check_in_opens_at?: string | null
        location_configured?: boolean
        hours_worked?: number
        open_attendance?: { check_in_at?: string } | null
      }
    | undefined

  const punch = async (kind: 'in' | 'out') => {
    if (!employeeId) return
    try {
      setError(null)
      const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          () => reject(new Error('Location permission is required')),
        )
      })
      const result =
        kind === 'in'
          ? await hrApi.checkIn(companyId!, employeeId, coords)
          : await hrApi.checkOut(companyId!, employeeId, coords)
      setMessage(result.message)
      await Promise.all([query.refetch(), today.refetch()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attendance failed')
    }
  }

  const rows = [...shifts]
    .sort((a, b) => shiftDateKey(b).localeCompare(shiftDateKey(a)))
    .map((shift) => {
      const key = shiftDateKey(shift)
      const record = list.find((item) => String(item.check_in_at ?? '').slice(0, 10) === key)
      const start = new Date(shift.start_time)
      const grace = new Date(start.getTime() + 5 * 60 * 1000)
      const checkIn = record?.check_in_at ? new Date(String(record.check_in_at)) : null
      const checkOut = record?.check_out_at ? new Date(String(record.check_out_at)) : null
      let status = 'Upcoming'
      if (key < todayKey && !checkIn) status = 'Absent'
      else if (checkIn && !Number.isNaN(checkIn.getTime()) && checkIn > grace) status = 'Late'
      else if (checkIn) status = 'On time'
      return {
        id: idOf(shift),
        date: key,
        shift,
        checkIn: checkIn && !Number.isNaN(checkIn.getTime()) ? checkIn.toISOString() : null,
        checkOut: checkOut && !Number.isNaN(checkOut.getTime()) ? checkOut.toISOString() : null,
        hours: hoursWorked(
          record?.check_in_at ? String(record.check_in_at) : null,
          record?.check_out_at ? String(record.check_out_at) : null,
        ),
        status,
      }
    })

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Check in and out from within 3 km of the workplace, then review lateness, absences and hours."
      />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {message ? <div className="mb-4"><Alert tone="success">{message}</Alert></div> : null}

      <Card className="mb-6 p-6">
        {today.isLoading ? (
          <Loading />
        ) : !todayData?.shift ? (
          <EmptyState title="No shift today" body="When a published shift is assigned, check-in appears 10 minutes before it starts." />
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Today’s shift</p>
              <p className="mt-1 text-lg font-semibold text-navy">
                {formatTimeRange(todayData.shift.start_time, todayData.shift.end_time)}
              </p>
              <p className="mt-1 text-sm text-muted">{todayData.shift.role_name || 'Scheduled'}</p>
              {todayData.open_attendance?.check_in_at ? (
                <p className="mt-3 text-sm text-navy">
                  Checked in at {formatStamp(todayData.open_attendance.check_in_at)}
                  {todayData.late_label ? ` · ${todayData.late_label}` : ''}
                </p>
              ) : todayData.late ? (
                <p className="mt-3 text-sm font-medium text-brand">Check in late</p>
              ) : !todayData.can_check_in && todayData.check_in_opens_at ? (
                <p className="mt-3 text-sm text-muted">
                  Check-in opens at {formatStamp(todayData.check_in_opens_at)}
                </p>
              ) : null}
              {todayData.can_check_out ? (
                <p className="mt-1 text-sm text-muted">
                  Hours so far: {Number(todayData.hours_worked ?? 0).toFixed(2)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {todayData.can_check_out ? (
                <Button onClick={() => punch('out')}>Check out</Button>
              ) : todayData.can_check_in ? (
                <Button variant={todayData.late ? 'danger' : 'primary'} onClick={() => punch('in')}>
                  {todayData.late ? 'Check in late' : 'Check in'}
                </Button>
              ) : null}
            </div>
          </div>
        )}
        {todayData && todayData.location_configured === false ? (
          <p className="mt-4 text-sm text-muted">
            Your employer still needs to save the workplace location in Settings.
          </p>
        ) : null}
      </Card>

      <Card>
        {query.isLoading || shiftsQuery.isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState title="No attendance yet" body="Published shifts and your check-in history will appear here." />
        ) : (
          <Table columns={['Date', 'Shift', 'Check in', 'Check out', 'Hours', 'Status']}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{formatDate(row.date)}</td>
                <td className="px-4 py-3">{formatTimeRange(row.shift.start_time, row.shift.end_time)}</td>
                <td className="px-4 py-3">{formatClock(row.checkIn)}</td>
                <td className="px-4 py-3">{formatClock(row.checkOut)}</td>
                <td className="px-4 py-3">{row.hours == null ? '—' : `${row.hours.toFixed(2)} h`}</td>
                <td className="px-4 py-3">
                  <Badge status={row.status}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

export function PortalLeavePage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['my-leave', companyId, employeeId],
    queryFn: () => hrApi.myLeave(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const list = (query.data?.data as Record<string, unknown>[] | undefined) ?? []
  const [form, setForm] = useState({
    leave_type: 'Annual leave',
    start_date: '',
    end_date: '',
    reason: '',
  })

  return (
    <div>
      <PageHeader title="Leave" subtitle="Request leave by choosing the dates and leave type." />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {message ? <div className="mb-4"><Alert tone="success">{message}</Alert></div> : null}
      <Card className="mb-6 p-6">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!employeeId) return
            try {
              setError(null)
              setMessage(null)
              await hrApi.createLeave(companyId!, employeeId, form)
              setForm({ ...form, reason: '', start_date: '', end_date: '' })
              setMessage('Leave request submitted')
              await query.refetch()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Request failed')
            }
          }}
        >
          <Field label="Leave type">
            <Select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
              {LEAVE_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </Field>
          <Field label="Start date">
            <Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </Field>
          <Field label="End date">
            <Input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </Field>
          <Field label="Reason">
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional" />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit">Submit request</Button>
          </div>
        </form>
      </Card>
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState title="No requests" body="Your leave history will appear here." />
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {list.map((item) => (
              <div key={idOf(item)} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-navy">{String(item.leave_type)}</p>
                  <p className="text-sm text-muted">
                    {formatDate(String(item.start_date))} – {formatDate(String(item.end_date))}
                  </p>
                </div>
                <Badge status={String(item.status)}>{String(item.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export function PortalPayslipsPage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const query = useQuery({
    queryKey: ['my-payslips', companyId, employeeId],
    queryFn: () => employeesApi.myPayslips(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const list = (query.data?.data as Record<string, unknown>[] | undefined) ?? []

  return (
    <div>
      <PageHeader
        title="Payslip"
        subtitle="Finalised payslips uploaded by your employer. You will be emailed when a new one is ready."
      />
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState title="No payslips yet" body="Payslips appear after payroll is finalised and uploaded." />
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {list.map((item) => {
              const run = item.payroll_runs as
                | {
                    period_start_date?: string
                    period_end_date?: string
                    pay_date?: string
                    pay_frequency?: string
                  }
                | undefined
              return (
                <div key={idOf(item)} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-navy">
                      {formatPayslipPeriod(run?.period_start_date, run?.period_end_date, run?.pay_frequency)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Pay date {formatDate(run?.pay_date)} · {String(item.file_name ?? 'Payslip')}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      payslipsApi.download(companyId!, idOf(item), String(item.file_name ?? 'payslip.pdf'))
                    }
                  >
                    Download
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

export function PortalDocumentsPage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const query = useQuery({
    queryKey: ['my-compliance', companyId, employeeId],
    queryFn: () => hrApi.myCompliance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const documents = (query.data?.data as ComplianceFile[] | undefined) ?? []
  const fromEmployer = documents.filter((doc) => doc.uploaded_by_kind === 'EMPLOYER' || doc.employer_only)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Compliance documents"
        subtitle="Upload your documents and expiry dates, and view files shared by your employer."
      />
      {fromEmployer.length > 0 ? (
        <Card className="mb-4 p-5">
          <h2 className="mb-3 text-sm font-semibold text-navy">Uploaded by your employer</h2>
          <div className="space-y-2">
            {fromEmployer.map((doc) => (
              <p key={doc.id} className="text-sm text-navy">
                {doc.title || doc.file_name}
                {doc.expiry_date ? ` · expires ${formatDate(doc.expiry_date)}` : ''}
              </p>
            ))}
          </div>
        </Card>
      ) : null}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {companyId && employeeId ? (
          <ComplianceDocumentsPanel
            companyId={companyId}
            employeeId={employeeId}
            role="employee"
            documents={documents}
            loading={query.isLoading}
          />
        ) : (
          <EmptyState title="No employee record" body="Your documents appear here once your portal access is linked." />
        )}
      </Card>
    </div>
  )
}

export function PortalRotaPage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [periodKey, setPeriodKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [requesting, setRequesting] = useState<RotaShift | null>(null)
  const [reason, setReason] = useState('')
  const [requestedStart, setRequestedStart] = useState('')
  const [requestedEnd, setRequestedEnd] = useState('')

  const employeeQuery = useQuery({
    queryKey: ['employee', companyId, employeeId],
    queryFn: () => employeesApi.me(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const employment = employeeQuery.data?.data
    ? Array.isArray((employeeQuery.data.data as Employee).employment_details)
      ? (employeeQuery.data.data as Employee).employment_details?.[0]
      : (employeeQuery.data.data as Employee).employment_details
    : null
  const preferredScheduleId =
    employment && typeof employment === 'object'
      ? String((employment as { pay_schedule_id?: unknown }).pay_schedule_id ?? '')
      : ''
  const paySchedule = pickPaySchedule(
    (schedulesQuery.data?.data ?? []) as PayrollSchedule[],
    preferredScheduleId,
  )
  const period = useMemo(
    () => timesheetPeriodFromSchedule(paySchedule, periodKey),
    [paySchedule, periodKey],
  )
  const days = useMemo(() => daysInPeriod(period.start, period.end), [period.from, period.to])

  const query = useQuery({
    queryKey: ['my-shifts', companyId, employeeId],
    queryFn: () => hrApi.myShifts(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const requestsQuery = useQuery({
    queryKey: ['my-shift-changes', companyId, employeeId],
    queryFn: () => hrApi.myShiftChangeRequests(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const shifts = ((query.data?.data as RotaShift[] | undefined) ?? []).filter((shift) =>
    days.some((day) => shiftDateKey(shift) === dateKey(day)),
  )
  const requests = (requestsQuery.data?.data as Array<{
    id: string
    shift_id: string
    status: string
    reason: string
    requested_start: string
    requested_end: string
  }> | undefined) ?? []

  function step(direction: number) {
    const next = adjacentTimesheetPeriod(paySchedule, period.from, period.to, direction)
    if (next) setPeriodKey(next.periodKey)
  }

  function openRequest(shift: RotaShift) {
    setRequesting(shift)
    setRequestedStart(toLocalInput(shift.start_time))
    setRequestedEnd(toLocalInput(shift.end_time))
    setReason('')
    setError(null)
  }

  async function submitRequest() {
    if (!companyId || !employeeId || !requesting) return
    try {
      setError(null)
      setMessage(null)
      await hrApi.requestShiftChange(companyId, employeeId, {
        shift_id: idOf(requesting),
        requested_start: new Date(requestedStart).toISOString(),
        requested_end: new Date(requestedEnd).toISOString(),
        reason,
      })
      setRequesting(null)
      setMessage('Shift change request sent')
      await requestsQuery.refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request')
    }
  }

  return (
    <div>
      <PageHeader
        title="ROTA"
        subtitle="Published shifts assigned to you. Request a time change if you need to swap or start later."
      />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {message ? <div className="mb-4"><Alert tone="success">{message}</Alert></div> : null}
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-navy">
        <button type="button" className="rounded p-1 hover:bg-white" onClick={() => step(-1)}>
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[180px] text-center">{period.label}</span>
        <button type="button" className="rounded p-1 hover:bg-white" onClick={() => step(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {days.map((day) => {
              const key = dateKey(day)
              const dayShifts = shifts.filter((shift) => shiftDateKey(shift) === key)
              return (
                <div key={key} className="flex items-start gap-4 px-5 py-3">
                  <div className="w-36 shrink-0 text-sm font-semibold text-navy">
                    {formatLongDate(day)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {dayShifts.length === 0 ? (
                      <p className="text-sm text-muted">No published shift</p>
                    ) : (
                      dayShifts.map((shift) => {
                        const pending = requests.find(
                          (item) => String(item.shift_id) === idOf(shift) && item.status === 'PENDING',
                        )
                        return (
                          <div
                            key={idOf(shift)}
                            className="mb-2 rounded-[8px] border border-[#c9daf4] bg-[#eaf3fb] px-3 py-2 text-sm text-[#2f6fad] last:mb-0"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold">
                                  {formatTimeRange(shift.start_time, shift.end_time)}
                                </p>
                                <p>{shift.role_name?.trim() || 'Scheduled'}</p>
                                {pending ? (
                                  <p className="mt-1 text-xs font-semibold text-navy">Change request pending</p>
                                ) : null}
                              </div>
                              <Button variant="secondary" onClick={() => openRequest(shift)}>
                                Request change
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
      {requests.length > 0 ? (
        <Card className="mt-4">
          <div className="px-5 py-3 text-sm font-semibold text-navy">Your change requests</div>
          <div className="divide-y divide-[#eceae6]">
            {requests.map((item) => (
              <div key={idOf(item)} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy">
                    {formatTimeRange(item.requested_start, item.requested_end)}
                  </p>
                  <p className="text-muted">{item.reason}</p>
                </div>
                <Badge status={item.status}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {requesting ? (
        <Card className="mt-4 p-6">
          <h2 className="text-lg font-semibold text-navy">Request a shift change</h2>
          <p className="mt-1 text-sm text-muted">
            Current shift {formatTimeRange(requesting.start_time, requesting.end_time)}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Requested start">
              <Input type="datetime-local" value={requestedStart} onChange={(e) => setRequestedStart(e.target.value)} />
            </Field>
            <Field label="Requested end">
              <Input type="datetime-local" value={requestedEnd} onChange={(e) => setRequestedEnd(e.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Reason">
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} required />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void submitRequest()} disabled={!reason.trim()}>
              Send request
            </Button>
            <Button variant="secondary" onClick={() => setRequesting(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

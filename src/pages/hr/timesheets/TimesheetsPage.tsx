import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Pencil,
  Send,
  User,
} from 'lucide-react'
import { payrollApi, timesheetsApi } from '../../../api'
import { useAuth } from '../../../auth/AuthContext'
import { Alert, Button, EmptyState, Loading, PageHeader } from '../../../components/ui'
import { idOf, labelize } from '../../../lib/format'
import { PayslipPeriodSwitcher } from '../../payroll/PayslipPeriodSwitcher'
import type { PayrollSchedule } from '../../../types'
import { StatCard, TimesheetStatusBadge } from './TimesheetStatusBadge'
import {
  activePaySchedules,
  pickPaySchedule,
  timesheetPeriodFromSchedule,
} from './timesheetPeriod'
import {
  canApprove,
  canEdit,
  canReopen,
  canSend,
  formatHours,
  type TimesheetOverview,
  type TimesheetRow,
  type TimesheetStatus,
} from './timesheetTypes'

function reviewPath(
  row: TimesheetRow,
  from: string,
  to: string,
  scheduleId?: string,
  edit = false,
) {
  const params = new URLSearchParams({ from, to })
  if (scheduleId) params.set('schedule', scheduleId)
  return `/timesheets/${row.employee.id}${edit ? '/edit' : ''}?${params.toString()}`
}

function personName(row: TimesheetRow) {
  return (
    [row.employee.first_name, row.employee.last_name]
      .filter(Boolean)
      .map((part) => labelize(part))
      .join(' ') || '—'
  )
}

function RowActions({
  row,
  from,
  to,
  scheduleId,
  open,
  onToggle,
  onClose,
  onApprove,
  onSend,
  onReopen,
}: {
  row: TimesheetRow
  from: string
  to: string
  scheduleId?: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  onApprove: () => void
  onSend: () => void
  onReopen: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const status = row.status as TimesheetStatus

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) {
      setPos(null)
      return
    }
    const rect = wrapRef.current.getBoundingClientRect()
    const width = 188
    const openUp = rect.bottom > window.innerHeight * 0.62
    setPos({
      left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onViewport = () => onClose()
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onViewport, true)
    window.addEventListener('resize', onViewport)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onViewport, true)
      window.removeEventListener('resize', onViewport)
    }
  }, [open, onClose])

  return (
    <div ref={wrapRef} className="inline-flex h-9 overflow-hidden rounded-[8px] border border-navy bg-white">
      <Link
        to={reviewPath(row, from, to, scheduleId)}
        className="inline-flex items-center px-3 text-sm font-medium text-navy hover:bg-cream"
      >
        Review
      </Link>
      <button
        type="button"
        className="inline-flex items-center border-l border-navy px-2 text-navy hover:bg-cream"
        onClick={onToggle}
        aria-label="More actions"
        aria-expanded={open}
      >
        <ChevronDown size={16} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] w-[188px] overflow-hidden rounded-[10px] border border-[#e4e2dd] bg-white py-1 text-left text-sm text-navy shadow-lg"
              style={pos}
            >
              <Link
                className="block px-3 py-2 hover:bg-cream"
                to={reviewPath(row, from, to, scheduleId)}
                onClick={onClose}
              >
                Review
              </Link>
              {canApprove(status) ? (
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-cream" onClick={onApprove}>
                  Approve
                </button>
              ) : null}
              {canSend(status) ? (
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-cream" onClick={onSend}>
                  Send to Payroll
                </button>
              ) : null}
              {canEdit(status) ? (
                <Link
                  className="block px-3 py-2 hover:bg-cream"
                  to={reviewPath(row, from, to, scheduleId, true)}
                  onClick={onClose}
                >
                  Change / Edit
                </Link>
              ) : null}
              {canReopen(status) ? (
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-cream" onClick={onReopen}>
                  Reopen
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export function TimesheetsPage() {
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scheduleId, setScheduleId] = useState('')
  const [periodKey, setPeriodKey] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const schedules = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const scheduleList = activePaySchedules((schedules.data?.data ?? []) as PayrollSchedule[])
  const paySchedule = pickPaySchedule(scheduleList, scheduleId)
  const selectedScheduleId = paySchedule ? idOf(paySchedule) : ''
  const period = useMemo(
    () => timesheetPeriodFromSchedule(paySchedule, periodKey),
    [paySchedule, periodKey],
  )

  useEffect(() => {
    setScheduleId('')
    setPeriodKey('')
    setSelected([])
  }, [companyId])

  useEffect(() => {
    if (!selectedScheduleId) return
    if (scheduleId !== selectedScheduleId) setScheduleId(selectedScheduleId)
    if (periodKey !== period.periodKey) setPeriodKey(period.periodKey)
  }, [selectedScheduleId, scheduleId, period.periodKey, periodKey])

  const overview = useQuery({
    queryKey: ['timesheets', companyId, period.from, period.to, selectedScheduleId],
    queryFn: () => timesheetsApi.overview(companyId!, period.from, period.to, selectedScheduleId),
    enabled: Boolean(companyId) && !schedules.isPending,
  })

  const data = overview.data?.data as TimesheetOverview | undefined
  const rows = data?.rows ?? []
  const counts = data?.counts ?? {
    pending_review: 0,
    changes_requested: 0,
    approved: 0,
    processed: 0,
    total: 0,
  }

  const selectedRows = rows.filter((row) => selected.includes(row.employee.id))

  async function ensureIds(targets: TimesheetRow[]) {
    const ids: string[] = []
    for (const row of targets) {
      if (row.timesheet_id) {
        ids.push(row.timesheet_id)
        continue
      }
      const created = await timesheetsApi.ensure(companyId!, {
        employee_id: row.employee.id,
        period_start: period.from,
        period_end: period.to,
      })
      ids.push(idOf(created.data))
    }
    return ids
  }

  const act = useMutation({
    mutationFn: async (input: {
      action: 'approve' | 'send_to_payroll' | 'changes' | 'reopen'
      rows: TimesheetRow[]
    }) => {
      const ids = await ensureIds(input.rows)
      const result = await timesheetsApi.bulk(companyId!, { action: input.action, ids })
      return { action: input.action, message: result.message }
    },
    onSuccess: async (result) => {
      setSelected([])
      const failed = /could not be sent|failed/i.test(result.message ?? '')
      if (result.action === 'send_to_payroll' || failed) {
        setError(failed ? result.message : null)
        setMessage(failed ? null : result.message || 'Hours sent to payroll')
      } else {
        setError(null)
        setMessage(null)
      }
      await queryClient.invalidateQueries({ queryKey: ['timesheets', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-record', companyId] })
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof Error ? err.message : 'Action failed')
    },
  })

  function toggleAll(checked: boolean) {
    setSelected(checked ? rows.map((row) => row.employee.id) : [])
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((value) => value !== id),
    )
  }

  async function runAction(action: 'approve' | 'send_to_payroll' | 'changes', row?: TimesheetRow) {
    const targets = row ? [row] : selectedRows
    if (!targets.length) {
      setError('Select at least one timesheet')
      setMessage(null)
      return
    }
    if (action === 'changes' && targets.length === 1) {
      navigate(reviewPath(targets[0], period.from, period.to, selectedScheduleId, true))
      return
    }
    act.mutate({ action, rows: targets })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <PageHeader
        title="Timesheets"
        subtitle="Review employees on the selected pay schedule. The week or month matches that schedule’s dates."
      />
      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Clock3 size={18} />} label="Pending reviews" value={`${counts.pending_review} Employees`} />
        <StatCard icon={<Pencil size={18} />} label="Change requests" value={`${counts.changes_requested} Employees`} />
        <StatCard icon={<Check size={18} />} label="Approved" value={`${counts.approved} Employees`} />
        <StatCard icon={<FileText size={18} />} label="Processed" value={`${counts.processed} Employees`} />
        <StatCard icon={<User size={18} />} label="Total Employees" value={`${counts.total} Employees`} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <PayslipPeriodSwitcher
          schedules={scheduleList}
          scheduleId={selectedScheduleId}
          periodKey={period.periodKey}
          onScheduleChange={(nextId) => {
            setScheduleId(nextId)
            setPeriodKey('')
            setSelected([])
          }}
          onPeriodChange={(nextKey) => {
            setPeriodKey(nextKey)
            setSelected([])
          }}
          disabled={scheduleList.length === 0}
        />
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Button onClick={() => void runAction('approve')} disabled={act.isPending}>
            <Check size={16} />
            Approve Selected
          </Button>
          <Button variant="secondary" onClick={() => void runAction('send_to_payroll')} disabled={act.isPending}>
            <Send size={16} />
            Send to Payroll
          </Button>
          <Button variant="secondary" onClick={() => void runAction('changes')} disabled={act.isPending}>
            <Pencil size={16} />
            Change / Edit
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[16px] border border-[#e4e2dd] bg-white">
        {overview.isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No timesheets for this period"
            body="Employees with scheduled shifts will appear here for review and approval."
          />
        ) : (
          <table className="w-full min-w-[880px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-12" />
              <col />
              <col className="w-[108px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[108px]" />
              <col className="w-[168px]" />
              <col className="w-[156px]" />
            </colgroup>
            <thead className="border-b border-[#eceae6] bg-[#f7f6f3] text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 align-middle accent-navy"
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={(event) => toggleAll(event.target.checked)}
                    aria-label="Select all timesheets"
                  />
                </th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Breaks</th>
                <th className="px-4 py-3">Worked</th>
                <th className="px-4 py-3">Overtime</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {rows.map((row) => {
                const status = row.status as TimesheetStatus
                return (
                  <tr key={row.employee.id} className="hover:bg-cream/60">
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        className="size-4 align-middle accent-navy"
                        checked={selected.includes(row.employee.id)}
                        onChange={(event) => toggleOne(row.employee.id, event.target.checked)}
                        aria-label={`Select ${personName(row)}`}
                      />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="flex items-center gap-2.5 font-medium text-navy">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] text-navy/70">
                          <User size={14} />
                        </span>
                        <span className="truncate">{personName(row)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap text-navy/80">
                      {formatHours(row.scheduled_hours)}
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap text-navy/80">
                      {formatHours(row.break_minutes / 60)}
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap text-navy/80">
                      {formatHours(row.worked_hours)}
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap text-navy/80">
                      {formatHours(row.overtime_hours)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <TimesheetStatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <RowActions
                        row={row}
                        from={period.from}
                        to={period.to}
                        scheduleId={selectedScheduleId}
                        open={menuFor === row.employee.id}
                        onToggle={() => setMenuFor(menuFor === row.employee.id ? null : row.employee.id)}
                        onClose={() => setMenuFor(null)}
                        onApprove={() => {
                          setMenuFor(null)
                          void runAction('approve', row)
                        }}
                        onSend={() => {
                          setMenuFor(null)
                          void runAction('send_to_payroll', row)
                        }}
                        onReopen={() => {
                          setMenuFor(null)
                          act.mutate({ action: 'reopen', rows: [row] })
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

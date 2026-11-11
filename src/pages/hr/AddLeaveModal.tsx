import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Check, ChevronDown, Search, User, X } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { Employee, LeavePayQuote } from '../../types'
import { LeaveStatutoryPayFields, paidLeaveReady } from './LeaveStatutoryPayFields'
import { LEAVE_TYPES } from './leaveTypes'

const fieldClass =
  'w-full rounded-[12px] border border-[#e3e1dc] bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-navy/40 focus:ring-2 focus:ring-navy/10'

export function AddLeaveModal({
  people,
  initialEmployeeId,
  initialStartDate,
  initialEndDate,
  quote,
  quoting,
  submitting,
  error,
  onClose,
  onQuoteKeys,
  onSubmit,
}: {
  people: Employee[]
  initialEmployeeId?: string
  initialStartDate?: string
  initialEndDate?: string
  quote?: LeavePayQuote
  quoting?: boolean
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onQuoteKeys: (keys: {
    employee_id: string
    leave_type: string
    start_date: string
    end_date: string
    is_paid: boolean
  }) => void
  onSubmit: (payload: {
    employee_ids: string[]
    leave_type: string
    start_date: string
    end_date: string
    is_paid: boolean
    paid_per_day?: number
    reason: string
  }) => Promise<void>
}) {
  const [employeeIds, setEmployeeIds] = useState<string[]>(() =>
    initialEmployeeId ? [initialEmployeeId] : [],
  )
  const [leaveType, setLeaveType] = useState<(typeof LEAVE_TYPES)[number]['id']>('Annual Leave')
  const [startDate, setStartDate] = useState(initialStartDate ?? '')
  const [endDate, setEndDate] = useState(initialEndDate || initialStartDate || '')
  const [isPaid, setIsPaid] = useState(true)
  const [paidPerDay, setPaidPerDay] = useState('')
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const quoteEmployeeId = employeeIds[0] ?? ''

  useEffect(() => {
    onQuoteKeys({
      employee_id: quoteEmployeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate || startDate,
      is_paid: isPaid,
    })
  }, [quoteEmployeeId, leaveType, startDate, endDate, isPaid, onQuoteKeys])

  useEffect(() => {
    if (!quote || quote.requires_manual_amount || quote.paid_per_day == null) return
    setPaidPerDay(Number(quote.paid_per_day).toFixed(2))
  }, [quote])

  const selectedType = LEAVE_TYPES.find((type) => type.id === leaveType) ?? LEAVE_TYPES[0]
  const ready = paidLeaveReady(isPaid, paidPerDay, quote, quoting)

  async function submit() {
    setLocalError(null)
    if (employeeIds.length === 0) {
      setLocalError('Select at least one employee')
      return
    }
    if (!startDate || !endDate) {
      setLocalError('Choose start and leave dates')
      return
    }
    if (endDate < startDate) {
      setLocalError('Leave date cannot be before the start date')
      return
    }
    if (!ready) {
      setLocalError('Enter the amount to be paid per day')
      return
    }
    try {
      await onSubmit({
        employee_ids: employeeIds,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        is_paid: isPaid,
        ...(isPaid && (!quote || quote.requires_manual_amount) ? { paid_per_day: Number(paidPerDay) } : {}),
        reason,
      })
    } catch {
      /* parent surfaces the error */
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-navy/40 p-3 py-6 sm:p-4 sm:py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <Card className="w-full max-w-[min(100%,460px)] overflow-hidden shadow-2xl">
        <div className="border-b border-[#eceae6] bg-gradient-to-r from-[#f4f7fb] to-white px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-xl font-semibold text-navy">Add Leave</h2>
          <p className="mt-1 text-sm text-muted">Assign the same leave to one or more employees.</p>
        </div>
        <div className="max-h-[min(70svh,640px)] space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {error || localError ? (
            <p className="rounded-[10px] bg-[#fdecec] px-3 py-2 text-sm text-[#b42318]">{error || localError}</p>
          ) : null}

          <EmployeePicker people={people} value={employeeIds} onChange={setEmployeeIds} />

          <LeaveTypeSelect value={selectedType.id} onChange={setLeaveType} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Start Date</span>
              <span className="relative block">
                <input
                  type="date"
                  className={`${fieldClass} pr-9`}
                  value={startDate}
                  onChange={(event) => {
                    const next = event.target.value
                    setStartDate(next)
                    if (endDate && endDate < next) setEndDate(next)
                  }}
                />
                <Calendar size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/35" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Leave Date</span>
              <span className="relative block">
                <input
                  type="date"
                  className={`${fieldClass} pr-9`}
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                />
                <Calendar size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/35" />
              </span>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-navy">Leave is</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { paid: true, label: 'Paid' },
                  { paid: false, label: 'Unpaid' },
                ] as const
              ).map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setIsPaid(option.paid)}
                  className={`rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition ${
                    isPaid === option.paid
                      ? 'border-navy bg-navy text-white shadow-sm'
                      : 'border-[#e3e1dc] bg-white text-navy hover:bg-cream'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isPaid ? (
            <>
              {employeeIds.length > 1 ? (
                <p className="text-xs text-muted">
                  The rate below is calculated for the first selected employee. Each employee is paid from their own
                  HMRC / holiday-pay figures when you save.
                </p>
              ) : null}
              <LeaveStatutoryPayFields
                quote={quote}
                loading={quoting}
                value={paidPerDay}
                onChange={setPaidPerDay}
              />
            </>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Notes (optional)</span>
            <textarea
              className={`${fieldClass} min-h-[88px] resize-y`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Add a note for this leave"
            />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#eceae6] bg-[#fbfaf8] px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button disabled={submitting || !ready || employeeIds.length === 0} onClick={() => void submit()}>
            {submitting ? 'Adding…' : employeeIds.length > 1 ? `Add Leave (${employeeIds.length})` : 'Add Leave'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function EmployeePicker({
  people,
  value,
  onChange,
}: {
  people: Employee[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = people.filter((person) => value.includes(idOf(person)))
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return people.filter((person) =>
      fullName(person.first_name, person.last_name).toLowerCase().includes(needle),
    )
  }, [people, query])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
  }

  return (
    <div ref={ref} className="relative">
      <span className="mb-1.5 block text-sm font-medium text-navy">Select Employee(s)</span>
      <div className="relative">
        <button
          type="button"
          className={`${fieldClass} flex min-h-[44px] items-center justify-between gap-2 pr-9 text-left`}
          onClick={() => setOpen((current) => !current)}
        >
          {selected.length === 0 ? (
            <span className="text-muted">Choose one or more employees</span>
          ) : (
            <span className="flex min-w-0 flex-wrap gap-1.5">
              {selected.slice(0, 3).map((person) => (
                <span
                  key={idOf(person)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#e7f1f8] px-2 py-0.5 text-xs font-semibold text-navy"
                >
                  <User size={11} />
                  {fullName(person.first_name, person.last_name)}
                </span>
              ))}
              {selected.length > 3 ? (
                <span className="inline-flex items-center rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white">
                  +{selected.length - 3}
                </span>
              ) : null}
            </span>
          )}
        </button>
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/35" />
      </div>
      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[12px] border border-[#e3e1dc] bg-white shadow-xl">
          <div className="border-b border-[#eceae6] p-2">
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                className="h-9 w-full rounded-[8px] bg-cream pl-8 pr-3 text-sm text-navy outline-none"
                placeholder="Search employees"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">No matching employees</p>
            ) : (
              filtered.map((person) => {
                const id = idOf(person)
                const checked = value.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                      checked ? 'bg-[#e7f1f8] font-semibold text-navy' : 'text-navy hover:bg-cream'
                    }`}
                    onClick={() => toggle(id)}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${
                        checked ? 'border-navy bg-navy text-white' : 'border-[#cfd4da] bg-white'
                      }`}
                    >
                      {checked ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
                      <User size={13} />
                    </span>
                    <span className="truncate">{fullName(person.first_name, person.last_name)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((person) => (
            <button
              key={idOf(person)}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[#e3e1dc] bg-white px-2 py-0.5 text-xs font-medium text-navy hover:border-navy/40"
              onClick={() => toggle(idOf(person))}
            >
              {fullName(person.first_name, person.last_name)}
              <X size={11} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LeaveTypeSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: (typeof LEAVE_TYPES)[number]['id']) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = LEAVE_TYPES.find((type) => type.id === value) ?? LEAVE_TYPES[0]

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  return (
    <div ref={ref} className="relative">
      <span className="mb-1.5 block text-sm font-medium text-navy">Leave Type</span>
      <div className="relative">
        <button
          type="button"
          className={`${fieldClass} flex items-center justify-between gap-2 pr-9 text-left`}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full" style={{ background: selected.color }} />
            {selected.id}
          </span>
        </button>
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/35" />
      </div>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-[12px] border border-[#e3e1dc] bg-white py-1 shadow-xl">
          {LEAVE_TYPES.map((type) => {
            const active = type.id === value
            return (
              <button
                key={type.id}
                type="button"
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm ${
                  active ? 'bg-[#e7f1f8] font-semibold text-navy' : 'text-navy hover:bg-cream'
                }`}
                onClick={() => {
                  onChange(type.id)
                  setOpen(false)
                }}
              >
                <span className="size-2.5 rounded-full" style={{ background: type.color }} />
                <span className="flex-1">{type.id}</span>
                {active ? <Check size={14} className="text-navy" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

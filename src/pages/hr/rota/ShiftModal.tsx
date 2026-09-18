import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Plus,
  User,
} from 'lucide-react'
import { Alert, Button } from '../../../components/ui'
import {
  combineDateAndMinutes,
  decodeShiftNotes,
  encodeShiftNotes,
  formatTimeRange,
  parseTimeRange,
  type RotaEmployee,
  type RotaShift,
} from './rotaModel'
import { fullName, idOf } from '../../../lib/format'

const fieldClass =
  'h-11 w-full appearance-none rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none placeholder:text-muted focus:border-navy'

export type ShiftModalMode = 'create' | 'edit' | 'move'

export type ShiftFormValue = {
  employee_id: string
  employee_ids: string[]
  date: string
  time: string
  breakMinutes: string
  role: string
  requireApproval: boolean
  notes: string
}

function emptyForm(overrides: Partial<ShiftFormValue> = {}): ShiftFormValue {
  const employeeId = overrides.employee_id ?? ''
  return {
    employee_id: employeeId,
    employee_ids: overrides.employee_ids ?? (employeeId ? [employeeId] : []),
    date: overrides.date ?? '',
    time: overrides.time ?? '',
    breakMinutes: overrides.breakMinutes ?? '',
    role: overrides.role ?? '',
    requireApproval: overrides.requireApproval ?? false,
    notes: overrides.notes ?? '',
  }
}

export function selectedEmployeeIds(form: ShiftFormValue): string[] {
  if (form.employee_ids.length > 0) return [...new Set(form.employee_ids.filter(Boolean))]
  return form.employee_id ? [form.employee_id] : []
}

export function formFromShift(shift: RotaShift): ShiftFormValue {
  const meta = decodeShiftNotes(shift.notes)
  const employeeId =
    shift.employee_id != null && shift.employee_id !== '' ? String(shift.employee_id) : ''
  return {
    employee_id: employeeId,
    employee_ids: employeeId ? [employeeId] : [],
    date: String(shift.shift_date ?? '').slice(0, 10),
    time: formatTimeRange(shift.start_time, shift.end_time),
    breakMinutes: meta.breakMinutes ? String(meta.breakMinutes) : '',
    role: shift.role_name ?? '',
    requireApproval: meta.requireApproval,
    notes: meta.notes,
  }
}

export function shiftPayload(form: ShiftFormValue) {
  const range = parseTimeRange(form.time)
  if (!range) {
    throw new Error('Enter a time range such as 9 am - 5 pm')
  }
  if (!form.date) {
    throw new Error('Select a date')
  }
  const start = combineDateAndMinutes(form.date, range.startMinutes)
  const end = combineDateAndMinutes(form.date, range.endMinutes)
  if (end <= start) end.setDate(end.getDate() + 1)
  return {
    employee_id: selectedEmployeeIds(form)[0] ?? null,
    shift_date: form.date,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    role_name: form.role.trim() || undefined,
    notes: encodeShiftNotes({
      breakMinutes: Number(form.breakMinutes) || 0,
      requireApproval: form.requireApproval,
      notes: form.notes,
    }),
  }
}

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-navy">
      <span className="text-navy/70">{icon}</span>
      {children}
    </span>
  )
}

function EmployeeMultiSelect({
  people,
  value,
  onChange,
}: {
  people: RotaEmployee[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = people.filter((person) => value.includes(idOf(person)))
  const label =
    selected.length === 0
      ? 'Select'
      : selected.length === 1
        ? fullName(selected[0].first_name, selected[0].last_name)
        : `${selected.length} employees selected`

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
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`${fieldClass} flex items-center justify-between pr-8 text-left ${
          selected.length === 0 ? 'text-muted' : ''
        }`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{label}</span>
      </button>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/40"
      />
      {open ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[8px] border border-[#d9d9d9] bg-white py-1 shadow-lg">
          {people.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">No employees available</p>
          ) : (
            people.map((person) => {
              const id = idOf(person)
              const checked = value.includes(id)
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-navy"
                    checked={checked}
                    onChange={() => toggle(id)}
                  />
                  <span className="truncate">{fullName(person.first_name, person.last_name)}</span>
                </label>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ShiftModal({
  mode,
  people,
  roles,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  mode: ShiftModalMode
  people: RotaEmployee[]
  roles: string[]
  initial: Partial<ShiftFormValue>
  saving?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (form: ShiftFormValue) => Promise<void>
}) {
  const [form, setForm] = useState<ShiftFormValue>(() => emptyForm(initial))
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setForm(emptyForm(initial))
    setLocalError(null)
  }, [initial, mode])

  const title = mode === 'edit' ? 'Edit Shift' : mode === 'move' ? 'Move Shift' : 'Add Shift'
  const submitLabel = mode === 'edit' ? 'Save Edits' : mode === 'move' ? 'Save' : 'Add Shift'
  const moveOnly = mode === 'move'

    return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-navy/25 px-4 py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-navy">
          <Plus size={18} />
          {title}
        </h2>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              setLocalError(null)
              await onSubmit(form)
            } catch (err) {
              setLocalError(err instanceof Error ? err.message : 'Could not save shift')
            }
          }}
        >
          {error || localError ? <Alert>{error || localError}</Alert> : null}

          {moveOnly ? null : (
            <label className="block">
              <Label icon={<User size={14} />}>Select Employees</Label>
              {mode === 'create' ? (
                <EmployeeMultiSelect
                  people={people}
                  value={form.employee_ids}
                  onChange={(employee_ids) =>
                    setForm({
                      ...form,
                      employee_ids,
                      employee_id: employee_ids[0] ?? '',
                    })
                  }
                />
              ) : (
                <div className="relative">
                  <select
                    className={`${fieldClass} pr-8`}
                    value={form.employee_id}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        employee_id: event.target.value,
                        employee_ids: event.target.value ? [event.target.value] : [],
                      })
                    }
                  >
                    <option value="">Select</option>
                    {people.map((person) => (
                      <option key={String(person.id)} value={String(person.id)}>
                        {fullName(person.first_name, person.last_name)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/40"
                  />
                </div>
              )}
            </label>
          )}

          <label className="block">
            <Label icon={<CalendarDays size={14} />}>Date</Label>
            <div className="relative">
              <input
                type="date"
                className={`${fieldClass} pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
              <CalendarDays
                size={16}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy/45"
              />
            </div>
          </label>

          <div className={moveOnly ? '' : 'grid grid-cols-[1fr_120px] gap-3'}>
            <label className="block">
              <Label icon={<Clock size={14} />}>Time</Label>
              <input
                className={fieldClass}
                placeholder="e.g. 9 am - 5 pm"
                value={form.time}
                onChange={(event) => setForm({ ...form, time: event.target.value })}
                required
              />
            </label>
            {moveOnly ? null : (
              <label className="block">
                <Label icon={<Coffee size={14} />}>Break</Label>
                <div className="flex items-center gap-2">
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={form.breakMinutes}
                    onChange={(event) => setForm({ ...form, breakMinutes: event.target.value })}
                  />
                  <span className="text-sm text-muted">min</span>
                </div>
              </label>
            )}
          </div>

          {moveOnly ? null : (
            <label className="block">
              <Label icon={<Briefcase size={14} />}>Role</Label>
              <div className="relative">
                <input
                  className={fieldClass}
                  list="rota-roles"
                  placeholder="Select"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                />
                <datalist id="rota-roles">
                  {roles.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
            </label>
          )}

          {moveOnly ? null : (
            <div className="flex items-center justify-between gap-3">
              <Label icon={<Check size={14} />}>Require Approval</Label>
              <button
                type="button"
                role="switch"
                aria-checked={form.requireApproval}
                onClick={() => setForm({ ...form, requireApproval: !form.requireApproval })}
                className={`relative h-6 w-11 rounded-full transition ${
                  form.requireApproval ? 'bg-navy' : 'bg-[#d9d9d9]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition ${
                    form.requireApproval ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          )}

          {moveOnly ? null : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Notes (optional)</span>
              <textarea
                className="min-h-24 w-full rounded-[8px] border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-muted focus:border-navy"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

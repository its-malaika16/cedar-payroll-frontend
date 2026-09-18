import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronLeft,
  Flag,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { BrandIcon } from '../../components/BrandIcon'
import { formatLongDate, fullName, idOf, isEmployeeOnPayrollRun } from '../../lib/format'
import type { PayrollRecord, PayrollRun } from '../../types'
import iconPerson from '../../assets/brand/icon-person.png'
import { CreateSendMenu, toolbarBtn } from './CreateSendMenu'
import { PayrollImportMenu } from './PayrollImportMenu'
import { PayrollMoreMenu } from './PayrollMoreMenu'
import { PayrollSchedulesMenu } from './PayrollSchedulesMenu'
import { ADDITION_ITEMS, DEDUCTION_ITEMS } from './payslipMenus'
import { loadSavedPayTypes, rememberPayType } from './payTypes'
import { payrollListPathFromRun } from './payrollNavigation'

const ZERO_FIELDS = [
  'holiday_pay',
  'overtime_1',
  'overtime_1_5',
  'overtime_2',
  'bonus',
  'bonus_2',
  'commission',
  'night_allowance',
  'holiday_adjustment',
  'car_allowance',
  'service_charges',
] as const

const titles: Record<string, string> = {
  addition: 'Add Addition To Multiple Payslips',
  deduction: 'Add Deduction To Multiple Payslips',
  note: 'Add Note To Multiple Payslips',
  fps: 'Set FPS Settings for Multiple Payslips',
  zeroise: 'Zeroise Payslips',
}

const crumbs: Record<string, string> = {
  addition: 'Add Addition',
  deduction: 'Add Deduction',
  note: 'Add Note',
  fps: 'FPS Settings',
  zeroise: 'Zeroise Payslips',
}

export function BulkPayslipActionPage() {
  const { runId = '', action = 'addition' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const preselect = params.get('recordId') ?? ''
  const typeRef = useRef<HTMLLabelElement>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [focusedId, setFocusedId] = useState(preselect)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [source, setSource] = useState<'existing' | 'new'>('existing')
  const [typeLabel, setTypeLabel] = useState('')
  const [newName, setNewName] = useState('')
  const [amount, setAmount] = useState('0.00')
  const [noteTarget, setNoteTarget] = useState<'employee' | 'employer'>('employee')
  const [note, setNote] = useState('')
  const [typeOpen, setTypeOpen] = useState(false)

  const runQuery = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })

  const run = runQuery.data?.data as PayrollRun | undefined
  const records = ((run?.payroll_records ?? []) as PayrollRecord[]).filter((record) =>
    isEmployeeOnPayrollRun(record.employees, run),
  )
  const locked = ['LOCKED', 'COMPLETED'].includes((run?.status ?? '').toUpperCase())
  const periodLabel = (run?.pay_frequency ?? '').toUpperCase().includes('MONTH')
    ? 'Month Ending'
    : 'Week Ending'
  const savedTypes = companyId
    ? loadSavedPayTypes(companyId).filter((item) =>
        action === 'deduction' ? item.kind === 'deduction' : item.kind === 'addition',
      )
    : []

  useEffect(() => {
    if (records.length === 0) return
    setSelected(records.map((record) => idOf(record)))
  }, [records.length])

  useEffect(() => {
    if (focusedId || records.length === 0) return
    setFocusedId(idOf(records[0]))
  }, [focusedId, records])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) setTypeOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const additionOptions = useMemo(
    () => [...ADDITION_ITEMS.map((item) => item.label), ...savedTypes.map((item) => item.name)],
    [savedTypes],
  )
  const deductionOptions = useMemo(
    () => [...DEDUCTION_ITEMS, ...savedTypes.map((item) => item.name)],
    [savedTypes],
  )
  const typeOptions = action === 'deduction' ? deductionOptions : additionOptions
  const allSelected = records.length > 0 && selected.length === records.length
  const currentId = focusedId || selected[0] || (records[0] ? idOf(records[0]) : '')
  const title = titles[action] ?? 'Multiple Payslips'
  const listPath = payrollListPathFromRun(run)
  const backTo = preselect ? `/payroll/runs/${runId}/records/${preselect}` : listPath
  const backState = preselect ? { from: listPath } : undefined
  const periodText = run ? `${periodLabel} ${formatLongDate(run.period_end_date)}` : ''

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function applyToSelected(getBody: (record: PayrollRecord) => Record<string, unknown>) {
    if (!companyId) throw new Error('Select a company first')
    for (const recordId of selected) {
      const record = records.find((item) => idOf(item) === recordId)
      if (!record) continue
      await payrollApi.updateRecord(companyId, runId, recordId, getBody(record))
    }
    await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, runId] })
  }

  async function onOk() {
    setError(null)
    setMessage(null)
    if (selected.length === 0) {
      setError('Select at least one employee.')
      return
    }
    if (locked) {
      setError('Reopen this pay run before changing payslips.')
      return
    }
    setBusy(true)
    try {
      if (action === 'zeroise') {
        await applyToSelected(() => Object.fromEntries(ZERO_FIELDS.map((field) => [field, 0])))
        setMessage(`Zeroised ${selected.length} payslip${selected.length === 1 ? '' : 's'}.`)
      } else if (action === 'note') {
        if (!note.trim()) throw new Error('Enter a note.')
        await applyToSelected((record) => {
          const key = noteTarget === 'employee' ? 'employee_notes' : 'employer_notes'
          const existing = String(record[key] ?? '').trim()
          const next = existing ? `${existing}\n${note.trim()}` : note.trim()
          return { [key]: next }
        })
        setMessage(`Note added to ${selected.length} payslip${selected.length === 1 ? '' : 's'}.`)
      } else if (action === 'fps') {
        throw new Error('FPS settings cannot be changed in bulk yet. Edit each employee Tax, NICs, RTI tab.')
      } else if (action === 'addition') {
        const label = source === 'new' ? newName.trim() : typeLabel
        if (!label) throw new Error(source === 'new' ? 'Enter a name for the addition type.' : 'Select an addition type.')
        const value = Number(amount)
        if (Number.isNaN(value)) throw new Error('Enter a valid amount.')
        const field = ADDITION_ITEMS.find((item) => item.label === label)?.field
        if (source === 'new' && companyId) {
          rememberPayType(companyId, 'addition', {
            name: label,
            amount,
            calculationMethod: 'Basic amount',
            repetition: 'Include in this period only',
            tax: true,
            nics: true,
            employeePension: false,
            employerPension: false,
            minWage: true,
            notional: false,
            reuse: 'remember',
          })
        }
        if (!field) {
          throw new Error(
            'This addition type is stored for reuse, but it cannot be written to payroll records yet. Choose a mapped type such as Bonus or Overtime.',
          )
        }
        await applyToSelected((record) => ({ [field]: Number(record[field] ?? 0) + value }))
        setMessage(`Added ${label} to ${selected.length} payslip${selected.length === 1 ? '' : 's'}.`)
      } else if (action === 'deduction') {
        const label = source === 'new' ? newName.trim() : typeLabel
        if (!label) throw new Error(source === 'new' ? 'Enter a name for the deduction type.' : 'Select a deduction type.')
        if (source === 'new' && companyId) {
          rememberPayType(companyId, 'deduction', {
            name: label,
            amount,
            calculationMethod: 'Basic amount',
            repetition: 'Include in this period only',
            tax: true,
            nics: true,
            employeePension: false,
            employerPension: false,
            minWage: false,
            notional: false,
            reuse: 'remember',
          })
        }
        throw new Error(
          'Custom deductions are remembered for the Add menu, but payroll records cannot store them yet.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update payslips')
    } finally {
      setBusy(false)
    }
  }

  if (runQuery.isLoading) return <Loading />
  if (!run) return <Alert>Payroll run not found</Alert>

  return (
    <div>
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; More &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">{crumbs[action] ?? 'Bulk'}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(backTo, { state: backState })}
          className="flex max-w-3xl items-start gap-3 text-left text-[28px] font-semibold leading-tight text-navy xl:text-[32px] xl:leading-none"
        >
          <ChevronLeft size={25} strokeWidth={2.4} className="mt-1 shrink-0" />
          <span>
            {title}
            {periodText ? ` (${periodText})` : ''}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <PayrollImportMenu onUnavailable={setError} />
          <button
            type="button"
            className={toolbarBtn}
            disabled={locked}
            onClick={() =>
              companyId &&
              payrollApi
                .completeRun(companyId, runId)
                .then(() => payrollApi.lockRun(companyId, runId))
                .then((result) => {
                  setMessage(result.message)
                  return queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, runId] })
                })
                .catch((err: unknown) =>
                  setError(err instanceof Error ? err.message : 'Could not finalise the pay run'),
                )
            }
          >
            <Check size={16} />
            Finalise
          </button>
          <button
            type="button"
            className={toolbarBtn}
            disabled={!locked}
            onClick={() => navigate(`/payroll/runs/${runId}/reopen`)}
          >
            <RefreshCw size={16} />
            Reopen
          </button>
          <CreateSendMenu companyId={companyId!} runId={runId} />
          <button type="button" className={toolbarBtn} onClick={() => navigate('/payroll/runs')}>
            <SlidersHorizontal size={16} />
            Filter
          </button>
          <PayrollSchedulesMenu />
          <PayrollMoreMenu runId={runId} onUnavailable={setError} />
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mt-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <div className="mt-6 grid min-h-0 gap-4 xl:grid-cols-[276px_minmax(220px,320px)_minmax(0,1fr)]">
        <aside className="h-[min(640px,calc(100vh-16rem))] overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <div className="h-full overflow-y-auto">
            {records.map((item, index) => {
              const id = idOf(item)
              const active = id === currentId
              const name = fullName(item.employees?.first_name, item.employees?.last_name)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFocusedId(id)}
                  className={`flex h-[39px] w-full items-center gap-3 border-b border-[#d9d9d9] px-4 text-left text-xs font-medium ${
                    active ? 'bg-navy text-white' : 'text-navy'
                  } ${index === 0 ? 'rounded-t-[10px]' : ''}`}
                >
                  <BrandIcon src={iconPerson} alt="" className="size-4" tone={active ? 'navy' : 'light'} />
                  <span className="min-w-0 flex-1 truncate">{name === '—' ? 'Employee Name' : name}</span>
                  {item.is_starter || item.is_leaver ? (
                    <Flag size={12} className={active ? 'fill-white text-white' : 'fill-navy text-navy'} />
                  ) : null}
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <h3 className="px-5 pt-5 text-base font-semibold text-navy">Select Employees</h3>
          <label className="mt-3 flex items-center gap-3 border-y border-[#d9d9d9] px-5 py-2 text-xs font-medium text-muted">
            <input
              type="checkbox"
              className="size-3.5 accent-navy"
              checked={allSelected}
              onChange={(event) =>
                setSelected(event.target.checked ? records.map((record) => idOf(record)) : [])
              }
            />
            Employee
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {records.map((record) => {
              const id = idOf(record)
              const name = fullName(record.employees?.first_name, record.employees?.last_name)
              return (
                <label
                  key={id}
                  className="flex items-center gap-3 border-b border-[#eee] px-5 py-2.5 text-sm text-navy hover:bg-cream"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-navy"
                    checked={selected.includes(id)}
                    onChange={() => toggle(id)}
                  />
                  <span className="truncate">{name === '—' ? 'Employee Name' : name}</span>
                </label>
              )
            })}
          </div>
          <p className="border-t border-[#d9d9d9] px-5 py-3 text-xs font-medium text-muted">
            {selected.length} of {records.length} employees selected.
          </p>
        </section>

        <section className="flex min-h-[520px] flex-col rounded-[10px] border border-[#d9d9d9] bg-white p-6">
          {action === 'addition' || action === 'deduction' ? (
            <>
              <p className="mb-3 text-sm font-semibold text-navy">Select an option</p>
              <label className="mb-2 flex items-start gap-3 text-sm font-medium text-navy">
                <input
                  type="radio"
                  className="mt-0.5 size-3.5 accent-navy"
                  checked={source === 'existing'}
                  onChange={() => setSource('existing')}
                />
                Use an existing {action} type
              </label>
              <label className="mb-5 flex items-start gap-3 text-sm font-medium text-navy">
                <input
                  type="radio"
                  className="mt-0.5 size-3.5 accent-navy"
                  checked={source === 'new'}
                  onChange={() => setSource('new')}
                />
                Create a new {action} type.
              </label>
              {source === 'existing' ? (
                <label className="relative mb-4 block" ref={typeRef}>
                  <span className="mb-1.5 block text-xs font-medium text-navy">
                    {action === 'addition' ? 'Addition type' : 'Deduction type'}
                  </span>
                  <button
                    type="button"
                    className="flex h-[35px] w-full max-w-[280px] items-center justify-between rounded-[6px] border-[0.5px] border-[#d9d9d9] px-3 text-left text-xs text-navy"
                    onClick={() => setTypeOpen((open) => !open)}
                  >
                    <span className={typeLabel ? 'text-navy' : 'text-muted'}>
                      {typeLabel || 'Select'}
                    </span>
                    <span className="text-muted">▾</span>
                  </button>
                  {typeOpen ? (
                    <div className="absolute z-20 mt-1 max-h-64 w-full max-w-[280px] overflow-y-auto rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white py-1 shadow-sm">
                      {typeOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="flex w-full px-3 py-1.5 text-left text-xs font-medium text-navy hover:bg-cream"
                          onClick={() => {
                            setTypeLabel(option)
                            setTypeOpen(false)
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
              ) : (
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-xs font-medium text-navy">Name</span>
                  <input
                    className="h-[35px] w-full max-w-[280px] rounded-[6px] border-[0.5px] border-[#d9d9d9] px-3 text-xs text-navy outline-none"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-navy">Amount</span>
                <div className="flex max-w-[180px]">
                  <span className="flex h-[35px] items-center rounded-l-[6px] border-[0.5px] border-r-0 border-[#d9d9d9] px-3 text-xs text-navy">
                    £
                  </span>
                  <input
                    className="h-[35px] min-w-0 flex-1 rounded-r-[6px] border-[0.5px] border-[#d9d9d9] px-3 text-xs text-navy outline-none"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
              </label>
            </>
          ) : null}

          {action === 'note' ? (
            <>
              <label className="mb-2 flex items-start gap-3 text-sm font-medium text-navy">
                <input
                  type="radio"
                  className="mt-0.5 size-3.5 accent-navy"
                  checked={noteTarget === 'employee'}
                  onChange={() => setNoteTarget('employee')}
                />
                Note for employee (appears on payslip)
              </label>
              <label className="mb-4 flex items-start gap-3 text-sm font-medium text-navy">
                <input
                  type="radio"
                  className="mt-0.5 size-3.5 accent-navy"
                  checked={noteTarget === 'employer'}
                  onChange={() => setNoteTarget('employer')}
                />
                Note for employer (does not appear on payslip)
              </label>
              <textarea
                className="h-40 w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] px-3 py-2 text-xs text-navy outline-none"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </>
          ) : null}

          {action === 'zeroise' ? (
            <p className="text-sm font-medium text-navy">
              Clear bonus, overtime, allowances and other pay additions on the selected payslips.
            </p>
          ) : null}

          {action === 'fps' ? (
            <p className="text-sm font-medium text-navy">
              FPS declarations are set on each employee’s Tax, NICs, RTI tab.
            </p>
          ) : null}

          <div className="mt-auto flex justify-end gap-3 pt-8">
            <Button type="button" variant="secondary" onClick={() => navigate(backTo, { state: backState })}>
              Cancel
            </Button>
            <Button type="button" disabled={busy || locked} onClick={() => void onOk()}>
              OK
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

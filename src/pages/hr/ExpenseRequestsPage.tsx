import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Search, User, X } from 'lucide-react'
import { employeesApi, hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { ExpenseReceiptActions } from '../../components/ExpenseReceiptActions'
import { Alert, Badge, Button, Card, EmptyState, Loading, Table, Textarea } from '../../components/ui'
import { fullName, idOf, labelize } from '../../lib/format'
import type { Employee } from '../../types'
import { EmployeePicker } from './AddLeaveModal'
import { HrCrumbs, HrTitle } from './HrChrome'

type ExpenseItem = {
  id?: unknown
  employee_id?: unknown
  name?: string
  expense_date?: string
  amount?: number | string
  status?: string
  rejection_reason?: string | null
  has_file?: boolean
  attachment_name?: string | null
  source?: string | null
  employees?: { first_name?: string | null; last_name?: string | null }
}

const ACCEPT =
  '.png,.pdf,.jpeg,.jpg,.doc,.docx,image/png,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_BYTES = 10 * 1024 * 1024

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

function money(value?: number | string) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return '£0.00'
  return `£${amount.toFixed(2)}`
}

function prettyDate(value?: string) {
  const key = String(value ?? '').slice(0, 10)
  if (!key) return '—'
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ExpenseRequestsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, can } = useAuth()
  const canReview = can('leave.approve')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState('')
  const [rejecting, setRejecting] = useState<ExpenseItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adding, setAdding] = useState(false)

  const query = useQuery({
    queryKey: ['expenses', companyId],
    queryFn: () => hrApi.expensesAll(companyId!),
    enabled: Boolean(companyId),
  })
  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId && canReview),
  })
  const people = (employeesQuery.data?.data ?? []) as Employee[]

  const requests = ((query.data?.data as ExpenseItem[] | undefined) ?? []).map((item) => ({
    ...item,
    id: idOf(item),
    employee_id: String(item.employee_id ?? idOf(item.employees) ?? ''),
  }))

  const counts = useMemo(() => {
    const next = { ALL: requests.length, PENDING: 0, APPROVED: 0, REJECTED: 0 }
    for (const item of requests) {
      const status = String(item.status ?? '').toUpperCase()
      if (status in next) next[status as keyof typeof next] += 1
    }
    return next
  }, [requests])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return requests.filter((item) => {
      const status = String(item.status ?? '').toUpperCase()
      if (filter !== 'ALL' && status !== filter) return false
      if (!needle) return true
      const name = fullName(item.employees?.first_name, item.employees?.last_name).toLowerCase()
      return name.includes(needle) || String(item.name ?? '').toLowerCase().includes(needle)
    })
  }, [filter, requests, search])

  async function review(item: ExpenseItem, status: 'APPROVED' | 'REJECTED', reason?: string) {
    if (!companyId || !item.id) return
    setError(null)
    setMessage(null)
    setBusyId(String(item.id))
    try {
      const result = await hrApi.reviewExpense(companyId, String(item.id), {
        status,
        ...(status === 'REJECTED' ? { rejection_reason: reason } : {}),
      })
      setMessage(result.message)
      setRejecting(null)
      setRejectionReason('')
      await queryClient.invalidateQueries({ queryKey: ['expenses', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this expense')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <HrCrumbs items={[{ label: 'HR', to: '/hr' }, { label: 'Expense' }]} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <HrTitle title="Expense" onBack={() => navigate('/hr')} />
        {canReview ? (
          <Button
            onClick={() => {
              setError(null)
              setAdding(true)
            }}
          >
            <Plus size={16} />
            Add expense for employee
          </Button>
        ) : null}
      </div>
      <p className="mb-5 text-sm text-muted">
        Approve employee claims, or add an expense for an employee. Assigned expenses are added to the
        payroll period that contains the expense date.
      </p>

      {error && !adding ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-[10px] border border-[#d9d9d9] bg-white p-1 text-sm font-semibold">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-[8px] px-3 py-1.5 ${filter === item ? 'bg-navy text-white' : 'text-navy'}`}
              onClick={() => setFilter(item)}
            >
              {item === 'ALL' ? 'All' : labelize(item)}
              <span className={`ml-1.5 text-xs ${filter === item ? 'text-white/80' : 'text-muted'}`}>
                {counts[item]}
              </span>
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            className="h-10 w-full rounded-[10px] border border-[#d9d9d9] bg-white pl-9 pr-3 text-sm text-navy outline-none"
            placeholder="Search employee or name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <Card>
        {query.isLoading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No expenses"
            body={filter === 'PENDING' ? 'There are no pending expense requests.' : 'No expenses match this filter.'}
          />
        ) : (
          <Table columns={['Employee', 'Expense', 'Date', 'Amount', 'Status', 'Actions']}>
            {visible.map((item) => {
              const pending = String(item.status).toUpperCase() === 'PENDING'
              const busy = busyId === String(item.id)
              const filePath = companyId ? hrApi.expenseAdminFilePath(companyId, String(item.id)) : ''
              return (
                <tr key={String(item.id)}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-navy">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
                        <User size={14} />
                      </span>
                      {fullName(item.employees?.first_name, item.employees?.last_name)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-navy">
                    <p className="font-medium">{item.name}</p>
                    {String(item.source).toUpperCase() === 'ADMIN' ? (
                      <p className="mt-0.5 text-xs text-muted">Assigned by company</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted">Employee request</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-navy">{prettyDate(item.expense_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{money(item.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge status={item.status}>{labelize(item.status)}</Badge>
                    {item.rejection_reason ? (
                      <p className="mt-1 max-w-[220px] truncate text-xs text-muted">{item.rejection_reason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.has_file && filePath ? (
                        <ExpenseReceiptActions
                          path={filePath}
                          fileName={item.attachment_name}
                          compact
                        />
                      ) : (
                        <span className="text-xs text-muted">No receipt</span>
                      )}
                      {pending && canReview ? (
                        <>
                          <Button disabled={busy} onClick={() => void review(item, 'APPROVED')}>
                            <Check size={14} />
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                              setRejecting(item)
                              setRejectionReason('')
                            }}
                          >
                            <X size={14} />
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      {adding ? (
        <AddExpenseModal
          people={people}
          submitting={busyId === 'assign'}
          error={error}
          onClose={() => setAdding(false)}
          onSubmit={async (payload) => {
            if (!companyId) return
            setBusyId('assign')
            setError(null)
            setMessage(null)
            try {
              const form = new FormData()
              form.append('name', payload.name)
              form.append('expense_date', payload.expense_date)
              form.append('amount', String(payload.amount))
              payload.employee_ids.forEach((id) => form.append('employee_ids', id))
              if (payload.file) form.append('file', payload.file)
              const result = await hrApi.assignExpense(companyId, form)
              setMessage(result.message ?? 'Expense assigned')
              setAdding(false)
              setFilter('APPROVED')
              await queryClient.invalidateQueries({ queryKey: ['expenses', companyId] })
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not assign this expense')
              throw err
            } finally {
              setBusyId('')
            }
          }}
        />
      ) : null}

      {rejecting ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-navy">Reject expense</h2>
            <p className="mt-1 text-sm text-muted">
              {fullName(rejecting.employees?.first_name, rejecting.employees?.last_name)} · {rejecting.name} ·{' '}
              {money(rejecting.amount)}
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-navy">Reason</span>
              <Textarea
                variant="outline"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Tell the employee why this expense is being rejected"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejecting(null)} disabled={Boolean(busyId)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={Boolean(busyId) || !rejectionReason.trim()}
                onClick={() => void review(rejecting, 'REJECTED', rejectionReason.trim())}
              >
                Reject request
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function AddExpenseModal({
  people,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  people: Employee[]
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (payload: {
    employee_ids: string[]
    name: string
    expense_date: string
    amount: number
    file: File | null
  }) => Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [name, setName] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  async function submit() {
    setLocalError(null)
    const value = Number(amount)
    if (employeeIds.length === 0) {
      setLocalError('Select at least one employee')
      return
    }
    if (!name.trim()) {
      setLocalError('Enter the expense name')
      return
    }
    if (!expenseDate) {
      setLocalError('Choose the expense date')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setLocalError('Enter a valid amount')
      return
    }
    if (file && file.size > MAX_BYTES) {
      setLocalError('Receipt must be 10 MB or smaller')
      return
    }
    try {
      await onSubmit({
        employee_ids: employeeIds,
        name: name.trim(),
        expense_date: expenseDate,
        amount: Math.round(value * 100) / 100,
        file,
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
        <div className="border-b border-[#eceae6] px-4 py-4 sm:px-6">
          <h2 className="text-xl font-semibold text-navy">Add expense</h2>
          <p className="mt-1 text-sm text-muted">
            Assign an expense to one or more employees. It is added to payroll for the period that contains
            the date.
          </p>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6">
          {error || localError ? (
            <p className="rounded-[10px] bg-[#fdecec] px-3 py-2 text-sm text-[#b42318]">{error || localError}</p>
          ) : null}
          <EmployeePicker people={people} value={employeeIds} onChange={setEmployeeIds} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Expense name</span>
            <input
              className="h-11 w-full rounded-[12px] border border-[#e3e1dc] bg-white px-3 text-sm text-navy outline-none focus:border-navy/40"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Client meeting travel"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Date</span>
              <input
                type="date"
                className="h-11 w-full rounded-[12px] border border-[#e3e1dc] bg-white px-3 text-sm text-navy outline-none focus:border-navy/40"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Amount (£)</span>
              <input
                inputMode="decimal"
                className="h-11 w-full rounded-[12px] border border-[#e3e1dc] bg-white px-3 text-sm text-navy outline-none focus:border-navy/40"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Receipt</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="block w-full text-sm text-navy file:mr-3 file:rounded-[8px] file:border file:border-[#d5d8de] file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null
                if (next && !/\.(png|pdf|jpe?g|docx?)$/i.test(next.name)) {
                  setLocalError('Attach a PNG, PDF, JPEG, JPG or Word file')
                  event.target.value = ''
                  setFile(null)
                  return
                }
                setLocalError(null)
                setFile(next)
              }}
            />
            <span className="mt-1 block text-xs text-muted">
              Optional. PNG, PDF, JPEG, JPG or Word, up to 10 MB.
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eceae6] px-4 py-4 sm:px-6">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={() => void submit()}>
            {submitting ? 'Saving…' : 'Add expense'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

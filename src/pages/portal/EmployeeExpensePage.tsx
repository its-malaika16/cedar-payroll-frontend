import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { hrApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { ExpenseReceiptActions } from '../../components/ExpenseReceiptActions'
import { Alert, Button, Card, EmptyState, Loading } from '../../components/ui'
import { idOf, labelize } from '../../lib/format'

type ExpenseItem = {
  id?: unknown
  name?: string
  expense_date?: string
  amount?: number | string
  status?: string
  rejection_reason?: string | null
  has_file?: boolean
  attachment_name?: string | null
  source?: string | null
}

const ACCEPT = '.png,.pdf,.jpeg,.jpg,.doc,.docx,image/png,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_BYTES = 10 * 1024 * 1024

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

function statusClass(status?: string) {
  const value = String(status ?? '').toUpperCase()
  if (value === 'APPROVED' || value === 'PAID') return 'bg-[#e7f6ec] text-[#1b7d4f]'
  if (value === 'REJECTED') return 'bg-[#fdecee] text-[#d32027]'
  if (value === 'CANCELLED') return 'bg-[#f3f1ec] text-[#7a8490]'
  return 'bg-[#fff4e5] text-[#c2782a]'
}

export function EmployeeExpensePage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const companyId = auth.companyId
  const employeeId = String(auth.currentEmployee?.employee_id ?? '')
  const [name, setName] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const query = useQuery({
    queryKey: ['my-expenses', companyId, employeeId],
    queryFn: () => hrApi.myExpenses(companyId!, employeeId),
    enabled: Boolean(companyId && employeeId),
  })

  const items = ((query.data?.data as ExpenseItem[] | undefined) ?? []).map((item) => ({
    ...item,
    id: idOf(item),
  }))

  const pending = useMemo(
    () => items.filter((item) => String(item.status).toUpperCase() === 'PENDING').length,
    [items],
  )

  async function submit() {
    if (!companyId || !employeeId) {
      setError('Your employee record was not found for this company')
      return
    }
    const value = Number(amount)
    if (!name.trim()) {
      setError('Enter the expense name')
      return
    }
    if (!expenseDate) {
      setError('Choose the expense date')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (file && file.size > MAX_BYTES) {
      setError('Receipt must be 10 MB or smaller')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('expense_date', expenseDate)
      form.append('amount', String(Math.round(value * 100) / 100))
      if (file) form.append('file', file)
      const result = await hrApi.createExpense(companyId, employeeId, form)
      setMessage(result.message ?? 'Expense submitted')
      setName('')
      setAmount('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await queryClient.invalidateQueries({ queryKey: ['my-expenses', companyId, employeeId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit this expense')
    } finally {
      setBusy(false)
    }
  }

  async function cancel(item: ExpenseItem) {
    if (!companyId || !employeeId || !item.id) return
    setCancellingId(String(item.id))
    setError(null)
    try {
      await hrApi.cancelExpense(companyId, employeeId, String(item.id))
      await queryClient.invalidateQueries({ queryKey: ['my-expenses', companyId, employeeId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this expense')
    } finally {
      setCancellingId('')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <p className="mb-3 text-sm text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        Expense
      </p>
      <h1 className="text-[28px] font-semibold text-navy">Expense</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Request repayment for work costs. Your company approves the claim, then it is added to payroll
        for the pay period that contains the expense date.
      </p>

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

      <Card className="mb-6 p-5">
        <h2 className="text-base font-semibold text-navy">New expense</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="mb-2 block text-sm font-medium text-navy">Expense name</span>
            <input
              className="h-11 w-full rounded-[8px] border border-[#d5d8de] bg-white px-3 text-sm text-navy outline-none focus:border-navy"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Client meeting travel"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-navy">Date</span>
            <input
              type="date"
              className="h-11 w-full rounded-[8px] border border-[#d5d8de] bg-white px-3 text-sm text-navy outline-none focus:border-navy"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-navy">Amount (£)</span>
            <input
              inputMode="decimal"
              className="h-11 w-full rounded-[8px] border border-[#d5d8de] bg-white px-3 text-sm text-navy outline-none focus:border-navy"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
        </div>
        <label className="mt-4 block max-w-xl">
          <span className="mb-2 block text-sm font-medium text-navy">Receipt</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="block w-full text-sm text-navy file:mr-3 file:rounded-[8px] file:border file:border-[#d5d8de] file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null
              if (next && !/\.(png|pdf|jpe?g|docx?)$/i.test(next.name)) {
                setError('Attach a PNG, PDF, JPEG, JPG or Word file')
                event.target.value = ''
                setFile(null)
                return
              }
              setError(null)
              setFile(next)
            }}
          />
          <span className="mt-1 block text-xs text-muted">
            PNG, PDF, JPEG, JPG or Word (.doc, .docx). Optional, up to 10 MB.
          </span>
          {file ? <span className="mt-1 block text-sm text-navy">{file.name}</span> : null}
        </label>
        <div className="mt-4">
          <Button type="button" disabled={busy || !employeeId} onClick={() => void submit()}>
            {busy ? 'Submitting…' : 'Submit expense'}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-navy">Your expenses</h2>
          {pending > 0 ? (
            <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white">
              {pending} pending
            </span>
          ) : null}
        </div>
        {query.isLoading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title="No expenses yet" body="Submit a claim above. Approved amounts appear on the matching payslip." />
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {items.map((item) => {
              const status = String(item.status ?? 'PENDING').toUpperCase()
              return (
                <div key={String(item.id)} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-navy">{item.name || 'Expense'}</p>
                    <p className="mt-1 text-sm text-muted">
                      {prettyDate(item.expense_date)} · {money(item.amount)}
                      {String(item.source).toUpperCase() === 'ADMIN' ? ' · Added by your company' : ''}
                    </p>
                    {item.rejection_reason ? (
                      <p className="mt-1 text-xs text-[#d32027]">{item.rejection_reason}</p>
                    ) : null}
                    {item.has_file && companyId ? (
                      <div className="mt-2">
                        <ExpenseReceiptActions
                          path={hrApi.expenseFilePath(companyId, employeeId, String(item.id))}
                          fileName={item.attachment_name}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>
                      {labelize(status === 'PAID' ? 'Paid' : status)}
                    </span>
                    {status === 'PENDING' ? (
                      <Button
                        variant="secondary"
                        disabled={cancellingId === String(item.id)}
                        onClick={() => void cancel(item)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

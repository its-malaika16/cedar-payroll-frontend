import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, ChevronLeft, Hash, Trash2, User } from 'lucide-react'
import { invoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { idOf } from '../../lib/format'
import {
  displayInvoiceNumber,
  headingLine,
  invoiceLineFromAmount,
  invoiceTotals,
  mapApiLines,
  type InvoiceLine,
  type InvoiceRecord,
} from './invoiceMath'

const NAVY = '#17375e'
const fieldClass =
  'h-[42px] w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 text-sm font-medium text-navy outline-none placeholder:text-[#9b9a9a] focus:border-navy'

function asRecord(value: unknown) {
  return (value ?? {}) as Record<string, unknown>
}

function formatFieldDate(value: string) {
  if (!value) return ''
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function InvoiceInput({
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#8a93a3]">
          {icon}
        </span>
      ) : null}
      <input className={`${fieldClass} ${icon ? 'pl-9' : ''} ${className}`} {...props} />
    </div>
  )
}

function DateField({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const label = formatFieldDate(value)

  return (
    <div className="relative">
      <CalendarDays size={15} className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-[#8a93a3]" />
      <div className={`${fieldClass} pointer-events-none pl-9 ${label ? '' : 'text-[#9b9a9a]'}`}>
        {label || placeholder}
      </div>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  )
}

export function InvoiceEditorPage() {
  const { invoiceId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, isBureauAdmin, isSuperAdmin } = useAuth()
  const canEdit = isBureauAdmin || isSuperAdmin
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [contact, setContact] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [reference, setReference] = useState('')
  const [heading, setHeading] = useState('')
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [bank, setBank] = useState({
    bank_sort_code: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_name: '',
  })
  const [addOpen, setAddOpen] = useState(false)
  const [headingOpen, setHeadingOpen] = useState(false)
  const [savedId, setSavedId] = useState(invoiceId)

  const defaultsQuery = useQuery({
    queryKey: ['invoice-defaults', companyId],
    queryFn: () => invoicesApi.defaults(companyId!),
    enabled: Boolean(companyId && canEdit && !invoiceId),
  })
  const invoiceQuery = useQuery({
    queryKey: ['invoice', companyId, invoiceId],
    queryFn: () => invoicesApi.get(companyId!, invoiceId),
    enabled: Boolean(companyId && invoiceId),
  })

  useEffect(() => {
    const source = invoiceId ? invoiceQuery.data?.data : defaultsQuery.data?.data
    if (!source) return
    const record = asRecord(source)
    setContact(String(record.contact_name ?? ''))
    setIssueDate(String(record.issue_date ?? '').slice(0, 10))
    setDueDate(String(record.due_date ?? '').slice(0, 10))
    setInvoiceNumber(String(record.invoice_number ?? ''))
    setReference(String(record.reference ?? ''))
    setHeading(String(record.heading ?? ''))
    setBank({
      bank_sort_code: String(record.bank_sort_code ?? ''),
      bank_account_number: String(record.bank_account_number ?? ''),
      bank_account_holder: String(record.bank_account_holder ?? ''),
      bank_name: String(record.bank_name ?? ''),
    })
    setLines(mapApiLines(record.lines as Array<Record<string, unknown>> | undefined))
  }, [defaultsQuery.data, invoiceQuery.data, invoiceId])

  const totals = useMemo(() => invoiceTotals(lines), [lines])
  const loading = invoiceId ? invoiceQuery.isLoading : defaultsQuery.isLoading
  const status = String(asRecord(invoiceQuery.data?.data).status ?? 'DRAFT')
  const locked = Boolean(invoiceId) && status !== 'DRAFT'

  function updateLine(key: string, patch: Partial<InvoiceLine>) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line
        if (line.kind === 'HEADING') return { ...line, ...patch, amount: 0, tax_amount: 0, total_amount: 0 }
        const next = { ...line, ...patch }
        return invoiceLineFromAmount(next.description, next.amount, next.tax_rate, next)
      }),
    )
  }

  function payload() {
    return {
      contact_name: contact,
      issue_date: issueDate || undefined,
      due_date: dueDate || null,
      reference,
      heading,
      ...bank,
      lines: lines.map((line) => ({
        id: line.id,
        employee_id: line.employee_id,
        kind: line.kind,
        description: line.description,
        amount: line.amount,
        tax_rate: line.tax_rate,
      })),
    }
  }

  async function saveDraft() {
    if (!companyId) return ''
    setError(null)
    setBusy(true)
    try {
      const result = savedId
        ? await invoicesApi.update(companyId, savedId, payload())
        : await invoicesApi.create(companyId, payload())
      const id = idOf(result.data as InvoiceRecord)
      setSavedId(id)
      void queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['invoice', companyId, id] })
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save invoice')
      return ''
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    const id = await saveDraft()
    if (!id || !companyId) return
    setBusy(true)
    try {
      await invoicesApi.approve(companyId, id)
      void queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
      navigate(`/payroll/invoices/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve invoice')
    } finally {
      setBusy(false)
    }
  }

  if (!canEdit) {
    return <Alert>Only a bureau admin can create invoices.</Alert>
  }
  if (loading) return <Loading />

  return (
    <div className="pb-8">
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; Invoices &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">{invoiceId ? displayInvoiceNumber(invoiceNumber) : 'New Invoice'}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/payroll/invoices')}
          className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          {invoiceId ? 'Edit Invoice' : 'New Invoice'}
        </button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy || locked} onClick={() => void saveDraft()}>
            Save draft
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void saveDraft().then((id) => id && navigate(`/payroll/invoices/${id}`))}>
            View invoice
          </Button>
          <Button disabled={busy || locked} onClick={() => void approve()}>
            Approve invoice
          </Button>
        </div>
      </div>
      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 rounded-[16px] border border-[#e6e3dc] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.06)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Contact</span>
            <InvoiceInput
              icon={<User size={15} />}
              value={contact}
              disabled={locked}
              placeholder="Search or select contact..."
              onChange={(e) => setContact(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Issue date</span>
            <DateField value={issueDate} disabled={locked} placeholder="Choose issue date..." onChange={setIssueDate} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Due date</span>
            <DateField value={dueDate} disabled={locked} placeholder="Choose due date..." onChange={setDueDate} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Invoice number</span>
            <InvoiceInput icon={<Hash size={15} />} value={displayInvoiceNumber(invoiceNumber)} readOnly />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Reference</span>
            <InvoiceInput
              icon={<Hash size={15} />}
              value={reference}
              disabled={locked}
              placeholder="Add reference..."
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-sm font-medium text-navy">Description</p>
          <div className="relative inline-block">
            <button
              type="button"
              className="flex h-[38px] items-center gap-2 rounded-[10px] border border-navy bg-white px-3 text-sm font-medium text-navy"
              disabled={locked}
              onClick={() => setHeadingOpen((open) => !open)}
            >
              Heading
              <ChevronDown size={14} />
            </button>
            {headingOpen ? (
              <div className="absolute z-20 mt-1 w-56 rounded-[10px] border border-[#d9d9d9] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-navy hover:bg-cream"
                  onClick={() => {
                    setLines((current) => [
                      headingLine(heading || 'Total Earnings'),
                      ...current.filter((line) => line.kind !== 'HEADING'),
                    ])
                    setHeadingOpen(false)
                  }}
                >
                  Insert heading row
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[12px] border border-[#eceae6]">
          <div className="grid grid-cols-[minmax(12rem,1.5fr)_7.5rem_7.5rem_8rem_8rem_2.75rem] bg-[#f7f5f1] px-4 py-3 text-[12px] font-semibold text-navy">
            <span>Employee Name</span>
            <span className="text-center">Amount</span>
            <span className="text-center">Tax rate</span>
            <span className="text-center">Tax amount</span>
            <span className="text-center">Amount</span>
            <span />
          </div>
          <div className="max-h-[min(420px,46vh)] overflow-y-auto">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid grid-cols-[minmax(12rem,1.5fr)_7.5rem_7.5rem_8rem_8rem_2.75rem] items-center gap-2 border-t border-[#f0eeea] px-4 py-2.5"
              >
                <InvoiceInput
                  value={line.description}
                  disabled={locked}
                  onChange={(e) => {
                    if (line.kind === 'HEADING') setHeading(e.target.value)
                    updateLine(line.key, { description: e.target.value })
                  }}
                />
                {line.kind === 'HEADING' ? (
                  <>
                    <span />
                    <span />
                    <span />
                    <span />
                  </>
                ) : (
                  <>
                    <InvoiceInput
                      className="text-right"
                      inputMode="decimal"
                      value={line.amount === 0 ? '' : String(line.amount)}
                      placeholder="0.00"
                      disabled={locked}
                      onChange={(e) => updateLine(line.key, { amount: Number(e.target.value) || 0 })}
                    />
                    <InvoiceInput className="text-center" value="20%" readOnly />
                    <InvoiceInput className="text-right" value={line.tax_amount.toFixed(2)} readOnly />
                    <InvoiceInput className="text-right" value={line.total_amount.toFixed(2)} readOnly />
                  </>
                )}
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center text-[#9b9a9a] hover:text-brand disabled:opacity-40"
                  disabled={locked}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                  aria-label="Delete row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex max-w-[220px] justify-between text-sm text-navy">
            <span>Subtotal</span>
            <span className="font-semibold tabular-nums">{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex max-w-[220px] justify-between text-sm text-navy">
            <span>Total VAT</span>
            <span className="font-semibold tabular-nums">{totals.vatTotal.toFixed(2)}</span>
          </div>
          <div className="relative inline-block">
            <button
              type="button"
              className="flex h-[38px] items-center gap-2 rounded-[10px] border border-navy bg-white px-3 text-sm font-medium text-navy"
              disabled={locked}
              onClick={() => setAddOpen((open) => !open)}
            >
              Add row
              <ChevronDown size={14} />
            </button>
            {addOpen ? (
              <div className="absolute bottom-full z-20 mb-1 w-48 rounded-[10px] border border-[#d9d9d9] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-navy hover:bg-cream"
                  onClick={() => {
                    setLines((current) => [...current, invoiceLineFromAmount('', 0)])
                    setAddOpen(false)
                  }}
                >
                  Employee row
                </button>
                <button
                  type="button"
                  className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-navy hover:bg-cream"
                  onClick={() => {
                    setLines((current) => [...current, headingLine('Heading')])
                    setAddOpen(false)
                  }}
                >
                  Heading
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t border-[#eceae6] pt-6 md:grid-cols-4">
          <p className="text-sm font-semibold md:col-span-4" style={{ color: NAVY }}>
            Bank details
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Sort code</span>
            <InvoiceInput value={bank.bank_sort_code} onChange={(e) => setBank((current) => ({ ...current, bank_sort_code: e.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Account number</span>
            <InvoiceInput value={bank.bank_account_number} onChange={(e) => setBank((current) => ({ ...current, bank_account_number: e.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Account holder</span>
            <InvoiceInput value={bank.bank_account_holder} onChange={(e) => setBank((current) => ({ ...current, bank_account_holder: e.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-navy">Bank name</span>
            <InvoiceInput value={bank.bank_name} onChange={(e) => setBank((current) => ({ ...current, bank_name: e.target.value }))} />
          </label>
        </div>
        {locked ? (
          <p className="mt-3 text-sm text-muted">Line items are locked after approval. Bank details can still be updated.</p>
        ) : null}
      </div>
    </div>
  )
}

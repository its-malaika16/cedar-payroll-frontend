import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { invoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Badge, Button, Input, Loading } from '../../components/ui'
import { idOf } from '../../lib/format'
import { isFormDirty } from '../../lib/formDirty'
import { downloadBlobFile } from '../employees/formPdf'
import { InvoiceDocument } from './InvoiceDocument'
import {
  displayInvoiceNumber,
  invoiceBadgeStatus,
  invoiceStatusLabel,
  mapApiLines,
  parseInvoiceType,
  type InvoiceRecord,
} from './invoiceMath'

export function InvoiceViewPage() {
  const { invoiceId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, isBureauAdmin, isSuperAdmin } = useAuth()
  const canManage = isBureauAdmin || isSuperAdmin
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [bank, setBank] = useState({
    bank_sort_code: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_name: '',
  })

  const query = useQuery({
    queryKey: ['invoice', companyId, invoiceId],
    queryFn: async () => {
      const result = await invoicesApi.get(companyId!, invoiceId)
      const invoice = result.data as InvoiceRecord
      setBank({
        bank_sort_code: invoice.bank_sort_code ?? '',
        bank_account_number: invoice.bank_account_number ?? '',
        bank_account_holder: invoice.bank_account_holder ?? '',
        bank_name: invoice.bank_name ?? '',
      })
      return result
    },
    enabled: Boolean(companyId && invoiceId),
  })

  const invoice = query.data?.data as InvoiceRecord | undefined
  const lines = mapApiLines(
    invoice?.lines as Array<Record<string, unknown>> | undefined,
    parseInvoiceType(invoice?.invoice_type),
  )

  async function downloadPdf() {
    if (!companyId || !invoiceId) return
    setError(null)
    setBusy(true)
    try {
      const blob = await invoicesApi.fileBlob(companyId, invoiceId)
      downloadBlobFile(blob, `${invoice?.invoice_number || 'invoice'}.pdf`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download invoice')
    } finally {
      setBusy(false)
    }
  }

  async function saveBank() {
    if (!companyId || !invoiceId) return
    setError(null)
    setBusy(true)
    try {
      await invoicesApi.update(companyId, invoiceId, bank)
      void queryClient.invalidateQueries({ queryKey: ['invoice', companyId, invoiceId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update bank details')
    } finally {
      setBusy(false)
    }
  }

  async function markPaid() {
    if (!companyId || !invoiceId) return
    setError(null)
    setBusy(true)
    try {
      await invoicesApi.markPaid(companyId, invoiceId)
      void queryClient.invalidateQueries({ queryKey: ['invoice', companyId, invoiceId] })
      void queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark invoice as paid')
    } finally {
      setBusy(false)
    }
  }

  async function removeInvoice() {
    if (!companyId || !invoiceId) return
    setError(null)
    setBusy(true)
    try {
      await invoicesApi.remove(companyId, invoiceId)
      void queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
      void queryClient.removeQueries({ queryKey: ['invoice', companyId, invoiceId] })
      navigate('/payroll/invoices')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete invoice')
      setBusy(false)
    }
  }

  if (query.isLoading) return <Loading />
  if (!invoice) return <Alert>Invoice not found</Alert>

  const savedBank = {
    bank_sort_code: invoice.bank_sort_code ?? '',
    bank_account_number: invoice.bank_account_number ?? '',
    bank_account_holder: invoice.bank_account_holder ?? '',
    bank_name: invoice.bank_name ?? '',
  }
  const bankDirty = isFormDirty(bank, savedBank)

  return (
    <div>
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; Invoices &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">{displayInvoiceNumber(invoice.invoice_number)}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/payroll/invoices')}
          className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          Invoice
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={invoiceBadgeStatus(invoice.status, invoice.due_date)}>
            {invoiceStatusLabel(invoice.status)}
          </Badge>
          {canManage && invoice.status === 'DRAFT' ? (
            <Button variant="secondary" onClick={() => navigate(`/payroll/invoices/${idOf(invoice)}/edit`)}>
              Edit
            </Button>
          ) : null}
          {canManage && invoice.status === 'APPROVED' ? (
            <Button disabled={busy} onClick={() => void markPaid()}>
              Mark as paid
            </Button>
          ) : null}
          {canManage ? (
            <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : null}
          <Button variant="secondary" disabled={busy} onClick={() => void downloadPdf()}>
            Download PDF
          </Button>
        </div>
      </div>
      {error && !confirmDelete ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
      <div className="mt-6">
        <InvoiceDocument invoice={invoice} lines={lines} bank={bank} />
      </div>
      {canManage ? (
        <div className="mt-6 rounded-[16px] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.06)]">
          <p className="text-sm font-semibold text-navy">Bank details</p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Sort code</span>
              <Input value={bank.bank_sort_code} onChange={(e) => setBank((current) => ({ ...current, bank_sort_code: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Account number</span>
              <Input value={bank.bank_account_number} onChange={(e) => setBank((current) => ({ ...current, bank_account_number: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Account holder</span>
              <Input value={bank.bank_account_holder} onChange={(e) => setBank((current) => ({ ...current, bank_account_holder: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Bank name</span>
              <Input value={bank.bank_name} onChange={(e) => setBank((current) => ({ ...current, bank_name: e.target.value }))} />
            </label>
          </div>
          <div className="mt-4">
            <Button variant="secondary" disabled={busy || !bankDirty} onClick={() => void saveBank()}>
              Save bank details
            </Button>
          </div>
        </div>
      ) : null}
      {confirmDelete ? (
        <InvoiceDeleteDialog
          invoiceNumber={displayInvoiceNumber(invoice.invoice_number)}
          deleting={busy}
          error={error}
          onKeep={() => {
            if (!busy) setConfirmDelete(false)
          }}
          onDelete={() => void removeInvoice()}
        />
      ) : null}
    </div>
  )
}

export function InvoiceDeleteDialog({
  invoiceNumber,
  deleting,
  error,
  onKeep,
  onDelete,
}: {
  invoiceNumber: string
  deleting: boolean
  error?: string | null
  onKeep: () => void
  onDelete: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
      role="presentation"
      onClick={() => {
        if (!deleting) onKeep()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-invoice-title"
        className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="delete-invoice-title" className="text-lg font-semibold text-navy">
          Delete {invoiceNumber}?
        </h3>
        <p className="mt-2 text-sm text-muted">
          This permanently removes the invoice. This cannot be undone.
        </p>
        {error ? <p className="mt-3 text-sm font-medium text-brand">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            type="button"
            className="h-10 min-w-[105px] text-xs"
            disabled={deleting}
            onClick={onKeep}
          >
            Keep invoice
          </Button>
          <Button
            variant="danger"
            type="button"
            className="h-10 min-w-[105px] text-xs"
            disabled={deleting}
            onClick={onDelete}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

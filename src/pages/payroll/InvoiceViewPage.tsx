import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { invoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Badge, Button, Input, Loading } from '../../components/ui'
import { idOf } from '../../lib/format'
import { downloadBlobFile } from '../employees/formPdf'
import { InvoiceDocument } from './InvoiceDocument'
import {
  displayInvoiceNumber,
  invoiceStatusLabel,
  mapApiLines,
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
  const lines = mapApiLines(invoice?.lines as Array<Record<string, unknown>> | undefined)

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

  if (query.isLoading) return <Loading />
  if (!invoice) return <Alert>Invoice not found</Alert>

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
          <Badge status={invoice.status}>{invoiceStatusLabel(invoice.status)}</Badge>
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
          <Button variant="secondary" disabled={busy} onClick={() => void downloadPdf()}>
            Download PDF
          </Button>
        </div>
      </div>
      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
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
            <Button variant="secondary" disabled={busy} onClick={() => void saveBank()}>
              Save bank details
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

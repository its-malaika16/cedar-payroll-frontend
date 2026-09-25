import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { companyInvoicesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal'
import { Alert, Button, Card, Field, Input, Loading, PageHeader, Textarea } from '../../components/ui'
import { money } from '../../lib/format'
import { FileChip, MetaTile, StatusPill, invoiceIcons, prettyDate } from './InvoiceChrome'
import { invoiceStatusLabel, type CompanyInvoice } from './invoiceTypes'

const ACCEPT = '.xlsx,.xls,.doc,.docx,.pdf,.png,.jpg,.jpeg'

export function CompanyInvoiceFormPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { invoiceId } = useParams()
  const companyId = auth.companyId ?? ''
  const isNew = !invoiceId

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const existing = useQuery({
    queryKey: ['company-invoice', companyId, invoiceId],
    queryFn: () => companyInvoicesApi.get(companyId, invoiceId!),
    enabled: Boolean(companyId && invoiceId),
  })

  const invoice = (existing.data?.data ?? null) as CompanyInvoice | null

  useEffect(() => {
    if (!invoice) return
    setTitle(invoice.title ?? '')
    setDescription(invoice.description ?? '')
    setAmount(invoice.amount ? String(invoice.amount) : '')
    setDueDate(invoice.due_date ? String(invoice.due_date).slice(0, 10) : '')
  }, [invoice])

  const save = useMutation({
    mutationFn: async (send: boolean) => {
      const form = new FormData()
      form.append('title', title.trim())
      form.append('description', description.trim())
      form.append('amount', amount.trim())
      if (dueDate) form.append('due_date', dueDate)
      form.append('send', send ? 'true' : 'false')
      if (file) form.append('file', file)
      return companyInvoicesApi.save(companyId, form, invoiceId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-invoices', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-invoice-dashboard', companyId] })
      navigate('/company-invoices')
    },
    onError: (err: Error) => setError(err.message),
  })

  const submitReason = useMutation({
    mutationFn: () => companyInvoicesApi.submitReason(companyId, invoiceId!, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-invoice', companyId, invoiceId] })
      await queryClient.invalidateQueries({ queryKey: ['company-invoices', companyId] })
      setReason('')
    },
    onError: (err: Error) => setError(err.message),
  })

  if (!isNew && existing.isLoading) return <Loading />

  const status = invoice?.status ?? 'DRAFT'
  const canEdit = isNew || status === 'DRAFT'
  const needsReason = status === 'REASON_REQUESTED'

  function onSubmit(event: FormEvent, send: boolean) {
    event.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Enter a title')
      return
    }
    if (!amount.trim() || Number(amount) <= 0) {
      setError('Enter an amount to be paid')
      return
    }
    save.mutate(send)
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'New invoice' : invoice?.title || 'Invoice'}
        subtitle={isNew ? 'Save a draft or send it to the bureau.' : invoiceStatusLabel(status)}
        actions={
          <Link to="/company-invoices">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#f0efec] px-5 py-4 sm:px-8">
            <p className="text-sm font-semibold text-navy">{isNew ? 'Invoice details' : 'Invoice'}</p>
            {invoice && !isNew ? <StatusPill status={status} /> : null}
          </div>
          <form className="grid gap-5 p-5 sm:p-8" onSubmit={(event) => onSubmit(event, false)}>
            <Field label="Title">
              <Input
                variant="outline"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={!canEdit}
                required
              />
            </Field>
            <Field label="Description">
              <Textarea
                variant="outline"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Amount to be paid">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  variant="outline"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={!canEdit}
                  required
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  variant="outline"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={!canEdit}
                />
              </Field>
            </div>
            <Field label="Attachment">
              {canEdit ? (
                <div className="rounded-[14px] border border-dashed border-[#d9d9d9] bg-[#faf9f7] px-4 py-4">
                  <input
                    type="file"
                    accept={ACCEPT}
                    className="block w-full text-sm text-navy file:mr-3 file:rounded-[8px] file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="mt-2 text-xs text-muted">Excel, Word, PDF, PNG or JPG.</p>
                  {file ? <p className="mt-2 text-sm font-semibold text-navy">{file.name}</p> : null}
                </div>
              ) : null}
              {invoice?.has_file ? (
                <div className="mt-3">
                  <FileChip name={invoice.file_name || 'Attachment'} onClick={() => setPreview(true)} />
                </div>
              ) : null}
            </Field>

            {canEdit ? (
              <div className="flex flex-wrap gap-2 border-t border-[#f0efec] pt-5">
                <Button type="submit" variant="secondary" disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" disabled={save.isPending} onClick={(event) => onSubmit(event, true)}>
                  {save.isPending ? 'Sending…' : 'Send'}
                </Button>
              </div>
            ) : null}
          </form>
        </Card>

        <div className="space-y-4">
          <div className="rounded-[20px] bg-navy p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">Amount</p>
            <div className="mt-3 text-white">
              <p className="text-[32px] font-semibold leading-none tracking-tight">
                {amount ? money(amount) : '£0.00'}
              </p>
            </div>
            <p className="mt-3 text-sm text-white/70">{dueDate ? `Due ${prettyDate(dueDate)}` : 'No due date yet'}</p>
          </div>
          {!isNew && invoice ? (
            <Card className="p-4">
              <div className="grid gap-3">
                <MetaTile icon={invoiceIcons.sent} label="Sent" value={prettyDate(invoice.sent_at)} />
                {invoice.company_reason ? (
                  <div className="rounded-[14px] bg-[#faf9f7] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Your reason</p>
                    <p className="mt-1 text-sm text-navy">{invoice.company_reason}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {needsReason ? (
        <Card className="mt-6 border-amber-200 p-5 sm:p-8">
          <h2 className="text-lg font-semibold text-navy">Reason requested</h2>
          <p className="mt-2 text-sm text-muted">The bureau has asked for an explanation of this invoice.</p>
          {invoice?.bureau_note ? (
            <p className="mt-3 rounded-[14px] bg-amber-50 px-4 py-3 text-sm text-navy">{invoice.bureau_note}</p>
          ) : null}
          <Field label="Explanation">
            <Textarea
              variant="outline"
              className="mt-1"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <Button
            className="mt-4"
            disabled={submitReason.isPending || !reason.trim()}
            onClick={() => {
              setError(null)
              submitReason.mutate()
            }}
          >
            {submitReason.isPending ? 'Submitting…' : 'Submit reason'}
          </Button>
        </Card>
      ) : null}

      {preview && invoice ? (
        <DocumentPreviewModal
          title={invoice.title}
          fileName={invoice.file_name || 'attachment'}
          path={companyInvoicesApi.filePath(companyId, invoice.id)}
          onClose={() => setPreview(false)}
        />
      ) : null}
    </div>
  )
}

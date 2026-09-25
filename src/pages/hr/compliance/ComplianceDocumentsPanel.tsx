import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, EyeOff, FileText, Trash2 } from 'lucide-react'
import { hrApi } from '../../../api'
import { download } from '../../../api/client'
import { DocumentPreviewModal } from '../../../components/DocumentPreviewModal'
import { Alert, Badge, Button, EmptyState, Field, Loading } from '../../../components/ui'
import { formatDate } from '../../../lib/format'
import {
  typesFor,
  type ComplianceDocumentType,
  type ComplianceFile,
} from './documentTypes'

const ACCEPT = '.png,.jpg,.jpeg,.pdf,.doc,.docx'

function IconButton({
  label,
  onClick,
  tone = 'navy',
  children,
}: {
  label: string
  onClick: () => void
  tone?: 'navy' | 'danger'
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex size-9 shrink-0 items-center justify-center rounded-[6px] border bg-white ${
        tone === 'danger'
          ? 'border-[#d32027] text-[#d32027] hover:bg-[#fdecee]'
          : 'border-[#17375e] text-navy hover:bg-cream'
      }`}
    >
      {children}
    </button>
  )
}

function expiryBadge(doc: ComplianceFile) {
  if (doc.expiry_state === 'expired') return <Badge status="EXPIRED">Expired</Badge>
  if (doc.expiry_state === 'soon') return <Badge status="PENDING">Expires soon</Badge>
  if (doc.expiry_date) return <Badge>Expires {formatDate(doc.expiry_date)}</Badge>
  return null
}

export function ComplianceDocumentsPanel({
  companyId,
  employeeId,
  role,
  documents,
  loading,
}: {
  companyId: string
  employeeId: string
  role: 'employee' | 'employer'
  documents: ComplianceFile[]
  loading?: boolean
}) {
  const queryClient = useQueryClient()
  const [documentType, setDocumentType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [visibleToEmployee, setVisibleToEmployee] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ComplianceFile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ComplianceFile | null>(null)

  const typesQuery = useQuery({
    queryKey: ['compliance-types', companyId, role],
    queryFn: () => hrApi.complianceTypes(companyId, role === 'employee'),
    enabled: Boolean(companyId),
  })
  const types = ((typesQuery.data?.data as ComplianceDocumentType[] | undefined) ?? typesFor(role))
    .map((item) => ({
      ...item,
      requiresExpiry: Boolean(item.requiresExpiry ?? (item as { requires_expiry?: boolean }).requires_expiry),
      employerOnly: Boolean(item.employerOnly ?? (item as { employer_only?: boolean }).employer_only),
    }))
    .filter((item) => item.key !== 'NI_EVIDENCE')
    .sort((a, b) => a.label.localeCompare(b.label, 'en-GB', { sensitivity: 'base' }))
  const selected = types.find((item) => item.key === documentType) ?? types[0]
  const selectedKey = selected?.key ?? ''

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !selected) throw new Error('Choose a document type and file')
      if (selected.requiresExpiry && !expiryDate) {
        throw new Error(`Enter the expiry date for ${selected.label}`)
      }
      const form = new FormData()
      form.append('file', file)
      form.append('document_type', selected.key)
      if (expiryDate) form.append('expiry_date', expiryDate)
      if (role === 'employer' && selected.employerOnly) {
        form.append('visible_to_employee', visibleToEmployee ? 'true' : 'false')
      }
      return hrApi.uploadCompliance(companyId, employeeId, form)
    },
    onSuccess: async () => {
      setError(null)
      setMessage('Document uploaded')
      setFile(null)
      setExpiryDate('')
      setVisibleToEmployee(false)
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['compliance', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employeeId] })
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof Error ? err.message : 'Upload failed')
    },
  })

  const visibility = useMutation({
    mutationFn: (input: { id: string; visible: boolean }) =>
      hrApi.updateComplianceVisibility(companyId, input.id, input.visible),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employeeId] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not update visibility'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => hrApi.deleteCompliance(companyId, id),
    onSuccess: async () => {
      setConfirmDelete(null)
      setViewer(null)
      setError(null)
      setMessage('Document deleted')
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['compliance', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employeeId] })
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof Error ? err.message : 'Could not delete this document')
    },
  })

  const typeOptions = useMemo(() => types, [types])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? (
        <div className="mb-4 px-5 pt-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 px-5 pt-5">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <form
        className="grid gap-4 border-b border-[#eceae6] px-5 py-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          upload.mutate()
        }}
      >
        <Field label="Document type">
          <select
            className="h-11 w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none"
            value={selectedKey}
            onChange={(event) => {
              setDocumentType(event.target.value)
              setExpiryDate('')
              setVisibleToEmployee(false)
            }}
          >
            {typeOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
                {item.requiresExpiry ? ' (expiry)' : ''}
              </option>
            ))}
          </select>
        </Field>
        {selected?.requiresExpiry ? (
          <Field label="Expiry date">
            <input
              type="date"
              required
              className="h-11 w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 text-sm text-navy outline-none"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
            />
          </Field>
        ) : (
          <div className="hidden xl:block" />
        )}
        <Field label="File">
          <input
            type="file"
            required
            accept={ACCEPT}
            className="h-11 w-full rounded-[10px] border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-navy file:mr-3 file:rounded file:border-0 file:bg-cream file:px-2 file:py-1 file:text-xs file:font-semibold file:text-navy"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="flex flex-col justify-end gap-3">
          {role === 'employer' && selected?.employerOnly ? (
            <label className="flex items-center gap-2 text-sm font-medium text-navy">
              <input
                type="checkbox"
                className="size-4 accent-navy"
                checked={visibleToEmployee}
                onChange={(event) => setVisibleToEmployee(event.target.checked)}
              />
              Visible to employee
            </label>
          ) : null}
          <Button type="submit" disabled={upload.isPending}>
            Upload
          </Button>
        </div>
      </form>
      <p className="px-5 pt-3 text-xs text-muted">Accepted files: PNG, JPG, JPEG, PDF, DOC.</p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <Loading />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents yet"
            body={
              role === 'employer'
                ? 'Upload a file for this employee, or they can add their own from the employee portal.'
                : 'Upload a Right to work, passport or other personal document here.'
            }
          />
        ) : (
          <div className="divide-y divide-[#eee]">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {doc.can_delete !== false ? (
                    <IconButton
                      label="Delete"
                      tone="danger"
                      onClick={() => {
                        setError(null)
                        setMessage(null)
                        setConfirmDelete(doc)
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  ) : null}
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e7f1f8] text-navy">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{doc.title || doc.file_name}</p>
                    <p className="text-sm text-muted">
                      {doc.file_name} · {formatDate(doc.uploaded_at)}
                      {doc.uploaded_by_kind === 'EMPLOYEE' ? ' · Employee upload' : ' · Employer upload'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {expiryBadge(doc)}
                  {doc.can_change_visibility ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
                      onClick={() =>
                        visibility.mutate({ id: doc.id, visible: !doc.visible_to_employee })
                      }
                    >
                      {doc.visible_to_employee ? <Eye size={14} /> : <EyeOff size={14} />}
                      {doc.visible_to_employee ? 'Visible to employee' : 'Hidden from employee'}
                    </button>
                  ) : null}
                  <IconButton label="View" onClick={() => setViewer(doc)}>
                    <Eye size={16} />
                  </IconButton>
                  <IconButton
                    label="Download"
                    onClick={() => void download(doc.download_path, doc.file_name)}
                  >
                    <Download size={16} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewer ? (
        <DocumentPreviewModal
          title={viewer.title || viewer.file_name}
          fileName={viewer.file_name}
          path={viewer.download_path}
          onClose={() => setViewer(null)}
          onDownload={() => void download(viewer.download_path, viewer.file_name)}
        />
      ) : null}

      {confirmDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => {
                if (!remove.isPending) setConfirmDelete(null)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-document-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-document-title" className="text-lg font-semibold text-navy">
                  Delete {confirmDelete.title || confirmDelete.file_name}?
                </h3>
                <p className="mt-2 text-sm text-muted">This cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={remove.isPending}
                    onClick={() => setConfirmDelete(null)}
                  >
                    Keep document
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(confirmDelete.id)}
                  >
                    {remove.isPending ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

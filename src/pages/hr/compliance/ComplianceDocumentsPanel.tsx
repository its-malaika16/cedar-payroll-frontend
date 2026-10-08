import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, FileText, Trash2, X } from 'lucide-react'
import { hrApi } from '../../../api'
import { download, fetchBlob } from '../../../api/client'
import { DocumentPreviewModal } from '../../../components/DocumentPreviewModal'
import { Alert, Badge, Button, EmptyState, Field, Loading } from '../../../components/ui'
import { downloadBlobFile } from '../../employees/formPdf'
import { formatDate } from '../../../lib/format'
import {
  typesFor,
  type ComplianceDocumentType,
  type ComplianceFile,
} from './documentTypes'
import {
  applyStarterFormToEmployee,
  loadStarterFormData,
  type StarterFormData,
  type StarterFormEmployeeSource,
} from './starterFormData'
import { StarterFormEditor } from './StarterFormEditor'
import { starterFormDownloadBlob, starterFormPdfFilename, buildStarterFormPdf } from './starterFormPdf'
import { starterFormFilename } from './starterFormTemplate'

const ACCEPT = '.png,.jpg,.jpeg,.pdf,.doc,.docx,.html,.htm'

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

async function downloadComplianceFile(doc: ComplianceFile) {
  if (doc.document_type !== 'STARTER_FORM') {
    await download(doc.download_path, doc.file_name)
    return
  }
  const blob = await fetchBlob(doc.download_path)
  const pdf = await starterFormDownloadBlob(blob)
  downloadBlobFile(pdf, starterFormPdfFilename(doc.file_name))
}

export function ComplianceDocumentsPanel({
  companyId,
  employeeId,
  role,
  documents,
  loading,
  compact = false,
}: {
  companyId: string
  employeeId: string
  role: 'employee' | 'employer'
  documents: ComplianceFile[]
  loading?: boolean
  compact?: boolean
}) {
  const queryClient = useQueryClient()
  const [documentType, setDocumentType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ComplianceFile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ComplianceFile | null>(null)
  const [starterDraft, setStarterDraft] = useState<StarterFormData | null>(null)
  const [starterOriginal, setStarterOriginal] = useState<StarterFormData | null>(null)
  const [starterSource, setStarterSource] = useState<StarterFormEmployeeSource | null>(null)
  const [starterBusy, setStarterBusy] = useState(false)

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
  const hasStarterForm = documents.some((doc) => doc.document_type === 'STARTER_FORM')
  const selected =
    types.find(
      (item) => item.key === documentType && !(hasStarterForm && item.key === 'STARTER_FORM'),
    ) ??
    types.find((item) => !(hasStarterForm && item.key === 'STARTER_FORM')) ??
    types[0]
  const selectedKey = selected?.key ?? ''

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !selected) throw new Error('Choose a document type and file')
      if (selected.key === 'STARTER_FORM' && documents.some((doc) => doc.document_type === 'STARTER_FORM')) {
        throw new Error('This employee already has a starter form. Delete it before creating another.')
      }
      if (selected.requiresExpiry && !expiryDate) {
        throw new Error(`Enter the expiry date for ${selected.label}`)
      }
      const form = new FormData()
      form.append('file', file)
      form.append('document_type', selected.key)
      if (expiryDate) form.append('expiry_date', expiryDate)
      return hrApi.uploadCompliance(companyId, employeeId, form)
    },
    onSuccess: async () => {
      setError(null)
      setMessage('Document uploaded')
      setFile(null)
      setExpiryDate('')
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['compliance', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employeeId] })
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof Error ? err.message : 'Upload failed')
    },
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
  const isStarterType = selectedKey === 'STARTER_FORM'

  async function createStarterForm() {
    setError(null)
    setMessage(null)
    if (hasStarterForm) {
      setError('This employee already has a starter form. Delete it before creating another.')
      return
    }
    setStarterBusy(true)
    try {
      const loaded = await loadStarterFormData(companyId, employeeId)
      setStarterDraft(loaded.form)
      setStarterOriginal(loaded.form)
      setStarterSource(loaded.source)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the starter form')
    } finally {
      setStarterBusy(false)
    }
  }

  async function saveStarterForm() {
    if (!starterDraft) return
    if (hasStarterForm) {
      setStarterDraft(null)
      setError('This employee already has a starter form. Delete it before creating another.')
      return
    }
    setStarterBusy(true)
    setError(null)
    try {
      if (starterOriginal && starterSource) {
        await applyStarterFormToEmployee(
          companyId,
          employeeId,
          starterOriginal,
          starterDraft,
          starterSource,
        )
      }
      const pdf = await buildStarterFormPdf(starterDraft)
      const filename = starterFormFilename(starterDraft)
      const form = new FormData()
      form.append('file', new File([pdf], filename, { type: 'application/pdf' }))
      form.append('document_type', 'STARTER_FORM')
      await hrApi.uploadCompliance(companyId, employeeId, form)
      setStarterDraft(null)
      setStarterOriginal(null)
      setStarterSource(null)
      setMessage('Starter form saved to documents')
      setDocumentType('STARTER_FORM')
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['compliance', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employeeId] })
      await queryClient.invalidateQueries({ queryKey: ['employee', companyId, employeeId] })
      await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the starter form')
    } finally {
      setStarterBusy(false)
    }
  }

  return (
    <div className={compact ? 'min-w-0' : 'flex min-h-0 flex-1 flex-col'}>
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

      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-[#eceae6] ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
        <p className="text-sm text-muted">
          {hasStarterForm
            ? 'A starter form is already on file. Delete it if you need to create a new one.'
            : 'Create a starter form from this employee’s details, or upload a scanned copy.'}
        </p>
        <Button
          type="button"
          disabled={starterBusy || hasStarterForm}
          onClick={() => void createStarterForm()}
        >
          {starterBusy && !starterDraft ? 'Preparing…' : 'Create starter form'}
        </Button>
      </div>

      <form
        className={
          compact
            ? 'grid gap-3 border-b border-[#eceae6] px-4 py-4'
            : 'grid gap-4 border-b border-[#eceae6] px-5 py-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
        }
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
            }}
          >
            {typeOptions.map((item) => (
              <option
                key={item.key}
                value={item.key}
                disabled={item.key === 'STARTER_FORM' && hasStarterForm}
              >
                {item.label}
                {item.requiresExpiry ? ' (expiry)' : ''}
                {item.key === 'STARTER_FORM' && hasStarterForm ? ' (already on file)' : ''}
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
          <Button type="submit" disabled={upload.isPending || !file || (isStarterType && hasStarterForm)}>
            Upload
          </Button>
        </div>
      </form>
      <p className="px-5 pt-3 text-xs text-muted">
        {isStarterType
          ? 'Create the starter form from employee details, or upload a completed copy. Accepted files: PNG, JPG, JPEG, PDF, DOC, HTML.'
          : 'Accepted files: PNG, JPG, JPEG, PDF, DOC, HTML.'}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <Loading />
        ) : documents.length === 0 ? (
          compact ? (
            <p className="px-4 py-4 text-sm text-muted">No documents yet</p>
          ) : (
            <EmptyState title="No documents yet" />
          )
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
                      {doc.document_type === 'STARTER_FORM'
                        ? starterFormPdfFilename(doc.file_name)
                        : doc.file_name}{' '}
                      · {formatDate(doc.uploaded_at)}
                      {doc.uploaded_by_kind === 'EMPLOYEE' ? ' · Employee upload' : ' · Employer upload'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {expiryBadge(doc)}
                  <IconButton label="View" onClick={() => setViewer(doc)}>
                    <Eye size={16} />
                  </IconButton>
                  <IconButton
                    label="Download"
                    onClick={() => void downloadComplianceFile(doc).catch((err) => {
                      setError(err instanceof Error ? err.message : 'Could not download this document')
                    })}
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
          onDownload={() =>
            void downloadComplianceFile(viewer).catch((err) => {
              setError(err instanceof Error ? err.message : 'Could not download this document')
            })
          }
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
      {starterDraft
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 px-4 py-6"
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="starter-form-title"
                className="flex h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-[16px] bg-white shadow-xl"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#eceae6] px-5 py-4">
                  <div className="min-w-0">
                    <h3 id="starter-form-title" className="text-lg font-semibold text-navy">
                      Employee Starter Form
                    </h3>
                    <p className="text-sm text-muted">
                      Change any details, then save the form to this employee’s documents.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      className="h-10 text-xs"
                      disabled={starterBusy}
                      onClick={() => void saveStarterForm()}
                    >
                      {starterBusy ? 'Saving…' : 'Save to documents'}
                    </Button>
                    <button
                      type="button"
                      className="flex size-10 items-center justify-center rounded-[10px] text-navy hover:bg-cream"
                      onClick={() => {
                        if (!starterBusy) {
                          setStarterDraft(null)
                          setStarterOriginal(null)
                          setStarterSource(null)
                        }
                      }}
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f7f4]">
                  <StarterFormEditor value={starterDraft} onChange={setStarterDraft} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

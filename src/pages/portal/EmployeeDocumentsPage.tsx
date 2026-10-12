import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Download,
  Eye,
  FileText,
  Filter,
  Info,
  MoreVertical,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react'
import { hrApi } from '../../api'
import { download } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal'
import { Alert, Button, Loading } from '../../components/ui'
import {
  ALL_COMPLIANCE_TYPES,
  typesFor,
  type ComplianceDocumentType,
  type ComplianceFile,
} from '../hr/compliance/documentTypes'

const ACCEPT = '.png,.jpg,.jpeg,.pdf,.doc,.docx'
const MAX_BYTES = 5 * 1024 * 1024
const EXPIRY_REQUIRED = ['PASSPORT', 'DRIVING_LICENCE', 'RIGHT_TO_WORK', 'QUALIFICATION', 'VISA']

type Tab = 'all' | 'mine' | 'company'

function prettyDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fileSizeLabel(bytes?: number | null) {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isEmployerUpload(doc: ComplianceFile) {
  const kind = String(doc.uploaded_by_kind ?? '').toUpperCase()
  if (kind === 'EMPLOYEE') return false
  if (kind === 'EMPLOYER') return true
  return Boolean(doc.employer_only)
}

function categoryOf(doc: ComplianceFile) {
  const category = String(doc.category ?? '').toUpperCase()
  if (category === 'COMPANY') return 'Company'
  if (category === 'PERSONAL') return 'Personal'
  return isEmployerUpload(doc) ? 'Company' : 'Personal'
}

function uploadedBy(doc: ComplianceFile) {
  return isEmployerUpload(doc) ? 'Admin' : 'You'
}

function displayStatus(doc: ComplianceFile) {
  if (doc.expiry_state === 'expired') {
    return { label: 'Expired', className: 'bg-[#fdecee] text-[#d32027]' }
  }
  if (doc.expiry_state === 'soon') {
    return { label: 'Expiring soon', className: 'bg-[#fff4e5] text-[#c2782a]' }
  }
  return { label: 'Valid', className: 'bg-[#e7f6ec] text-[#1b7d4f]' }
}

function typeLabel(item: ComplianceDocumentType) {
  return item.requiresExpiry && !/\(expiry\)/i.test(item.label) ? `${item.label} (expiry)` : item.label
}

export function EmployeeDocumentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'soon' | 'expired'>('all')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ComplianceFile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ComplianceFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['my-compliance', companyId, employeeId],
    queryFn: () => hrApi.myCompliance(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const documents = (query.data?.data as ComplianceFile[] | undefined) ?? []
  const remove = useMutation({
    mutationFn: (id: string) => hrApi.deleteCompliance(companyId!, id),
    onSuccess: async () => {
      setConfirmDelete(null)
      setViewer(null)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employeeId] })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Could not delete this document')
    },
  })

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return documents.filter((doc) => {
      if (tab === 'mine' && isEmployerUpload(doc)) return false
      if (tab === 'company' && !isEmployerUpload(doc)) return false
      if (statusFilter === 'valid' && (doc.expiry_state === 'soon' || doc.expiry_state === 'expired')) return false
      if (statusFilter === 'soon' && doc.expiry_state !== 'soon') return false
      if (statusFilter === 'expired' && doc.expiry_state !== 'expired') return false
      if (!needle) return true
      return [doc.title, doc.file_name, doc.document_type, categoryOf(doc)]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [documents, search, statusFilter, tab])

  const stats = {
    total: documents.length,
    valid: documents.filter((doc) => doc.expiry_state !== 'soon' && doc.expiry_state !== 'expired').length,
    soon: documents.filter((doc) => doc.expiry_state === 'soon').length,
    expired: documents.filter((doc) => doc.expiry_state === 'expired').length,
  }

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        Documents
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-semibold text-navy">Documents</h1>
          <p className="mt-1 text-sm text-muted">Upload, manage and access your documents in one place</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/portal/documents/upload')}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white"
        >
          + Upload Document
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="navy"
          icon={<FileText size={18} />}
          label="Total Documents"
          value={stats.total}
          hint="All documents uploaded by you and company"
        />
        <StatCard
          tone="green"
          icon={<CheckCircle2 size={18} />}
          label="Valid Documents"
          value={stats.valid}
          hint="Up to date and everything good"
        />
        <StatCard
          tone="amber"
          icon={<AlertTriangle size={18} />}
          label="Expiring soon"
          value={stats.soon}
          hint="Documents expiring in next 60 days"
        />
        <StatCard
          tone="red"
          icon={<XCircle size={18} />}
          label="Expired Documents"
          value={stats.expired}
          hint="Require your immediate attention"
        />
      </div>

      {error ? (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <section className="mt-5 rounded-[16px] border border-[#eceae6] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceae6] px-5 py-4">
          <div className="flex gap-6 text-sm font-semibold text-muted">
            {(
              [
                ['all', 'All Documents'],
                ['mine', 'My Uploads'],
                ['company', 'Company Documents'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`-mb-4 border-b-2 pb-3 ${tab === id ? 'border-navy text-navy' : 'border-transparent'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                className="h-10 w-56 rounded-full border border-[#eceae6] bg-[#f7f6f3] pl-9 pr-3 text-sm text-navy outline-none"
                placeholder="Search documents..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#eceae6] px-4 text-sm font-semibold text-navy"
              >
                <Filter size={15} />
                Filter
              </button>
              {filterOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-44 rounded-[12px] border border-[#eceae6] bg-white p-2 shadow-lg">
                  {(['all', 'valid', 'soon', 'expired'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setStatusFilter(item)
                        setFilterOpen(false)
                      }}
                      className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-navy hover:bg-[#f7f6f3]"
                    >
                      {item === 'all' ? 'All statuses' : item === 'soon' ? 'Expiring soon' : item === 'valid' ? 'Valid' : 'Expired'}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {query.isLoading ? (
          <div className="px-5 py-8">
            <Loading />
          </div>
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted">No documents match this view yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed text-left text-sm">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="w-[24%] px-5 py-3 font-medium">Document</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Category</th>
                  <th className="w-[14%] px-5 py-3 font-medium">Uploaded By</th>
                  <th className="w-[14%] px-5 py-3 font-medium">Uploaded On</th>
                  <th className="w-[14%] px-5 py-3 font-medium">Expiry Date</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Status</th>
                  <th className="w-[10%] px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((doc) => {
                  const status = displayStatus(doc)
                  return (
                    <tr key={doc.id} className="border-t border-[#f3f1ec]">
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eef2f6] text-navy">
                            <FileText size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-navy">{doc.title || doc.file_name}</p>
                            <p className="truncate text-xs text-muted">{doc.file_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-navy">{categoryOf(doc)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-navy">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] text-navy">
                            <UserRound size={14} />
                          </span>
                          {uploadedBy(doc)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-navy">{prettyDate(doc.uploaded_at)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-navy">{prettyDate(doc.expiry_date)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <DocumentRowActions
                          doc={doc}
                          open={menuId === doc.id}
                          onToggle={() => setMenuId(menuId === doc.id ? null : doc.id)}
                          onClose={() => setMenuId(null)}
                          onView={() => {
                            setMenuId(null)
                            setViewer(doc)
                          }}
                          onDownload={() => {
                            setMenuId(null)
                            void download(doc.download_path, doc.file_name)
                          }}
                          onDelete={() => {
                            setMenuId(null)
                            setError(null)
                            setConfirmDelete(doc)
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-[#eceae6] px-5 py-3 text-xs text-muted">
          Showing {visible.length ? 1 : 0} to {visible.length} out of {visible.length} documents
        </p>
      </section>

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

function DocumentRowActions({
  doc,
  open,
  onToggle,
  onClose,
  onView,
  onDownload,
  onDelete,
}: {
  doc: ComplianceFile
  open: boolean
  onToggle: () => void
  onClose: () => void
  onView: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const canDelete = Boolean(doc.can_delete ?? doc.uploaded_by_kind === 'EMPLOYEE')

  useEffect(() => {
    if (!open || !buttonRef.current) {
      setCoords(null)
      return
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setCoords({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return (
    <div className="flex flex-nowrap items-center justify-end gap-0.5 text-navy">
      <button
        type="button"
        aria-label="View"
        className="flex size-8 shrink-0 items-center justify-center rounded-[6px] text-navy hover:bg-[#f7f6f3]"
        onClick={onView}
      >
        <Eye size={16} />
      </button>
      <button
        type="button"
        aria-label="Download"
        className="flex size-8 shrink-0 items-center justify-center rounded-[6px] text-navy hover:bg-[#f7f6f3]"
        onClick={onDownload}
      >
        <Download size={16} />
      </button>
      <button
        ref={buttonRef}
        type="button"
        aria-label="More"
        aria-expanded={open}
        className="flex size-8 shrink-0 items-center justify-center rounded-[6px] text-navy hover:bg-[#f7f6f3]"
        onClick={onToggle}
      >
        <MoreVertical size={16} />
      </button>
      {open && coords
        ? createPortal(
            <div
              className="fixed inset-0 z-[70]"
              onClick={onClose}
              role="presentation"
            >
              <div
                role="menu"
                className="absolute w-36 overflow-hidden rounded-[10px] border border-[#eceae6] bg-white py-1 shadow-lg"
                style={{ top: coords.top, right: coords.right }}
                onClick={(event) => event.stopPropagation()}
              >
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-navy hover:bg-[#f7f6f3]" onClick={onView}>
                  View
                </button>
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-navy hover:bg-[#f7f6f3]" onClick={onDownload}>
                  Download
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-[#d32027] hover:bg-[#f7f6f3]"
                    onClick={onDelete}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  hint: string
  tone: 'navy' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    navy: 'bg-[#e8eef6] text-navy',
    green: 'bg-[#e7f6ec] text-[#1b7d4f]',
    amber: 'bg-[#fff4e5] text-[#c2782a]',
    red: 'bg-[#fdecee] text-[#d32027]',
  }
  return (
    <section className="rounded-[14px] border border-[#e6eaf0] bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-2xl font-semibold text-navy">{value}</span>
            <span className="text-sm font-semibold text-navy">{label}</span>
          </p>
          <p className="mt-0.5 text-xs leading-4 text-muted">{hint}</p>
        </div>
      </div>
    </section>
  )
}

export function EmployeeDocumentUploadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState({
    title: '',
    document_type: 'PASSPORT',
    category: 'PERSONAL',
    expiry_date: '',
    no_expiry: false,
    notes: '',
  })

  const typesQuery = useQuery({
    queryKey: ['compliance-types', companyId, 'employee'],
    queryFn: () => hrApi.complianceTypes(companyId!, true),
    enabled: Boolean(companyId),
  })
  const types = ((typesQuery.data?.data as ComplianceDocumentType[] | undefined) ?? typesFor('employee'))
    .map((item) => ({
      ...item,
      requiresExpiry: Boolean(item.requiresExpiry ?? (item as { requires_expiry?: boolean }).requires_expiry),
      employerOnly: Boolean(item.employerOnly ?? (item as { employer_only?: boolean }).employer_only),
    }))
    .filter((item) => item.key !== 'NI_EVIDENCE' && !item.employerOnly)
    .sort((a, b) => a.label.localeCompare(b.label, 'en-GB', { sensitivity: 'base' }))
  const selected = types.find((item) => item.key === form.document_type) ?? types[0]
  const needsExpiry = Boolean(selected?.requiresExpiry || EXPIRY_REQUIRED.includes(selected?.key ?? ''))
  const fieldClass =
    'h-11 w-full rounded-[8px] border border-[#d7dee8] bg-white px-3 text-sm text-navy outline-none focus:border-navy'

  function takeFile(next?: File | null) {
    if (!next) return
    setFile(next)
    setError(null)
  }

  async function submit() {
    if (!companyId || !employeeId || !selected) return
    if (!file) throw new Error('Choose a file to upload')
    if (file.size > MAX_BYTES) throw new Error('Maximum file size is 5 MB')
    if (needsExpiry && !form.no_expiry && !form.expiry_date) {
      throw new Error(`Enter the expiry date for ${selected.label}`)
    }
    const payload = new FormData()
    payload.append('file', file)
    payload.append('document_type', selected.key)
    payload.append('category', form.category === 'COMPANY' ? 'COMPANY' : 'PERSONAL')
    if (!form.no_expiry && form.expiry_date) payload.append('expiry_date', form.expiry_date)
    await hrApi.uploadCompliance(companyId, employeeId, payload)
    await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employeeId] })
    navigate('/portal/documents')
  }

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        <Link to="/portal/documents" className="hover:text-navy">
          Documents
        </Link>
        {' > '}
        Upload Documents
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-semibold text-navy">Upload Documents</h1>
          <p className="mt-1 text-sm text-muted">Upload your personal documents. Some documents require an expiry date</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/portal/documents/upload')}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white"
        >
          + Upload Document
        </button>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[16px] border border-[#eceae6] bg-white p-6">
          <h2 className="text-base font-semibold text-navy">Document Details</h2>
          <form
            className="mt-5 space-y-5"
            onSubmit={async (event) => {
              event.preventDefault()
              setBusy(true)
              setError(null)
              try {
                await submit()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Upload failed')
              } finally {
                setBusy(false)
              }
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-navy">Document Name</span>
              <input
                className={fieldClass}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={selected?.label ?? 'Document name'}
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-navy">Document Type</span>
                <span className="relative block">
                  <select
                    className={`${fieldClass} appearance-none pr-10`}
                    value={selected?.key ?? ''}
                    onChange={(event) => {
                      const next = types.find((item) => item.key === event.target.value)
                      setForm({
                        ...form,
                        document_type: event.target.value,
                        no_expiry: !(next?.requiresExpiry || EXPIRY_REQUIRED.includes(event.target.value)),
                        expiry_date: '',
                        title: form.title || next?.label || '',
                      })
                    }}
                  >
                    {types.map((item) => (
                      <option key={item.key} value={item.key}>
                        {typeLabel(item)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-navy">Category</span>
                <span className="relative block">
                  <select
                    className={`${fieldClass} appearance-none pr-10`}
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    <option value="PERSONAL">Personal Document</option>
                    <option value="COMPANY">Company Document</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
                </span>
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="min-w-[240px] flex-1">
                <span className="mb-2 block text-sm font-medium text-navy">Expiry Date</span>
                <input
                  type="date"
                  disabled={form.no_expiry && !needsExpiry}
                  required={needsExpiry && !form.no_expiry}
                  className={`${fieldClass} disabled:opacity-50`}
                  value={form.expiry_date}
                  onChange={(event) => setForm({ ...form, expiry_date: event.target.value, no_expiry: false })}
                />
              </label>
              <label className="mb-3 inline-flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  className="size-4 accent-navy"
                  checked={form.no_expiry && !needsExpiry}
                  disabled={needsExpiry}
                  onChange={(event) =>
                    setForm({ ...form, no_expiry: event.target.checked, expiry_date: event.target.checked ? '' : form.expiry_date })
                  }
                />
                No expiry date
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-navy">Notes</span>
              <textarea
                rows={4}
                className="w-full rounded-[8px] border border-[#d7dee8] bg-white px-3 py-3 text-sm text-navy outline-none focus:border-navy"
                placeholder="Add any additional notes..."
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-medium text-navy">Upload File</p>
              <label
                className={`flex min-h-[88px] cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-dashed px-4 py-4 ${
                  dragging ? 'border-navy bg-[#f4f7fb]' : 'border-[#c5d4e4] bg-[#f8fbfe]'
                }`}
                onDragOver={(event: DragEvent<HTMLLabelElement>) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event: DragEvent<HTMLLabelElement>) => {
                  event.preventDefault()
                  setDragging(false)
                  takeFile(event.dataTransfer.files?.[0] ?? null)
                }}
              >
                <span className="inline-flex min-w-0 items-center gap-3 text-sm text-navy">
                  <CloudUpload size={28} className="shrink-0 text-navy" />
                  <span>
                    <span className="block font-medium">
                      {file
                        ? `${file.name}${fileSizeLabel(file.size) ? ` · ${fileSizeLabel(file.size)}` : ''}`
                        : 'Drag and drop file here, or click to browse'}
                    </span>
                    <span className="block text-xs text-muted">Supported formats: PDF, JPG, PNG, DOC, DOCX</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-[8px] bg-navy px-4 py-2 text-xs font-semibold text-white">
                  Browse Files
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPT}
                  onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/portal/documents')}
                className="h-11 rounded-[8px] border border-[#d9d9d9] px-6 text-sm font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !file}
                className="h-11 rounded-[8px] bg-navy px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </form>
        </section>

        <div className="space-y-5">
          <aside className="rounded-[16px] border border-[#eceae6] bg-white p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
              <Info size={16} />
              Important Information
            </p>
            <ul className="mt-4 space-y-3 text-sm text-navy">
              {[
                'Ensure document is clear and readable',
                'Use PDF, DOCX, JPG or PNG format',
                'Maximum file size: 5MB',
                'Set an expiry date if applicable',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 text-navy">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
          <aside className="rounded-[16px] border border-[#eceae6] bg-white p-5">
            <p className="text-sm font-semibold text-navy">Documents Requiring Expiry Date</p>
            <div className="mt-4 space-y-2">
              {ALL_COMPLIANCE_TYPES.filter((item) => EXPIRY_REQUIRED.includes(item.key) || item.requiresExpiry)
                .filter((item) => ['PASSPORT', 'DRIVING_LICENCE', 'RIGHT_TO_WORK', 'QUALIFICATION'].includes(item.key))
                .map((item) => (
                  <div key={item.key} className="flex items-center gap-3 rounded-[12px] bg-[#f7f6f3] px-3 py-3 text-sm text-navy">
                    <FileText size={16} />
                    {item.key === 'QUALIFICATION' ? 'Certifications' : item.label}
                  </div>
                ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export { EmployeeDocumentsPage as PortalDocumentsPage }

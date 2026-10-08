import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, LayoutList, Search, Table2, Trash2, User, Users } from 'lucide-react'
import { employeesApi, hrApi } from '../../api'
import { download, fetchBlob } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal'
import { Alert, Button, Card, EmptyState, Field, Loading } from '../../components/ui'
import { downloadBlobFile } from '../employees/formPdf'
import { compareEmployeeNames, employeeLeaveDate, formatDate, fullName } from '../../lib/format'
import type { Employee } from '../../types'
import { ComplianceDocumentsPanel } from '../hr/compliance/ComplianceDocumentsPanel'
import {
  typesFor,
  type ComplianceDocumentType,
  type ComplianceFile,
} from '../hr/compliance/documentTypes'
import { starterFormDownloadBlob, starterFormPdfFilename } from '../hr/compliance/starterFormPdf'

function phoneLines(employee: Employee) {
  const lines: string[] = []
  if (employee.phone?.trim()) {
    lines.push(employee.phone_type?.trim() ? `${employee.phone_type}: ${employee.phone}` : employee.phone)
  }
  for (const extra of employee.extra_phones ?? []) {
    if (!extra.number?.trim()) continue
    lines.push(extra.type?.trim() ? `${extra.type}: ${extra.number}` : extra.number)
  }
  return lines
}

function emailLines(employee: Employee) {
  const lines: string[] = []
  if (employee.email?.trim()) {
    lines.push(employee.email_type?.trim() ? `${employee.email_type}: ${employee.email}` : employee.email)
  }
  for (const extra of employee.extra_emails ?? []) {
    if (!extra.address?.trim()) continue
    lines.push(extra.type?.trim() ? `${extra.type}: ${extra.address}` : extra.address)
  }
  return lines
}

function primaryEmail(employee: Employee) {
  return employee.email?.trim() || employee.extra_emails?.find((item) => item.address?.trim())?.address?.trim() || ''
}

function primaryPhone(employee: Employee) {
  return employee.phone?.trim() || employee.extra_phones?.find((item) => item.number?.trim())?.number?.trim() || ''
}

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
      className={`flex size-8 shrink-0 items-center justify-center rounded-[6px] border bg-white ${
        tone === 'danger'
          ? 'border-[#d32027] text-[#d32027] hover:bg-[#fdecee]'
          : 'border-[#17375e] text-navy hover:bg-cream'
      }`}
    >
      {children}
    </button>
  )
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

function hasLeftCompany(employee: Employee) {
  const leave = employeeLeaveDate(employee)
  if (!leave) return false
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return leave <= today
}

const fieldClass =
  'h-11 w-full rounded-[8px] border border-[#c5d4e4] bg-white px-3 text-sm text-navy outline-none'

function BureauComplianceForm({
  companyId,
  employee,
  documents,
  loading,
}: {
  companyId: string
  employee: Employee | undefined
  documents: ComplianceFile[]
  loading: boolean
}) {
  const queryClient = useQueryClient()
  const [documentType, setDocumentType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ComplianceFile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ComplianceFile | null>(null)

  useEffect(() => {
    setViewer(null)
    setConfirmDelete(null)
    setError(null)
    setMessage(null)
    setFile(null)
  }, [employee?.id])

  const typesQuery = useQuery({
    queryKey: ['compliance-types', companyId, 'employer'],
    queryFn: () => hrApi.complianceTypes(companyId, false),
    enabled: Boolean(companyId),
  })
  const types = ((typesQuery.data?.data as ComplianceDocumentType[] | undefined) ?? typesFor('employer'))
    .map((item) => ({
      ...item,
      requiresExpiry: Boolean(item.requiresExpiry ?? (item as { requires_expiry?: boolean }).requires_expiry),
    }))
    .filter((item) => item.key !== 'NI_EVIDENCE')
    .sort((a, b) => a.label.localeCompare(b.label, 'en-GB', { sensitivity: 'base' }))
  const selectedType = types.find((item) => item.key === documentType) ?? types[0]

  const upload = useMutation({
    mutationFn: async () => {
      if (!employee) throw new Error('Select an employee')
      if (!file || !selectedType) throw new Error('Choose a document type and file')
      if (selectedType.requiresExpiry && !expiryDate) {
        throw new Error(`Enter the expiry date for ${selectedType.label}`)
      }
      const form = new FormData()
      form.append('file', file)
      form.append('document_type', selectedType.key)
      if (expiryDate) form.append('expiry_date', expiryDate)
      return hrApi.uploadCompliance(companyId, employee.id, form)
    },
    onSuccess: async () => {
      setError(null)
      setMessage('Document uploaded')
      setFile(null)
      setExpiryDate('')
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employee?.id] })
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
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
      await queryClient.invalidateQueries({ queryKey: ['my-compliance', companyId, employee?.id] })
      await queryClient.invalidateQueries({ queryKey: ['compliance-employees', companyId] })
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof Error ? err.message : 'Could not delete this document')
    },
  })

  return (
    <section className="rounded-[12px] border border-[#d7e1ec] bg-white p-5">
      <h2 className="text-base font-semibold text-navy">Compliance</h2>
      {employee ? (
        <p className="mt-1 text-sm text-muted">
          Uploading for {fullName(employee.first_name, employee.last_name)}
        </p>
      ) : null}
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          upload.mutate()
        }}
      >
        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <Field label="Document Type">
          <select
            className={fieldClass}
            value={selectedType?.key ?? ''}
            onChange={(event) => {
              setDocumentType(event.target.value)
              setExpiryDate('')
            }}
          >
            {types.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="File">
          <input
            key={employee?.id ?? 'none'}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.html,.htm"
            className="block w-full rounded-[8px] border border-[#c5d4e4] bg-white px-3 py-2 text-sm text-navy file:mr-3 file:rounded-[6px] file:border file:border-[#c5d4e4] file:bg-[#f4f7fb] file:px-3 file:py-1.5 file:text-sm file:text-navy"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Expiry Date">
          <input
            type="date"
            className={fieldClass}
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
          />
        </Field>
        <div className="flex justify-center pt-2">
          <Button type="submit" disabled={!employee || upload.isPending || !file}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>
      <div className="mt-5 border-t border-[#e6eef5] pt-4">
        <h3 className="text-sm font-semibold text-navy">Uploaded documents</h3>
        {loading ? (
          <div className="mt-3">
            <Loading />
          </div>
        ) : documents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No documents yet</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e6eef5]">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy">{doc.title || doc.file_name}</p>
                  <p className="truncate text-xs text-muted">
                    {doc.document_type === 'STARTER_FORM' ? starterFormPdfFilename(doc.file_name) : doc.file_name}
                    {doc.uploaded_at ? ` · ${formatDate(doc.uploaded_at)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton label="View" onClick={() => setViewer(doc)}>
                    <Eye size={15} />
                  </IconButton>
                  <IconButton
                    label="Download"
                    onClick={() =>
                      void downloadComplianceFile(doc).catch((err) => {
                        setMessage(null)
                        setError(err instanceof Error ? err.message : 'Could not download this document')
                      })
                    }
                  >
                    <Download size={15} />
                  </IconButton>
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
                      <Trash2 size={15} />
                    </IconButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
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
              setMessage(null)
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
                aria-labelledby="delete-bureau-document-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-bureau-document-title" className="text-lg font-semibold text-navy">
                  Delete {confirmDelete.title || confirmDelete.file_name}?
                </h3>
                <p className="mt-2 text-sm text-muted">This cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => setConfirmDelete(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
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
    </section>
  )
}

function Detail({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.04em] text-muted uppercase">{label}</p>
      {lines.length === 0 ? (
        <p className="mt-1 text-sm text-navy">—</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {lines.map((line) => (
            <li key={line} className="text-sm text-navy">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function BureauPersonalPage() {
  const auth = useAuth()
  const { companyId, isBureauHrManager } = auth
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [view, setView] = useState<'list' | 'table'>('table')

  const employeesQuery = useQuery({
    queryKey: ['bureau-personal-employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId && isBureauHrManager),
  })
  const employees = (employeesQuery.data?.data ?? []) as Employee[]
  const filtered = employees.filter((employee) => !hasLeftCompany(employee)).filter((employee) => {
    const haystack = [
      fullName(employee.first_name, employee.last_name),
      employee.email,
      employee.phone,
      ...(employee.extra_emails ?? []).map((item) => item.address),
      ...(employee.extra_phones ?? []).map((item) => item.number),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  }).sort((left, right) => compareEmployeeNames(left, right))
  const selected =
    filtered.find((employee) => employee.id === employeeId) ?? filtered[0]

  const documentsQuery = useQuery({
    queryKey: ['my-compliance', companyId, selected?.id],
    queryFn: () => hrApi.myCompliance(companyId!, selected!.id),
    enabled: Boolean(companyId && selected?.id && isBureauHrManager),
  })
  const documents = (documentsQuery.data?.data as ComplianceFile[] | undefined) ?? []

  if (!isBureauHrManager) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {view === 'table' ? (
            <p className="mb-2 text-sm text-navy">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-1.5">&gt;</span>
              Bureau Personal
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold text-navy">Bureau Personal</h1>
          <p className="mt-1 text-sm text-muted">
            {view === 'table'
              ? 'Employee information'
              : 'Employee name, phone number, email address and compliance documents.'}
          </p>
        </div>
        <div className="inline-flex rounded-[10px] border border-[#d9d9d9] bg-white p-1">
          <button
            type="button"
            className={`inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold ${
              view === 'table' ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
            }`}
            onClick={() => setView('table')}
          >
            <Table2 size={16} />
            Table
          </button>
          <button
            type="button"
            className={`inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold ${
              view === 'list' ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
            }`}
            onClick={() => setView('list')}
          >
            <LayoutList size={16} />
            List
          </button>
        </div>
      </div>

      {!companyId ? (
        <Alert>Select a company to see its employees.</Alert>
      ) : view === 'table' ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.7fr)]">
          <section className="overflow-hidden rounded-[12px] border border-[#d7e1ec] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#e6eef5] px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
                <Users size={18} />
                Employee Details
              </h2>
              <label className="relative block w-full max-w-[220px]">
                <Search
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                />
                <input
                  className="h-9 w-full rounded-[8px] border border-[#c5d4e4] bg-white pr-3 pl-8 text-sm text-navy outline-none"
                  placeholder="Search..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            {employeesQuery.isLoading ? (
              <Loading />
            ) : employeesQuery.isError ? (
              <div className="p-4">
                <Alert>
                  {employeesQuery.error instanceof Error
                    ? employeesQuery.error.message
                    : 'Could not load employees'}
                </Alert>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm text-navy">
                  <thead>
                    <tr className="border-b border-[#e6eef5]">
                      <th className="px-5 py-3 font-semibold">Employee Name</th>
                      <th className="px-5 py-3 font-semibold">Email Address</th>
                      <th className="px-5 py-3 font-semibold">Phone Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-muted">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((employee) => {
                        const active = employee.id === selected?.id
                        return (
                          <tr
                            key={employee.id}
                            className={`cursor-pointer border-b border-[#eef3f8] last:border-b-0 ${
                              active ? 'bg-[#e7f1f8]' : 'hover:bg-cream'
                            }`}
                            onClick={() => setEmployeeId(employee.id)}
                          >
                            <td className="px-5 py-3.5">{fullName(employee.first_name, employee.last_name)}</td>
                            <td className="px-5 py-3.5">{primaryEmail(employee) || '—'}</td>
                            <td className="px-5 py-3.5">{primaryPhone(employee) || '—'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {documentsQuery.isError ? (
            <Alert>
              {documentsQuery.error instanceof Error
                ? documentsQuery.error.message
                : 'Could not load compliance documents'}
            </Alert>
          ) : (
            <BureauComplianceForm
              key={selected?.id ?? 'none'}
              companyId={companyId}
              employee={selected}
              documents={documents}
              loading={documentsQuery.isLoading}
            />
          )}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="flex min-h-0 flex-col overflow-hidden p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy">Employees</h2>
            <label className="relative mb-3 block">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <input
                className="h-10 w-full rounded-[10px] border border-[#d9d9d9] bg-white pr-3 pl-9 text-sm text-navy outline-none"
                placeholder="Search employee..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {employeesQuery.isLoading ? (
                <Loading />
              ) : employeesQuery.isError ? (
                <Alert>
                  {employeesQuery.error instanceof Error
                    ? employeesQuery.error.message
                    : 'Could not load employees'}
                </Alert>
              ) : filtered.length === 0 ? (
                <EmptyState title="No employees found" />
              ) : (
                filtered.map((employee) => {
                  const active = employee.id === selected?.id
                  return (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => setEmployeeId(employee.id)}
                      className={`mb-1 flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm ${
                        active ? 'bg-[#e7f1f8] font-semibold text-navy' : 'text-navy hover:bg-cream'
                      }`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e7f1f8]">
                        <User size={14} />
                      </span>
                      <span className="min-w-0 truncate">
                        {fullName(employee.first_name, employee.last_name)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </Card>

          {selected ? (
            <div className="min-w-0 space-y-4">
              <Card className="p-5">
                <h2 className="text-lg font-semibold text-navy">
                  {fullName(selected.first_name, selected.last_name)}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Detail label="Phone number" lines={phoneLines(selected)} />
                  <Detail label="Email address" lines={emailLines(selected)} />
                </div>
              </Card>
              {documentsQuery.isError ? (
                <Alert>
                  {documentsQuery.error instanceof Error
                    ? documentsQuery.error.message
                    : 'Could not load compliance documents'}
                </Alert>
              ) : (
                <ComplianceDocumentsPanel
                  key={selected.id}
                  companyId={companyId}
                  employeeId={selected.id}
                  role="employer"
                  documents={documents}
                  loading={documentsQuery.isLoading}
                />
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, History, Image, Mail, Paperclip, Search, Send, X } from 'lucide-react'
import { communicationApi, companiesApi, employeesApi } from '../api'
import { download, fetchBlob } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, EmptyState, Loading, PageHeader } from '../components/ui'
import { fullName, idOf } from '../lib/format'
import type { CompanyUserRole, Employee } from '../types'

const AUDIENCES = [
  { value: 'COMPANY_ADMINS', label: 'All company admins', hint: 'Admins of the selected company' },
  { value: 'COMPANY_ADMINS_AND_EMPLOYEES', label: 'All company admins and employees', hint: 'Everyone in the company' },
  { value: 'EMPLOYEES', label: 'All employees', hint: 'Everyone on the payroll' },
  { value: 'SPECIFIC_ADMINS', label: 'Specific admins', hint: 'Tick the admins to email' },
  { value: 'SPECIFIC', label: 'Specific employees', hint: 'Tick the employees to email' },
] as const

function isCompanyAdminRole(roleName?: string | null, isOwner?: boolean) {
  if (isOwner) return true
  const value = String(roleName ?? '').toUpperCase().replace(/\s+/g, '_')
  return value === 'COMPANY_ADMIN' || value === 'COMPANY_ADMINISTRATOR'
}

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 8 * 1024 * 1024
const SIGNATURE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FROM_OPTIONS = [
  {
    value: 'support' as const,
    label: 'Support',
    email: 'support@cedarpayroll.com',
  },
  {
    value: 'info' as const,
    label: 'Info',
    email: 'info@cedarpayroll.com',
  },
]

type SentAttachment = {
  id: string
  kind: string
  name: string
  content_type?: string
  size?: number
}

type SentEmail = {
  id: string
  subject: string
  body?: string
  from: string
  audience: string
  sent_count: number
  failed_count: number
  created_at: string
  sender_name: string
  company_name?: string | null
  recipients?: Array<{ email: string; name?: string | null; status?: string }>
  attachments?: SentAttachment[]
}

function attachmentPath(messageId: string, attachmentId: string) {
  return `/communication/messages/${messageId}/attachments/${attachmentId}`
}

function SentAttachments({ email }: { email: SentEmail }) {
  const signature = email.attachments?.find((item) => item.kind === 'signature')
  const files = (email.attachments ?? []).filter((item) => item.kind !== 'signature')
  const [preview, setPreview] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!signature) {
      setPreview(null)
      return
    }
    let url = ''
    let cancelled = false
    setPreviewError(null)
    void fetchBlob(attachmentPath(email.id, signature.id))
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPreview(url)
      })
      .catch(() => {
        if (!cancelled) setPreviewError('Could not load the signature')
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [email.id, signature?.id])

  if (!signature && files.length === 0) return null

  return (
    <div className="mt-5 space-y-4">
      {signature ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Signature</p>
          {preview ? (
            <img src={preview} alt="Signature" className="mt-2 max-h-40 max-w-full rounded-[8px] border border-[#e4e8ee] bg-white object-contain" />
          ) : (
            <p className="mt-2 text-sm text-muted">{previewError || 'Loading signature…'}</p>
          )}
        </div>
      ) : null}
      {files.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Attachments</p>
          <ul className="mt-2 divide-y divide-[#eef1f5] overflow-hidden rounded-[12px] border border-[#e4e8ee]">
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy">{file.name}</p>
                  {file.size ? <p className="text-xs text-muted">{fileSize(file.size)}</p> : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-navy hover:underline"
                  onClick={() =>
                    void download(attachmentPath(email.id, file.id), file.name).catch(() => {
                      setPreviewError('Could not download this file')
                    })
                  }
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
          {previewError && !signature ? <p className="mt-2 text-sm text-brand">{previewError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function audienceLabel(value: string) {
  return AUDIENCES.find((item) => item.value === value)?.label ?? value
}

function fromAddress(value: string) {
  return value === 'info' ? 'info@cedarpayroll.com' : 'support@cedarpayroll.com'
}

function when(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ChoiceCard({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[12px] border px-4 py-3 text-left transition ${
        selected
          ? 'border-navy bg-[#f0f5fe] shadow-[inset_0_0_0_1px_#17375e]'
          : 'border-[#e4e8ee] bg-white hover:border-navy/30'
      }`}
    >
      <span className="block text-sm font-semibold text-navy">{title}</span>
      <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>
    </button>
  )
}

function PeoplePicker({
  title,
  search,
  onSearch,
  searchPlaceholder,
  selectedCount,
  companyId,
  loading,
  items,
  totalCount,
  emptyLabel,
  selectedIds,
  onChange,
}: {
  title: string
  search: string
  onSearch: (value: string) => void
  searchPlaceholder: string
  selectedCount: number
  companyId: string
  loading: boolean
  items: Array<{ id: string; name: string; email: string }>
  totalCount: number
  emptyLabel: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-navy">{title}</p>
        {selectedCount > 0 ? (
          <p className="text-xs font-semibold text-navy">{selectedCount} selected</p>
        ) : null}
      </div>
      {!companyId ? (
        <p className="rounded-[12px] border border-[#e8edf5] bg-[#f7f9fc] px-4 py-3 text-sm text-muted">
          Choose a company at the top of the page first.
        </p>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-[#e4e8ee] bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#eef1f5] px-4 py-3">
            <label className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-[10px] border border-[#e4e8ee] bg-[#f8f9fb] pr-3 pl-9 text-sm text-navy outline-none placeholder:text-muted focus:border-navy focus:bg-white"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                className="size-4 accent-navy"
                checked={allVisibleSelected}
                onChange={(event) => {
                  const visibleIds = items.map((item) => item.id)
                  onChange(
                    event.target.checked
                      ? [...new Set([...selectedIds, ...visibleIds])]
                      : selectedIds.filter((id) => !visibleIds.includes(id)),
                  )
                }}
              />
              Select all
            </label>
          </div>
          {loading ? (
            <div className="px-4 py-8">
              <Loading />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {totalCount === 0 ? emptyLabel : 'No names match that search.'}
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {items.map((item) => {
                const checked = selectedIds.includes(item.id)
                return (
                  <li key={item.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition ${
                        checked ? 'bg-[#f0f5fe]' : 'hover:bg-[#f8f9fb]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-navy"
                        checked={checked}
                        onChange={() =>
                          onChange(
                            checked
                              ? selectedIds.filter((id) => id !== item.id)
                              : [...selectedIds, item.id],
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-navy">{item.name}</span>
                        {item.email ? (
                          <span className="block truncate text-xs text-muted">{item.email}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function CommunicationPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const canUse = auth.isBureauAdmin
  const [from, setFrom] = useState<'support' | 'info'>('support')
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]['value']>('COMPANY_ADMINS')
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [adminIds, setAdminIds] = useState<string[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [signature, setSignature] = useState<File | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [attachmentKey, setAttachmentKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [openedEmail, setOpenedEmail] = useState<SentEmail | null>(null)
  const companyId = auth.companyId ?? ''
  const companyName = auth.companies.find((company) => company.id === companyId)?.name

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId),
    enabled: Boolean(canUse && companyId && audience === 'SPECIFIC'),
  })
  const adminsQuery = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: () => companiesApi.users(companyId),
    enabled: Boolean(canUse && companyId && audience === 'SPECIFIC_ADMINS'),
  })
  const listQuery = useQuery({
    queryKey: ['communication', companyId],
    queryFn: () => communicationApi.list(companyId),
    enabled: Boolean(canUse && historyOpen && companyId),
  })

  const employees = useMemo(() => {
    const list = (employeesQuery.data?.data as Employee[] | undefined) ?? []
    return [...list].sort((left, right) =>
      fullName(left.first_name, left.last_name).localeCompare(
        fullName(right.first_name, right.last_name),
        'en-GB',
        { sensitivity: 'base' },
      ),
    )
  }, [employeesQuery.data])
  const visibleEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    if (!query) return employees
    return employees.filter((employee) =>
      fullName(employee.first_name, employee.last_name).toLowerCase().includes(query),
    )
  }, [employeeSearch, employees])
  const admins = useMemo(() => {
    const list = (adminsQuery.data?.data as CompanyUserRole[] | undefined) ?? []
    const unique = new Map<string, { id: string; name: string; email: string }>()
    for (const role of list) {
      if (!isCompanyAdminRole(role.roles?.role_name, role.is_owner)) continue
      const id = idOf(role.users)
      if (!id || unique.has(id)) continue
      unique.set(id, {
        id,
        name: fullName(role.users?.first_name, role.users?.last_name) || role.users?.email || 'Administrator',
        email: role.users?.email ?? '',
      })
    }
    return [...unique.values()].sort((left, right) =>
      left.name.localeCompare(right.name, 'en-GB', { sensitivity: 'base' }),
    )
  }, [adminsQuery.data])
  const visibleAdmins = useMemo(() => {
    const query = adminSearch.trim().toLowerCase()
    if (!query) return admins
    return admins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(query) || admin.email.toLowerCase().includes(query),
    )
  }, [adminSearch, admins])
  const sent = Array.isArray(listQuery.data?.data) ? (listQuery.data.data as SentEmail[]) : []

  useEffect(() => {
    setEmployeeIds([])
    setAdminIds([])
    setEmployeeSearch('')
    setAdminSearch('')
    setOpenedEmail(null)
  }, [companyId])

  const payload = useMemo(
    () => ({
      from,
      audience,
      all_companies: false,
      company_ids: companyId ? [companyId] : [],
      employee_ids: audience === 'SPECIFIC' ? employeeIds : [],
      admin_ids: audience === 'SPECIFIC_ADMINS' ? adminIds : [],
      subject: subject.trim(),
      body: body.trim(),
    }),
    [adminIds, audience, body, companyId, employeeIds, from, subject],
  )

  const previewQuery = useQuery({
    queryKey: ['communication-preview', payload],
    queryFn: () => communicationApi.preview(payload),
    enabled:
      canUse &&
      Boolean(payload.subject && payload.body) &&
      (payload.all_companies || payload.company_ids.length > 0) &&
      (payload.audience !== 'SPECIFIC' || payload.employee_ids.length > 0) &&
      (payload.audience !== 'SPECIFIC_ADMINS' || payload.admin_ids.length > 0),
  })
  const previewCount = Number((previewQuery.data?.data as { count?: number } | undefined)?.count ?? 0)
  const signaturePreview = useMemo(
    () => (signature ? URL.createObjectURL(signature) : ''),
    [signature],
  )
  useEffect(() => {
    if (!signaturePreview) return
    return () => URL.revokeObjectURL(signaturePreview)
  }, [signaturePreview])

  const send = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('from', payload.from)
      form.append('audience', payload.audience)
      form.append('all_companies', payload.all_companies ? 'true' : 'false')
      form.append('company_ids', payload.company_ids.join(','))
      form.append('employee_ids', payload.employee_ids.join(','))
      form.append('admin_ids', payload.admin_ids.join(','))
      form.append('subject', payload.subject)
      form.append('body', payload.body)
      if (signature) form.append('signature', signature)
      for (const file of files) form.append('files', file)
      return communicationApi.send(form)
    },
    onSuccess: async (result) => {
      const data = result.data as { sent_count?: number; failed_count?: number }
      setMessage(
        `Sent ${data.sent_count ?? 0} email${data.sent_count === 1 ? '' : 's'}${
          data.failed_count ? `, ${data.failed_count} failed` : ''
        }. Replies will arrive in Outlook.`,
      )
      setError(null)
      setSubject('')
      setBody('')
      setSignature(null)
      setFiles([])
      setAttachmentKey((value) => value + 1)
      setEmployeeIds([])
      setAdminIds([])
      setEmployeeSearch('')
      setAdminSearch('')
      await queryClient.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (err: Error) => {
      setMessage(null)
      setError(err.message || 'Could not send the email')
    },
  })

  if (!canUse) return <Navigate to="/" replace />

  const canSend = Boolean(payload.subject && payload.body) && previewCount > 0 && !send.isPending

  return (
    <div className="pb-8">
      <PageHeader
        title="Communication"
        actions={
          <Button
            variant="secondary"
            type="button"
            disabled={!companyId}
            onClick={() => {
              setOpenedEmail(null)
              setHistoryOpen(true)
            }}
          >
            <History size={15} />
            Sent emails
          </Button>
        }
      />

      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)] md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
            <Mail size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-navy">New email</h2>
            <p className="mt-1 text-sm text-muted">Choose who should receive it, then write the message.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-navy">Send from</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FROM_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.value}
                  selected={from === option.value}
                  title={`Cedar Payroll ${option.label}`}
                  subtitle={option.email}
                  onClick={() => setFrom(option.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-navy">Send to</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {AUDIENCES.map((item) => (
                <ChoiceCard
                  key={item.value}
                  selected={audience === item.value}
                  title={item.label}
                  subtitle={item.hint}
                  onClick={() => {
                    setAudience(item.value)
                    setEmployeeIds([])
                    setAdminIds([])
                    setEmployeeSearch('')
                    setAdminSearch('')
                  }}
                />
              ))}
            </div>
          </div>

          {audience === 'SPECIFIC_ADMINS' ? (
            <PeoplePicker
              title="Company admins"
              search={adminSearch}
              onSearch={setAdminSearch}
              searchPlaceholder="Search admins"
              selectedCount={adminIds.length}
              companyId={companyId}
              loading={adminsQuery.isLoading}
              items={visibleAdmins}
              totalCount={admins.length}
              emptyLabel="No company admins found for this company."
              selectedIds={adminIds}
              onChange={setAdminIds}
            />
          ) : null}

          {audience === 'SPECIFIC' ? (
            <PeoplePicker
              title="Employees"
              search={employeeSearch}
              onSearch={setEmployeeSearch}
              searchPlaceholder="Search employees"
              selectedCount={employeeIds.length}
              companyId={companyId}
              loading={employeesQuery.isLoading}
              items={visibleEmployees.map((employee) => ({
                id: idOf(employee),
                name: fullName(employee.first_name, employee.last_name),
                email: employee.email ?? '',
              }))}
              totalCount={employees.length}
              emptyLabel="No employees found for this company."
              selectedIds={employeeIds}
              onChange={setEmployeeIds}
            />
          ) : null}

          <div className="rounded-[16px] border border-[#dce3ee] bg-[#f7f9fc] p-4 md:p-5">
            <p className="mb-4 text-sm font-semibold text-navy">Write the email</p>
            <div className="overflow-hidden rounded-[14px] border border-[#d5dbe6] bg-white shadow-[0_1px_4px_rgba(23,55,94,0.04)]">
              <label className="flex flex-col border-b border-[#e4e8ee] sm:flex-row sm:items-stretch">
                <span className="flex shrink-0 items-center bg-[#eef3fb] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-navy sm:w-32">
                  Subject
                </span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Payroll information needed"
                  className="min-h-12 w-full border-0 bg-white px-4 py-3 text-sm font-medium text-navy outline-none placeholder:font-normal placeholder:text-muted focus:bg-[#fcfdff]"
                />
              </label>
              <div>
                <div className="flex flex-col gap-1 border-b border-[#e4e8ee] bg-[#eef3fb] px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-navy sm:w-28">
                    Message
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">Hello [Name],</p>
                    <p className="text-xs text-muted">Each recipient sees their own name here.</p>
                  </div>
                </div>
                <textarea
                  rows={9}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write the update or information request. Recipients can reply in Outlook."
                  className="min-h-32 w-full resize-y border-0 bg-white px-4 py-4 text-sm leading-6 text-navy outline-none placeholder:text-muted"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[14px] border border-[#e4e8ee] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <Image size={16} />
                    Signature
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Add an image. It appears at the end of the email.
                  </p>
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center rounded-[8px] border border-navy px-3 text-xs font-semibold text-navy hover:bg-cream">
                  {signature ? 'Change' : 'Add signature'}
                  <input
                    key={`signature-${attachmentKey}`}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (!file) return
                      const allowed =
                        SIGNATURE_TYPES.has(file.type) ||
                        /\.(png|jpe?g|gif|webp)$/i.test(file.name)
                      if (!allowed) {
                        setMessage(null)
                        setError('The signature must be a PNG, JPG, GIF or WebP image')
                        return
                      }
                      if (file.size > MAX_SIGNATURE_BYTES) {
                        setMessage(null)
                        setError('The signature image must be 2 MB or smaller')
                        return
                      }
                      const others = files.reduce((sum, item) => sum + item.size, 0)
                      if (file.size + others > MAX_TOTAL_BYTES) {
                        setMessage(null)
                        setError('Attachments must be 8 MB or smaller in total')
                        return
                      }
                      setError(null)
                      setSignature(file)
                    }}
                  />
                </label>
              </div>
              {signature ? (
                <div className="mt-3 flex items-center gap-3 rounded-[10px] border border-[#e4e8ee] bg-[#f7f9fc] p-2">
                  {signaturePreview ? (
                    <img
                      src={signaturePreview}
                      alt=""
                      className="h-12 max-w-24 rounded-[6px] object-contain"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">{signature.name}</p>
                    <p className="text-xs text-muted">{fileSize(signature.size)}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-[6px] p-1.5 text-muted hover:bg-white hover:text-navy"
                    aria-label="Remove signature"
                    onClick={() => setSignature(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-[14px] border border-[#e4e8ee] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <Paperclip size={16} />
                    Files
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Attach any files. Up to 5 files, 8 MB altogether.
                  </p>
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center rounded-[8px] border border-navy px-3 text-xs font-semibold text-navy hover:bg-cream">
                  Add files
                  <input
                    key={`files-${attachmentKey}`}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const picked = [...(event.target.files ?? [])]
                      event.target.value = ''
                      if (picked.length === 0) return
                      const next = [...files]
                      let rejected = false
                      for (const file of picked) {
                        if (next.some((item) => item.name === file.name && item.size === file.size)) continue
                        if (next.length >= 5) {
                          setMessage(null)
                          setError('You can attach up to 5 files')
                          rejected = true
                          break
                        }
                        if (file.size > MAX_FILE_BYTES) {
                          setMessage(null)
                          setError(`${file.name} must be 5 MB or smaller`)
                          rejected = true
                          continue
                        }
                        const total =
                          (signature?.size ?? 0) +
                          next.reduce((sum, item) => sum + item.size, 0) +
                          file.size
                        if (total > MAX_TOTAL_BYTES) {
                          setMessage(null)
                          setError('Attachments must be 8 MB or smaller in total')
                          rejected = true
                          break
                        }
                        next.push(file)
                      }
                      setFiles(next)
                      if (!rejected) setError(null)
                    }}
                  />
                </label>
              </div>
              {files.length > 0 ? (
                <ul className="mt-3 divide-y divide-[#eef1f5] rounded-[10px] border border-[#e4e8ee]">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-navy">{file.name}</p>
                        <p className="text-xs text-muted">{fileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-[6px] p-1.5 text-muted hover:bg-[#f7f9fc] hover:text-navy"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((item) => !(item.name === file.name && item.size === file.size)),
                          )
                        }
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f5] pt-5">
          <p className="text-sm text-muted">
            {previewQuery.isFetching
              ? 'Counting recipients…'
              : previewCount
                ? `${previewCount} recipient${previewCount === 1 ? '' : 's'} will receive this email.`
                : 'Add a subject, message and audience to see the recipient count.'}
          </p>
          <Button type="button" disabled={!canSend} onClick={() => send.mutate()}>
            <Send size={15} />
            {send.isPending ? 'Sending…' : 'Send email'}
          </Button>
        </div>
      </section>

      {historyOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy/40 px-4 py-10"
              role="presentation"
              onClick={() => {
                setHistoryOpen(false)
                setOpenedEmail(null)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sent-emails-title"
                className="w-full max-w-3xl overflow-hidden rounded-[16px] bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#eef1f5] px-6 py-4">
                  <div>
                    <h2 id="sent-emails-title" className="text-lg font-semibold text-navy">
                      {openedEmail ? openedEmail.subject : 'Sent emails'}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {openedEmail
                        ? when(openedEmail.created_at)
                        : companyName
                          ? `Emails sent to ${companyName}.`
                          : 'Choose a company at the top to see its email history.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-[8px] p-1.5 text-muted hover:bg-[#f7f9fc] hover:text-navy"
                    onClick={() => {
                      setHistoryOpen(false)
                      setOpenedEmail(null)
                    }}
                    aria-label="Close sent emails"
                  >
                    <X size={18} />
                  </button>
                </div>
                {openedEmail ? (
                  <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                    <button
                      type="button"
                      className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline"
                      onClick={() => setOpenedEmail(null)}
                    >
                      <ArrowLeft size={15} />
                      Back to sent emails
                    </button>
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Date</dt>
                        <dd className="mt-1 text-sm text-navy">{when(openedEmail.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">From</dt>
                        <dd className="mt-1 text-sm text-navy">{fromAddress(openedEmail.from)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">To</dt>
                        <dd className="mt-1 text-sm text-navy">
                          <p>{audienceLabel(openedEmail.audience)}</p>
                          {openedEmail.recipients?.length ? (
                            <ul className="mt-2 space-y-1">
                              {openedEmail.recipients.map((recipient) => (
                                <li key={recipient.email} className="text-muted">
                                  {recipient.name ? `${recipient.name} · ` : ''}
                                  {recipient.email}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Subject</dt>
                        <dd className="mt-1 text-sm font-semibold text-navy">{openedEmail.subject}</dd>
                      </div>
                    </dl>
                    <div className="mt-5 overflow-hidden rounded-[14px] border border-[#e4e8ee]">
                      <div className="border-b border-[#eef1f5] bg-[#f7f9fc] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Message</p>
                        <p className="mt-1 text-sm font-semibold text-navy">Hello [Name],</p>
                      </div>
                      <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-navy">
                        {openedEmail.body?.trim() || 'No message was saved.'}
                      </div>
                    </div>
                    <SentAttachments email={openedEmail} />
                  </div>
                ) : !companyId ? (
                  <p className="px-6 py-10 text-center text-sm text-muted">
                    Choose a company at the top of the page first.
                  </p>
                ) : listQuery.isLoading ? (
                  <div className="px-6 py-10">
                    <Loading />
                  </div>
                ) : listQuery.isError ? (
                  <div className="px-6 py-6">
                    <Alert>Could not load sent emails for this company.</Alert>
                  </div>
                ) : sent.length === 0 ? (
                  <EmptyState
                    title="No emails sent yet"
                    body="Emails sent for this company will appear here."
                  />
                ) : (
                  <div className="max-h-[70vh] overflow-y-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#eceae6] text-xs font-semibold uppercase tracking-wide text-muted">
                          <th className="px-6 py-3">Sent</th>
                          <th className="px-6 py-3">From</th>
                          <th className="px-6 py-3">To</th>
                          <th className="px-6 py-3">Subject</th>
                          <th className="px-6 py-3">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sent.map((row) => (
                          <tr
                            key={row.id}
                            className="cursor-pointer border-b border-[#f0eeea] last:border-0 hover:bg-[#f7f9fc]"
                            onClick={() => setOpenedEmail(row)}
                          >
                            <td className="px-6 py-3.5 text-navy">
                              <p className="font-medium">{when(row.created_at)}</p>
                              <p className="text-xs text-muted">{row.sender_name}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="inline-flex rounded-full bg-[#eef3fb] px-2.5 py-1 text-xs font-semibold text-navy">
                                {fromAddress(row.from)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-navy">{audienceLabel(row.audience)}</td>
                            <td className="px-6 py-3.5 font-medium text-navy">{row.subject}</td>
                            <td className="px-6 py-3.5 text-navy">
                              {row.sent_count} sent
                              {row.failed_count ? (
                                <span className="text-brand"> · {row.failed_count} failed</span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

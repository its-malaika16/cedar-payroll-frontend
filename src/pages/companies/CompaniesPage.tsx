import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { companiesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, EmptyState, Loading, PageHeader } from '../../components/ui'
import { idOf } from '../../lib/format'
import type { Company } from '../../types'

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
type ModuleFilter = 'ALL' | 'PAYROLL' | 'HR'
type SortKey = 'name-asc' | 'name-desc' | 'employees' | 'created'
type ViewMode = 'list' | 'grid'
type DisplayStatus = 'Active' | 'Inactive'

const PAGE_SIZE = 8
const AVATAR_TONES = ['bg-navy', 'bg-navy-mid', 'bg-[#5c738f]', 'bg-emerald-800']

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'OR'
}

function avatarTone(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0)
  return AVATAR_TONES[sum % AVATAR_TONES.length]
}

function ownerName(company: Company) {
  if (company.owner_name?.trim()) return company.owner_name.trim()
  const owner = company.user_roles?.find((role) => role.is_owner)?.users
  return [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || '—'
}

function ownerRole(company: Company) {
  const role = company.user_roles?.find((item) => item.is_owner)?.roles?.role_name
  if (!role) return 'Administrator'
  if (role.toUpperCase() === 'COMPANY_ADMIN') return 'Administrator'
  return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isCompanyActive(company: Company) {
  return (company.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE'
}

function displayStatus(company: Company): DisplayStatus {
  return isCompanyActive(company) ? 'Active' : 'Inactive'
}

function activeModules(company: Company) {
  return (company.company_modules ?? [])
    .filter((module) => module.is_active !== false)
    .map((module) => module.module.toUpperCase())
    .filter((module) => module === 'PAYROLL' || module === 'HR')
}

function createdLabel(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusPill({ status }: { status: DisplayStatus }) {
  const styles = {
    Active: 'bg-emerald-50 text-emerald-800',
    Inactive: 'bg-[#f0efec] text-muted',
  }[status]
  const dot = {
    Active: 'bg-emerald-500',
    Inactive: 'bg-[#c5c4c0]',
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}

function ModuleTag({ module }: { module: string }) {
  const styles =
    module === 'HR' ? 'bg-violet-50 text-violet-800' : 'bg-emerald-50 text-emerald-800'
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {module === 'HR' ? 'HR' : 'Payroll'}
    </span>
  )
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  hint,
  hintClass,
  nested,
}: {
  icon: ReactNode
  iconClass: string
  label: string
  value: string
  hint: ReactNode
  hintClass: string
  nested?: boolean
}) {
  return (
    <Card className="p-4 shadow-[0_8px_24px_rgba(23,55,94,0.04)]">
      <div className="flex items-center gap-4">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
          {nested ? (
            <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white">
              {icon}
            </span>
          ) : (
            icon
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-0.5 text-[28px] font-bold leading-none text-navy">{value}</p>
          <p className={`mt-2 text-xs font-medium ${hintClass}`}>{hint}</p>
        </div>
      </div>
    </Card>
  )
}

function ActionMenu({
  open,
  anchor,
  onClose,
  children,
}: {
  open: boolean
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null)
      return
    }
    const update = () => {
      const rect = anchor.getBoundingClientRect()
      const width = Math.max(176, menuRef.current?.offsetWidth ?? 176)
      const height = menuRef.current?.offsetHeight ?? 128
      const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)
      const openUp = window.innerHeight - rect.bottom < height + 12
      const top = openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4
      setPosition({ top, left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (anchor?.contains(target) || menuRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, anchor, onClose])

  if (!open || !anchor) return null

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[70] min-w-[176px] rounded-[12px] border border-[#eceae6] bg-white p-1 shadow-lg"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
      role="menu"
    >
      {children}
    </div>,
    document.body,
  )
}

function CompanyMenuItems({
  onEdit,
  onToggleStatus,
  statusLabel,
  onDelete,
}: {
  onEdit: () => void
  onToggleStatus?: () => void
  statusLabel?: string
  onDelete?: () => void
}) {
  return (
    <>
      <button
        type="button"
        role="menuitem"
        className="w-full rounded-[8px] px-3 py-2 text-left text-sm font-medium text-navy hover:bg-cream"
        onClick={onEdit}
      >
        Edit organisation
      </button>
      {onToggleStatus && statusLabel ? (
        <button
          type="button"
          role="menuitem"
          className="w-full rounded-[8px] px-3 py-2 text-left text-sm font-medium text-navy hover:bg-cream"
          onClick={onToggleStatus}
        >
          {statusLabel}
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          role="menuitem"
          className="w-full rounded-[8px] px-3 py-2 text-left text-sm font-medium text-brand hover:bg-red-50"
          onClick={onDelete}
        >
          Delete organisation
        </button>
      ) : null}
    </>
  )
}

const filterClass =
  'h-10 rounded-xl border border-[#eceae6] bg-white px-3 text-sm text-navy shadow-[0_1px_2px_rgba(23,55,94,0.04)]'

export function CompaniesPage() {
  const auth = useAuth()
  const { canManageOrganizations } = auth
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })
  const companies = (query.data?.data ?? []) as Company[]
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('name-asc')
  const [view, setView] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<Company | null>(null)

  const stats = useMemo(() => {
    const total = companies.length
    const statuses = companies.map(displayStatus)
    const active = statuses.filter((status) => status === 'Active').length
    const employees = companies.reduce((sum, company) => sum + (company._count?.employees ?? 0), 0)
    const startOfThisMonth = new Date()
    startOfThisMonth.setDate(1)
    startOfThisMonth.setHours(0, 0, 0, 0)
    const previousTotal = companies.filter((company) => {
      if (!company.created_at) return true
      const created = new Date(company.created_at)
      return Number.isNaN(created.getTime()) || created < startOfThisMonth
    }).length
    const added = total - previousTotal
    const growthPercent =
      previousTotal === 0 ? (added > 0 ? 100 : 0) : Math.round((added / previousTotal) * 100)
    return { total, active, employees, growthPercent, added }
  }, [companies])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = companies.filter((company) => {
      const status = displayStatus(company)
      if (statusFilter !== 'ALL' && status.toUpperCase() !== statusFilter) return false
      const modules = activeModules(company)
      if (moduleFilter !== 'ALL' && !modules.includes(moduleFilter)) return false
      if (!term) return true
      const haystack = [
        company.company_name,
        company.paye_reference,
        company.postcode,
        company.sector,
        ownerName(company),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })

    rows.sort((left, right) => {
      if (sortKey === 'name-desc') return right.company_name.localeCompare(left.company_name)
      if (sortKey === 'employees') return (right._count?.employees ?? 0) - (left._count?.employees ?? 0)
      if (sortKey === 'created') return String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''))
      return left.company_name.localeCompare(right.company_name)
    })
    return rows
  }, [companies, search, statusFilter, moduleFilter, sortKey])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)

  const resetPage = () => setPage(1)

  const closeMenu = useCallback(() => {
    setMenuId(null)
    setMenuAnchor(null)
  }, [])

  function toggleMenu(id: string, button: HTMLElement) {
    if (menuId === id) {
      closeMenu()
      return
    }
    setMenuId(id)
    setMenuAnchor(button)
  }

  const menuCompany = menuId ? companies.find((company) => idOf(company) === menuId) ?? null : null

  useEffect(() => {
    closeMenu()
  }, [search, statusFilter, moduleFilter, sortKey, currentPage, view, closeMenu])

  async function toggleCompanyStatus(company: Company) {
    const id = idOf(company)
    const nextStatus = isCompanyActive(company) ? 'INACTIVE' : 'ACTIVE'
    closeMenu()
    setStatusError(null)
    setTogglingStatus(true)
    try {
      await companiesApi.update(id, { status: nextStatus })
      setPendingStatus(null)
      await queryClient.invalidateQueries({ queryKey: ['companies'] })
      if (auth.companyId === id) {
        await auth.refresh()
      }
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : nextStatus === 'ACTIVE'
            ? 'Could not activate this organisation'
            : 'Could not deactivate this organisation',
      )
    } finally {
      setTogglingStatus(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const id = idOf(pendingDelete)
      await companiesApi.remove(id)
      setPendingDelete(null)
      closeMenu()
      await queryClient.invalidateQueries({ queryKey: ['companies'] })
      if (auth.companyId === id) {
        await auth.refresh()
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this organisation')
    } finally {
      setDeleting(false)
    }
  }

  if (!canManageOrganizations) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <PageHeader
        title="Organisations"
        subtitle="Client companies in your bureau and the modules assigned to each."
        actions={
          canManageOrganizations ? (
            <Link to="/companies/new">
              <Button>
                <Plus size={16} />
                Add Organisation
              </Button>
            </Link>
          ) : undefined
        }
      />

      {statusError ? <Alert className="mb-4">{statusError}</Alert> : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Building2 size={20} />}
          iconClass="bg-[#e8eef5] text-navy"
          label="Total Organisations"
          value={String(stats.total)}
          hintClass={stats.growthPercent > 0 ? 'text-emerald-600' : stats.growthPercent < 0 ? 'text-brand' : 'text-muted'}
          hint={
            stats.total === 0 ? (
              'No companies yet'
            ) : stats.growthPercent > 0 ? (
              <span className="inline-flex items-center gap-1">
                <ArrowUp size={12} strokeWidth={2.5} />
                {stats.growthPercent}% this month
              </span>
            ) : stats.growthPercent < 0 ? (
              <span className="inline-flex items-center gap-1">
                <ArrowDown size={12} strokeWidth={2.5} />
                {Math.abs(stats.growthPercent)}% this month
              </span>
            ) : (
              'No change this month'
            )
          }
        />
        <StatCard
          icon={<Check size={14} strokeWidth={3} />}
          iconClass="bg-emerald-50"
          nested
          label="Active"
          value={String(stats.active)}
          hintClass="text-emerald-600"
          hint={
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {stats.total ? `${Math.round((stats.active / stats.total) * 100)}% active` : 'No companies yet'}
            </span>
          }
        />
        <StatCard
          icon={<Users size={20} />}
          iconClass="bg-violet-50 text-violet-700"
          label="Total Employees"
          value={String(stats.employees)}
          hintClass="text-violet-700"
          hint={
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-violet-500" />
              Across all organisations
            </span>
          }
        />
      </div>

      <Card className="shadow-[0_8px_24px_rgba(23,55,94,0.04)]">
        <div className="flex items-center gap-3 overflow-x-auto border-b border-[#eceae6] px-4 py-3">
          <label className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                resetPage()
              }}
              className={`${filterClass} w-full min-w-[240px] pl-9`}
              placeholder="Search by company name, PAYE, owner..."
            />
          </label>
          <select
            className={`${filterClass} w-[148px] shrink-0`}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter)
              resetPage()
            }}
          >
            <option value="ALL">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            className={`${filterClass} w-[148px] shrink-0`}
            value={moduleFilter}
            onChange={(event) => {
              setModuleFilter(event.target.value as ModuleFilter)
              resetPage()
            }}
          >
            <option value="ALL">Module: All</option>
            <option value="PAYROLL">Payroll</option>
            <option value="HR">HR</option>
          </select>
          <select
            className={`${filterClass} w-[168px] shrink-0`}
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="name-asc">Sort by: Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="employees">Employees</option>
            <option value="created">Date created</option>
          </select>
          <div className="ml-auto flex shrink-0 rounded-[10px] border border-[#e4e2de] p-0.5">
            <button
              type="button"
              className={`rounded-[8px] p-2 ${view === 'list' ? 'bg-navy text-white' : 'text-navy hover:bg-cream'}`}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              className={`rounded-[8px] p-2 ${view === 'grid' ? 'bg-navy text-white' : 'text-navy hover:bg-cream'}`}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {query.isLoading ? (
          <Loading />
        ) : companies.length === 0 ? (
          <EmptyState title="No organisations" body="Create an organisation to start payroll." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matches" body="Try a different search or filter." />
        ) : view === 'grid' ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {paged.map((company) => {
              const id = idOf(company)
              const status = displayStatus(company)
              return (
                <div
                  key={id}
                  className="relative rounded-[16px] border border-[#eceae6] bg-white p-4 text-left transition hover:border-navy/20 hover:shadow-sm"
                >
                  <button
                    type="button"
                    className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-[8px] text-navy hover:bg-cream"
                    aria-label={`Actions for ${company.company_name}`}
                    aria-expanded={menuId === id}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleMenu(id, event.currentTarget)
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => navigate(`/companies/${id}`)}
                  >
                    <div className="flex items-start justify-between gap-3 pr-8">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarTone(id)}`}
                        >
                          {initials(company.company_name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-navy">{company.company_name}</p>
                          <p className="truncate text-xs text-muted">{company.sector || '—'}</p>
                        </div>
                      </div>
                      <StatusPill status={status} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {activeModules(company).length === 0 ? (
                        <span className="text-xs text-muted">No modules</span>
                      ) : (
                        activeModules(company).map((module) => <ModuleTag key={module} module={module} />)
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} /> {company._count?.employees ?? 0} employees
                      </span>
                      <span>{ownerName(company)}</span>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#eceae6] text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Company name</th>
                  <th className="px-5 py-3">PAYE</th>
                  <th className="px-5 py-3">Postcode</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Modules</th>
                  <th className="px-5 py-3">Employees</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((company) => {
                  const id = idOf(company)
                  const status = displayStatus(company)
                  const owner = ownerName(company)
                  return (
                    <tr
                      key={id}
                      className="cursor-pointer border-b border-[#eceae6] last:border-b-0 hover:bg-cream/70"
                      onClick={() => navigate(`/companies/${id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarTone(id)}`}
                          >
                            {initials(company.company_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-navy">{company.company_name}</p>
                            <p className="text-xs text-muted">{company.sector || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-navy">{company.paye_reference || '—'}</td>
                      <td className="px-5 py-4 text-navy">{company.postcode || '—'}</td>
                      <td className="px-5 py-4">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {activeModules(company).length === 0 ? (
                            <span className="text-muted">—</span>
                          ) : (
                            activeModules(company).map((module) => <ModuleTag key={module} module={module} />)
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 tabular-nums text-navy">
                          <Users size={14} className="text-muted" />
                          {company._count?.employees ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eceae6] text-[10px] font-semibold text-navy">
                            {initials(owner === '—' ? company.company_name : owner)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-navy">{owner}</p>
                            <p className="text-xs text-muted">{ownerRole(company)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-navy">{createdLabel(company.created_at)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-[8px] text-navy hover:bg-cream"
                          aria-label={`Actions for ${company.company_name}`}
                          aria-expanded={menuId === id}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleMenu(id, event.currentTarget)
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceae6] px-5 py-3 text-sm text-muted">
            <p>
              Showing {from}-{to} of {filtered.length} organisations
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-[8px] text-navy hover:bg-cream disabled:text-muted"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                    number === currentPage ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
                  }`}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-[8px] text-navy hover:bg-cream disabled:text-muted"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <ActionMenu open={Boolean(menuId && menuAnchor && menuCompany)} anchor={menuAnchor} onClose={closeMenu}>
        {menuCompany ? (
          <CompanyMenuItems
            onEdit={() => {
              const id = idOf(menuCompany)
              closeMenu()
              navigate(`/companies/${id}`)
            }}
            onToggleStatus={
              canManageOrganizations && !togglingStatus
                ? () => {
                    closeMenu()
                    setStatusError(null)
                    if (isCompanyActive(menuCompany)) {
                      setPendingStatus(menuCompany)
                      return
                    }
                    void toggleCompanyStatus(menuCompany)
                  }
                : undefined
            }
            statusLabel={isCompanyActive(menuCompany) ? 'Deactivate' : 'Activate'}
            onDelete={
              canManageOrganizations
                ? () => {
                    closeMenu()
                    setDeleteError(null)
                    setPendingDelete(menuCompany)
                  }
                : undefined
            }
          />
        ) : null}
      </ActionMenu>

      {pendingStatus
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => {
                if (!togglingStatus) setPendingStatus(null)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="deactivate-organization-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="deactivate-organization-title" className="text-lg font-semibold text-navy">
                  Deactivate {pendingStatus.company_name}?
                </h3>
                <p className="mt-2 text-sm text-muted">
                  This sets the organisation status to Inactive. It is not deleted, and you can activate it again later.
                </p>
                {statusError ? <Alert className="mt-4">{statusError}</Alert> : null}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={togglingStatus}
                    onClick={() => setPendingStatus(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={togglingStatus}
                    onClick={() => void toggleCompanyStatus(pendingStatus)}
                  >
                    {togglingStatus ? 'Saving…' : 'Deactivate'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {pendingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => {
                if (!deleting) {
                  setPendingDelete(null)
                  setDeleteError(null)
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-organization-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-organization-title" className="text-lg font-semibold text-navy">
                  Delete {pendingDelete.company_name}?
                </h3>
                <p className="mt-2 text-sm text-muted">
                  This permanently removes the organisation, its employees, and payroll data. This cannot be undone.
                </p>
                {deleteError ? <Alert className="mt-4">{deleteError}</Alert> : null}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={deleting}
                    onClick={() => {
                      setPendingDelete(null)
                      setDeleteError(null)
                    }}
                  >
                    Keep organisation
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={deleting}
                    onClick={() => void confirmDelete()}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
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

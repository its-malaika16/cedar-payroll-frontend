import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Building2, ChevronDown, Home, Search } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { BrandIcon } from './BrandIcon'
import { fullName } from '../lib/format'
import sidebarLogo from '../assets/brand/sidebar-logo.png'
import iconEmployees from '../assets/brand/icon-employees.png'
import iconPayroll from '../assets/brand/icon-payroll.png'
import iconForms from '../assets/brand/icon-forms.png'
import iconActivityDoc from '../assets/brand/icon-activity-doc.png'
import iconRota from '../assets/brand/icon-rota.png'
import iconTimesheets from '../assets/brand/icon-timesheets.png'
import iconOrg from '../assets/brand/icon-org.png'
import iconRti from '../assets/brand/icon-rti.png'
import iconAnalysis from '../assets/brand/icon-analysis.png'
import iconActivityCheck from '../assets/brand/icon-activity-check.png'
import iconNotifications from '../assets/brand/icon-notifications.png'
import iconHelp from '../assets/brand/icon-help.png'
import iconSettings from '../assets/brand/icon-settings.png'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../api'
import { PortalSwitchButton } from './PortalSwitcher'

type NavItem = {
  to: string
  label: string
  icon?: string
  home?: boolean
  end?: boolean
  isActive?: (pathname: string) => boolean
}

const adminNav: NavItem[] = [
  { to: '/', label: 'Dashboard', home: true, end: true },
  {
    to: '/employees',
    label: 'Employees',
    icon: iconEmployees,
    isActive: (pathname) => pathname.startsWith('/employees') && !pathname.startsWith('/employees/payslips'),
  },
  {
    to: '/employees/payslips',
    label: 'Payslips',
    icon: iconPayroll,
    isActive: (pathname) => pathname.startsWith('/employees/payslips'),
  },
  {
    to: '/payroll/runs',
    label: 'Payroll',
    icon: iconPayroll,
    isActive: (pathname) =>
      pathname.startsWith('/payroll') &&
      !pathname.startsWith('/payroll/rti') &&
      !pathname.startsWith('/payroll/reports') &&
      !pathname.startsWith('/payroll/invoices'),
  },
  {
    to: '/hr',
    label: 'HR',
    icon: iconForms,
    isActive: (pathname) =>
      pathname.startsWith('/hr') && !pathname.startsWith('/hr/shifts'),
  },
  { to: '/payroll/invoices', label: 'Invoices', icon: iconActivityDoc },
  {
    to: '/hr/shifts',
    label: 'Rota',
    icon: iconRota,
    isActive: (pathname) => pathname.startsWith('/hr/shifts'),
  },
  { to: '/timesheets', label: 'Timesheets', icon: iconTimesheets },
  { to: '/companies', label: 'Organisation', icon: iconOrg },
  { to: '/payroll/rti', label: 'RTI', icon: iconRti },
  {
    to: '/payroll/reports',
    label: 'Analysis',
    icon: iconAnalysis,
    isActive: (pathname) => pathname.startsWith('/payroll/reports'),
  },
  { to: '/activities', label: 'Activities', icon: iconActivityCheck },
]

const footerNav: NavItem[] = [
  { to: '/notifications', label: 'Notifications', icon: iconNotifications },
  { to: '/help', label: 'Help', icon: iconHelp },
  {
    to: '/company-info',
    label: 'Company info',
    icon: iconOrg,
    isActive: (pathname) => pathname.startsWith('/company-info'),
  },
  { to: '/settings', label: 'Settings', icon: iconSettings },
]

function initials(first?: string | null, last?: string | null) {
  const value = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return value || 'CP'
}

function SidebarLink({ item }: { item: NavItem }) {
  const location = useLocation()
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => {
        const active = item.isActive ? item.isActive(location.pathname) : isActive
        return `relative flex h-[47px] items-center gap-3 rounded-[9px] px-3 text-sm font-semibold text-white transition ${
          active ? 'bg-navy-mid' : 'hover:bg-white/5'
        }`
      }}
    >
      {({ isActive }) => {
        const active = item.isActive ? item.isActive(location.pathname) : isActive
        return (
          <>
            {active ? (
              <span className="absolute top-0 left-0 h-full w-[6.5px] rounded-l-[9px] bg-brand" />
            ) : null}
            {item.home ? (
              <Home size={22} strokeWidth={2.2} className="shrink-0" />
            ) : (
              <BrandIcon src={item.icon!} alt="" className="size-[22px]" tone="navy" />
            )}
            {item.label}
          </>
        )
      }}
    </NavLink>
  )
}

function CompanySwitcher({
  companies,
  companyId,
  onChange,
}: {
  companies: { id: string; name: string }[]
  companyId: string | null
  onChange: (id: string) => void
}) {
  if (companies.length === 0) return null

  return (
    <label className="relative min-w-[200px] max-w-[320px] shrink-0">
      <Building2
        size={16}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-navy"
      />
      {companies.length === 1 ? (
        <span className="flex h-[42px] items-center truncate rounded-[15px] border border-[#d9d9d9] bg-white pr-4 pl-11 text-[15px] font-medium text-navy">
          {companies[0].name}
        </span>
      ) : (
        <>
          <select
            className="h-[42px] w-full appearance-none rounded-[15px] border border-[#d9d9d9] bg-white pr-10 pl-11 text-[15px] font-medium text-navy outline-none"
            value={companyId ?? ''}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Select company"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy"
          />
        </>
      )}
    </label>
  )
}

export function AppLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = adminNav.filter((item) => {
    if (item.to === '/hr' || item.to === '/hr/shifts') return auth.hasModule('HR')
    if (item.to === '/activities') return auth.isBureauAdmin
    if (item.to === '/companies') return auth.canManageOrganizations
    if (item.to === '/employees/payslips') return auth.isCompanyAdmin
    if (auth.isCompanyAdmin) {
      return [
        '/',
        '/employees',
        '/employees/payslips',
        '/hr',
        '/payroll/invoices',
        '/hr/shifts',
        '/timesheets',
        '/payroll/reports',
      ].includes(item.to)
    }
    return true
  })
  const footerItems = footerNav.filter((item) => {
    if (item.to === '/settings') return !auth.isCompanyAdmin
    if (item.to === '/company-info') return auth.isCompanyAdmin
    return true
  })
  const location = useLocation()
  const searchPlaceholder = location.pathname.startsWith('/help')
    ? 'Search Help Centre...'
    : 'Search...'
  const name = fullName(auth.user?.first_name, auth.user?.last_name)
  const seenNotifications = useRef(new Set<string>())
  const notifications = useQuery({
    queryKey: ['notifications', auth.companyId],
    queryFn: () => notificationsApi.list(auth.companyId!),
    enabled: Boolean(auth.token && auth.companyId),
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (!auth.adminCompanies.length) return
    if (!auth.adminCompanies.some((company) => company.id === auth.companyId)) {
      auth.setCompanyId(auth.adminCompanies[0].id)
    }
  }, [auth.adminCompanies, auth.companyId, auth.setCompanyId])

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    void Notification.requestPermission()
  }, [])

  useEffect(() => {
    const list = (notifications.data?.data as Array<{
      id: unknown
      title?: string
      body?: string
      is_read?: boolean
      type?: string
    }> | undefined) ?? []
    for (const item of list) {
      const id = String(item.id ?? '')
      if (!id || seenNotifications.current.has(id) || item.is_read) continue
      seenNotifications.current.add(id)
      if (item.type !== 'ROTA_PUBLISHED' && item.type !== 'ROTA_UPDATED' && item.type !== 'DOCUMENT_EXPIRING' && item.type !== 'INVOICE_APPROVED') continue
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(item.title || 'Rota update', { body: item.body || '' })
      }
    }
  }, [notifications.data])

  return (
    <div className="min-h-screen bg-cream lg:grid lg:h-screen lg:grid-cols-[228px_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="flex min-h-screen flex-col bg-navy text-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <div className="shrink-0 px-[26px] pt-[43px] pb-8">
          <span className="block h-[43px] w-[126px] overflow-hidden">
            <img
              src={sidebarLogo}
              alt="Cedar Payroll"
              width={126}
              height={43}
              className="brand-knockout h-full w-full object-contain object-left"
            />
          </span>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1.5">
          {items.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-auto shrink-0 px-1.5 pb-3">
          <div className="mb-3 space-y-1">
            {footerItems.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </div>
          <div className="relative mx-1.5 border-t border-white/20 pt-3">
            <button
              type="button"
              className="flex h-[60px] w-full items-center gap-2 rounded-[15px] px-2 text-left"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="flex size-[46px] items-center justify-center rounded-full bg-[#9b9a9a] text-base font-semibold text-white">
                {initials(auth.user?.first_name, auth.user?.last_name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium">Welcome,</span>
                <span className="block truncate text-xs font-semibold">{name}</span>
              </span>
              <span className="text-[10px] text-white/80">▾</span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 bottom-[70px] left-0 rounded-[12px] bg-white p-2 text-navy shadow-lg">
                <button
                  type="button"
                  className="w-full rounded-[8px] px-2 py-2 text-left text-sm font-semibold text-brand hover:bg-cream"
                  onClick={() => {
                    auth.logout()
                    navigate('/login')
                  }}
                >
                  Log out
                </button>
              </div>
            ) : null} 
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col lg:min-h-0 lg:overflow-y-auto">
        <header className="flex h-16 items-center justify-between gap-4 bg-white px-10 print:hidden lg:px-16 xl:px-24">
          <CompanySwitcher
            companies={auth.adminCompanies}
            companyId={auth.companyId}
            onChange={auth.setCompanyId}
          />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <PortalSwitchButton variant="admin" />
            <label className="relative w-full max-w-[353px]">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-navy"
              />
              <input
                className="h-[42px] w-full rounded-[15px] border border-[#d9d9d9] bg-white pr-4 pl-11 text-[15px] font-medium text-navy outline-none placeholder:text-muted"
                placeholder={searchPlaceholder}
              />
            </label>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-10 py-6 lg:px-16 xl:px-24">
          <Outlet />
        </main>
        <footer className="bg-white px-10 py-6 text-sm font-medium text-[#999] print:hidden lg:px-16 xl:px-24">
          2026 Cedar Payroll. All rights reserved.  
        </footer>
      </div>
    </div>
  )
}
        
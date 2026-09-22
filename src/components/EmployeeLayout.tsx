import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Search } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { BrandIcon } from './BrandIcon'
import { fullName } from '../lib/format'
import sidebarLogo from '../assets/brand/sidebar-logo.png'
import iconEmployees from '../assets/brand/icon-employees.png'
import iconPayroll from '../assets/brand/icon-payroll.png'
import iconRota from '../assets/brand/icon-rota.png'
import iconTimesheets from '../assets/brand/icon-timesheets.png'
import iconForms from '../assets/brand/icon-forms.png'
import iconActivityDoc from '../assets/brand/icon-activity-doc.png'
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
}

const mainNav: NavItem[] = [
  { to: '/portal', label: 'Dashboard', home: true, end: true },
  { to: '/portal/information', label: 'My Profile', icon: iconEmployees },
  { to: '/portal/payslips', label: 'Payslip', icon: iconPayroll },
  { to: '/portal/rota', label: 'Rota', icon: iconRota },
  { to: '/portal/attendance', label: 'Attendance', icon: iconTimesheets },
  { to: '/portal/leave', label: 'Leave', icon: iconForms },
  { to: '/portal/documents', label: 'Documents', icon: iconActivityDoc },
]

const footerNav: NavItem[] = [
  { to: '/portal/notifications', label: 'Notifications', icon: iconNotifications },
  { to: '/portal/help', label: 'Help', icon: iconHelp },
  { to: '/portal/profile', label: 'Settings', icon: iconSettings },
]

function initials(first?: string | null, last?: string | null) {
  const value = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return value || 'ME'
}

function SidebarLink({ item, unread = 0 }: { item: NavItem; unread?: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `relative flex h-[47px] items-center gap-3 rounded-[9px] px-3 text-sm font-semibold text-white transition ${
          isActive ? 'bg-navy-mid' : 'hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute top-0 left-0 h-full w-[6.5px] rounded-l-[9px] bg-brand" />
          ) : null}
          {item.home ? (
            <Home size={22} strokeWidth={2.2} className="shrink-0" />
          ) : (
            <BrandIcon src={item.icon!} alt="" className="size-[22px]" tone="navy" />
          )}
          <span>{item.label}</span>
          {item.to === '/portal/notifications' && unread > 0 ? (
            <span
              className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isActive ? 'bg-white text-navy' : 'bg-brand text-white'
              }`}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export function EmployeeLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const name = fullName(auth.user?.first_name, auth.user?.last_name)
  const employeeCompanies = auth.companies.filter((item) =>
    auth.employeeAccess.some((access) => access.company_id === item.id),
  )
  const company = employeeCompanies.find((item) => item.id === auth.companyId) ?? employeeCompanies[0]
  const seenNotifications = useRef(new Set<string>())
  const notifications = useQuery({
    queryKey: ['notifications', auth.companyId],
    queryFn: () => notificationsApi.list(auth.companyId!),
    enabled: Boolean(auth.token && auth.companyId),
    refetchInterval: 30000,
  })
  const unread = (
    (notifications.data?.data as Array<{ is_read?: boolean }> | undefined) ?? []
  ).filter((item) => !item.is_read).length

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    void Notification.requestPermission()
  }, [])

  useEffect(() => {
    const list =
      (notifications.data?.data as Array<{
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
      const allowed = ['ROTA_PUBLISHED', 'ROTA_UPDATED', 'DOCUMENT_EXPIRING', 'PAYSLIP_READY']
      if (!allowed.includes(item.type ?? '')) continue
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(item.title || 'Cedar Payroll', { body: item.body || '' })
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
          {mainNav.map((item) => (
            <SidebarLink key={item.to} item={item} unread={unread} />
          ))}
        </nav>
        <div className="mt-auto shrink-0 px-1.5 pb-3">
          <div className="mb-3 space-y-1">
            {footerNav.map((item) => (
              <SidebarLink key={item.to} item={item} unread={unread} />
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
        <header className="flex h-16 items-center justify-end gap-3 bg-white px-10 print:hidden lg:px-16 xl:px-24">
          <PortalSwitchButton variant="employee" />
          {employeeCompanies.length > 1 ? (
            <select
              className="h-[42px] rounded-[15px] border border-[#d9d9d9] bg-white px-3 text-[15px] font-medium text-navy outline-none"
              value={auth.companyId ?? ''}
              onChange={(event) => auth.setCompanyId(event.target.value)}
              aria-label="Select company"
            >
              {employeeCompanies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : null}
          <label className="relative w-full max-w-[353px]">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-navy"
            />
            <input
              className="h-[42px] w-full rounded-[15px] border border-[#d9d9d9] bg-white pr-4 pl-11 text-[15px] font-medium text-navy outline-none placeholder:text-muted"
              placeholder="Search..."
            />
          </label>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-10 py-6 lg:px-16 xl:px-24">
          <Outlet context={{ companyName: company?.name ?? '' }} />
        </main>
      </div>
    </div>
  )
}

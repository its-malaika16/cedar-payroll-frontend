import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarClock,
  CircleHelp,
  ClipboardList,
  createLucideIcon,
  FileText,
  Home,
  Search,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react'
import { ResponsiveShell } from './ResponsiveShell'
import { useAuth } from '../auth/AuthContext'
import { fullName } from '../lib/format'
import sidebarLogo from '../assets/brand/sidebar-logo.png'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../api'
import { PortalSwitchButton } from './PortalSwitcher'

const CalendarUser = createLucideIcon('calendar-user', [
  ['path', { d: 'M8 2v4' }],
  ['path', { d: 'M16 2v4' }],
  ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }],
  ['path', { d: 'M3 10h18' }],
  ['circle', { cx: '12', cy: '15', r: '2' }],
  ['path', { d: 'M8.5 20a3.5 3.5 0 0 1 7 0' }],
])

const LeaveIcon = createLucideIcon('leave', [
  ['circle', { cx: '9', cy: '7', r: '4' }],
  ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
  ['circle', { cx: '19', cy: '16', r: '3.5' }],
  ['path', { d: 'm16.6 18.4 4.8-4.8' }],
])

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const mainNav: NavItem[] = [
  { to: '/portal', label: 'Dashboard', icon: Home, end: true },
  { to: '/portal/information', label: 'My Profile', icon: User },
  { to: '/portal/payslips', label: 'Payslip', icon: ClipboardList },
  { to: '/portal/rota', label: 'Rota', icon: CalendarClock },
  { to: '/portal/attendance', label: 'Attendance', icon: CalendarUser },
  { to: '/portal/leave', label: 'Leave', icon: LeaveIcon },
  { to: '/portal/documents', label: 'Documents', icon: FileText },
]

const footerNav: NavItem[] = [
  { to: '/portal/notifications', label: 'Notifications', icon: Bell },
  { to: '/portal/help', label: 'Help', icon: CircleHelp },
  { to: '/portal/profile', label: 'Settings', icon: Settings },
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
          <item.icon size={22} strokeWidth={1.8} className="shrink-0" />
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
    <ResponsiveShell
      sidebar={
        <>
          <div className="shrink-0 px-5 pb-4 pt-1 lg:px-[26px] lg:pt-[43px] lg:pb-8">
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
        </>
      }
      headerRight={
        <>
          <PortalSwitchButton variant="employee" />
          {employeeCompanies.length > 1 ? (
            <select
              className="h-[42px] min-w-0 max-w-full rounded-[15px] border border-[#d9d9d9] bg-white px-3 text-[15px] font-medium text-navy outline-none sm:max-w-[220px]"
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
          <label className="relative min-w-0 w-full max-w-[353px] basis-full sm:basis-auto">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-navy"
            />
            <input
              className="h-[42px] w-full rounded-[15px] border border-[#d9d9d9] bg-white pr-4 pl-11 text-[15px] font-medium text-navy outline-none placeholder:text-muted"
              placeholder="Search..."
            />
          </label>
        </>
      }
    >
      <Outlet context={{ companyName: company?.name ?? '' }} />
    </ResponsiveShell>
  )
}

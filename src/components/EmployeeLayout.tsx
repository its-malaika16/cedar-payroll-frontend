import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  CircleHelp,
  CircleUser,
  Clock3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Palmtree,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { fullName } from '../lib/format'
import logoLogin from '../assets/brand/logo-login.png'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../api'
import { PortalSwitchButton } from './PortalSwitcher'

const nav = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portal/information', label: 'Employee Information', icon: UserRound },
  { to: '/portal/payslips', label: 'Payslip', icon: FileText },
  { to: '/portal/rota', label: 'ROTA', icon: CalendarDays },
  { to: '/portal/leave', label: 'Leave', icon: Palmtree },
  { to: '/portal/attendance', label: 'Attendance', icon: Clock3 },
  { to: '/portal/documents', label: 'Compliance documents', icon: FolderOpen },
  { to: '/portal/notifications', label: 'Notifications', icon: Bell },
  { to: '/portal/help', label: 'Help', icon: CircleHelp },
  { to: '/portal/profile', label: 'User profile', icon: CircleUser },
] as const

function initials(first?: string | null, last?: string | null) {
  const value = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return value || 'ME'
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
      const allowed = [
        'ROTA_PUBLISHED',
        'ROTA_UPDATED',
        'DOCUMENT_EXPIRING',
        'PAYSLIP_READY',
      ]
      if (!allowed.includes(item.type ?? '')) continue
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(item.title || 'Cedar Payroll', { body: item.body || '' })
      }
    }
  }, [notifications.data])

  return (
    <div className="min-h-screen bg-[#eef3f8] lg:grid lg:h-screen lg:grid-cols-[268px_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="flex min-h-screen flex-col border-r border-[#d7dee8] bg-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <div className="shrink-0 px-6 pt-8 pb-6">
          <img
            src={logoLogin}
            alt="Cedar Payroll"
            width={150}
            height={52}
            className="h-[44px] w-auto object-contain object-left"
          />
          <p className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            Employee portal
          </p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  `relative flex min-h-[46px] items-center gap-3 rounded-[12px] px-3 text-[13px] font-semibold transition ${
                    isActive ? 'bg-[#17375e] text-white' : 'text-navy hover:bg-[#f4f7fb]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} strokeWidth={2.1} className="shrink-0" />
                    <span className="leading-tight">{item.label}</span>
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
          })}
        </nav>
        <div className="relative shrink-0 border-t border-[#e8edf5] px-3 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[12px] px-2 py-2 text-left hover:bg-[#f4f7fb]"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
              {initials(auth.user?.first_name, auth.user?.last_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy">{name}</span>
              <span className="block truncate text-xs text-muted">{company?.name || 'Your company'}</span>
            </span>
          </button>
          {menuOpen ? (
            <div className="absolute right-3 bottom-[72px] left-3 rounded-[12px] border border-[#e8edf5] bg-white p-2 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-sm font-semibold text-brand hover:bg-cream"
                onClick={() => {
                  auth.logout()
                  navigate('/login')
                }}
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col lg:min-h-0 lg:overflow-y-auto">
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-[#d7dee8] bg-white px-6 print:hidden lg:px-10">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Signed in as employee</p>
            <p className="text-base font-semibold text-navy">{company?.name || 'Cedar Payroll'}</p>
          </div>
          <div className="flex items-center gap-3">
            <PortalSwitchButton variant="employee" />
            {employeeCompanies.length > 1 ? (
              <select
                className="h-10 rounded-[12px] border border-[#d9d9d9] bg-white px-3 text-sm font-medium text-navy outline-none"
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
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-7 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

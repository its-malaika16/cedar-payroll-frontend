import { Navigate, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileBarChart,
  Image,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Card, EmptyState } from '../../components/ui'
import { HrTitle } from './HrChrome'

const MODULES = [
  {
    to: '/hr/attendance',
    name: 'Attendance',
    description: 'Daily and weekly check-in, lateness and absence across the team.',
    action: 'Review Timesheets',
    icon: CalendarClock,
  },
  {
    to: '/hr/compliance',
    name: 'Compliance',
    description: 'Upload and review employee documents, including expiry tracking.',
    action: 'View Compliance',
    icon: ClipboardList,
  },
  {
    to: '/hr/leave',
    name: 'Leave',
    description: 'Holiday balances, upcoming leave, and calendar by employee.',
    action: 'Handle Requests',
    icon: Image,
  },
  {
    to: '/hr/financial',
    name: 'Financial Report',
    description: 'Hours, labour cost, and visual spend across the year.',
    action: 'View Reports',
    icon: FileBarChart,
  },
  {
    to: '/hr/shifts',
    name: 'Rota',
    description: 'Published shifts and cover. Opens the existing rota workspace.',
    action: 'Manage Rota',
    icon: Clock3,
  },
] as const

export function HrUnavailablePage() {
  return (
    <Card>
      <EmptyState
        title="HR is not enabled"
        body="This company has not subscribed to the HR module. Assign HR under Organisation to unlock Leave, Attendance, Compliance, Financial reports, and Rota."
      />
    </Card>
  )
}

export function RequireHr({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.loading) return null
  if (auth.isEmployeeOnly) return <Navigate to="/portal" replace />
  if (!auth.hasModule('HR')) return <HrUnavailablePage />
  return children
}

export function HrDashboardPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  if (auth.isEmployeeOnly) return <Navigate to="/portal" replace />
  if (!auth.hasModule('HR')) return <HrUnavailablePage />

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <HrTitle title="HR" />
      <p className="mt-3 mb-6 text-sm text-muted">
        People operations for companies subscribed to the HR module.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex min-h-[214px] flex-col rounded-[16px] border border-[#e6e4df] bg-white p-6 text-left shadow-[0_1px_2px_rgba(23,55,94,0.04)] transition hover:border-navy/25 hover:shadow-sm"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-[#f0f5fe] text-navy">
                <Icon size={22} strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-navy">{item.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-semibold text-navy">
                {item.action}
                <ChevronRight size={16} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

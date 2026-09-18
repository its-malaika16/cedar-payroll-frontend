import { Navigate, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Hash } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Card } from '../../components/ui'
import { HrTitle } from '../hr/HrChrome'

const SUPPORT_TILES = [
  {
    to: '/help/payroll-due',
    title: 'When is the next payroll due?',
    description: 'Invoices processing deadlines, submission dates, and direct debit triggers.',
    action: 'Check calendar',
  },
  {
    to: '/help/payroll-summary',
    title: 'View payroll summary',
    description: 'Instant analysis of previous trials, paid liabilities, and breakdown summaries.',
    action: 'View report',
  },
  {
    to: '/help/leave',
    title: 'How many employees are on leave this week/month?',
    description: 'Pull leave counters and calendar rates categorised by departments.',
    action: 'View leave',
  },
  {
    to: '/help/chat',
    title: 'Direct message to employee/bureau',
    description: 'Initiate direct message streams using any registered workforce.',
    action: 'Open chats',
  },
] as const

export function RequireCompanyOfficial({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.loading) return null
  if (auth.isEmployeeOnly) return <Navigate to="/portal/help" replace />
  return children
}

export function HelpPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  if (auth.isEmployeeOnly) return <Navigate to="/portal/help" replace />

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <HrTitle title="Help Centre" />
      <Card className="mt-8 p-6 md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
            <Hash size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-navy">Company Support</h2>
            <p className="mt-1 text-sm text-muted">
              Check payroll dates, employee leave and contact your payroll team.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {SUPPORT_TILES.map((tile) => (
            <HelpTile
              key={tile.to}
              title={tile.title}
              description={tile.description}
              action={tile.action}
              onClick={() => navigate(tile.to)}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}

function HelpTile({
  title,
  description,
  action,
  onClick,
}: {
  title: string
  description: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[14px] border border-[#e8edf5] bg-[#f7f9fc] p-5 text-left transition hover:border-navy/20 hover:bg-white"
    >
      <h3 className="text-[15px] font-semibold text-navy">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2b6cb0]">
        {action} →
      </span>
    </button>
  )
}

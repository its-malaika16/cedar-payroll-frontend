import type { ReactNode } from 'react'
import { CheckCircle2, Clock3, FileText, Pencil, Smartphone } from 'lucide-react'
import { statusLabel, type TimesheetStatus } from './timesheetTypes'

const styles: Record<TimesheetStatus, string> = {
  DRAFT: 'border-[#f3d2a8] bg-[#fff6ea] text-[#c2782a]',
  SUBMITTED: 'border-[#f3d2a8] bg-[#fff6ea] text-[#c2782a]',
  REJECTED: 'border-[#e0d0f0] bg-[#f6effc] text-[#7a4cb2]',
  APPROVED: 'border-[#bfe3c6] bg-[#eef8f0] text-[#2f8a4b]',
  PROCESSING: 'border-[#d9d9d9] bg-[#f4f4f4] text-[#6f6f6f]',
  PROCESSED: 'border-[#c9daf4] bg-[#eaf3fb] text-[#2f6fad]',
}

function StatusIcon({ status }: { status: TimesheetStatus }) {
  if (status === 'APPROVED') return <CheckCircle2 size={14} />
  if (status === 'REJECTED') return <Pencil size={14} />
  if (status === 'PROCESSED') return <Smartphone size={14} />
  if (status === 'PROCESSING') return <Clock3 size={14} />
  return status === 'DRAFT' ? <FileText size={14} /> : <Clock3 size={14} />
}

export function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <StatusIcon status={status} />
      {statusLabel(status)}
    </span>
  )
}

export function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-[#e4e2dd] bg-white px-5 py-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] text-navy">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold leading-tight text-navy">{value}</p>
      </div>
    </div>
  )
}

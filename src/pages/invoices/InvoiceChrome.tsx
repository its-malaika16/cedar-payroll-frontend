import type { ReactNode } from 'react'
import { CalendarDays, Check, Clock, FileText, Paperclip, Wallet } from 'lucide-react'
import { formatLongDate, money } from '../../lib/format'
import { invoiceStatusClass, invoiceStatusLabel } from './invoiceTypes'

export function invoiceInitials(name?: string | null) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0]?.slice(0, 2) || 'IN').toUpperCase()
}

export function StatusPill({ status }: { status: string }) {
  const dot =
    status === 'ACCEPTED'
      ? 'bg-emerald-500'
      : status === 'REJECTED'
        ? 'bg-brand'
        : status === 'REASON_REQUESTED' || status === 'REASON_SUBMITTED'
          ? 'bg-amber-500'
          : status === 'SENT'
            ? 'bg-sky-500'
            : 'bg-[#c5c4c0]'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${invoiceStatusClass(status)}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {invoiceStatusLabel(status)}
    </span>
  )
}

export function MetaTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-[14px] bg-[#faf9f7] px-4 py-3">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  )
}

export function FileChip({
  name,
  onClick,
}: {
  name: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy/8 text-navy">
        <Paperclip size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Attachment</span>
        <span className="block truncate text-sm font-semibold text-navy">{name}</span>
      </span>
    </>
  )
  const className =
    'flex w-full min-w-0 items-center gap-3 rounded-[14px] border border-[#eceae6] bg-white px-3 py-2.5 text-left'
  if (!onClick) return <div className={className}>{content}</div>
  return (
    <button type="button" className={`${className} transition hover:border-navy/30 hover:bg-cream`} onClick={onClick}>
      {content}
    </button>
  )
}

export function InvoiceAmount({ value }: { value: unknown }) {
  return <p className="text-[28px] font-semibold leading-none tracking-tight text-navy sm:text-[34px]">{money(value)}</p>
}

export function prettyDate(value?: string | null) {
  if (!value) return '—'
  return formatLongDate(value)
}

export const invoiceIcons = {
  amount: <Wallet size={14} />,
  due: <CalendarDays size={14} />,
  sent: <Clock size={14} />,
  file: <FileText size={14} />,
  accepted: <Check size={14} />,
}

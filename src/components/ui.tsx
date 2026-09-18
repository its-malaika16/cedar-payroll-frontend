import type { ButtonHTMLAttributes, FormEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { statusTone } from '../lib/format'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-none text-navy">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm font-semibold text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[16px] border border-[#d9d9d9]/80 bg-white ${className}`}>
      {children}
    </div>
  )
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
}) {
  const styles = {
    primary:
      'bg-navy text-white hover:bg-navy-mid disabled:bg-[#d9d9d9]',
    secondary:
      'border-[0.5px] border-navy bg-white text-navy hover:bg-cream',
    ghost: 'text-navy hover:bg-white',
    danger: 'bg-brand text-white hover:bg-gold-600',
    accent: 'bg-brand text-white hover:bg-gold-600 disabled:bg-[#d9d9d9]',
  }[variant]
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-navy">{label}</span>
      {children}
    </label>
  )
}

const controlClass =
  'w-full rounded-[15px] px-4 py-3 text-sm text-navy outline-none transition placeholder:text-muted'
const filledControlClass = `${controlClass} border-0 bg-input focus:ring-2 focus:ring-navy/20`
const outlineControlClass = `${controlClass} border border-[#d9d9d9] bg-white focus:border-navy focus:ring-2 focus:ring-navy/20`

type ControlVariant = 'filled' | 'outline'

export function Input({
  className = '',
  variant = 'filled',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { variant?: ControlVariant }) {
  return (
    <input
      className={`${variant === 'outline' ? outlineControlClass : filledControlClass} ${className}`}
      {...props}
    />
  )
}

export function Select({
  className = '',
  variant = 'filled',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { variant?: ControlVariant }) {
  return (
    <select
      className={`${variant === 'outline' ? outlineControlClass : filledControlClass} ${className}`}
      {...props}
    />
  )
}

export function Textarea({
  className = '',
  variant = 'filled',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { variant?: ControlVariant }) {
  return (
    <textarea
      className={`${variant === 'outline' ? outlineControlClass : filledControlClass} min-h-24 ${className}`}
      {...props}
    />
  )
}

export function Alert({
  tone = 'danger',
  children,
  className = '',
}: {
  tone?: 'danger' | 'success' | 'info' | 'warning'
  children: ReactNode
  className?: string
}) {
  const styles = {
    danger: 'border-brand/20 bg-red-50 text-brand',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-navy/15 bg-white text-navy',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
  }[tone]
  return (
    <div className={`rounded-[15px] border px-3 py-2 text-sm ${styles} ${className}`}>{children}</div>
  )
}

export function Badge({ children, status }: { children: ReactNode; status?: string }) {
  const tone = statusTone(status)
  const styles = {
    success: 'bg-emerald-50 text-emerald-800',
    warning: 'bg-amber-50 text-amber-800',
    danger: 'bg-red-50 text-brand',
    neutral: 'bg-[#f0efec] text-navy',
  }[tone]
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-xl font-semibold text-navy">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  )
}

export function Table({
  columns,
  children,
}: {
  columns: string[]
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[#d9d9d9] bg-cream text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee]">{children}</tbody>
      </table>
    </div>
  )
}

export function Stat({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-navy">{value}</p>
    </Card>
  )
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>
}

export function onSubmit(
  handler: () => Promise<void>,
  setError: (message: string | null) => void,
  setSaving?: (value: boolean) => void,
) {
  return async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving?.(true)
    try {
      await handler()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setSaving?.(false)
    }
  }
}

export function Loading() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted">
      Loading…
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowLeft, Inbox } from 'lucide-react'
import { Button } from '../../components/ui'

export function HrCrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <p className="mb-3 text-sm text-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? ' > ' : null}
          {item.to ? (
            <Link to={item.to} className="hover:text-navy">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </p>
  )
}

export function HrTitle({
  title,
  onBack,
}: {
  title: string
  onBack?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back">
          <ArrowLeft size={22} className="text-navy" />
        </button>
      ) : null}
      <h1 className="text-[32px] font-semibold leading-none text-navy">{title}</h1>
    </div>
  )
}

export function RequestsButton({
  count,
  active,
}: {
  count?: number
  active?: boolean
}) {
  return (
    <Link to="/hr/leave/requests">
      <Button variant={active ? 'primary' : 'secondary'}>
        <Inbox size={16} />
        Requests
        {typeof count === 'number' && count > 0 ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
              active ? 'bg-white/20 text-white' : 'bg-navy text-white'
            }`}
          >
            {count}
          </span>
        ) : null}
      </Button>
    </Link>
  )
}

import { Field, Input } from '../../components/ui'
import type { LeavePayQuote } from '../../types'

function money(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`
}

export function LeaveStatutoryPayFields({
  quote,
  loading,
  value,
  onChange,
}: {
  quote?: LeavePayQuote | null
  loading?: boolean
  value: string
  onChange: (value: string) => void
}) {
  if (loading) {
    return <p className="mt-4 text-sm text-muted">Calculating HMRC rate…</p>
  }

  if (quote && !quote.requires_manual_amount && quote.can_calculate) {
    return (
      <div className="mt-4 rounded-[10px] border border-[#d9d9d9] bg-cream px-3 py-3">
        <p className="text-sm font-semibold text-navy">{quote.label}</p>
        <p className="mt-1 text-sm text-muted">{quote.basis}</p>
        {quote.weekly_rate != null ? (
          <p className="mt-2 text-sm text-navy">Weekly rate: {money(quote.weekly_rate)}</p>
        ) : null}
        <p className="mt-1 text-lg font-semibold text-navy">{money(quote.paid_per_day)} per day</p>
        <p className="mt-1 text-sm text-muted">
          {quote.days} working day{quote.days === 1 ? '' : 's'} × {money(quote.paid_per_day)} ={' '}
          <span className="font-semibold text-navy">{money(quote.total)}</span>
        </p>
        {quote.reason ? <p className="mt-2 text-sm text-muted">{quote.reason}</p> : null}
      </div>
    )
  }

  return (
    <div className="mt-4">
      {quote?.reason ? <p className="mb-3 text-sm text-muted">{quote.reason}</p> : null}
      <Field label="Amount to be paid per day">
        <Input
          variant="outline"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
        />
      </Field>
    </div>
  )
}

export function paidLeaveReady(isPaid: boolean, value: string, quote?: LeavePayQuote | null, loading?: boolean) {
  if (!isPaid) return true
  if (loading) return false
  if (quote && quote.can_calculate && !quote.requires_manual_amount) return true
  return Number(value) > 0
}

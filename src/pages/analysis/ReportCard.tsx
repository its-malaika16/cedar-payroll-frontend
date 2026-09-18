import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Building2, Coins, Pencil } from 'lucide-react'
import type { ReportKind } from './reportCatalog'

function ArrowButton() {
  return (
    <span className="inline-flex size-9 items-center justify-center rounded-[8px] border border-[#d9d9d9] bg-white text-navy">
      <ArrowRight size={16} />
    </span>
  )
}

function P32Glyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <text x="12" y="16.5" textAnchor="middle" fill="currentColor" fontSize="6.5" fontWeight="700">
        P32
      </text>
    </svg>
  )
}

function CoinsGlyph({ mark }: { mark: '+' | '–' }) {
  return (
    <span className="relative inline-flex text-navy">
      <Coins size={20} strokeWidth={1.6} />
      <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-white text-[9px] font-bold leading-none text-navy ring-1 ring-[#c5d8ea]">
        {mark}
      </span>
    </span>
  )
}

function glyphFor(slug: ReportKind | undefined, Icon: LucideIcon) {
  if (slug === 'p32') return <P32Glyph />
  if (slug === 'additions') return <CoinsGlyph mark="+" />
  if (slug === 'deductions') return <CoinsGlyph mark="–" />
  if (slug === 'hmrc-payments') return <Building2 size={20} strokeWidth={1.6} />
  if (slug === 'notes') return <Pencil size={20} strokeWidth={1.6} />
  return <Icon size={20} strokeWidth={1.6} />
}

export function ReportCard({
  report,
  onClick,
  badge = false,
}: {
  report: {
    slug?: ReportKind
    name: string
    description: string
    icon: LucideIcon
  }
  onClick: () => void
  badge?: boolean
}) {
  const Icon = report.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[214px] flex-col rounded-[16px] border border-[#e6e4df] bg-white p-5 text-left shadow-[0_1px_2px_rgba(23,55,94,0.04)] transition hover:border-navy/25 hover:shadow-sm"
    >
      {badge ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-[#e7f1f8] text-navy">
          {glyphFor(report.slug, Icon)}
        </span>
      ) : (
        <Icon size={28} strokeWidth={1.6} className="text-navy" />
      )}
      <h3 className="mt-4 text-base font-semibold text-navy">{report.name}</h3>
      <p className="mt-2 text-sm leading-5 text-muted">{report.description}</p>
      <span className="mt-auto flex justify-end pt-4">
        <ArrowButton />
      </span>
    </button>
  )
}

export function ReportArrowButton() {
  return <ArrowButton />
}

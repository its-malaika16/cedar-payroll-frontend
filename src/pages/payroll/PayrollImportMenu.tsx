import { CircleEllipsis, Download, Import } from 'lucide-react'
import { menuItemClass, menuPanel, useMenuOpen } from './CreateSendMenu'

const MIX_ITEM = {
  id: 'mix',
  label: 'Import mix of payments, additions and deductions from CSV file...',
}

const TYPED_ITEMS = [
  { id: 'weekly', label: 'Import Weekly Payments from CSV File...' },
  { id: 'daily', label: 'Import Daily Payments from CSV File...' },
  { id: 'hourly', label: 'Import Hourly Payments from CSV File...' },
  { id: 'additions', label: 'Import Additions from CSV File...' },
  { id: 'deductions', label: 'Import Deductions from CSV File...' },
  { id: 'notes', label: 'Import Notes from CSV File...' },
] as const

export function PayrollImportMenu({
  onUnavailable,
}: {
  onUnavailable?: (message: string) => void
}) {
  const { ref, open, setOpen } = useMenuOpen()

  function choose(label: string) {
    setOpen(false)
    onUnavailable?.(`${label.replace(/\.\.\.$/, '')} is not available yet.`)
  }

  return (
    <div className="relative" ref={ref} data-menu>
      <button
        type="button"
        aria-label="Import from CSV"
        className="flex h-[47px] w-[49px] items-center justify-center rounded-[8px] bg-navy text-white hover:bg-[#123052]"
        onClick={() => setOpen((value) => !value)}
      >
        <Download size={20} />
      </button>
      {open ? (
        <div className={`${menuPanel} right-0 w-[420px]`}>
          <button type="button" className={menuItemClass} onClick={() => choose(MIX_ITEM.label)}>
            <Import size={14} className="shrink-0" />
            {MIX_ITEM.label}
          </button>
          <div className="my-1 border-t border-[#d9d9d9]" />
          {TYPED_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={menuItemClass}
              onClick={() => choose(item.label)}
            >
              <Import size={14} className="shrink-0" />
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-[#d9d9d9]" />
          <button
            type="button"
            className={menuItemClass}
            onClick={() => choose('CSV Import References...')}
          >
            <CircleEllipsis size={14} className="shrink-0" />
            CSV Import References...
          </button>
        </div>
      ) : null}
    </div>
  )
}

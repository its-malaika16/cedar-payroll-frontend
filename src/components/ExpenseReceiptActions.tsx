import { useState, type ReactNode } from 'react'
import { Download, Eye } from 'lucide-react'
import { download } from '../api/client'
import { DocumentPreviewModal } from './DocumentPreviewModal'

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-[#17375e] bg-white text-navy hover:bg-cream"
    >
      {children}
    </button>
  )
}

export function ExpenseReceiptActions({
  path,
  fileName,
  compact = false,
}: {
  path: string
  fileName?: string | null
  compact?: boolean
}) {
  const [viewer, setViewer] = useState(false)
  const name = fileName?.trim() || 'receipt'

  return (
    <div className={compact ? 'flex items-center gap-1.5' : 'flex flex-wrap items-center gap-2'}>
      <IconButton label="View receipt" onClick={() => setViewer(true)}>
        <Eye size={15} />
      </IconButton>
      <IconButton label="Download receipt" onClick={() => void download(path, name)}>
        <Download size={15} />
      </IconButton>
      {compact ? null : (
        <span className="max-w-[140px] truncate text-xs text-muted" title={name}>
          {name}
        </span>
      )}
      {viewer ? (
        <DocumentPreviewModal
          title="Receipt"
          fileName={name}
          path={path}
          onClose={() => setViewer(false)}
          onDownload={() => void download(path, name)}
        />
      ) : null}
    </div>
  )
}

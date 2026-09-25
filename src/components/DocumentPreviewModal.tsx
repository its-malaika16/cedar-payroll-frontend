import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, X } from 'lucide-react'
import { fetchBlob } from '../api/client'
import { Button } from './ui'

function previewKind(fileName: string, mime?: string) {
  const name = fileName.toLowerCase()
  if (mime?.startsWith('image/') || /\.(png|jpe?g)$/.test(name)) return 'image'
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  return 'other'
}

export function DocumentPreviewModal({
  title,
  fileName,
  path,
  onClose,
  onDownload,
}: {
  title: string
  fileName: string
  path: string
  onClose: () => void
  onDownload?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [kind, setKind] = useState<'image' | 'pdf' | 'other'>('other')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchBlob(path)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setKind(previewKind(fileName, blob.type))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not open this document')
        setLoading(false)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, fileName])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 px-4 py-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
        className="flex h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-[16px] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eceae6] px-5 py-4">
          <div className="min-w-0">
            <h3 id="document-preview-title" className="truncate text-lg font-semibold text-navy">
              {title}
            </h3>
            <p className="truncate text-sm text-muted">{fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onDownload ? (
              <Button type="button" variant="secondary" className="h-10 text-xs" onClick={onDownload}>
                <Download size={14} />
                Download
              </Button>
            ) : null}
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-[10px] text-navy hover:bg-cream"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-[#f8f7f4]">
          {loading ? (
            <p className="p-6 text-sm text-muted">Opening document…</p>
          ) : error ? (
            <p className="p-6 text-sm text-[#d32027]">{error}</p>
          ) : kind === 'pdf' && url ? (
            <iframe title={title} src={url} className="h-full w-full border-0 bg-white" />
          ) : kind === 'image' && url ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="p-6 text-sm text-muted">
              <p>This file cannot be previewed on screen. Download it to open the form.</p>
              {onDownload ? (
                <Button type="button" className="mt-4 h-10 text-xs" onClick={onDownload}>
                  <Download size={14} />
                  Download
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

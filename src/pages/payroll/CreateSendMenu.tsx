import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Download, Eye, FileText, Send } from 'lucide-react'
import { payslipsApi } from '../../api'
import { idOf } from '../../lib/format'

export const toolbarBtn =
  'inline-flex h-[47px] items-center justify-center gap-2 rounded-[8px] border-[0.5px] border-navy bg-white px-4 text-sm font-medium text-navy hover:bg-cream disabled:cursor-not-allowed disabled:border-[#9b9a9a] disabled:bg-[#f1efef] disabled:text-muted'

export const menuPanel =
  'absolute z-30 mt-1 rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white py-1 shadow-sm'

export const menuItemClass =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream disabled:cursor-not-allowed disabled:text-muted'

export const menuItemSelectedClass =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white bg-navy'

export function useMenuOpen() {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  return { ref, open, setOpen }
}

type CreateSendMenuProps = {
  companyId: string
  runId: string
  recordId?: string
  payslipReady?: boolean
  disabled?: boolean
  onMessage?: (message: string) => void
  onError?: (message: string) => void
}

export function CreateSendMenu({
  companyId,
  runId,
  recordId,
  payslipReady = true,
  disabled,
  onMessage,
  onError,
}: CreateSendMenuProps) {
  const navigate = useNavigate()
  const { ref, open, setOpen } = useMenuOpen()

  async function generateAndDownload() {
    if (!recordId) return
    if (!payslipReady) {
      onError?.('Mark this payslip as done before generating or sending it.')
      return
    }
    await payslipsApi.generateRecord(companyId, runId, recordId)
    const result = await payslipsApi.forRun(companyId, runId)
    const list = payslipList(result.data)
    const match = list.find((item) => String(item.payroll_record_id) === recordId)
    if (match) {
      await payslipsApi.download(
        companyId,
        idOf(match),
        String(match.file_name ?? 'payslip.pdf'),
      )
    }
  }

  return (
    <div className="relative" ref={ref} data-menu>
      <button
        type="button"
        className={toolbarBtn}
        disabled={disabled || !runId}
        onClick={() => setOpen((value) => !value)}
      >
        <Send size={16} />
        Create/Send
        <ChevronRight size={12} className="rotate-90" />
      </button>
      {open ? (
        <div className={`${menuPanel} right-0 w-[320px]`}>
          {recordId ? (
            <>
              <button
                type="button"
                className={menuItemClass}
                disabled={!payslipReady}
                onClick={async () => {
                  setOpen(false)
                  try {
                    await generateAndDownload()
                    onMessage?.('Payslip generated for the current employee.')
                  } catch (err) {
                    onError?.(err instanceof Error ? err.message : 'Could not generate payslip')
                  }
                }}
              >
                <FileText size={14} className="shrink-0" />
                Generate payslip PDF
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  setOpen(false)
                  navigate(`/payroll/payslips/${runId}/${recordId}`, {
                    state: { from: `/payroll/runs/${runId}/records/${recordId}` },
                  })
                }}
              >
                <Eye size={14} className="shrink-0" />
                View payslip
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={menuItemClass}
            disabled={Boolean(recordId) && !payslipReady}
            onClick={() => {
              setOpen(false)
              if (recordId && !payslipReady) {
                onError?.('Mark this payslip as done before emailing it.')
                return
              }
              navigate(
                `/payroll/runs/${runId}/payslips/send${recordId ? `?recordId=${recordId}` : ''}`,
              )
            }}
          >
            <Send size={14} className="shrink-0" />
            Email payslip PDF to multiple employees...
          </button>
          <button
            type="button"
            className={menuItemClass}
            disabled={Boolean(recordId) && !payslipReady}
            onClick={() => {
              setOpen(false)
              if (recordId && !payslipReady) {
                onError?.('Mark this payslip as done before downloading it.')
                return
              }
              navigate(
                `/payroll/runs/${runId}/payslips/download${recordId ? `?recordId=${recordId}` : ''}`,
              )
            }}
          >
            <Download size={14} className="shrink-0" />
            Download payslip PDF to multiple employees...
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function payslipList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'payslips' in data) {
    const payslips = (data as { payslips?: unknown }).payslips
    return Array.isArray(payslips) ? (payslips as Record<string, unknown>[]) : []
  }
  return []
}

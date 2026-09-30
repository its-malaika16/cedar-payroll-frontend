import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, Printer, Send, X } from 'lucide-react'
import { companiesApi, employeesApi, payrollApi, payslipsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Loading } from '../../components/ui'
import { formatPeriodEndingLabel, fullName, idOf } from '../../lib/format'
import type { Employee, PayrollRecord, PayrollRun } from '../../types'
import { downloadBlobFile } from '../employees/formPdf'
import { payslipList } from './CreateSendMenu'
import { PayslipDocument } from './PayslipDocument'
import { buildPayslipViewModel } from './payslipViewModel'

export function PayslipPreviewModal({
  runId,
  recordId,
  onClose,
}: {
  runId: string
  recordId: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId, currentEmployee } = useAuth()
  const inEmployeePortal = location.pathname.startsWith('/portal')
  const selfId = currentEmployee?.employee_id
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const runQuery = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId) && !inEmployeePortal,
  })
  const recordQuery = useQuery({
    queryKey: ['payroll-record', companyId, runId, recordId, inEmployeePortal],
    queryFn: () =>
      inEmployeePortal && selfId
        ? employeesApi.myPayrollRecord(companyId!, selfId, recordId)
        : payrollApi.getRecord(companyId!, runId, recordId),
    enabled: Boolean(companyId && recordId && (inEmployeePortal ? selfId : runId)),
  })
  const companyQuery = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companiesApi.get(companyId!),
    enabled: Boolean(companyId),
  })

  const record = recordQuery.data?.data as PayrollRecord | undefined
  const run = (runQuery.data?.data as PayrollRun | undefined) ?? (record?.payroll_runs as PayrollRun | undefined)
  const employeeId = record?.employee_id ? String(record.employee_id) : selfId ?? ''

  const employeeQuery = useQuery({
    queryKey: ['employee', companyId, employeeId, inEmployeePortal],
    queryFn: () =>
      inEmployeePortal && selfId
        ? employeesApi.me(companyId!, selfId)
        : employeesApi.get(companyId!, employeeId),
    enabled: Boolean(companyId && employeeId),
  })

  const employee = (employeeQuery.data?.data as Employee | undefined) ?? record?.employees
  const company = companyQuery.data?.data
  const model = useMemo(() => {
    if (!record) return null
    return buildPayslipViewModel(record, run, employee, company)
  }, [record, run, employee, company])

  const displayName = fullName(employee?.first_name, employee?.last_name)
  const periodLabel = formatPeriodEndingLabel(
    run?.period_end_date ?? run?.period_start_date ?? record?.pay_date,
    run?.pay_frequency,
  )

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

  async function downloadPdf() {
    if (!companyId) return
    setError(null)
    setBusy(true)
    try {
      if (inEmployeePortal && selfId && record?.payslips?.id) {
        await employeesApi.downloadMyPayslip(
          companyId,
          selfId,
          String(record.payslips.id),
          String(record.payslips.file_name ?? 'payslip.pdf'),
        )
        return
      }
      await payslipsApi.generateRecord(companyId, runId, recordId)
      const result = await payslipsApi.forRun(companyId, runId)
      const match = payslipList(result.data).find((item) => String(item.payroll_record_id) === recordId)
      if (!match) throw new Error('Payslip PDF was not generated.')
      const blob = await payslipsApi.fileBlob(companyId, idOf(match))
      downloadBlobFile(blob, String(match.file_name ?? 'payslip.pdf'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download payslip')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-auto bg-navy/45 p-4 sm:p-8"
      role="presentation"
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #payslip-print-root, #payslip-print-root * { visibility: visible !important; }
          #payslip-print-root {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          #payslip-print-root header { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
      <div
        id="payslip-print-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payslip-preview-title"
        className="relative w-[210mm] max-w-full shrink-0 overflow-hidden bg-white shadow-[0_8px_32px_rgba(23,55,94,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 bg-navy px-3 py-2 text-white">
          <p id="payslip-preview-title" className="min-w-0 truncate text-left text-sm">
            <span className="font-semibold">
              {displayName !== '—' ? displayName : 'Payslip'}
            </span>
            {periodLabel ? (
              <span className="font-normal text-white/90"> {periodLabel}</span>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {inEmployeePortal ? null : (
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-[6px] text-white hover:bg-white/10"
                aria-label="Email payslip"
                onClick={() => {
                  onClose()
                  navigate(`/payroll/runs/${runId}/payslips/send?recordId=${recordId}`)
                }}
              >
                <Send size={15} />
              </button>
            )}
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-[6px] text-white hover:bg-white/10 disabled:opacity-40"
              aria-label="Download PDF"
              disabled={busy}
              onClick={() => void downloadPdf()}
            >
              <Download size={15} />
            </button>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-[6px] text-white hover:bg-white/10"
              aria-label="Print"
              onClick={() => window.print()}
            >
              <Printer size={15} />
            </button>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-[6px] text-white hover:bg-white/10"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </header>
        {error ? (
          <div className="px-4 pt-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        {recordQuery.isLoading || employeeQuery.isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loading />
          </div>
        ) : !record || !model ? (
          <div className="p-4">
            <Alert>Payslip not found</Alert>
          </div>
        ) : (
          <PayslipDocument model={model} />
        )}
      </div>
    </div>,
    document.body,
  )
}

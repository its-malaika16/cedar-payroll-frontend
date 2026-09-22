import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { employeesApi, payrollApi, payslipsApi, companiesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { Employee, PayrollRecord, PayrollRun } from '../../types'
import { downloadBlobFile } from '../employees/formPdf'
import { payslipList } from './CreateSendMenu'
import { PayslipDocument } from './PayslipDocument'
import { payrollListPathFromRun, payslipReturnPath } from './payrollNavigation'
import { buildPayslipViewModel } from './payslipViewModel'

export function PayslipViewPage() {
  const { runId = '', recordId = '' } = useParams()
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
  const recordPath = `/payroll/runs/${runId}/records/${recordId}`
  const backTo = inEmployeePortal
    ? '/portal/payslips'
    : payslipReturnPath(
        (location.state as { from?: unknown } | null)?.from,
        recordPath,
      )

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

  if (recordQuery.isLoading || employeeQuery.isLoading) return <Loading />
  if (!record || !model) return <Alert>Payslip not found</Alert>

  return (
    <div>
      <p className="text-sm font-semibold text-[#607080]">
        {inEmployeePortal ? (
          <>
            Home &nbsp;&nbsp;&gt;&nbsp;&nbsp; Payslip
          </>
        ) : (
          <>
            Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; Payslips &nbsp;&nbsp;&gt;&nbsp;&nbsp;
            <span className="text-navy">{displayName}</span>
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(backTo, { state: { from: payrollListPathFromRun(run) } })}
          className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          Payslip
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => void downloadPdf()}>
            Download PDF
          </Button>
          {inEmployeePortal ? null : (
            <Button
              disabled={busy}
              onClick={() =>
                navigate(`/payroll/runs/${runId}/payslips/send?recordId=${recordId}`)
              }
            >
              Email payslip
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <div className="mt-6">
        <PayslipDocument model={model} />
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        © {model.year} Cedar Payroll. All rights reserved.
      </p>
    </div>
  )
}

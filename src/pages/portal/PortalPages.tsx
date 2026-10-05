import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Eye } from 'lucide-react'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import {
  EmptyState,
  Loading,
} from '../../components/ui'
import { formatDate, fullName, idOf, money } from '../../lib/format'
import { PayslipPreviewModal } from '../payroll/PayslipPreviewModal'

export { PortalAttendancePage } from './EmployeeAttendancePage'
export { PortalLeavePage } from './EmployeeLeavePage'
export { PortalDocumentsPage } from './EmployeeDocumentsPage'

type PayslipRun = {
  id?: unknown
  pay_date?: string
  period_end_date?: string
  pay_frequency?: string
  period_number?: number | null
  tax_week?: number | null
  tax_month?: number | null
}

function payPeriodWord(frequency?: string | null) {
  switch (String(frequency ?? '').toUpperCase()) {
    case 'MONTHLY':
      return 'month'
    case 'WEEKLY':
      return 'week'
    case 'FORTNIGHTLY':
      return 'fortnight'
    case 'FOUR_WEEKLY':
      return '4-week'
    default:
      return 'period'
  }
}

function payslipName(employeeName: string, item: Record<string, unknown>) {
  const run = item.payroll_runs as PayslipRun | undefined
  const ending = formatDate(run?.period_end_date || run?.pay_date)
  const name = employeeName.trim() && employeeName.trim() !== '—' ? employeeName.trim() : 'Employee'
  if (ending === '—') return `${name} - Pay Slip`
  return `${name} - Pay Slip for ${payPeriodWord(run?.pay_frequency)} ending ${ending}`
}

export function PortalPayslipsPage() {
  const { companyId, currentEmployee, user } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const [preview, setPreview] = useState<{ runId: string; recordId: string } | null>(null)
  const query = useQuery({
    queryKey: ['my-payslips', companyId, employeeId],
    queryFn: () => employeesApi.myPayslips(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const list = (query.data?.data as Record<string, unknown>[] | undefined) ?? []
  const employeeName = fullName(
    currentEmployee?.first_name ?? user?.first_name,
    currentEmployee?.last_name ?? user?.last_name,
  )

  return (
    <div>
      <p className="text-xs text-muted">
        <Link to="/portal" className="hover:text-navy">
          Home
        </Link>
        {' > '}
        Payslip
      </p>
      <h1 className="mt-2 text-[32px] font-semibold text-navy">Payslip</h1>
      <p className="mt-1 text-sm text-muted">View and download payslips published by your employer</p>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-[#eceae6] bg-white">
        {query.isLoading ? (
          <div className="px-5 py-8">
            <Loading />
          </div>
        ) : list.length === 0 ? (
          <EmptyState title="No payslips yet" body="Payslips appear after payroll is finalised and published." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#eceae6] text-sm font-medium text-muted">
                  <th className="px-6 py-4 font-medium">Payslip</th>
                  <th className="px-6 py-4 font-medium">Total Earnings</th>
                  <th className="px-6 py-4 font-medium">Take-home Pay</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => {
                  const run = item.payroll_runs as PayslipRun | undefined
                  const record = item.payroll_records as { id?: unknown; gross_pay?: unknown } | undefined
                  const runId = String(item.payroll_run_id ?? run?.id ?? '')
                  const recordId = String(item.payroll_record_id ?? record?.id ?? '')
                  const label = payslipName(employeeName, item)
                  const fileName = `${label}.pdf`
                  return (
                    <tr key={idOf(item)} className="border-b border-[#f0eeea] last:border-b-0">
                      <td className="px-6 py-5 font-medium text-navy">{label}</td>
                      <td className="px-6 py-5 text-navy">{money(item.gross_pay ?? record?.gross_pay)}</td>
                      <td className="px-6 py-5 text-navy">{money(item.take_home_pay)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={!runId || !recordId}
                            onClick={() => setPreview({ runId, recordId })}
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-navy px-4 text-xs font-semibold text-navy disabled:opacity-40"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void employeesApi.downloadMyPayslip(
                                companyId!,
                                employeeId!,
                                idOf(item),
                                fileName,
                              )
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-navy px-4 text-xs font-semibold text-white"
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {preview ? (
        <PayslipPreviewModal
          runId={preview.runId}
          recordId={preview.recordId}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  )
}

export { PortalRotaPage } from './EmployeeRotaPage'

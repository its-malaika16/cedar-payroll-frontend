import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, Eye } from 'lucide-react'
import { employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import {
  EmptyState,
  Loading,
} from '../../components/ui'
import { formatDate, formatPayslipPeriod, idOf, money } from '../../lib/format'

export { PortalAttendancePage } from './EmployeeAttendancePage'
export { PortalLeavePage } from './EmployeeLeavePage'
export { PortalDocumentsPage } from './EmployeeDocumentsPage'

function payslipName(item: Record<string, unknown>) {
  const file = String(item.file_name ?? '').replace(/\.pdf$/i, '').trim()
  if (file) return file
  const run = item.payroll_runs as
    | { period_start_date?: string; period_end_date?: string; pay_frequency?: string }
    | undefined
  const period = formatPayslipPeriod(run?.period_start_date, run?.period_end_date, run?.pay_frequency)
  return period === '—' ? 'Payslip' : period
}

export function PortalPayslipsPage() {
  const { companyId, currentEmployee } = useAuth()
  const employeeId = currentEmployee?.employee_id
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['my-payslips', companyId, employeeId],
    queryFn: () => employeesApi.myPayslips(companyId!, employeeId!),
    enabled: Boolean(companyId && employeeId),
  })
  const list = (query.data?.data as Record<string, unknown>[] | undefined) ?? []

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
                  <th className="px-6 py-4 font-medium">Payslip name</th>
                  <th className="px-6 py-4 font-medium">Pay Date</th>
                  <th className="px-6 py-4 font-medium">Take-home Pay</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => {
                  const run = item.payroll_runs as
                    | { id?: unknown; pay_date?: string }
                    | undefined
                  const record = item.payroll_records as { id?: unknown } | undefined
                  const runId = String(item.payroll_run_id ?? run?.id ?? '')
                  const recordId = String(item.payroll_record_id ?? record?.id ?? '')
                  const fileName = String(item.file_name ?? 'payslip.pdf')
                  return (
                    <tr key={idOf(item)} className="border-b border-[#f0eeea] last:border-b-0">
                      <td className="px-6 py-5 font-medium text-navy">{payslipName(item)}</td>
                      <td className="px-6 py-5 text-navy">{formatDate(run?.pay_date)}</td>
                      <td className="px-6 py-5 text-navy">{money(item.take_home_pay)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={!runId || !recordId}
                            onClick={() => navigate(`/portal/payslips/${runId}/${recordId}`)}
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
    </div>
  )
}

export { PortalRotaPage } from './EmployeeRotaPage'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { payrollApi, payslipsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Badge, Button, Card, EmptyState, Loading, PageHeader, Stat, Table } from '../../components/ui'
import { formatDate, fullName, idOf, isEmployeeOnPayrollRun, money } from '../../lib/format'
import type { PayrollRecord, PayrollRun } from '../../types'
import { useState } from 'react'

export function PayrollRunDetailPage() {
  const { runId = '' } = useParams()
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })

  const run = query.data?.data as PayrollRun | undefined
  const records = ((run?.payroll_records ?? []) as PayrollRecord[]).filter((record) =>
    isEmployeeOnPayrollRun(record.employees, run),
  )

  const act = async (fn: () => Promise<{ message: string }>) => {
    setError(null)
    try {
      const result = await fn()
      setMessage(result.message)
      void queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, runId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  if (query.isLoading) return <Loading />
  if (!run) return <Alert>Payroll run not found</Alert>

  const locked = run.status === 'LOCKED'
  const takeHome = records.reduce((sum, record) => sum + Number(record.take_home_pay ?? 0), 0)
  const tax = records.reduce((sum, record) => sum + Number(record.tax ?? 0), 0)
  const nic = records.reduce((sum, record) => sum + Number(record.employee_nic ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={`${run.payroll_schedules?.schedule_name ?? 'Payroll'} · Period ${run.period_number}`}
        subtitle={`${formatDate(run.period_start_date)} to ${formatDate(run.period_end_date)} · Pay date ${formatDate(run.pay_date)}`}
        actions={<Badge status={run.status}>{run.status}</Badge>}
      />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {message ? <div className="mb-4"><Alert tone="success">{message}</Alert></div> : null}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="Employees" value={records.length} />
        <Stat label="PAYE" value={money(tax)} />
        <Stat label="Employee NI" value={money(nic)} />
        <Stat label="Take-home" value={money(takeHome)} />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button disabled={locked} onClick={() => act(() => payrollApi.generateRecords(companyId!, runId))}>
          Generate records
        </Button>
        <Button disabled={locked} onClick={() => act(() => payrollApi.calculateRun(companyId!, runId))}>
          Calculate run
        </Button>
        <Button disabled={locked} variant="secondary" onClick={() => act(() => payrollApi.completeRun(companyId!, runId))}>
          Complete
        </Button>
        <Button disabled={locked} variant="secondary" onClick={() => act(() => payrollApi.lockRun(companyId!, runId))}>
          Lock
        </Button>
        <Button variant="secondary" onClick={() => act(() => payslipsApi.generateRun(companyId!, runId))}>
          Generate payslips
        </Button>
      </div>
      <Card>
        {records.length === 0 ? (
          <EmptyState title="No payroll records" body="Generate records from the current employee list." />
        ) : (
          <Table columns={['Employee', 'Basis', 'Gross', 'Tax', 'NI', 'Net', '']}>
            {records.map((record) => (
              <tr key={idOf(record)} className="hover:bg-cedar-50/40">
                <td className="px-4 py-3 font-medium">
                  {fullName(record.employees?.first_name, record.employees?.last_name)}
                </td>
                <td className="px-4 py-3">{record.pay_basis}</td>
                <td className="px-4 py-3">{money(record.gross_pay)}</td>
                <td className="px-4 py-3">{money(record.tax)}</td>
                <td className="px-4 py-3">{money(record.employee_nic)}</td>
                <td className="px-4 py-3">{money(record.net_pay)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    className="font-semibold text-cedar-800"
                    to={`/payroll/runs/${runId}/records/${idOf(record)}`}
                    state={{ from: `/payroll/runs/${runId}` }}
                  >
                    Calculate
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

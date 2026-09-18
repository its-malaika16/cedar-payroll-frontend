import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { payrollApi, payslipsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Button, Card, EmptyState, Field, Loading, PageHeader, Select } from '../../components/ui'
import { formatDate, fullName, idOf } from '../../lib/format'
import type { PayrollRun } from '../../types'
import { useState } from 'react'
import { payslipList } from './CreateSendMenu'

export function PayslipsPage() {
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const [runId, setRunId] = useState('')
  const runs = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId),
  })
  const payslips = useQuery({
    queryKey: ['payslips', companyId, runId],
    queryFn: () => payslipsApi.forRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })
  const runList = (runs.data?.data ?? []) as PayrollRun[]
  const list = payslipList(payslips.data?.data)

  return (
    <div>
      <PageHeader title="Payslips" subtitle="Generate and download PDFs after a payroll run is completed or locked." />
      <Card className="mb-6 p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Payroll run">
            <Select value={runId} onChange={(e) => setRunId(e.target.value)}>
              <option value="">Select a run</option>
              {runList.map((run) => (
                <option key={idOf(run)} value={idOf(run)}>
                  Period {run.period_number} · {formatDate(run.pay_date)} · {run.status}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            disabled={!runId}
            onClick={() => payslipsApi.generateRun(companyId!, runId).then(() => payslips.refetch())}
          >
            Generate payslips
          </Button>
        </div>
      </Card>
      <Card>
        {!runId ? (
          <EmptyState title="Choose a payroll run" body="Payslips are generated per completed period." />
        ) : payslips.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState title="No payslips" body="Generate payslips for this run after it is completed." />
        ) : (
          <div className="divide-y divide-stone-100">
            {list.map((item) => {
              const employee = item.employees as { first_name?: string; last_name?: string } | undefined
              const name = fullName(employee?.first_name, employee?.last_name)
              const recordId = String(item.payroll_record_id ?? '')
              return (
                <div key={idOf(item)} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium">{name === '—' ? String(item.file_name ?? 'Payslip') : name}</p>
                    <p className="text-sm text-stone-500">{formatDate(String(item.generated_at ?? ''))}</p>
                  </div>
                  <div className="flex gap-2">
                    {recordId ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate(`/payroll/payslips/${runId}/${recordId}`, {
                            state: { from: `/payroll/runs/${runId}/records/${recordId}` },
                          })
                        }
                      >
                        View
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() =>
                        payslipsApi.download(
                          companyId!,
                          idOf(item),
                          String(item.file_name ?? 'payslip.pdf'),
                        )
                      }
                    >
                      Download
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

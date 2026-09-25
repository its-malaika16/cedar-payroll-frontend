import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, RefreshCw } from 'lucide-react'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { formatLongDate, money } from '../../lib/format'
import type { PayrollPension, PayrollRun } from '../../types'
import { CreateSendMenu, toolbarBtn } from './CreateSendMenu'
import { PensionToolbarButton } from './PensionToolbarButton'
import { PayrollMoreMenu } from './PayrollMoreMenu'
import { PayrollSchedulesMenu } from './PayrollSchedulesMenu'
import { payrollListPathFromRun } from './payrollNavigation'

export function PensionPage() {
  const { runId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const runQuery = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })
  const pensionQuery = useQuery({
    queryKey: ['payroll-pension', companyId, runId],
    queryFn: () => payrollApi.pension(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })

  const run = runQuery.data?.data as PayrollRun | undefined
  const pension = pensionQuery.data?.data as PayrollPension | undefined
  const employees = pension?.employees ?? []
  const paid = (pension?.status ?? '').toUpperCase() === 'PAID'
  const periodLabel = (run?.pay_frequency ?? '').toUpperCase().includes('MONTH')
    ? 'Month Ending'
    : 'Week Ending'

  async function pay() {
    if (!companyId) return
    setSaving(true)
    setError(null)
    try {
      const result = await payrollApi.payPension(companyId, runId)
      setMessage(result.message)
      setConfirming(false)
      await queryClient.invalidateQueries({ queryKey: ['payroll-pension', companyId, runId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, runId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pay pension')
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  if (runQuery.isLoading || pensionQuery.isLoading) return <Loading />
  if (!run) return <Alert>Payroll run not found</Alert>

  const backTo = payrollListPathFromRun(run)

  return (
    <div>
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">Pension</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
          >
            <ChevronLeft size={25} strokeWidth={2.4} />
            Pension
          </button>
          <p className="mt-2 text-sm font-medium text-muted">
            {periodLabel} {formatLongDate(run.period_end_date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={toolbarBtn} disabled>
            <Check size={16} />
            Finalise
          </button>
          <button type="button" className={toolbarBtn} disabled>
            <RefreshCw size={16} />
            Reopen
          </button>
          <PensionToolbarButton paid={paid} disabled />
          <CreateSendMenu companyId={companyId!} runId={runId} disabled />
          <PayrollSchedulesMenu />
          <PayrollMoreMenu
            runId={runId}
            locked={['LOCKED', 'COMPLETED'].includes((run?.status ?? '').toUpperCase())}
            onUnavailable={setError}
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mt-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}
      {pension && !pension.finalised ? (
        <div className="mt-4">
          <Alert>Pension can only be paid after payroll is finalised.</Alert>
        </div>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-[16px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-[#d9d9d9] bg-cream text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-right">Employee pension</th>
                <th className="px-4 py-3 text-right">Employer pension</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee]">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    No employees in this pay run.
                  </td>
                </tr>
              ) : (
                employees.map((row) => (
                  <tr key={row.record_id}>
                    <td className="px-4 py-3 font-medium text-navy">{row.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-navy">
                      {money(row.employee_pension)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-navy">
                      {money(row.employer_pension)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-navy">
                      {money(row.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {employees.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-navy bg-cream">
                  <th className="px-4 py-3 text-left font-semibold text-navy">Total</th>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">
                    {money(pension?.employee_pension ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">
                    {money(pension?.employer_pension ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">
                    {money(pension?.total_payable ?? 0)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {confirming ? (
          <>
            <p className="mr-auto text-sm font-medium text-navy">
              Are you sure you want to pay this pension of {money(pension?.total_payable ?? 0)}?
            </p>
            <Button variant="secondary" disabled={saving} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void pay()}>
              {saving ? 'Paying…' : 'Pay pension'}
            </Button>
          </>
        ) : (
          <Button
            disabled={saving || paid || !pension?.finalised || employees.length === 0}
            onClick={() => setConfirming(true)}
          >
            Pay pension
          </Button>
        )}
      </div>
    </div>
  )
}

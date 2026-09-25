import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronLeft,
  Flag,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { BrandIcon } from '../../components/BrandIcon'
import { formatLongDate, fullName, idOf, isEmployeeOnPayrollRun, money } from '../../lib/format'
import type { PayrollRecord, PayrollRun } from '../../types'
import iconPerson from '../../assets/brand/icon-person.png'
import { CreateSendMenu, toolbarBtn } from './CreateSendMenu'
import { PayrollMoreMenu } from './PayrollMoreMenu'
import { PayrollSchedulesMenu } from './PayrollSchedulesMenu'
import { payrollListPathFromRun } from './payrollNavigation'

export function ReopenPayslipsPage() {
  const { runId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const preselect = params.get('recordId') ?? ''

  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : [])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const runQuery = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })

  const run = runQuery.data?.data as PayrollRun | undefined
  const records = ((run?.payroll_records ?? []) as PayrollRecord[]).filter((record) =>
    isEmployeeOnPayrollRun(record.employees, run),
  )
  const locked = ['LOCKED', 'COMPLETED'].includes((run?.status ?? '').toUpperCase())
  const periodLabel = (run?.pay_frequency ?? '').toUpperCase().includes('MONTH')
    ? 'Month Ending'
    : 'Week Ending'

  useEffect(() => {
    if (preselect || records.length === 0) return
    setSelected(records.map((record) => idOf(record)))
  }, [preselect, records.length])

  const allSelected = records.length > 0 && selected.length === records.length
  const currentId = selected[0] || (records[0] ? idOf(records[0]) : '')

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function reopen() {
    if (!companyId) return
    if (selected.length === 0) {
      setError('Select at least one employee to reopen.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const result = await payrollApi.reopenRun(companyId, runId, selected)
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, runId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
      navigate(preselect ? `/payroll/runs/${runId}/records/${preselect}` : payrollListPathFromRun(run), {
        state: {
          message: result.message,
          from: payrollListPathFromRun(run),
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reopen payslips')
    } finally {
      setBusy(false)
    }
  }

  if (runQuery.isLoading) return <Loading />
  if (!run) return <Alert>Payroll run not found</Alert>

  const backTo = preselect
    ? `/payroll/runs/${runId}/records/${preselect}`
    : payrollListPathFromRun(run)

  return (
    <div>
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">Reopen</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            navigate(backTo, {
              state: preselect ? { from: payrollListPathFromRun(run) } : undefined,
            })
          }
          className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
        >
          <ChevronLeft size={25} strokeWidth={2.4} />
          Reopen Payslips
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={toolbarBtn} disabled>
            <Check size={16} />
            Finalise
          </button>
          <button type="button" className={toolbarBtn} disabled>
            <RefreshCw size={16} />
            Reopen
          </button>
          <CreateSendMenu companyId={companyId!} runId={runId} disabled />
          <button type="button" className={toolbarBtn} onClick={() => navigate('/payroll/runs')}>
            <SlidersHorizontal size={16} />
            Filter
          </button>
          <PayrollSchedulesMenu />
          <PayrollMoreMenu runId={runId} recordId={preselect || undefined} locked={locked} onUnavailable={setError} />
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {locked ? null : (
        <div className="mt-4">
          <Alert tone="success">This pay run is already open for editing.</Alert>
        </div>
      )}

      <div className="mt-6 grid min-h-0 gap-4 xl:grid-cols-[276px_minmax(0,1fr)]">
        <aside className="h-[min(640px,calc(100vh-16rem))] overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <div className="h-full overflow-y-auto">
            {records.map((item, index) => {
              const id = idOf(item)
              const active = id === currentId
              const name = fullName(item.employees?.first_name, item.employees?.last_name)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected((current) => (current.includes(id) ? current : [...current, id]))}
                  className={`flex h-[39px] w-full items-center gap-3 border-b border-[#d9d9d9] px-4 text-left text-xs font-medium ${
                    active ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
                  } ${index === 0 ? 'rounded-t-[10px]' : ''}`}
                >
                  <BrandIcon
                    src={iconPerson}
                    alt=""
                    className="size-4"
                    tone={active ? 'navy' : 'light'}
                  />
                  <span className="min-w-0 flex-1 truncate">{name === '—' ? 'Employee Name' : name}</span>
                  {item.is_starter || item.is_leaver ? (
                    <Flag
                      size={12}
                      className={active ? 'fill-white text-white' : 'fill-navy text-navy'}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-navy">
            {periodLabel} {formatLongDate(run.period_end_date)}
          </h2>
          <section className="mt-4 flex min-h-[520px] flex-col overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
            <h3 className="px-5 pt-5 text-base font-semibold text-navy">Select Employees</h3>
            <div className="mt-3 grid grid-cols-[24px_minmax(0,1fr)_120px] items-center gap-3 border-y border-[#d9d9d9] px-5 py-2 text-xs font-medium text-muted">
              <input
                type="checkbox"
                className="size-3.5 accent-navy"
                checked={allSelected}
                onChange={(event) =>
                  setSelected(event.target.checked ? records.map((record) => idOf(record)) : [])
                }
              />
              <span>Employee</span>
              <span className="text-right">Gross Pay</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {records.map((record) => {
                const id = idOf(record)
                const name = fullName(record.employees?.first_name, record.employees?.last_name)
                const checked = selected.includes(id)
                return (
                  <label
                    key={id}
                    className="grid grid-cols-[24px_minmax(0,1fr)_120px] items-center gap-3 border-b border-[#eee] px-5 py-2.5 text-sm text-navy hover:bg-cream"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-navy"
                      checked={checked}
                      onChange={() => toggle(id)}
                    />
                    <span className="flex min-w-0 items-center gap-3">
                      {record.is_starter || record.is_leaver ? (
                        <Flag size={14} className="shrink-0 fill-navy text-navy" />
                      ) : (
                        <BrandIcon src={iconPerson} alt="" className="size-4" tone="light" />
                      )}
                      <span className="truncate">{name === '—' ? 'Employee Name' : name}</span>
                    </span>
                    <span className="text-right tabular-nums">{money(record.gross_pay)}</span>
                  </label>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d9d9d9] px-5 py-4">
              <p className="text-xs font-medium text-muted">
                {selected.length} of {records.length} employees selected
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => navigate(backTo, { state: { from: payrollListPathFromRun(run) } })}>
                  Cancel
                </Button>
                <Button type="button" disabled={busy || !locked || selected.length === 0} onClick={() => void reopen()}>
                  Reopen
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

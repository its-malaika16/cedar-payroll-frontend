import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check,
  RefreshCw,
  Users,
} from 'lucide-react'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import {
  formatLongDate,
  formatPeriodRange,
  fullName,
  idOf,
  isEmployeeOnPayrollRun,
  labelize,
  money,
} from '../../lib/format'
import { taxYearStartFromDate } from '../../lib/hmrcTaxCalendar'
import type { PayrollRecord, PayrollRun, PayrollSchedule } from '../../types'
import {
  asPayFrequency,
  dateKey,
  hmrcPeriodFromPayDate,
  hmrcPeriodLabel,
  periodsFromSavedSchedule,
} from './scheduleWizard/payDateRules'
import { CreateSendMenu, toolbarBtn } from './CreateSendMenu'
import { PayrollImportMenu } from './PayrollImportMenu'
import { PayrollMoreMenu, payrollMoreMenuItem } from './PayrollMoreMenu'
import { PayrollSchedulesMenu } from './PayrollSchedulesMenu'
import { FinaliseEmployeesModal } from './FinaliseEmployeesModal'
import { PensionToolbarButton } from './PensionToolbarButton'
import { PayslipPeriodSwitcher, defaultPeriodKey, findRunForPeriod } from './PayslipPeriodSwitcher'

function taxYearLabel(taxYear: number) {
  return `${taxYear}/${String(taxYear + 1).slice(-2)}`
}


function sumField(records: PayrollRecord[], key: keyof PayrollRecord) {
  return records.reduce((total, record) => total + Number(record[key] ?? 0), 0)
}

function isCompleted(status?: string) {
  const value = (status ?? '').toUpperCase()
  return value === 'LOCKED' || value === 'COMPLETED'
}

function StatCell({
  label,
  value,
  icon,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
}) {
  return (
    <div className="min-w-0 px-4 first:pl-0 xl:border-l xl:border-[#d9d9d9] xl:first:border-l-0 xl:first:pl-0 xl:pl-5">
      <span className="mb-2 flex size-[29px] items-center justify-center rounded-full bg-[#d7dee8] text-navy">
        {icon}
      </span>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-navy">{value}</p>
    </div>
  )
}

export function PayrollRunsPage() {
  const auth = useAuth()
  const { companyId } = auth
  const selectedCompany = auth.companies.find((company) => company.id === companyId)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scheduleId, setScheduleId] = useState(() => searchParams.get('schedule') ?? '')
  const [periodKey, setPeriodKey] = useState(() => searchParams.get('period') ?? '')
  const [finaliseOpen, setFinaliseOpen] = useState(false)
  const previousCompanyId = useRef(companyId)

  const schedules = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const runs = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId),
  })
  const scheduleList = ((schedules.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const runList = (runs.data?.data ?? []) as PayrollRun[]
  const currentTaxYear = taxYearStartFromDate(new Date())
  const selectedSchedule =
    scheduleList.find((schedule) => idOf(schedule) === scheduleId) ?? scheduleList[0]
  const selectedScheduleId = selectedSchedule ? idOf(selectedSchedule) : ''
  const schedulePeriods = useMemo(
    () => (selectedSchedule ? periodsFromSavedSchedule(selectedSchedule).periods : []),
    [selectedSchedule],
  )
  const periodKeys = useMemo(
    () => schedulePeriods.map((period) => String(period.number)),
    [schedulePeriods],
  )

  useEffect(() => {
    if (!previousCompanyId.current) {
      previousCompanyId.current = companyId
      return
    }
    if (previousCompanyId.current === companyId) return
    previousCompanyId.current = companyId
    setScheduleId('')
    setPeriodKey('')
  }, [companyId])

  useEffect(() => {
    if (!selectedScheduleId) return
    if (scheduleId !== selectedScheduleId) setScheduleId(selectedScheduleId)
    if (!periodKeys.includes(periodKey)) {
      setPeriodKey(defaultPeriodKey(schedulePeriods, runList, selectedScheduleId))
    }
  }, [selectedScheduleId, scheduleId, periodKeys, periodKey, schedulePeriods])

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (scheduleId) next.set('schedule', scheduleId)
        else next.delete('schedule')
        if (periodKey) next.set('period', periodKey)
        else next.delete('period')
        if (next.toString() === current.toString()) return current
        return next
      },
      { replace: true },
    )
  }, [periodKey, scheduleId, setSearchParams])

  const selectedPeriod = schedulePeriods.find((period) => String(period.number) === periodKey)
  const selectedSchedulePeriod = selectedPeriod ?? schedulePeriods[0]
  const selectedSummary = useMemo(
    () =>
      findRunForPeriod(
        runList,
        selectedScheduleId,
        periodKey,
        selectedSchedulePeriod?.start,
      ),
    [periodKey, runList, selectedScheduleId, selectedSchedulePeriod],
  )
  const selectedId = selectedSummary ? idOf(selectedSummary) : ''

  const runDetail = useQuery({
    queryKey: ['payroll-run', companyId, selectedId],
    queryFn: () => payrollApi.getRun(companyId!, selectedId),
    enabled: Boolean(companyId && selectedId),
  })
  const selectedRun = (runDetail.data?.data as PayrollRun | undefined) ?? selectedSummary
  const records = (selectedRun?.payroll_records ?? []) as PayrollRecord[]
  const visibleRecords = records.filter((record) =>
    isEmployeeOnPayrollRun(record.employees, selectedRun),
  )

  const locked = isCompleted(selectedRun?.status)
  const allFinalised =
    visibleRecords.length > 0 &&
    visibleRecords.every((record) => (record.status ?? '').toUpperCase() === 'FINALISED')
  const pensionQuery = useQuery({
    queryKey: ['payroll-pension', companyId, selectedId],
    queryFn: () => payrollApi.pension(companyId!, selectedId),
    enabled: Boolean(companyId && selectedId && allFinalised),
  })
  const pensionPaid = (pensionQuery.data?.data.status ?? '').toUpperCase() === 'PAID'
  const headerDate = selectedRun?.pay_date
    ? formatLongDate(selectedRun.pay_date)
    : formatLongDate(selectedSchedulePeriod?.payDate)
  const periodCaption = selectedSchedulePeriod
    ? `${hmrcPeriodLabel(selectedSchedule?.pay_frequency, selectedSchedulePeriod)} · ${formatPeriodRange(selectedSchedulePeriod.start, selectedSchedulePeriod.end)} · Tax year ${taxYearLabel(hmrcPeriodFromPayDate(selectedSchedulePeriod.payDate, asPayFrequency(selectedSchedule?.pay_frequency)).taxYear)}`
    : `Tax year ${taxYearLabel(currentTaxYear)}`

  function changeSchedule(nextId: string) {
    const next = scheduleList.find((schedule) => idOf(schedule) === nextId)
    setScheduleId(nextId)
    if (!next) {
      setPeriodKey('')
      return
    }
    const periods = periodsFromSavedSchedule(next).periods
    setPeriodKey(defaultPeriodKey(periods, runList, nextId))
  }

  async function startPayroll() {
    if (!companyId || !selectedSchedule || !selectedSchedulePeriod) {
      setError('Select a schedule and period first')
      return
    }
    const frequency = asPayFrequency(selectedSchedule.pay_frequency)
    const payDate = selectedSchedulePeriod.payDate
    const taxPeriod = hmrcPeriodFromPayDate(payDate, frequency)
    setSaving(true)
    setError(null)
    try {
      const created = await payrollApi.createRun(companyId, {
        schedule_id: idOf(selectedSchedule),
        tax_year_start: taxPeriod.taxYear,
        tax_year_end: taxPeriod.taxYear + 1,
        period_number: selectedSchedulePeriod.number,
        period_start_date: dateKey(selectedSchedulePeriod.start),
        period_end_date: dateKey(selectedSchedulePeriod.end),
        pay_date: dateKey(payDate),
        tax_week: taxPeriod.taxWeek ?? undefined,
        tax_month: taxPeriod.taxMonth ?? undefined,
      })
      const runId = idOf(created.data)
      if (runId) {
        await payrollApi.generateRecords(companyId, runId)
      }
      setMessage('Payroll started for the selected schedule and period')
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payroll')
    } finally {
      setSaving(false)
    }
  }

  async function act(fn: () => Promise<{ message: string }>) {
    setError(null)
    try {
      const result = await fn()
      setMessage(result.message)
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, selectedId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const stats = [
    { label: 'Employees', value: visibleRecords.length || selectedRun?._count?.payroll_records || 0 },
    { label: 'Gross pay', value: money(sumField(visibleRecords, 'gross_pay')) },
    { label: 'Tax', value: money(sumField(visibleRecords, 'tax')) },
    { label: 'Employee NIC', value: money(sumField(visibleRecords, 'employee_nic')) },
    { label: 'Employer NIC', value: money(sumField(visibleRecords, 'employer_nic')) },
    { label: 'Net pay', value: money(sumField(visibleRecords, 'net_pay')) },
    { label: 'Take-home Pay', value: money(sumField(visibleRecords, 'take_home_pay')) },
    { label: 'Cost to employer', value: money(sumField(visibleRecords, 'cost_to_employer')) },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold leading-none text-navy">Payroll</h1>
          {selectedCompany?.name ? (
            <p className="mt-2 text-base font-semibold text-navy">{selectedCompany.name}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PayrollImportMenu onUnavailable={setError} />
          <button
            type="button"
            className={toolbarBtn}
            disabled={!selectedId || (locked && allFinalised)}
            onClick={() => setFinaliseOpen(true)}
          >
            <Check size={16} />
            Finalise
          </button>
          <button
            type="button"
            className={toolbarBtn}
            disabled={!selectedId || !locked}
            onClick={() => selectedId && navigate(`/payroll/runs/${selectedId}/reopen`)}
          >
            <RefreshCw size={16} />
            Reopen
          </button>
          <PensionToolbarButton
            paid={pensionPaid}
            disabled={!selectedId || !allFinalised}
            onClick={() => selectedId && navigate(`/payroll/runs/${selectedId}/pension`)}
          />
          <CreateSendMenu
            companyId={companyId!}
            runId={selectedId}
            disabled={!selectedId}
            onMessage={setMessage}
            onError={setError}
          />
          <PayrollSchedulesMenu />
          <PayrollMoreMenu
            runId={selectedId}
            onUnavailable={setError}
            extras={
              <>
                <button
                  type="button"
                  className={payrollMoreMenuItem}
                  disabled={Boolean(selectedId) || saving || !selectedSchedulePeriod}
                  onClick={() => void startPayroll()}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  className={payrollMoreMenuItem}
                  disabled={!selectedId || locked}
                  onClick={() =>
                    selectedId && act(() => payrollApi.generateRecords(companyId!, selectedId))
                  }
                >
                  Generate records
                </button>
                <button
                  type="button"
                  className={payrollMoreMenuItem}
                  disabled={!selectedId || locked}
                  onClick={() =>
                    selectedId && act(() => payrollApi.calculateRun(companyId!, selectedId))
                  }
                >
                  Calculate run
                </button>
                <Link to="/payroll/payslips" className={payrollMoreMenuItem}>
                  Payslips
                </Link>
              </>
            }
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

      {runs.isLoading ? (
        <Loading />
      ) : (
        <>
          <section className="mt-8 rounded-[16px] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted">Current Pay Run</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-navy">{headerDate}</h2>
                  {locked ? (
                    <span className="inline-flex h-[34px] items-center gap-2 rounded-[8px] bg-[#4976ae] px-3 text-[11px] font-semibold text-white">
                      <Check size={14} />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex h-[34px] items-center rounded-[8px] bg-[#f0efec] px-3 text-[11px] font-semibold text-navy">
                      {selectedRun ? labelize(selectedRun.status) : 'Incomplete'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-muted">{periodCaption}</p>
              </div>
              <PayslipPeriodSwitcher
                schedules={scheduleList}
                scheduleId={selectedScheduleId}
                periodKey={periodKey}
                onScheduleChange={changeSchedule}
                onPeriodChange={setPeriodKey}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-y-6 border-t border-[#d9d9d9] pt-6 sm:grid-cols-4 xl:grid-cols-8 xl:gap-0">
              {stats.map((stat, index) => (
                <StatCell
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  icon={
                    index === 0 ? (
                      <Users size={14} />
                    ) : (
                      <span className="text-[11px] font-semibold">£</span>
                    )
                  }
                />
              ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-[16px] bg-white">
            <h3 className="px-6 pt-5 text-base font-semibold text-navy">Employees in this pay run</h3>
            {selectedId && runDetail.isLoading ? (
              <Loading />
            ) : visibleRecords.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-muted">
                  {selectedId
                    ? 'No employees in this pay run yet.'
                    : `No pay run for this period in tax year ${taxYearLabel(currentTaxYear)}. Start payroll to open one for the selected schedule and period.`}
                </p>
                {selectedId ? (
                  <Button
                    className="mt-4"
                    disabled={locked}
                    onClick={() => act(() => payrollApi.generateRecords(companyId!, selectedId))}
                  >
                    Generate records
                  </Button>
                ) : (
                  <Button
                    className="mt-4"
                    disabled={saving || !selectedSchedulePeriod}
                    onClick={() => void startPayroll()}
                  >
                    {saving ? 'Starting…' : 'Manual Entry'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-3 max-h-[min(1100px,calc(100vh-8rem))] overflow-auto">
                <table className="w-full min-w-[960px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[11%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white text-xs font-medium text-muted">
                    <tr className="border-y border-[#d9d9d9]">
                      <th className="px-4 py-3 text-left font-medium">Employees</th>
                      <th className="px-4 py-3 text-right font-medium">Gross pay</th>
                      <th className="px-4 py-3 text-right font-medium">Tax</th>
                      <th className="px-4 py-3 text-right font-medium">Employee NIC</th>
                      <th className="px-4 py-3 text-right font-medium">Employer NIC</th>
                      <th className="px-4 py-3 text-right font-medium">Net pay</th>
                      <th className="px-4 py-3 text-right font-medium">Take-home pay</th>
                      <th className="px-4 py-3 text-right font-medium">Cost to employer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map((record) => (
                      <tr key={idOf(record)} className="border-b border-[#eee] hover:bg-[#f0f5fe]">
                        <td className="truncate px-4 py-2.5 text-left">
                          <Link
                            to={`/payroll/runs/${selectedId}/records/${idOf(record)}`}
                            state={{ from: `${location.pathname}${location.search}` }}
                            className="inline-flex items-center gap-2 font-medium text-navy"
                          >
                            <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
                              {(record.status ?? '').toUpperCase() === 'FINALISED' ? (
                                <Check size={14} className="text-navy" />
                              ) : null}
                            </span>
                            {fullName(record.employees?.first_name, record.employees?.last_name)}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(record.gross_pay)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(record.tax)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(record.employee_nic)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(record.employer_nic)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(record.net_pay)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(record.take_home_pay)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(record.cost_to_employer)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      {finaliseOpen && selectedId ? (
        <FinaliseEmployeesModal
          records={visibleRecords}
          saving={saving}
          onClose={() => setFinaliseOpen(false)}
          onConfirm={(recordIds) =>
            void (async () => {
              setSaving(true)
              setError(null)
              try {
                const result = await payrollApi.finaliseRun(companyId!, selectedId, recordIds)
                setMessage(result.message)
                setFinaliseOpen(false)
                await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
                await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, selectedId] })
                await queryClient.invalidateQueries({ queryKey: ['rti', companyId] })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not finalise payslips')
              } finally {
                setSaving(false)
              }
            })()
          }
        />
      ) : null}
    </div>
  )
}

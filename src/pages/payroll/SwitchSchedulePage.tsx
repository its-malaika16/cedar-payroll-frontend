import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { employeesApi, payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { fullName, idOf, isEmployeeOnPayrollRun } from '../../lib/format'
import type { Employee, PayrollRecord, PayrollRun, PayrollSchedule } from '../../types'
import { CreateSendMenu, toolbarBtn } from './CreateSendMenu'
import { PayrollImportMenu } from './PayrollImportMenu'
import { PayrollMoreMenu } from './PayrollMoreMenu'
import { PayrollSchedulesMenu } from './PayrollSchedulesMenu'
import { payrollListPathFromRun } from './payrollNavigation'
import { FREQUENCY_META, asPayFrequency } from './scheduleWizard/payDateRules'

function scheduleLabel(schedule: PayrollSchedule, all: PayrollSchedule[]) {
  const frequency = FREQUENCY_META[asPayFrequency(schedule.pay_frequency)].title
  const name = schedule.schedule_name?.trim()
  const duplicates = all.filter((item) => item.pay_frequency === schedule.pay_frequency).length > 1
  if (name && duplicates) return `${name} · ${frequency}`
  return name || frequency
}

function employmentOf(employee: Employee | PayrollRecord['employees'] | null | undefined) {
  const details = (employee as Employee | undefined)?.employment_details
  if (Array.isArray(details)) return (details[0] ?? {}) as Record<string, unknown>
  return (details ?? {}) as Record<string, unknown>
}

function scheduleIdOf(employee: Employee | PayrollRecord['employees'] | null | undefined) {
  return String(employmentOf(employee).pay_schedule_id ?? '')
}

export function SwitchSchedulePage() {
  const { runId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const preselect = params.get('recordId') ?? ''
  const [selected, setSelected] = useState<string[]>([])
  const [toScheduleId, setToScheduleId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const runQuery = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })
  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const schedulesQuery = useQuery({
    queryKey: ['payroll-schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })

  const run = runQuery.data?.data as PayrollRun | undefined
  const schedules = ((schedulesQuery.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const allEmployees = (employeesQuery.data?.data ?? []) as Employee[]
  const runRecords = ((run?.payroll_records ?? []) as PayrollRecord[]).filter((record) =>
    isEmployeeOnPayrollRun(record.employees, run),
  )
  const runScheduleId = String(run?.schedule_id ?? run?.payroll_schedules?.id ?? '')

  const people = useMemo(() => {
    const scheduleByEmployee = new Map(
      allEmployees.map((employee) => [idOf(employee), scheduleIdOf(employee)]),
    )
    if (run) {
      return runRecords
        .map((record) => {
          const id = String(record.employees?.id ?? '')
          return {
            id,
            name: fullName(record.employees?.first_name, record.employees?.last_name),
            scheduleId: scheduleByEmployee.get(id) || scheduleIdOf(record.employees as Employee) || runScheduleId,
          }
        })
        .filter((person) => person.id)
    }
    return allEmployees
      .map((employee) => ({
        id: idOf(employee),
        name: fullName(employee.first_name, employee.last_name),
        scheduleId: scheduleIdOf(employee),
      }))
      .filter((person) => person.scheduleId)
  }, [run, runRecords, allEmployees, runScheduleId])

  const destinations = schedules.filter((schedule) => idOf(schedule) !== runScheduleId)
  const listPath = run ? payrollListPathFromRun(run) : '/payroll/runs'
  const backTo = preselect && runId ? `/payroll/runs/${runId}/records/${preselect}` : listPath
  const allSelected = people.length > 0 && selected.length === people.length

  useEffect(() => {
    if (people.length === 0) return
    if (preselect) {
      const record = runRecords.find((item) => idOf(item) === preselect)
      const employeeId = String(record?.employees?.id ?? '')
      setSelected(employeeId ? [employeeId] : people.map((person) => person.id))
      return
    }
    setSelected(people.map((person) => person.id))
  }, [people.length, preselect, runId])

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function onOk() {
    setError(null)
    setMessage(null)
    if (!companyId) return
    if (selected.length === 0) {
      setError('Select at least one employee.')
      return
    }
    if (!toScheduleId) {
      setError('Select the schedule to move them to.')
      return
    }
    const alreadyOn = selected.filter((id) => {
      const person = people.find((item) => item.id === id)
      return person?.scheduleId === toScheduleId
    })
    if (alreadyOn.length === selected.length) {
      setError('Those employees are already on that schedule.')
      return
    }
    setBusy(true)
    try {
      const result = await employeesApi.switchPaySchedule(companyId, {
        employee_ids: selected,
        to_schedule_id: toScheduleId,
      })
      setMessage(result.message)
      await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch payment schedule')
    } finally {
      setBusy(false)
    }
  }

  if ((runId && runQuery.isLoading) || employeesQuery.isLoading || schedulesQuery.isLoading) {
    return <Loading />
  }
  if (runId && !run) return <Alert>Payroll run not found</Alert>

  return (
    <div>
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp; More &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">Switch Schedule</span>
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(backTo, { state: preselect ? { from: listPath } : undefined })}
          className="flex max-w-3xl items-start gap-3 text-left text-[28px] font-semibold leading-tight text-navy xl:text-[32px] xl:leading-none"
        >
          <ChevronLeft size={25} strokeWidth={2.4} className="mt-1 shrink-0" />
          <span>Switch Employee(s) Payment Schedule</span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {runId ? (
            <>
              <PayrollImportMenu onUnavailable={setError} />
              <button type="button" className={toolbarBtn} onClick={() => navigate(`/payroll/runs/${runId}/reopen`)}>
                <RefreshCw size={16} />
                Reopen
              </button>
              <CreateSendMenu companyId={companyId!} runId={runId} />
              <button type="button" className={toolbarBtn} onClick={() => navigate('/payroll/runs')}>
                <SlidersHorizontal size={16} />
                Filter
              </button>
            </>
          ) : null}
          <PayrollSchedulesMenu />
          <PayrollMoreMenu
            runId={runId}
            recordId={preselect || undefined}
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

      <div className="mt-6 grid min-h-0 gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <h3 className="px-5 pt-5 text-base font-semibold text-navy">Select Employees</h3>
          <label className="mt-3 flex items-center gap-3 border-y border-[#d9d9d9] px-5 py-2 text-xs font-medium text-muted">
            <input
              type="checkbox"
              className="size-3.5 accent-navy"
              checked={allSelected}
              onChange={(event) => setSelected(event.target.checked ? people.map((person) => person.id) : [])}
            />
            Employee
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {people.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No employees are assigned to a payment schedule yet.</p>
            ) : (
              people.map((person) => {
                const current = schedules.find((schedule) => idOf(schedule) === person.scheduleId)
                return (
                  <label
                    key={person.id}
                    className="flex items-center gap-3 border-b border-[#eee] px-5 py-2.5 text-sm text-navy hover:bg-cream"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-navy"
                      checked={selected.includes(person.id)}
                      onChange={() => toggle(person.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{person.name === '—' ? 'Employee' : person.name}</span>
                    {current ? (
                      <span className="shrink-0 text-[11px] text-muted">{scheduleLabel(current, schedules)}</span>
                    ) : null}
                  </label>
                )
              })
            )}
          </div>
          <p className="border-t border-[#d9d9d9] px-5 py-3 text-xs font-medium text-muted">
            {selected.length} of {people.length} employees selected.
          </p>
        </section>

        <section className="flex min-h-[520px] flex-col rounded-[10px] border border-[#d9d9d9] bg-white p-6">
          <p className="text-sm font-semibold text-navy">Move to schedule</p>
          <p className="mt-2 max-w-[520px] text-sm text-navy/70">
            An employee can only be on one payment schedule. Draft payslips on the old schedule are removed.
            Finalised payslips stay as they were paid.
          </p>
          <label className="mt-5 block max-w-[320px]">
            <span className="mb-1.5 block text-xs font-medium text-navy">New payment schedule</span>
            <select
              className="h-[35px] w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] bg-white px-3 text-xs text-navy outline-none"
              value={toScheduleId}
              onChange={(event) => setToScheduleId(event.target.value)}
            >
              <option value="">Select</option>
              {destinations.map((schedule) => (
                <option key={idOf(schedule)} value={idOf(schedule)}>
                  {scheduleLabel(schedule, schedules)}
                </option>
              ))}
            </select>
          </label>
          {destinations.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Create another payment schedule first.</p>
          ) : null}
          <div className="mt-8 flex gap-2">
            <Button disabled={busy || destinations.length === 0} onClick={() => void onOk()}>
              {busy ? 'Switching…' : 'Switch schedule'}
            </Button>
            <Button variant="secondary" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

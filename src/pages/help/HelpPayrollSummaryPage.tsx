import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { helpApi } from '../../api'
import { Card, EmptyState, Field, Loading, Select, Stat } from '../../components/ui'
import { formatDate, money } from '../../lib/format'
import { HrTitle } from '../hr/HrChrome'

type SummaryPayload = {
  schedules: { id: string; schedule_name: string; pay_frequency: string }[]
  selected_schedule_id: string | null
  selected_date: string | null
  available_dates: string[]
  summary: {
    run_id: string
    schedule_name: string
    status: string
    pay_date: string
    period_start_date: string
    period_end_date: string
    employee_count: number
    total_gross: number
    total_tax: number
    total_employee_nic: number
    total_employer_nic: number
    total_employee_pension: number
    total_employer_pension: number
    total_net_pay: number
    total_take_home: number
    total_cost_to_employer: number
  } | null
}

export function HelpPayrollSummaryPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [scheduleId, setScheduleId] = useState('')
  const [date, setDate] = useState('')

  const query = useQuery({
    queryKey: ['help-payroll-summary', auth.companyId, scheduleId, date],
    queryFn: () => helpApi.payrollSummary(auth.companyId!, scheduleId || undefined, date || undefined),
    enabled: Boolean(auth.companyId),
  })

  const payload = query.data?.data as SummaryPayload | undefined
  const schedules = payload?.schedules ?? []
  const availableDates = payload?.available_dates ?? []
  const summary = payload?.summary ?? null

  const selectedSchedule = scheduleId || payload?.selected_schedule_id || ''
  const selectedDate = date || payload?.selected_date || ''

  const dateOptions = useMemo(() => {
    if (selectedDate && !availableDates.includes(selectedDate)) {
      return [selectedDate, ...availableDates]
    }
    return availableDates
  }, [availableDates, selectedDate])

  return (
    <div>
      <HrTitle title="Payroll summary" onBack={() => navigate('/help')} />
      <p className="mt-3 mb-6 text-sm text-muted">
        Bureau-approved analysis for a selected schedule and pay date.
      </p>
      <Card className="mb-6 grid gap-4 p-5 md:grid-cols-2">
        <Field label="Schedule">
          <Select
            value={selectedSchedule}
            onChange={(event) => {
              setScheduleId(event.target.value)
              setDate('')
            }}
          >
            {schedules.length === 0 ? <option value="">No schedules</option> : null}
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.schedule_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pay date">
          <Select
            value={selectedDate}
            onChange={(event) => setDate(event.target.value)}
            disabled={dateOptions.length === 0}
          >
            {dateOptions.length === 0 ? (
              <option value="">No approved payrolls</option>
            ) : null}
            {dateOptions.map((item) => (
              <option key={item} value={item}>
                {formatDate(item)}
              </option>
            ))}
          </Select>
        </Field>
      </Card>
      {query.isLoading ? <Loading /> : null}
      {!query.isLoading && !summary ? (
        <Card>
          <EmptyState
            title="No approved payroll"
            body="Once the bureau completes a payroll run for this schedule, the analysis will appear here."
          />
        </Card>
      ) : null}
      {summary ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {summary.schedule_name} · {formatDate(summary.period_start_date)} to{' '}
            {formatDate(summary.period_end_date)} · {summary.employee_count} employees ·{' '}
            {summary.status === 'LOCKED' ? 'Locked' : 'Completed'}
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="Gross pay" value={money(summary.total_gross)} />
            <Stat label="Tax" value={money(summary.total_tax)} />
            <Stat label="Employee NIC" value={money(summary.total_employee_nic)} />
            <Stat label="Employer NIC" value={money(summary.total_employer_nic)} />
            <Stat label="Employee pension" value={money(summary.total_employee_pension)} />
            <Stat label="Employer pension" value={money(summary.total_employer_pension)} />
            <Stat label="Net pay" value={money(summary.total_net_pay)} />
            <Stat label="Cost to employer" value={money(summary.total_cost_to_employer)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

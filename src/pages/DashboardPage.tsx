import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { employeesApi, hrApi, payrollApi, timesheetsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Loading } from '../components/ui'
import { PortalSwitchBanner } from '../components/PortalSwitcher'
import { BrandIcon } from '../components/BrandIcon'
import { formatPeriodRange, idOf, money } from '../lib/format'
import { taxYearStartFromDate } from '../lib/hmrcTaxCalendar'
import type { Employee, PayrollRecord, PayrollRun, PayrollSchedule } from '../types'
import type { TimesheetOverview } from './hr/timesheets/timesheetTypes'
import {
  FREQUENCY_META,
  asPayFrequency,
  dateKey,
  hmrcPeriodLabel,
  periodsFromSavedSchedule,
} from './payroll/scheduleWizard/payDateRules'
import { defaultPeriodKey, runScheduleId } from './payroll/PayslipPeriodSwitcher'
import iconEmployees from '../assets/brand/icon-employees.png'
import iconPayroll from '../assets/brand/icon-payroll.png'
import iconActivityCheck from '../assets/brand/icon-activity-check.png'
import iconActivityDoc from '../assets/brand/icon-activity-doc.png'
import iconTimesheets from '../assets/brand/icon-timesheets.png'
import iconActivityAlert from '../assets/brand/icon-activity-alert.png'

const SLICE_COLORS = {
  net: '#17375e',
  tax: '#d32027',
  employeeNic: '#3d5572',
  employeeNest: '#8a9bb0',
  employerNic: '#c5cdd6',
  employerNest: '#e8e4dc',
} as const

const cardClass = 'rounded-[26px] bg-white p-8'
const periodControl =
  'flex h-[38px] items-center gap-2 rounded-[8px] border border-[#d9d9d9] bg-white px-3 text-xs font-medium text-navy'

type PeriodOption = { key: string; label: string }

function taxYearLabel(taxYear: number) {
  return `Tax year ${taxYear}/${String(taxYear + 1).slice(-2)}`
}

function scheduleLabel(schedule: PayrollSchedule, all: PayrollSchedule[]) {
  const frequency = FREQUENCY_META[asPayFrequency(schedule.pay_frequency)].title
  const name = schedule.schedule_name?.trim()
  const duplicates = all.filter((item) => item.pay_frequency === schedule.pay_frequency).length > 1
  if (name && duplicates) return `${name} · ${frequency}`
  return name || frequency
}

function employeeScheduleId(employee: Employee) {
  const details = employee.employment_details
  const row = Array.isArray(details) ? details[0] : details
  if (!row || typeof row !== 'object') return ''
  return String((row as { pay_schedule_id?: unknown }).pay_schedule_id ?? '')
}

function displayName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(' ') || 'User Name'
}

function sumField(records: PayrollRecord[], key: keyof PayrollRecord) {
  return records.reduce((total, record) => total + Number(record[key] ?? 0), 0)
}

function isDarkSlice(color: string) {
  const value = color.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 150
}

type Slice = {
  label: string
  amount: number
  color: string
  pct: number
  start: number
}

function toSlices(records: PayrollRecord[]): { slices: Slice[]; gross: number } {
  const parts = [
    { label: 'Net Pay', amount: sumField(records, 'net_pay'), color: SLICE_COLORS.net },
    { label: 'Tax (PAYE)', amount: sumField(records, 'tax'), color: SLICE_COLORS.tax },
    { label: 'Employee NIC', amount: sumField(records, 'employee_nic'), color: SLICE_COLORS.employeeNic },
    { label: 'Employee NEST', amount: sumField(records, 'employee_pension'), color: SLICE_COLORS.employeeNest },
    { label: 'Employer NIC', amount: sumField(records, 'employer_nic'), color: SLICE_COLORS.employerNic },
    { label: 'Employer NEST', amount: sumField(records, 'employer_pension'), color: SLICE_COLORS.employerNest },
  ]
  const gross = sumField(records, 'gross_pay') || parts.reduce((total, part) => total + part.amount, 0)
  const basis = parts.reduce((total, part) => total + part.amount, 0) || 1
  let start = 0
  const slices = parts.map((part) => {
    const pct = (part.amount / basis) * 100
    const slice = { ...part, pct, start }
    start += pct
    return slice
  })
  return { slices, gross }
}

function donutBackground(slices: Slice[]) {
  const stops = slices.map((slice) => `${slice.color} ${slice.start}% ${slice.start + slice.pct}%`)
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

export function DashboardPage() {
  const auth = useAuth()
  const companyId = auth.companyId ?? ''
  const selectedCompany = auth.companies.find((company) => company.id === companyId)
  const greeting = `Welcome, ${displayName(auth.user?.first_name, auth.user?.last_name)}`
  const [scheduleId, setScheduleId] = useState('')
  const [periodKey, setPeriodKey] = useState('')

  const employees = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId),
    enabled: Boolean(companyId) && !auth.isEmployeeOnly,
  })
  const schedules = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId),
    enabled: Boolean(companyId) && auth.hasModule('PAYROLL') && !auth.isEmployeeOnly,
  })
  const runs = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId),
    enabled: Boolean(companyId) && auth.hasModule('PAYROLL') && !auth.isEmployeeOnly,
  })
  const compliance = useQuery({
    queryKey: ['compliance', companyId],
    queryFn: () => hrApi.compliance(companyId),
    enabled: Boolean(companyId) && auth.hasModule('HR') && !auth.isEmployeeOnly,
  })

  const payrollRuns = (runs.data?.data ?? []) as PayrollRun[]
  const scheduleList = ((schedules.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const selectedSchedule =
    scheduleList.find((schedule) => idOf(schedule) === scheduleId) ?? scheduleList[0]
  const selectedScheduleId = selectedSchedule ? idOf(selectedSchedule) : ''
  const schedulePreview = useMemo(
    () => (selectedSchedule ? periodsFromSavedSchedule(selectedSchedule) : null),
    [selectedSchedule],
  )
  const schedulePeriods = schedulePreview?.periods ?? []
  const currentTaxYear = schedulePreview?.taxYear ?? taxYearStartFromDate(new Date())

  const scheduleOptions = useMemo<PeriodOption[]>(
    () =>
      scheduleList.map((schedule) => ({
        key: idOf(schedule),
        label: scheduleLabel(schedule, scheduleList),
      })),
    [scheduleList],
  )
  const periodOptions = useMemo<PeriodOption[]>(
    () =>
      schedulePeriods.map((period) => ({
        key: String(period.number),
        label: `${formatPeriodRange(period.start, period.end)} (${hmrcPeriodLabel(selectedSchedule?.pay_frequency, period)})`,
      })),
    [schedulePeriods, selectedSchedule],
  )

  useEffect(() => {
    setScheduleId('')
    setPeriodKey('')
  }, [companyId])

  useEffect(() => {
    if (!selectedScheduleId) return
    if (scheduleId !== selectedScheduleId) setScheduleId(selectedScheduleId)
    if (!periodOptions.some((option) => option.key === periodKey)) {
      setPeriodKey(defaultPeriodKey(schedulePeriods, payrollRuns, selectedScheduleId))
    }
  }, [selectedScheduleId, scheduleId, periodOptions, periodKey, schedulePeriods, payrollRuns])

  const selectedSchedulePeriod =
    schedulePeriods.find((period) => String(period.number) === periodKey) ?? schedulePeriods[0]
  const periodIndex = Math.max(
    0,
    periodOptions.findIndex((option) => option.key === periodKey),
  )
  const periodFrom = selectedSchedulePeriod ? dateKey(selectedSchedulePeriod.start) : ''
  const periodTo = selectedSchedulePeriod ? dateKey(selectedSchedulePeriod.end) : ''

  const timesheets = useQuery({
    queryKey: ['dashboard-timesheets', companyId, periodFrom, periodTo],
    queryFn: () => timesheetsApi.overview(companyId, periodFrom, periodTo),
    enabled:
      Boolean(companyId && periodFrom && periodTo) &&
      auth.hasModule('HR') &&
      !auth.isEmployeeOnly,
  })

  const matchingRunIds = useMemo(() => {
    if (!selectedScheduleId || !periodKey) return []
    return payrollRuns
      .filter((run) => {
        if (runScheduleId(run) !== selectedScheduleId) return false
        if (String(run.period_number) === periodKey) return true
        const start = String(run.period_start_date ?? '').slice(0, 10)
        return Boolean(selectedSchedulePeriod && start === dateKey(selectedSchedulePeriod.start))
      })
      .map((run) => idOf(run))
  }, [payrollRuns, periodKey, selectedScheduleId, selectedSchedulePeriod])

  const breakdownQuery = useQuery({
    queryKey: ['dashboard-breakdown', companyId, selectedScheduleId, periodKey, matchingRunIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        matchingRunIds.map((runId) => payrollApi.getRun(companyId, runId)),
      )
      return results.flatMap((result) => ((result.data as PayrollRun).payroll_records ?? []) as PayrollRecord[])
    },
    enabled: Boolean(companyId && matchingRunIds.length),
  })

  if (auth.isEmployeeOnly) {
    return <Navigate to="/portal" replace />
  }

  const employeeCount = employees.data?.data.length ?? 0
  const employeeList = (employees.data?.data ?? []) as Employee[]
  const scheduleEmployeeIds = new Set(
    employeeList
      .filter((employee) => !selectedScheduleId || employeeScheduleId(employee) === selectedScheduleId)
      .map((employee) => idOf(employee)),
  )
  const scheduleRuns = payrollRuns.filter(
    (run) => !selectedScheduleId || runScheduleId(run) === selectedScheduleId,
  )
  const runsThisMonth = scheduleRuns.filter((run) => {
    const date = new Date(run.pay_date)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length
  const records = (breakdownQuery.data ?? []) as PayrollRecord[]
  const { slices, gross } = toSlices(records)
  const complianceList = (compliance.data?.data as Record<string, unknown>[] | undefined) ?? []
  const complianceIssues = complianceList.filter((item) => {
    if (String(item.status ?? '').toUpperCase() === 'APPROVED') return false
    if (!selectedScheduleId) return true
    const employeeId = String(
      item.employee_id ?? (item.employees as { id?: unknown } | undefined)?.id ?? '',
    )
    return scheduleEmployeeIds.has(employeeId)
  }).length
  const payrollsProcessed = scheduleRuns.length
  const payslipsDistributed = scheduleRuns.filter(
    (run) => run.status === 'LOCKED' || run.status === 'COMPLETED',
  ).length
  const timesheetRows =
    (timesheets.data?.data as TimesheetOverview | undefined)?.rows ?? []
  const timesheetsPending = timesheetRows.filter((row) => {
    if (selectedScheduleId && !scheduleEmployeeIds.has(row.employee.id)) return false
    return row.status === 'SUBMITTED' || row.status === 'DRAFT'
  }).length

  function changeSchedule(nextId: string) {
    const next = scheduleList.find((schedule) => idOf(schedule) === nextId)
    setScheduleId(nextId)
    if (!next) {
      setPeriodKey('')
      return
    }
    const periods = periodsFromSavedSchedule(next).periods
    setPeriodKey(defaultPeriodKey(periods, payrollRuns, nextId))
  }

  function shiftPeriod(direction: -1 | 1) {
    const next = periodOptions[periodIndex + direction]
    if (next) setPeriodKey(next.key)
  }

  const canGoPrevious = periodIndex > 0
  const canGoNext = periodIndex < periodOptions.length - 1
  const selectedPeriodLabel =
    periodOptions.find((option) => option.key === periodKey)?.label ?? 'Select period'
  const scheduleCaption = selectedSchedule
    ? `${scheduleLabel(selectedSchedule, scheduleList)} · ${taxYearLabel(currentTaxYear)}`
    : taxYearLabel(currentTaxYear)

  if (employees.isLoading || runs.isLoading || schedules.isLoading) return <Loading />

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-none text-navy">Dashboard</h1>
      <p className="mt-5 text-[22px] font-semibold text-navy">{greeting}</p>
      {selectedCompany?.name ? (
        <p className="mt-2 text-base font-semibold text-navy">{selectedCompany.name}</p>
      ) : null}
      <PortalSwitchBanner variant="admin" />

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,414px)]">
        <div className="grid gap-6">
          <section className={`${cardClass} min-h-[415px]`}>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-navy">Payroll Breakdown</h2>
                <p className="mt-1 text-sm font-medium text-muted">
                  {selectedCompany?.name ?? 'Select a company'}
                  {' · '}
                  {scheduleCaption}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {auth.adminCompanies.length > 1 ? (
                  <label className={`${periodControl} min-w-[160px]`}>
                    <select
                      className="w-full bg-transparent text-xs font-medium outline-none"
                      value={companyId}
                      onChange={(event) => auth.setCompanyId(event.target.value)}
                    >
                      {auth.adminCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {scheduleOptions.length > 0 ? (
                  <label className={`${periodControl} min-w-[160px] max-w-[220px]`}>
                    <select
                      className="w-full bg-transparent text-xs font-medium outline-none"
                      value={selectedScheduleId}
                      onChange={(event) => changeSchedule(event.target.value)}
                    >
                      {scheduleOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button
                  type="button"
                  aria-label="Previous period"
                  disabled={!canGoPrevious}
                  onClick={() => shiftPeriod(-1)}
                  className="flex size-[38px] items-center justify-center rounded-[8px] border border-[#d9d9d9] bg-white text-navy disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <label className={`${periodControl} min-w-[280px] max-w-[420px]`}>
                  <CalendarDays size={16} className="shrink-0" />
                  <select
                    className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
                    value={periodKey}
                    disabled={periodOptions.length === 0}
                    onChange={(event) => setPeriodKey(event.target.value)}
                  >
                    {periodOptions.length === 0 ? (
                      <option value="">{selectedSchedule ? 'No periods' : 'No schedule'}</option>
                    ) : (
                      periodOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label="Next period"
                  disabled={!canGoNext}
                  onClick={() => shiftPeriod(1)}
                  className="flex size-[38px] items-center justify-center rounded-[8px] border border-[#d9d9d9] bg-white text-navy disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-10 lg:justify-between">
              <div className="relative size-[260px] shrink-0">
                <div
                  className="size-full rounded-full"
                  style={{
                    background: gross ? donutBackground(slices) : '#e8e4dc',
                  }}
                />
                <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-[22px] font-semibold text-navy">{money(gross)}</p>
                  <p className="text-sm font-medium text-muted">Gross Pay</p>
                </div>
                {gross
                  ? slices.map((slice) => {
                      if (slice.pct < 3) return null
                      const angle = ((slice.start + slice.pct / 2) / 100) * 2 * Math.PI - Math.PI / 2
                      const radius = 88
                      return (
                        <span
                          key={slice.label}
                          className="pointer-events-none absolute text-[11px] font-semibold"
                          style={{
                            left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                            top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                            color: isDarkSlice(slice.color) ? '#ffffff' : '#17375e',
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {slice.pct.toFixed(1)}%
                        </span>
                      )
                    })
                  : null}
              </div>
              <ul className="min-w-[250px] flex-1">
                {slices.map((slice, index) => (
                  <li
                    key={slice.label}
                    className={`flex items-center gap-3 py-2.5 text-sm ${
                      index < slices.length - 1 ? 'border-b border-[#d9d9d9]' : ''
                    }`}
                  >
                    <span className="size-6 shrink-0 rounded-full" style={{ background: slice.color }} />
                    <span className="flex-1 font-medium text-navy">{slice.label}</span>
                    <span className="font-semibold text-navy">{money(slice.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {breakdownQuery.isFetching ? (
              <p className="mt-4 text-xs font-medium text-muted">Loading figures for this company…</p>
            ) : scheduleList.length === 0 ? (
              <p className="mt-4 text-xs font-medium text-muted">
                No payroll schedule for {selectedCompany?.name ?? 'the selected company'}.
              </p>
            ) : matchingRunIds.length === 0 ? (
              <p className="mt-4 text-xs font-medium text-muted">
                No payroll run for {selectedPeriodLabel} on{' '}
                {selectedSchedule ? scheduleLabel(selectedSchedule, scheduleList) : 'this schedule'} in{' '}
                {selectedCompany?.name ?? 'the selected company'}.
              </p>
            ) : null}
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className={`${cardClass} flex min-h-[254px] flex-col`}>
              <span className="flex size-14 items-center justify-center rounded-full bg-navy">
                <BrandIcon src={iconEmployees} alt="" className="size-8" tone="navy" />
              </span>
              <p className="mt-6 text-[32px] font-semibold leading-none text-navy">{employeeCount}</p>
              <p className="mt-1 text-sm font-semibold text-navy">Total Employees</p>
              <Link to="/employees" className="mt-auto pt-8 text-sm font-semibold text-brand">
                View Employees →
              </Link>
            </section>
            <section className={`${cardClass} flex min-h-[254px] flex-col`}>
              <span className="flex size-14 items-center justify-center rounded-full bg-navy">
                <BrandIcon src={iconPayroll} alt="" className="size-8" tone="navy" />
              </span>
              <p className="mt-6 text-[32px] font-semibold leading-none text-navy">{runsThisMonth}</p>
              <p className="mt-1 text-sm font-semibold text-navy">Payroll This Month</p>
              {auth.isCompanyAdmin ? (
                <span className="mt-auto pt-8 text-sm font-semibold text-muted">This company</span>
              ) : (
                <Link to="/payroll/runs" className="mt-auto pt-8 text-sm font-semibold text-brand">
                  View Payroll →
                </Link>
              )}
            </section>
          </div>
        </div>

        <div className="grid gap-6">
          <section className={`${cardClass} min-h-[415px]`}>
            <h2 className="text-xl font-semibold text-navy">Payroll Activity</h2>
            <p className="mt-1 text-sm font-medium text-muted">
              {selectedSchedule
                ? `Overview for ${scheduleLabel(selectedSchedule, scheduleList)}`
                : 'Overview of dashboard activity'}
            </p>
            <div className="mt-5 divide-y divide-[#d9d9d9]">
              {[
                {
                  label: 'Payrolls Processed',
                  value: payrollsProcessed,
                  to: auth.isCompanyAdmin ? '/payroll/reports' : '/payroll/runs',
                  icon: iconActivityCheck,
                  circle: '#17375e',
                },
                {
                  label: 'Payslips Distributed',
                  value: payslipsDistributed,
                  to: auth.isCompanyAdmin ? '/payroll/reports' : '/payroll/payslips',
                  icon: iconActivityDoc,
                  circle: '#9b9a9a',
                },
                {
                  label: 'Timesheets Pending',
                  value: timesheetsPending,
                  to: '/timesheets',
                  icon: iconTimesheets,
                  circle: '#3d5572',
                },
                {
                  label: 'Compliance Issues',
                  value: complianceIssues,
                  to: '/hr/compliance',
                  icon: iconActivityAlert,
                  circle: '#d32027',
                },
              ].map((row) => (
                <Link key={row.label} to={row.to} className="flex items-center gap-3 py-4">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: row.circle }}
                  >
                    <BrandIcon src={row.icon} alt="" className="size-5" tone="navy" />
                  </span>
                  <span className="text-[19px] font-semibold text-navy">{row.value}</span>
                  <span className="flex-1 text-sm font-semibold text-navy">{row.label}</span>
                  <span className="text-lg font-semibold text-navy">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-navy">Quick Actions</h2>
            <div className="mt-4 divide-y divide-[#d9d9d9]">
              {[
                ['Add New Client', '/companies/new'],
                ['Invoices', '/payroll/invoices'],
                ['Support', '/help'],
                ['Track Activities', '/activities'],
              ]
                .filter(([, to]) => {
                  if (to === '/activities') return auth.isBureauAdmin
                  if (to === '/companies/new') return auth.canManageOrganizations
                  return true
                })
                .map(([label, to]) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center justify-between py-3 text-sm font-semibold text-navy"
                >
                  {label}
                  <span>→</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

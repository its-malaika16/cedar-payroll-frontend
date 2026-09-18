import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { employeesApi, payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, Loading } from '../../components/ui'
import { idOf, money } from '../../lib/format'
import { taxMonthFromDate, taxWeekEndDate } from '../../lib/hmrcTaxCalendar'
import type { Employee, PayrollRecord, PayrollRun, PayrollSchedule, PensionAssessment } from '../../types'
import { EMPLOYEE_PERIOD_DEFAULT, readReportDraft, writeReportDraft } from './employeeDetailsState'
import { employeeFieldValue } from './employeeDetailsValues'
import { HmrcPreviewPage } from './HmrcPreviewPage'
import { mergePayrollRecords, payrollSummaryFieldValue } from './payrollSummaryValues'
import { pensionReportFieldValue } from './pensionsValues'
import { isSchedulePeriodMode, periodGrain, reportPeriodHeading, scheduleIdFromMode, selectedRangeValue } from './periodSelection'
import { recordPreviousReport, updatePreviousReport } from './previousReports'
import { isHmrcKind, specFor, usesPayrollRecords, type AnalysisBuilderKind } from './reportSpecs'
import { downloadCsv, downloadReportPdf, ReportExportMenu, reportFileSlug } from './reportExport'
import { ytdFieldValue } from './ytdValues'

function parseAmount(value: string) {
  if (!value || value === '—') return null
  const amount = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isNaN(amount) ? null : amount
}

export function ReportPreviewPage({ kind }: { kind: AnalysisBuilderKind }) {
  if (isHmrcKind(kind)) return <HmrcPreviewPage kind={kind} />
  return <EmployeeReportPreviewPage kind={kind} />
}

function EmployeeReportPreviewPage({ kind }: { kind: AnalysisBuilderKind }) {
  const spec = specFor(kind)
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const draft = readReportDraft(
    kind,
    spec?.defaultName ?? '',
    spec?.defaultFieldIds,
    spec?.periodModes?.[0] ?? EMPLOYEE_PERIOD_DEFAULT,
  )
  const [notice, setNotice] = useState<string | null>(null)
  const payrollEnabled = usesPayrollRecords(kind)

  const peopleQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const payrollSchedules = ((schedulesQuery.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const grain = periodGrain(draft, payrollSchedules)
  const selectedScheduleId = isSchedulePeriodMode(draft.periodMode)
    ? draft.scheduleId || scheduleIdFromMode(draft.periodMode)
    : ''
  const detailsQuery = useQuery({
    queryKey: ['report-employee-details', companyId, draft.selectedEmployeeIds.join(',')],
    queryFn: async () => {
      const rows = await Promise.all(
        draft.selectedEmployeeIds.map((employeeId) => employeesApi.get(companyId!, employeeId)),
      )
      return rows.map((row) => row.data as Employee)
    },
    enabled: Boolean(companyId && draft.selectedEmployeeIds.length),
  })
  const runsQuery = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId) && payrollEnabled,
  })
  const recordsQuery = useQuery({
    queryKey: [
      'report-payroll-records',
      kind,
      companyId,
      grain,
      selectedScheduleId,
      draft.taxYear,
      draft.fromYear,
      draft.fromWeek,
      draft.toWeek,
      draft.fromMonth,
      draft.toMonth,
    ],
    queryFn: async () => {
      const runs = (runsQuery.data?.data ?? []) as PayrollRun[]
      const matching = runs.filter((run) => {
        if (isSchedulePeriodMode(draft.periodMode)) {
          if (selectedScheduleId && String(run.schedule_id) !== selectedScheduleId) return false
          const period = Number(run.period_number)
          const from = selectedRangeValue(draft, grain, 'from')
          const to = selectedRangeValue(draft, grain, 'to')
          const lo = Math.min(Number(from), Number(to))
          const hi = Math.max(Number(from), Number(to))
          if (kind === 'ytd-summary') return period >= 1 && period <= hi
          return period >= lo && period <= hi
        }
        const year = Number(run.tax_year_start)
        if (grain === 'year') {
          const from = Math.min(draft.fromYear ?? draft.taxYear, draft.taxYear)
          const to = Math.max(draft.fromYear ?? draft.taxYear, draft.taxYear)
          return year >= from && year <= to
        }
        if (year !== draft.taxYear) return false
        if (grain === 'months') {
          const month = Number(
            run.tax_month ?? taxMonthFromDate(taxWeekEndDate(year, Number(run.tax_week ?? 1))),
          )
          const lo = Math.min(draft.fromMonth ?? 1, draft.toMonth ?? 1)
          const hi = Math.max(draft.fromMonth ?? 1, draft.toMonth ?? 1)
          return month >= lo && month <= hi
        }
        const week = Number(run.tax_week ?? 0)
        const hi = Math.max(draft.fromWeek, draft.toWeek)
        if (kind === 'ytd-summary') return week >= 1 && week <= hi
        const lo = Math.min(draft.fromWeek, draft.toWeek)
        return week >= lo && week <= hi
      })
      const details = await Promise.all(matching.map((run) => payrollApi.getRun(companyId!, idOf(run))))
      return details.flatMap((item) => (item.data as PayrollRun).payroll_records ?? [])
    },
    enabled: Boolean(companyId) && payrollEnabled && Boolean(runsQuery.data),
  })
  const pensionAssessQuery = useQuery({
    queryKey: ['report-pension-assess', companyId, draft.selectedEmployeeIds.join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        draft.selectedEmployeeIds.map(async (employeeId) => {
          try {
            const result = await employeesApi.assessPension(companyId!, employeeId)
            return [employeeId, result.data as PensionAssessment] as const
          } catch {
            return [employeeId, undefined] as const
          }
        }),
      )
      return Object.fromEntries(entries) as Record<string, PensionAssessment | undefined>
    },
    enabled: Boolean(companyId) && kind === 'pensions' && draft.selectedEmployeeIds.length > 0,
  })

  const columns = useMemo(
    () =>
      draft.selectedFieldIds
        .map((id) => spec?.fields.find((field) => field.id === id))
        .filter(Boolean) as { id: string; label: string }[],
    [draft.selectedFieldIds, spec],
  )
  const employees = detailsQuery.data ?? []
  const records = (recordsQuery.data ?? []) as PayrollRecord[]
  const stickyId = columns.some((column) => column.id === 'name') ? 'name' : columns[0]?.id

  if (!spec) return <Navigate to="/payroll/reports" replace />
  if (!draft.selectedFieldIds.length) return <Navigate to={`/payroll/reports/${kind}`} replace />

  const periodLabel = reportPeriodHeading(draft, grain)

  function cellValue(employee: Employee, fieldId: string) {
    const forEmployee = records.filter((record) => String(record.employee_id) === idOf(employee))
    const merged = mergePayrollRecords(forEmployee)
    if (kind === 'payroll-summary' || kind === 'notes' || kind === 'additions' || kind === 'deductions') {
      if (fieldId.startsWith('ad_') || fieldId.startsWith('tot_') || fieldId.startsWith('oth_') || fieldId.startsWith('earn_') || fieldId.startsWith('ea_') || fieldId.startsWith('ed_') || fieldId.startsWith('stat_') || fieldId.startsWith('ben_')) {
        return payrollSummaryFieldValue(employee, merged, fieldId)
      }
      return employeeFieldValue(employee, fieldId)
    }
    if (kind === 'pensions') {
      return pensionReportFieldValue(
        employee,
        merged,
        pensionAssessQuery.data?.[idOf(employee)],
        fieldId,
      )
    }
    if (kind === 'ytd-summary') {
      return ytdFieldValue(employee, merged, fieldId)
    }
    return employeeFieldValue(employee, fieldId)
  }

  function columnTotal(fieldId: string) {
    let sum = 0
    let countable = false
    for (const employee of employees) {
      const amount = parseAmount(cellValue(employee, fieldId))
      if (amount == null) continue
      countable = true
      sum += amount
    }
    return countable ? money(sum) : null
  }

  function persist(published?: boolean) {
    if (!companyId) return
    const payload = { ...draft, kind }
    if (draft.savedReportId) {
      updatePreviousReport(companyId, draft.savedReportId, {
        name: draft.reportName,
        published,
        payload,
        generatedAt: new Date().toISOString(),
      })
      setNotice(published ? 'Report published.' : 'Report saved.')
      return
    }
    const saved = recordPreviousReport(companyId, kind, {
      name: draft.reportName,
      payload,
      published,
    })
    writeReportDraft({ ...payload, savedReportId: saved.id })
    setNotice(published ? 'Report published.' : 'Report saved.')
  }

  function exportRows() {
    const header = columns.map((column) => column.label)
    const lines = employees.map((employee) => columns.map((column) => cellValue(employee, column.id)))
    if (spec.showTotalsRow) {
      lines.push(columns.map((column, index) => (index === 0 ? 'Total' : columnTotal(column.id) ?? '')))
    }
    return { header, lines }
  }

  function exportCsv() {
    const { header, lines } = exportRows()
    downloadCsv(reportFileSlug(draft.reportName), [header, ...lines])
  }

  function exportPdf() {
    const { header, lines } = exportRows()
    downloadReportPdf({
      filename: reportFileSlug(draft.reportName),
      title: draft.reportName || spec.title,
      subtitle: periodLabel,
      sections: [{ headers: header, rows: lines }],
    })
  }

  const loading =
    peopleQuery.isLoading ||
    detailsQuery.isLoading ||
    (payrollEnabled && (runsQuery.isLoading || recordsQuery.isLoading)) ||
    (kind === 'pensions' && pensionAssessQuery.isLoading)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-6">
      <p className="mb-3 text-sm text-muted">
        <Link to="/payroll/reports" className="hover:text-navy">
          Analysis
        </Link>
        <span> &gt; </span>
        <Link to={`/payroll/reports/${kind}`} className="hover:text-navy">
          {spec.generateCrumb}
        </Link>
        <span> &gt; </span>
        <span className="font-semibold text-navy">Report Preview</span>
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(`/payroll/reports/${kind}`)} aria-label="Back">
            <ArrowLeft size={22} className="text-navy" />
          </button>
          <h1 className="text-[32px] font-semibold leading-none text-navy">{draft.reportName || spec.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => persist(false)}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/payroll/reports/${kind}`)}>
            Edit
          </Button>
          <ReportExportMenu onCsv={exportCsv} onPdf={exportPdf} disabled={loading || employees.length === 0} />
          <Button onClick={() => persist(true)}>Publish Report</Button>
        </div>
      </div>
      {notice ? (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-[#eceae6] px-5 py-3 text-sm font-semibold text-navy">{periodLabel}</div>
        {loading ? (
          <Loading />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-max min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#eceae6]">
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`min-w-[140px] max-w-[220px] bg-white px-4 py-3 font-semibold text-navy ${
                        column.id === stickyId ? 'sticky left-0 z-10 shadow-[2px_0_0_#eceae6]' : ''
                      }`}
                    >
                      <span className="block whitespace-normal leading-5">{column.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={idOf(employee)} className="border-b border-[#f3f1ec] last:border-b-0">
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`min-w-[140px] bg-white px-4 py-3 text-navy ${
                          column.id === stickyId ? 'sticky left-0 z-10 shadow-[2px_0_0_#eceae6]' : ''
                        }`}
                      >
                        {cellValue(employee, column.id)}
                      </td>
                    ))}
                  </tr>
                ))}
                {spec.showTotalsRow ? (
                  <tr className="border-t border-[#eceae6] bg-[#f8f7f4] font-semibold">
                    {columns.map((column, index) => (
                      <td
                        key={column.id}
                        className={`min-w-[140px] px-4 py-3 text-navy ${
                          column.id === stickyId ? 'sticky left-0 z-10 bg-[#f8f7f4] shadow-[2px_0_0_#eceae6]' : ''
                        }`}
                      >
                        {index === 0 ? 'Total' : columnTotal(column.id) ?? ''}
                      </td>
                    ))}
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

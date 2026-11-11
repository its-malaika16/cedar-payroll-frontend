import { Fragment, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { employeesApi, payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, Loading } from '../../components/ui'
import { idOf, money } from '../../lib/format'
import type { Employee, PayrollRecord, PayrollRun, PayrollSchedule, PensionAssessment } from '../../types'
import { EMPLOYEE_PERIOD_DEFAULT, readReportDraft, writeReportDraft } from './employeeDetailsState'
import { employeeFieldValue } from './employeeDetailsValues'
import { HmrcPreviewPage } from './HmrcPreviewPage'
import { mergePayrollRecords, payrollSummaryFieldValue } from './payrollSummaryValues'
import { pensionReportFieldValue } from './pensionsValues'
import {
  employeesFromFinalisedRuns,
  finalisedRunsInRange,
  isFinalisedPayrollRecord,
  runPeriodEnd,
  runPeriodNumber,
} from './finalisedPayroll'
import {
  isSchedulePeriodMode,
  periodBlockHeading,
  periodGrain,
  periodRangeSummaryHeading,
  rangeNoun,
  reportPeriodHeading,
  scheduleIdFromMode,
} from './periodSelection'
import { recordPreviousReport, updatePreviousReport } from './previousReports'
import { isHmrcKind, specFor, usesPayrollRecords, type AnalysisBuilderKind } from './reportSpecs'
import { downloadCsv, downloadReportPdf, ReportExportMenu, reportFileSlug } from './reportExport'
import { ytdFieldValue } from './ytdValues'

function parseAmount(value: string) {
  if (!value || value === '—') return null
  const trimmed = value.trim()
  const compact = trimmed.replace(/\s/g, '')
  const moneyLike = /^£?-?[0-9,]+(\.[0-9]+)?$/.test(compact)
  const numberLike = /^-?[0-9]+(\.[0-9]+)?$/.test(trimmed)
  if (!moneyLike && !numberLike) return null
  const amount = Number(trimmed.replace(/[£,\s]/g, ''))
  return Number.isNaN(amount) ? null : amount
}

function formatColumnTotal(sum: number, asMoney: boolean) {
  if (asMoney) return money(sum)
  const rounded = Math.round(sum * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export function ReportPreviewPage({ kind }: { kind: AnalysisBuilderKind }) {
  if (isHmrcKind(kind)) return <HmrcPreviewPage kind={kind} />
  return <EmployeeReportPreviewPage kind={kind} />
}

function EmployeeReportPreviewPage({ kind }: { kind: AnalysisBuilderKind }) {
  const spec = specFor(kind)
  const { companyId, isCompanyAdmin } = useAuth()
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
      draft.periodMode,
      draft.taxYear,
      draft.fromYear,
      draft.fromWeek,
      draft.toWeek,
      draft.fromMonth,
      draft.toMonth,
    ],
    queryFn: async () => {
      const matching = finalisedRunsInRange(
        (runsQuery.data?.data ?? []) as PayrollRun[],
        draft,
        grain,
        selectedScheduleId,
        kind,
      )
      const details = await Promise.all(matching.map((run) => payrollApi.getRun(companyId!, idOf(run))))
      return details.map((item) => item.data as PayrollRun)
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
  const payrollRuns = ((recordsQuery.data ?? []) as PayrollRun[]).slice().sort((left, right) => {
    const year = Number(left.tax_year_start) - Number(right.tax_year_start)
    if (year !== 0) return year
    return Number(left.period_number) - Number(right.period_number)
  })
  const records = payrollRuns.flatMap((run) =>
    (run.payroll_records ?? []).filter(isFinalisedPayrollRecord),
  )
  const selectedIds = new Set(draft.selectedEmployeeIds)
  const payrollPeople = employeesFromFinalisedRuns(payrollRuns, companyId ?? '')
  const employees = (detailsQuery.data ?? []).filter((employee) => selectedIds.has(idOf(employee)))
  const reportEmployees =
    payrollEnabled && payrollPeople.length > 0
      ? employees.filter((employee) => payrollPeople.some((person) => idOf(person) === idOf(employee)))
      : employees
  const taxPeriod = draft.periodMode.startsWith('tax-')
  const periodNoun = rangeNoun(grain, taxPeriod, payrollRuns[0]?.pay_frequency)
  const periodBlocks = payrollRuns.map((run) => ({
    number: runPeriodNumber(run, grain, taxPeriod),
    end: runPeriodEnd(run),
    records: (run.payroll_records ?? []).filter(
      (record) => isFinalisedPayrollRecord(record) && selectedIds.has(String(record.employee_id)),
    ),
  }))
  const grouped = payrollEnabled && kind !== 'ytd-summary' && periodBlocks.length > 1
  const stickyId = columns.some((column) => column.id === 'name') ? 'name' : columns[0]?.id

  if (!spec) return <Navigate to="/payroll/reports" replace />
  if (isCompanyAdmin && !draft.savedReportId) return <Navigate to="/payroll/reports" replace />
  if (!draft.selectedFieldIds.length) {
    return <Navigate to={isCompanyAdmin ? '/payroll/reports' : `/payroll/reports/${kind}`} replace />
  }

  const periodLabel =
    grouped && periodBlocks.length > 1
      ? periodRangeSummaryHeading(periodNoun, periodBlocks[0].number, periodBlocks[periodBlocks.length - 1].number)
      : periodBlocks.length === 1
        ? periodBlockHeading(periodNoun, periodBlocks[0].number, periodBlocks[0].end)
        : reportPeriodHeading(draft, grain, payrollRuns[0]?.pay_frequency)

  function employeesForRecords(source: PayrollRecord[]) {
    const ids = new Set(source.map((record) => String(record.employee_id)))
    return reportEmployees.filter((employee) => ids.has(idOf(employee)))
  }

  function cellValue(employee: Employee, fieldId: string, sourceRecords = records) {
    const forEmployee = sourceRecords.filter((record) => String(record.employee_id) === idOf(employee))
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

  function columnTotal(fieldId: string, people = reportEmployees, sourceRecords = records) {
    let sum = 0
    let countable = false
    let asMoney = false
    for (const employee of people) {
      const value = cellValue(employee, fieldId, sourceRecords)
      const amount = parseAmount(value)
      if (amount == null) continue
      countable = true
      if (value.includes('£')) asMoney = true
      sum += amount
    }
    return countable ? formatColumnTotal(sum, asMoney) : ''
  }

  async function persist(published?: boolean) {
    if (!companyId || isCompanyAdmin) return
    const payload = { ...draft, kind }
    try {
      if (draft.savedReportId) {
        await updatePreviousReport(companyId, draft.savedReportId, {
          name: draft.reportName,
          published,
          payload,
          generatedAt: new Date().toISOString(),
        })
      } else {
        const saved = await recordPreviousReport(companyId, kind, {
          name: draft.reportName,
          payload,
          published,
        })
        writeReportDraft({ ...payload, savedReportId: saved.id })
      }
      setNotice(published ? 'Report published.' : 'Report saved.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save this report')
    }
  }

  function tableRows(people: Employee[], sourceRecords: PayrollRecord[]) {
    const lines = people.map((employee) =>
      columns.map((column) => cellValue(employee, column.id, sourceRecords)),
    )
    if (spec?.showTotalsRow) {
      lines.push(
        columns.map((column, index) =>
          index === 0 ? 'TOTAL' : columnTotal(column.id, people, sourceRecords),
        ),
      )
    }
    return lines
  }

  function exportSections() {
    const header = columns.map((column) => column.label)
    if (!grouped) {
      return [{ heading: periodLabel, headers: header, rows: tableRows(reportEmployees, records) }]
    }
    const sections = periodBlocks
      .filter((block) => block.records.length > 0)
      .map((block) => {
        const people = employeesForRecords(block.records)
        return {
          heading: periodBlockHeading(periodNoun, block.number, block.end),
          headers: header,
          rows: tableRows(people, block.records),
        }
      })
    sections.push({
      heading: periodRangeSummaryHeading(
        periodNoun,
        periodBlocks[0].number,
        periodBlocks[periodBlocks.length - 1].number,
      ),
      headers: header,
      rows: tableRows(reportEmployees, records),
    })
    return sections
  }

  function exportCsv() {
    const sections = exportSections()
    const lines: string[][] = []
    for (const section of sections) {
      if (lines.length) lines.push([])
      if (section.heading) lines.push([section.heading])
      lines.push(section.headers)
      lines.push(...section.rows)
    }
    downloadCsv(reportFileSlug(draft.reportName), lines)
  }

  function exportPdf() {
    downloadReportPdf({
      filename: reportFileSlug(draft.reportName),
      title: draft.reportName || spec?.title || 'Report',
      subtitle: grouped ? undefined : periodLabel,
      sections: exportSections(),
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
        {isCompanyAdmin ? (
          <span className="font-semibold text-navy">Published report</span>
        ) : (
          <>
            <Link to={`/payroll/reports/${kind}`} className="hover:text-navy">
              {spec?.generateCrumb}
            </Link>
            <span> &gt; </span>
            <span className="font-semibold text-navy">Report Preview</span>
          </>
        )}
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(isCompanyAdmin ? '/payroll/reports' : `/payroll/reports/${kind}`)}
            aria-label="Back"
          >
            <ArrowLeft size={22} className="text-navy" />
          </button>
          <h1 className="text-[32px] font-semibold leading-none text-navy">{draft.reportName || spec?.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isCompanyAdmin ? null : (
            <>
              <Button variant="secondary" onClick={() => void persist(false)}>
                Save
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/payroll/reports/${kind}`)}>
                Edit
              </Button>
            </>
          )}
          <ReportExportMenu onCsv={exportCsv} onPdf={exportPdf} disabled={loading || reportEmployees.length === 0} />
          {isCompanyAdmin ? null : <Button onClick={() => void persist(true)}>Publish Report</Button>}
        </div>
      </div>
      {notice ? (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {grouped ? null : (
          <div className="border-b border-[#eceae6] px-5 py-3 text-sm font-semibold text-navy">{periodLabel}</div>
        )}
        {loading ? (
          <Loading />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-max min-w-full text-left text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-[#eceae6]">
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`min-w-[140px] max-w-[220px] bg-white px-4 py-3 font-semibold text-navy ${
                        column.id === stickyId ? 'sticky left-0 z-30 shadow-[2px_0_0_#eceae6]' : ''
                      }`}
                    >
                      <span className="block whitespace-normal leading-5">{column.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped
                  ? periodBlocks
                      .filter((block) => block.records.length > 0)
                      .map((block) => {
                        const people = employeesForRecords(block.records)
                        return (
                          <Fragment key={`${block.number}-${block.end.toISOString()}`}>
                            <tr className="border-b border-[#eceae6]">
                              <td
                                colSpan={columns.length}
                                className="sticky left-0 bg-[#eef3f8] px-4 py-2.5 font-semibold text-navy"
                              >
                                {periodBlockHeading(periodNoun, block.number, block.end)}
                              </td>
                            </tr>
                            {people.map((employee) => (
                              <tr key={`${block.number}-${idOf(employee)}`} className="border-b border-[#f3f1ec]">
                                {columns.map((column) => (
                                  <td
                                    key={column.id}
                                    className={`min-w-[140px] bg-white px-4 py-3 text-navy ${
                                      column.id === stickyId ? 'sticky left-0 z-10 shadow-[2px_0_0_#eceae6]' : ''
                                    }`}
                                  >
                                    {cellValue(employee, column.id, block.records)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {spec?.showTotalsRow ? (
                              <tr className="border-b-2 border-[#d9d9d9] bg-[#f8f7f4] font-semibold">
                                {columns.map((column, index) => (
                                  <td
                                    key={column.id}
                                    className={`min-w-[140px] bg-[#f8f7f4] px-4 py-3 text-navy ${
                                      column.id === stickyId ? 'sticky left-0 z-10 shadow-[2px_0_0_#eceae6]' : ''
                                    }`}
                                  >
                                    {index === 0 ? 'TOTAL' : columnTotal(column.id, people, block.records)}
                                  </td>
                                ))}
                              </tr>
                            ) : null}
                          </Fragment>
                        )
                      })
                  : reportEmployees.map((employee) => (
                      <tr key={idOf(employee)} className="border-b border-[#f3f1ec]">
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
                {grouped ? (
                  <>
                    <tr className="border-b border-[#eceae6]">
                      <td
                        colSpan={columns.length}
                        className="sticky left-0 bg-[#eef3f8] px-4 py-2.5 font-semibold text-navy"
                      >
                        {periodRangeSummaryHeading(
                          periodNoun,
                          periodBlocks[0].number,
                          periodBlocks[periodBlocks.length - 1].number,
                        )}
                      </td>
                    </tr>
                    {reportEmployees.map((employee) => (
                      <tr key={`summary-${idOf(employee)}`} className="border-b border-[#f3f1ec]">
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
                  </>
                ) : null}
              </tbody>
              {spec?.showTotalsRow ? (
                <tfoot className="sticky bottom-0 z-20">
                  <tr className="border-t-2 border-[#d9d9d9] bg-[#f8f7f4] font-semibold shadow-[0_-4px_10px_rgba(23,55,94,0.06)]">
                    {columns.map((column, index) => (
                      <td
                        key={column.id}
                        className={`min-w-[140px] bg-[#f8f7f4] px-4 py-3 text-navy ${
                          column.id === stickyId ? 'sticky left-0 z-30 shadow-[2px_0_0_#eceae6]' : ''
                        }`}
                      >
                        {index === 0 ? 'TOTAL' : columnTotal(column.id)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

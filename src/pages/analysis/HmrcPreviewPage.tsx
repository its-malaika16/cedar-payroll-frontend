import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { payrollApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card, EmptyState, Loading } from '../../components/ui'
import { idOf } from '../../lib/format'
import type { PayrollRecord, PayrollRun } from '../../types'
import { readReportDraft, writeReportDraft } from './employeeDetailsState'
import type { HmrcSchedule } from './hmrcFields'
import { generateHmrcPeriods, hmrcYears, summaryHeading, yearHeading } from './hmrcPeriods'
import { buildHmrcRows, hmrcCell, hmrcTotalCell, type HmrcRow } from './hmrcValues'
import { recordPreviousReport, updatePreviousReport } from './previousReports'
import { specFor, type AnalysisBuilderKind } from './reportSpecs'
import { downloadCsv, downloadReportPdf, ReportExportMenu, reportFileSlug } from './reportExport'

function TableBlock({
  title,
  columns,
  rows,
  stickyId,
  empty,
}: {
  title: string
  columns: { id: string; label: string }[]
  rows: HmrcRow[]
  stickyId?: string
  empty?: boolean
}) {
  return (
    <div className="border-b border-[#eceae6] last:border-b-0">
      <div className="px-5 py-3 text-sm font-semibold text-navy">{title}</div>
      {empty || rows.length === 0 ? (
        <div className="px-5 pb-6">
          <EmptyState title="No HMRC payment data" body="There is no payroll data for this tax year." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-max min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#eceae6]">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={`min-w-[140px] max-w-[220px] bg-white px-4 py-3 font-semibold text-navy ${
                      column.id === stickyId ? 'sticky left-0 z-10 shadow-[2px_0_0_#eceae6]' : ''
                    } ${column.id === 'tax_period_ending' ? '' : 'text-right'}`}
                  >
                    <span className="block whitespace-normal leading-5">{column.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.period.id} className="border-b border-[#f3f1ec]">
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={`min-w-[140px] bg-white px-4 py-3 text-navy ${
                        column.id === stickyId ? 'sticky left-0 z-10 shadow-[2px_0_0_#eceae6]' : ''
                      } ${column.id === 'tax_period_ending' ? '' : 'text-right'}`}
                    >
                      {hmrcCell(row, column.id)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-[#eceae6] bg-[#f8f7f4] font-semibold">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`min-w-[140px] px-4 py-3 text-navy ${
                      column.id === stickyId ? 'sticky left-0 z-10 bg-[#f8f7f4] shadow-[2px_0_0_#eceae6]' : ''
                    } ${column.id === 'tax_period_ending' ? '' : 'text-right'}`}
                  >
                    {hmrcTotalCell(rows, column.id)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function HmrcPreviewPage({ kind }: { kind: AnalysisBuilderKind }) {
  const spec = specFor(kind)
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const draft = readReportDraft(kind, spec?.defaultName ?? '', spec?.defaultFieldIds)
  const [notice, setNotice] = useState<string | null>(null)
  const schedule = (draft.schedule ?? 'tax-months') as HmrcSchedule
  const years = hmrcYears(draft.taxYear, draft.periodMode)
  const allPeriods = useMemo(() => generateHmrcPeriods(years, schedule), [years, schedule])
  const selectedPeriods = allPeriods.filter((period) => draft.selectedPeriodIds.includes(period.id))

  const runsQuery = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => payrollApi.runs(companyId!),
    enabled: Boolean(companyId),
  })
  const recordsQuery = useQuery({
    queryKey: ['hmrc-payroll-records', companyId, years.join(',')],
    queryFn: async () => {
      const runs = (runsQuery.data?.data ?? []) as PayrollRun[]
      const matching = runs.filter((run) => years.includes(Number(run.tax_year_start)))
      const details = await Promise.all(matching.map((run) => payrollApi.getRun(companyId!, idOf(run))))
      return details.map((item) => ({
        run: item.data as PayrollRun,
        records: ((item.data as PayrollRun).payroll_records ?? []) as PayrollRecord[],
      }))
    },
    enabled: Boolean(companyId) && Boolean(runsQuery.data),
  })

  const columns = useMemo(
    () =>
      draft.selectedFieldIds
        .map((id) => spec?.fields.find((field) => field.id === id))
        .filter(Boolean) as { id: string; label: string }[],
    [draft.selectedFieldIds, spec],
  )
  const stickyId = columns.some((column) => column.id === 'tax_period_ending')
    ? 'tax_period_ending'
    : columns[0]?.id

  const rows = useMemo(
    () => buildHmrcRows(selectedPeriods, recordsQuery.data ?? []),
    [selectedPeriods, recordsQuery.data],
  )
  const rowsByYear = useMemo(() => {
    const map = new Map<number, HmrcRow[]>()
    for (const row of rows) {
      const list = map.get(row.period.taxYear) ?? []
      list.push(row)
      map.set(row.period.taxYear, list)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [rows])
  const yearsWithData = rowsByYear.filter(([, yearRows]) => yearRows.some((row) => row.hasData))

  if (!spec) return <Navigate to="/payroll/reports" replace />
  if (!draft.selectedFieldIds.length) return <Navigate to={`/payroll/reports/${kind}`} replace />

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

  function exportSections() {
    const header = columns.map((column) => column.label)
    const yearSections = yearsWithData.map(([taxYear, yearRows]) => ({
      heading: yearHeading(
        taxYear,
        schedule,
        yearRows.map((row) => row.period),
      ),
      headers: header,
      rows: [
        ...yearRows.map((row) => columns.map((column) => hmrcCell(row, column.id))),
        columns.map((column) => hmrcTotalCell(yearRows, column.id)),
      ],
    }))
    if (kind === 'hmrc-payments' && yearsWithData.length > 0) {
      const allRows = yearsWithData.flatMap(([, yearRows]) => yearRows)
      yearSections.push({
        heading: summaryHeading(yearsWithData.map(([taxYear]) => taxYear)),
        headers: header,
        rows: [
          ...allRows.map((row) => columns.map((column) => hmrcCell(row, column.id))),
          columns.map((column) => hmrcTotalCell(allRows, column.id)),
        ],
      })
    }
    return yearSections
  }

  function exportCsv() {
    const header = columns.map((column) => column.label)
    const rows: string[][] = []
    for (const section of exportSections()) {
      if (section.heading) rows.push([section.heading])
      rows.push(header, ...section.rows, [])
    }
    downloadCsv(reportFileSlug(draft.reportName), rows)
  }

  function exportPdf() {
    downloadReportPdf({
      filename: reportFileSlug(draft.reportName),
      title: draft.reportName || spec.title,
      sections: exportSections(),
    })
  }

  const loading = runsQuery.isLoading || recordsQuery.isLoading

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
          <ReportExportMenu onCsv={exportCsv} onPdf={exportPdf} disabled={loading || yearsWithData.length === 0} />
          <Button onClick={() => persist(true)}>Publish Report</Button>
        </div>
      </div>
      {notice ? (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <Loading />
        ) : yearsWithData.length === 0 ? (
          <EmptyState
            title="No HMRC payment data"
            body="Run payroll for the selected periods, then generate this report again."
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            {yearsWithData.map(([taxYear, yearRows]) => (
              <TableBlock
                key={taxYear}
                title={yearHeading(taxYear, schedule, yearRows.map((row) => row.period))}
                columns={columns}
                rows={yearRows}
                stickyId={stickyId}
              />
            ))}
            {kind === 'hmrc-payments' && yearsWithData.length > 0 ? (
              <TableBlock
                title={summaryHeading(yearsWithData.map(([taxYear]) => taxYear))}
                columns={columns}
                rows={yearsWithData.flatMap(([, yearRows]) => yearRows)}
                stickyId={stickyId}
              />
            ) : null}
          </div>
        )}
      </Card>
    </div>
  )
}

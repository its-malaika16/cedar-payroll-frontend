import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { formatDate } from '../../lib/format'
import {
  FEATURED_REPORTS,
  MORE_REPORTS,
  MORE_REPORTS_CARD,
  ALL_REPORTS,
  type ReportDefinition,
} from './reportCatalog'
import {
  deletePreviousReport,
  listPreviousReports,
  recordPreviousReport,
  type PreviousReport,
} from './previousReports'
import { clearReportDraft, writeReportDraft } from './employeeDetailsState'
import { isBuilderKind } from './reportSpecs'
import { ReportArrowButton, ReportCard } from './ReportCard'

export function AnalysisPage() {
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)
  const [previousTick, setPreviousTick] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<PreviousReport | null>(null)

  const previous = useMemo(
    () => (companyId ? listPreviousReports(companyId) : []),
    [companyId, previousTick],
  )

  function openReport(report: ReportDefinition) {
    if (isBuilderKind(report.slug)) {
      clearReportDraft(report.slug)
      navigate(`/payroll/reports/${report.slug}`)
      return
    }
    if (companyId) {
      recordPreviousReport(companyId, report.slug)
      setPreviousTick((value) => value + 1)
    }
    navigate(`/payroll/reports/${report.slug}`)
  }

  function openPrevious(item: (typeof previous)[number]) {
    if (isBuilderKind(item.type) && item.payload) {
      writeReportDraft({ ...item.payload, savedReportId: item.id })
      navigate(`/payroll/reports/${item.type}/preview`)
      return
    }
    navigate(`/payroll/reports/${item.type}`)
  }

  function confirmDelete() {
    if (!companyId || !pendingDelete) return
    deletePreviousReport(companyId, pendingDelete.id)
    setPendingDelete(null)
    setPreviousTick((value) => value + 1)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <PageHeader
        title="Analysis"
        subtitle="Explore your payroll data and generate reports"
      />

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-navy">Generate Report</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {FEATURED_REPORTS.map((report) => (
            <ReportCard key={report.slug} report={report} onClick={() => openReport(report)} />
          ))}
          <ReportCard
            report={{
              name: MORE_REPORTS_CARD.name,
              description: MORE_REPORTS_CARD.description,
              icon: MORE_REPORTS_CARD.icon,
            }}
            onClick={() => setShowMore((open) => !open)}
          />
        </div>
        {showMore ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {MORE_REPORTS.map((report) => (
              <ReportCard
                key={report.slug}
                report={report}
                badge
                onClick={() => openReport(report)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-navy">Previous Reports</h2>
        <Card className="overflow-hidden">
          {previous.length === 0 ? (
            <EmptyState
              title="No reports yet"
              body="Generate a report above and it will appear in this list."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eceae6] text-sm font-semibold text-navy">
                    <th className="px-5 py-4">Report</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {previous.map((item) => {
                    const Icon = ALL_REPORTS.find((report) => report.slug === item.type)?.icon
                    return (
                      <tr key={item.id} className="border-b border-[#eceae6] last:border-b-0">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 font-semibold text-navy">
                            {Icon ? <Icon size={18} strokeWidth={1.8} className="shrink-0 text-navy" /> : null}
                            {item.name}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted">{item.description}</td>
                        <td className="px-5 py-4 text-navy">{formatDate(item.generatedAt)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex size-9 items-center justify-center rounded-[8px] border border-[#d9d9d9] bg-white text-brand hover:bg-red-50"
                              aria-label={`Delete ${item.name}`}
                              onClick={() => setPendingDelete(item)}
                            >
                              <Trash2 size={16} strokeWidth={1.8} />
                            </button>
                            <button
                              type="button"
                              className="rounded-[8px]"
                              aria-label={`Open ${item.name}`}
                              onClick={() => openPrevious(item)}
                            >
                              <ReportArrowButton />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {pendingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => setPendingDelete(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-report-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-report-title" className="text-lg font-semibold text-navy">
                  Delete {pendingDelete.name}?
                </h3>
                <p className="mt-2 text-sm text-muted">This cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    onClick={() => setPendingDelete(null)}
                  >
                    Keep report
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    onClick={confirmDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

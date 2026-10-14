import { analysisReportsApi } from '../../api'
import { reportBySlug, type ReportKind } from './reportCatalog'
import type { AnalysisReportDraft } from './employeeDetailsState'

export type PreviousReport = {
  id: string
  type: ReportKind
  name: string
  description: string
  generatedAt: string
  published?: boolean
  payload?: AnalysisReportDraft
}

function asReport(row: {
  id: string
  type: string
  name: string
  description?: string
  generatedAt: string
  published?: boolean
  payload?: AnalysisReportDraft | null
}): PreviousReport {
  return {
    id: row.id,
    type: row.type as ReportKind,
    name: row.name,
    description: row.description || reportBySlug(row.type as ReportKind)?.listDescription || 'Report',
    generatedAt: row.generatedAt,
    published: Boolean(row.published),
    payload: (row.payload as AnalysisReportDraft | null | undefined) ?? undefined,
  }
}

export async function listPreviousReports(companyId: string): Promise<PreviousReport[]> {
  const result = await analysisReportsApi.list(companyId)
  return (result.data ?? []).map(asReport)
}

export async function recordPreviousReport(
  companyId: string,
  type: ReportKind,
  extras?: { name?: string; payload?: AnalysisReportDraft; published?: boolean },
): Promise<PreviousReport> {
  const definition = reportBySlug(type)
  const result = await analysisReportsApi.create(companyId, {
    report_type: type,
    name: extras?.name?.trim() || definition?.name || 'Report',
    description: definition?.listDescription ?? 'Employee details',
    payload: extras?.payload ?? null,
    published: extras?.published ?? false,
  })
  return asReport(result.data)
}

export async function updatePreviousReport(
  companyId: string,
  reportId: string,
  patch: Partial<PreviousReport>,
) {
  await analysisReportsApi.update(companyId, reportId, {
    name: patch.name,
    description: patch.description,
    payload: patch.payload ?? undefined,
    published: patch.published,
  })
}

export async function deletePreviousReport(companyId: string, reportId: string) {
  await analysisReportsApi.delete(companyId, reportId)
}

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

function storageKey(companyId: string) {
  return `cedar.analysis.previous.${companyId}`
}

function readAll(companyId: string): PreviousReport[] {
  try {
    const raw = localStorage.getItem(storageKey(companyId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as PreviousReport[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(companyId: string, reports: PreviousReport[]) {
  localStorage.setItem(storageKey(companyId), JSON.stringify(reports))
}

export function listPreviousReports(companyId: string): PreviousReport[] {
  return readAll(companyId)
}

export function getPreviousReport(companyId: string, reportId: string) {
  return readAll(companyId).find((item) => item.id === reportId)
}

export function recordPreviousReport(
  companyId: string,
  type: ReportKind,
  extras?: { name?: string; payload?: AnalysisReportDraft; published?: boolean },
): PreviousReport {
  const definition = reportBySlug(type)
  const existing = readAll(companyId)
  const sameCount = existing.filter((item) => item.type === type).length
  const baseName = extras?.name?.trim() || definition?.name || 'Report'
  const next: PreviousReport = {
    id: crypto.randomUUID(),
    type,
    name: extras?.name?.trim()
      ? baseName
      : sameCount === 0
        ? baseName
        : `${baseName} ${sameCount + 1}`,
    description: definition?.listDescription ?? 'Employee details',
    generatedAt: new Date().toISOString(),
    published: extras?.published,
    payload: extras?.payload,
  }
  writeAll(companyId, [next, ...existing])
  return next
}

export function updatePreviousReport(
  companyId: string,
  reportId: string,
  patch: Partial<PreviousReport>,
) {
  const existing = readAll(companyId)
  writeAll(
    companyId,
    existing.map((item) => (item.id === reportId ? { ...item, ...patch } : item)),
  )
}

export function deletePreviousReport(companyId: string, reportId: string) {
  writeAll(
    companyId,
    readAll(companyId).filter((item) => item.id !== reportId),
  )
}

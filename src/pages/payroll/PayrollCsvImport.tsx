import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { employeesApi, payrollApi } from '../../api'
import { Alert, Button, Card } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { PayrollRecord, PayrollRun } from '../../types'
import {
  cellFor,
  invertCsvMapping,
  parseCsvNumber,
  type ParsedCsv,
} from '../employees/csvImport'
import { periodPayLabel } from './scheduleWizard/payDateRules'
import {
  fieldsForKind,
  hasIdentityMapping,
  IMPORT_KIND_LABEL,
  isRecordLocked,
  matchNamedPerson,
  matchPayrollRecord,
  mergeDeductionLines,
  mergePayLines,
  PAYROLL_CSV_GROUPS,
  type PayrollCsvField,
  type PayrollImportKind,
} from './payrollCsv'

export function PayrollCsvImport({
  file,
  kind,
  mapping,
  companyId,
  runId,
  payFrequency,
  onMappingChange,
  onCancel,
  onImported,
}: {
  file: ParsedCsv
  kind: PayrollImportKind
  mapping: Record<string, string>
  companyId: string
  runId: string
  payFrequency?: string | null
  onMappingChange: (next: Record<string, string>) => void
  onCancel: () => void
  onImported: (count: number) => void
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{
    imported: number
    failed: { row: number; name: string; reason: string }[]
  } | null>(null)

  const fields = fieldsForKind(kind)
  const fieldById = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields])
  const headerToField = mapping
  const assignedFields = Object.values(headerToField).filter(Boolean)
  const duplicateField = assignedFields.find(
    (fieldId, index) => assignedFields.indexOf(fieldId) !== index,
  )
  const previewRows = file.rows.slice(0, 5)

  function setHeaderField(header: string, fieldId: string) {
    const next = { ...headerToField }
    if (!fieldId) delete next[header]
    else next[header] = fieldId
    onMappingChange(next)
  }

  async function importRows() {
    if (duplicateField) {
      setError(`“${fieldById.get(duplicateField)?.label ?? duplicateField}” is mapped more than once`)
      return
    }
    if (!hasIdentityMapping(headerToField)) {
      setError('Map a works number, email, or first name and last name so each row can match an employee')
      return
    }
    setBusy(true)
    setError(null)
    setResults(null)
    const failed: { row: number; name: string; reason: string }[] = []
    let imported = 0
    try {
      const [detail, peopleRes] = await Promise.all([
        payrollApi.getRun(companyId, runId),
        employeesApi.list(companyId),
      ])
      const run = detail.data as PayrollRun
      const records = (run.payroll_records ?? []) as PayrollRecord[]
      const companyPeople = peopleRes.data ?? []
      const used = new Set<string>()
      const fieldHeader = invertCsvMapping(headerToField)

      for (let index = 0; index < file.rows.length; index += 1) {
        const row = file.rows[index]
        const value = (fieldId: string) => cellFor(row, file.headers, fieldHeader[fieldId])
        const first = value('first_name')
        const last = value('last_name')
        const code = value('employee_code')
        const email = value('email')
        const name = [first, last].filter(Boolean).join(' ') || code || email || `Row ${index + 2}`
        const identity = { code, email, first, last }
        const record = matchPayrollRecord(records, identity)
        if (!record) {
          const companyMatch = matchNamedPerson(companyPeople, identity)
          failed.push({
            row: index + 2,
            name,
            reason: companyMatch
              ? 'This employee is in the company but not on this payroll run'
              : 'No matching employee on this payroll run',
          })
          continue
        }
        const recordId = idOf(record)
        if (used.has(recordId)) {
          failed.push({ row: index + 2, name, reason: 'This employee appears more than once in the CSV' })
          continue
        }
        if (isRecordLocked(record)) {
          failed.push({ row: index + 2, name: fullName(record.employees?.first_name, record.employees?.last_name), reason: 'Payslip is finalised' })
          continue
        }
        used.add(recordId)
        const body = buildRecordPayload(row, file.headers, headerToField, fields, record, payFrequency)
        if (!body) {
          failed.push({ row: index + 2, name, reason: 'No mapped payroll values in this row' })
          continue
        }
        try {
          await payrollApi.updateRecord(companyId, runId, recordId, { ...body, recalculate: true })
          imported += 1
        } catch (err) {
          failed.push({
            row: index + 2,
            name,
            reason: err instanceof Error ? err.message : 'Could not update this payroll record',
          })
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['payroll-run', companyId, runId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['payroll-record', companyId, runId] })
      setResults({ imported, failed })
      if (imported && failed.length === 0) onImported(imported)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this payroll run')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mt-6 flex min-h-[520px] flex-col p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy">Import payroll CSV</h2>
          <p className="mt-1 text-sm text-muted">
            {file.filename} · {file.rows.length} row{file.rows.length === 1 ? '' : 's'} · importing{' '}
            {IMPORT_KIND_LABEL[kind]}. Match each CSV column to a Cedar payroll field. Rows are
            matched to people already on this run by works number, then email, then first and last
            name.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">CSV columns</h3>
          <div className="space-y-2">
            {file.headers.map((header) => (
              <label key={header} className="flex items-center justify-between gap-3 text-xs text-navy">
                <span className="min-w-[150px] font-medium">{header}</span>
                <select
                  className="h-[35px] min-w-[180px] flex-1 rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white px-3 text-xs text-navy outline-none"
                  value={headerToField[header] ?? ''}
                  onChange={(event) => setHeaderField(header, event.target.value)}
                >
                  <option value="">Do not import</option>
                  {PAYROLL_CSV_GROUPS.map((group) => {
                    const groupFields = fields.filter((field) => field.group === group)
                    if (!groupFields.length) return null
                    return (
                      <optgroup key={group} label={group}>
                        {groupFields.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Preview</h3>
          <div className="overflow-auto rounded-[10px] border border-[#eceae6]">
            <table className="min-w-full text-left text-xs text-navy">
              <thead>
                <tr className="border-b border-[#eceae6] bg-[#f8f7f4]">
                  {file.headers.map((header) => {
                    const field = fieldById.get(headerToField[header] ?? '')
                    return (
                      <th
                        key={header}
                        className={`whitespace-nowrap px-3 py-2 font-semibold ${field ? 'text-navy' : 'text-muted'}`}
                      >
                        {field?.label ?? header}
                        {!field ? (
                          <span className="ml-1 font-normal text-[10px] uppercase tracking-wide">unmatched</span>
                        ) : null}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-[#f3f1ec] last:border-b-0">
                    {file.headers.map((header) => (
                      <td key={`${header}-${rowIndex}`} className="whitespace-nowrap px-3 py-2">
                        {cellFor(row, file.headers, header) || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Grey headings are not mapped. Choose a Cedar field so those values are used in payroll calculation.
          </p>
        </div>
      </div>

      {results ? (
        <div className="mt-4">
          <Alert tone={results.failed.length ? 'warning' : 'success'}>
            Updated {results.imported} payroll record{results.imported === 1 ? '' : 's'}
            {results.failed.length ? `. ${results.failed.length} row(s) could not be imported.` : '.'}
          </Alert>
          {results.failed.length ? (
            <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-navy">
              {results.failed.map((item) => (
                <li key={`${item.row}-${item.name}`}>
                  Row {item.row} ({item.name}): {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Close
        </Button>
        <Button
          type="button"
          onClick={() => void importRows()}
          disabled={busy || Boolean(results && results.failed.length === 0)}
        >
          {busy ? 'Importing…' : 'Import and calculate'}
        </Button>
      </div>
    </Card>
  )
}

export function PayrollCsvReferences({ onClose }: { onClose: () => void }) {
  return (
    <Card className="mt-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy">CSV import references</h2>
          <p className="mt-1 text-sm text-muted">
            Map your file headings to these Cedar payroll columns. Tax, NI and pension are calculated after import.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PAYROLL_CSV_GROUPS.map((group) => (
          <section key={group}>
            <h3 className="mb-2 text-sm font-semibold text-navy">{group}</h3>
            <ul className="space-y-1 text-xs text-navy">
              {fieldsForKind('mix')
                .filter((field) => field.group === group)
                .map((field) => (
                  <li key={field.id}>{field.label}</li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  )
}

function buildRecordPayload(
  row: string[],
  headers: string[],
  headerToField: Record<string, string>,
  fields: PayrollCsvField[],
  record: PayrollRecord,
  payFrequency?: string | null,
) {
  const fieldHeader = invertCsvMapping(headerToField)
  const value = (fieldId: string) => cellFor(row, headers, fieldHeader[fieldId])
  const body: Record<string, unknown> = {}
  const extraAdditions: { label: string; amount: number }[] = []
  const deductions: { label: string; amount: number }[] = []
  let dailyQty: number | undefined
  let dailyRate: number | undefined
  let periodAmount: number | undefined
  let hours: number | undefined

  for (const field of fields) {
    if (!fieldHeader[field.id]) continue
    const raw = value(field.id)
    if (raw === '') continue
    if (field.id === 'employee_code' || field.id === 'first_name' || field.id === 'last_name' || field.id === 'email') {
      continue
    }
    if (field.id === 'daily_qty') {
      dailyQty = parseCsvNumber(raw)
      continue
    }
    if (field.id === 'daily_rate') {
      dailyRate = parseCsvNumber(raw)
      continue
    }
    if (field.id === 'period_pay') {
      periodAmount = parseCsvNumber(raw)
      continue
    }
    if (field.id === 'total_hours') {
      hours = parseCsvNumber(raw)
      if (hours != null) {
        body.total_hours = hours
        if (hours > 0) body.pay_basis = 'HOURLY'
      }
      continue
    }
    if (field.dtoField === 'employee_notes' || field.dtoField === 'employer_notes') {
      body[field.dtoField] = raw
      continue
    }
    const amount = parseCsvNumber(raw)
    if (amount == null) continue
    if (field.dtoField) body[field.dtoField] = amount
    else if (field.lineKind === 'addition') extraAdditions.push({ label: field.label, amount })
    else if (field.lineKind === 'deduction') deductions.push({ label: field.label, amount })
  }

  const daily =
    dailyQty != null && dailyRate != null
      ? { qty: dailyQty, rate: dailyRate }
      : dailyQty != null
        ? { qty: dailyQty, rate: Number(record.daily_rate ?? 0) }
        : dailyRate != null
          ? {
              qty: Number((record.pay_lines ?? []).find((line) => line.kind === 'daily')?.qty ?? 0),
              rate: dailyRate,
            }
          : undefined
  const usableDaily = daily && (daily.qty > 0 || daily.rate > 0) ? daily : undefined

  if (usableDaily || periodAmount != null || extraAdditions.length) {
    body.pay_lines = mergePayLines(record.pay_lines, {
      daily: usableDaily,
      periodAmount,
      periodLabel: periodPayLabel(payFrequency),
      extraAdditions,
    })
  }
  if (deductions.length) {
    body.deduction_lines = mergeDeductionLines(record.deduction_lines, deductions)
  }

  const keys = Object.keys(body)
  return keys.length ? body : null
}

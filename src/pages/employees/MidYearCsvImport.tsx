import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { employeesApi } from '../../api'
import { Alert, Button } from '../../components/ui'
import { fullName, idOf } from '../../lib/format'
import type { Employee } from '../../types'
import {
  cellFor,
  guessCsvMappingFor,
  invertCsvMapping,
  parseCsvText,
  type ParsedCsv,
} from './csvImport'
import {
  MID_YEAR_CSV_FIELDS,
  MID_YEAR_CSV_GROUPS,
  midYearDraftFromCsv,
  personNameKey,
} from './midYearCsv'
import { draftFromMidYear, midYearPayload, type MidYearTotalsDraft } from './midYearTotals'

export function MidYearCsvButton({
  companyId,
  currentEmployeeId,
  onStored,
}: {
  companyId?: string | null
  currentEmployeeId?: string | null
  onStored: (employeeId: string, draft: MidYearTotalsDraft) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  async function onPicked(picked: File | undefined) {
    if (!picked) return
    try {
      const parsed = parseCsvText(await picked.text(), picked.name)
      setFile(parsed)
      setMapping(invertCsvMapping(guessCsvMappingFor(parsed.headers, MID_YEAR_CSV_FIELDS)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this CSV file')
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="h-10 shrink-0 px-3 text-xs"
        disabled={!companyId}
        onClick={() => inputRef.current?.click()}
      >
        Upload CSV
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0]
          event.target.value = ''
          void onPicked(picked)
        }}
      />
      {error && !file ? (
        <p className="mt-2 text-xs text-brand">{error}</p>
      ) : null}
      {file && companyId
        ? createPortal(
            <MidYearCsvDialog
              file={file}
              mapping={mapping}
              companyId={companyId}
              currentEmployeeId={currentEmployeeId}
              onMappingChange={setMapping}
              onClose={() => setFile(null)}
              onStored={onStored}
            />,
            document.body,
          )
        : null}
    </>
  )
}

function MidYearCsvDialog({
  file,
  mapping,
  companyId,
  currentEmployeeId,
  onMappingChange,
  onClose,
  onStored,
}: {
  file: ParsedCsv
  mapping: Record<string, string>
  companyId: string
  currentEmployeeId?: string | null
  onMappingChange: (next: Record<string, string>) => void
  onClose: () => void
  onStored: (employeeId: string, draft: MidYearTotalsDraft) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{
    imported: number
    failed: { row: number; name: string; reason: string }[]
  } | null>(null)
  const fieldById = useMemo(() => new Map(MID_YEAR_CSV_FIELDS.map((field) => [field.id, field])), [])
  const assigned = Object.values(mapping).filter(Boolean)
  const duplicateField = assigned.find((fieldId, index) => assigned.indexOf(fieldId) !== index)

  function setHeaderField(header: string, fieldId: string) {
    const next = { ...mapping }
    if (!fieldId) delete next[header]
    else next[header] = fieldId
    onMappingChange(next)
    setResults(null)
  }

  async function importRows() {
    if (duplicateField) {
      setError(`“${fieldById.get(duplicateField)?.label ?? duplicateField}” is selected more than once`)
      return
    }
    const fieldHeader = invertCsvMapping(mapping)
    if (!fieldHeader.first_name || !fieldHeader.last_name) {
      setError('Select the CSV columns for first name and last name')
      return
    }
    const valueFields = MID_YEAR_CSV_FIELDS.filter(
      (field) => field.id !== 'first_name' && field.id !== 'last_name',
    )
    if (!valueFields.some((field) => fieldHeader[field.id])) {
      setError('Select at least one mid year total column to store')
      return
    }
    setBusy(true)
    setError(null)
    setResults(null)
    const failed: { row: number; name: string; reason: string }[] = []
    let imported = 0
    try {
      const listed = await employeesApi.list(companyId)
      const people = (listed.data ?? []) as Employee[]
      const used = new Set<string>()
      for (let index = 0; index < file.rows.length; index += 1) {
        const row = file.rows[index]
        const value = (fieldId: string) => cellFor(row, file.headers, fieldHeader[fieldId])
        const first = value('first_name')
        const last = value('last_name')
        const name = [first, last].filter(Boolean).join(' ') || `Row ${index + 2}`
        if (!first.trim() || !last.trim()) {
          failed.push({ row: index + 2, name, reason: 'First name and last name are required' })
          continue
        }
        const matches = people.filter(
          (person) =>
            personNameKey(person.first_name ?? '') === personNameKey(first) &&
            personNameKey(person.last_name ?? '') === personNameKey(last),
        )
        if (matches.length === 0) {
          failed.push({ row: index + 2, name, reason: 'No employee with this first and last name' })
          continue
        }
        if (matches.length > 1) {
          failed.push({ row: index + 2, name, reason: 'More than one employee has this first and last name' })
          continue
        }
        const employeeId = idOf(matches[0])
        if (used.has(employeeId)) {
          failed.push({ row: index + 2, name, reason: 'This employee appears more than once in the CSV' })
          continue
        }
        const built = midYearDraftFromCsv(value)
        if (!built.draft) {
          failed.push({ row: index + 2, name, reason: built.error ?? 'This row could not be read' })
          continue
        }
        used.add(employeeId)
        try {
          const totals = midYearPayload(built.draft)
          await employeesApi.updateTax(companyId, employeeId, { mid_year_totals: totals })
          imported += 1
          if (employeeId === currentEmployeeId) {
            onStored(employeeId, draftFromMidYear(totals))
          }
        } catch (err) {
          failed.push({
            row: index + 2,
            name: fullName(matches[0].first_name, matches[0].last_name),
            reason: err instanceof Error ? err.message : 'Could not save these totals',
          })
        }
      }
      setResults({ imported, failed })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load employees')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4 py-6"
      role="presentation"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mid-year-csv-title"
        className="flex max-h-[90vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-[16px] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="mid-year-csv-title" className="text-lg font-semibold text-navy">
              Upload mid year totals
            </h3>
            <p className="mt-1 text-sm text-muted">
              {file.filename} · {file.rows.length} row{file.rows.length === 1 ? '' : 's'}. Choose which CSV column
              fills each total. Each row is saved to the employee with the same first and last name.
            </p>
          </div>
          <Button type="button" variant="secondary" className="h-10 text-xs" disabled={busy} onClick={onClose}>
            Close
          </Button>
        </div>

        {error ? (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        <div className="mt-5 grid min-h-0 flex-1 gap-6 overflow-auto xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">Column selection</h4>
            <div className="space-y-2">
              {file.headers.map((header) => (
                <label key={header} className="flex items-center justify-between gap-3 text-xs text-navy">
                  <span className="min-w-[140px] font-medium">{header}</span>
                  <select
                    className="h-[35px] min-w-[180px] flex-1 rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white px-3 text-xs text-navy outline-none"
                    value={mapping[header] ?? ''}
                    onChange={(event) => setHeaderField(header, event.target.value)}
                  >
                    <option value="">Do not import</option>
                    {MID_YEAR_CSV_GROUPS.map((group) => (
                      <optgroup key={group} label={group}>
                        {MID_YEAR_CSV_FIELDS.filter((field) => field.group === group).map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                            {field.required ? ' *' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">Preview</h4>
            <div className="max-h-[360px] overflow-auto rounded-[10px] border border-[#eceae6]">
              <table className="min-w-full text-left text-xs text-navy">
                <thead>
                  <tr className="border-b border-[#eceae6] bg-[#f8f7f4]">
                    {file.headers.map((header) => {
                      const field = fieldById.get(mapping[header] ?? '')
                      return (
                        <th key={header} className="sticky top-0 whitespace-nowrap bg-[#f8f7f4] px-3 py-2 font-semibold">
                          {field?.label ?? header}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {file.rows.slice(0, 8).map((row, rowIndex) => (
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
          </div>
        </div>

        {results ? (
          <div className="mt-4">
            <Alert tone={results.failed.length ? 'warning' : 'success'}>
              Saved mid year totals for {results.imported} employee{results.imported === 1 ? '' : 's'}
              {results.failed.length ? `. ${results.failed.length} row(s) were not saved.` : '.'}
            </Alert>
            {results.failed.length ? (
              <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-navy">
                {results.failed.map((item) => (
                  <li key={`${item.row}-${item.name}`}>
                    Row {item.row} ({item.name}): {item.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button type="button" className="h-10 text-xs" disabled={busy} onClick={() => void importRows()}>
            {busy ? 'Saving…' : 'Save totals'}
          </Button>
        </div>
      </div>
    </div>
  )
}

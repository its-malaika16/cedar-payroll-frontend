import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { employeesApi } from '../../api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Card } from '../../components/ui'
import { idOf } from '../../lib/format'
import {
  CSV_FIELD_GROUPS,
  EMPLOYEE_CSV_FIELDS,
  cellFor,
  isValidEmail,
  parseCsvDate,
  parseCsvGender,
  parseCsvNiCategory,
  parseCsvNumber,
  recommendedNiCategoryFromDob,
  DEFAULT_CSV_TAX_CODE,
  type ParsedCsv,
} from './csvImport'

export function EmployeeCsvImport({
  file,
  mapping,
  onMappingChange,
  onCancel,
  onImported,
}: {
  file: ParsedCsv
  mapping: Record<string, string>
  onMappingChange: (next: Record<string, string>) => void
  onCancel: () => void
  onImported: (count: number) => void
}) {
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{ imported: number; failed: { row: number; name: string; reason: string }[] } | null>(
    null,
  )

  const missingRequired = EMPLOYEE_CSV_FIELDS.filter((field) => field.required && !mapping[field.id])
  const previewRows = file.rows.slice(0, 5)
  const mappedPreview = useMemo(
    () =>
      EMPLOYEE_CSV_FIELDS.filter((field) => mapping[field.id]).map((field) => ({
        label: field.label,
        values: previewRows.map((row) => cellFor(row, file.headers, mapping[field.id])),
      })),
    [file.headers, mapping, previewRows],
  )

  async function importRows() {
    if (!companyId) return
    if (missingRequired.length) {
      setError(`Select a CSV column for ${missingRequired.map((field) => field.label).join(', ')}`)
      return
    }
    setBusy(true)
    setError(null)
    setResults(null)
    const failed: { row: number; name: string; reason: string }[] = []
    let imported = 0
    const seenEmails = new Set<string>()
    for (let index = 0; index < file.rows.length; index += 1) {
      const row = file.rows[index]
      const value = (fieldId: string) => cellFor(row, file.headers, mapping[fieldId])
      const firstName = value('first_name')
      const lastName = value('last_name')
      const email = value('email').trim().toLowerCase()
      const dob = parseCsvDate(value('dob'))
      const gender = parseCsvGender(value('gender'))
      const name = [firstName, lastName].filter(Boolean).join(' ') || `Row ${index + 2}`
      if (!firstName || !lastName || !email || !dob || !gender) {
        failed.push({ row: index + 2, name, reason: 'First name, last name, email, date of birth and gender are required' })
        continue
      }
      if (!isValidEmail(email)) {
        failed.push({ row: index + 2, name, reason: 'Email is not valid' })
        continue
      }
      if (seenEmails.has(email)) {
        failed.push({ row: index + 2, name, reason: 'Duplicate email in this CSV' })
        continue
      }
      seenEmails.add(email)
      try {
        const rawTitle = value('title')
        const rawJobTitle = value('job_title')
        const title = rawTitle && rawTitle.length <= 20 ? rawTitle : undefined
        const jobTitle = rawJobTitle || (rawTitle.length > 20 ? rawTitle : undefined)
        const created = await employeesApi.create(companyId, {
          title: title || undefined,
          first_name: firstName,
          middle_name: value('middle_name') || undefined,
          last_name: lastName,
          dob,
          gender,
          email,
          phone: value('phone') || undefined,
        })
        const employeeId = idOf(created.data)
        const address = {
          address_line_1: value('address_line_1'),
          address_line_2: value('address_line_2'),
          address_line_3: value('address_line_3'),
          address_line_4: value('address_line_4'),
          postcode: value('postcode'),
          country: value('country') || 'United Kingdom',
        }
        if (Object.values(address).some((item) => item && item !== 'United Kingdom')) {
          await employeesApi.updateAddress(companyId, employeeId, address)
        }
        const hourly = parseCsvNumber(value('hourly_rate'))
        const daily = parseCsvNumber(value('daily_rate'))
        const salary = parseCsvNumber(value('annual_salary'))
        if (jobTitle || value('department') || salary != null || hourly != null || daily != null) {
          await employeesApi.updateEmployment(companyId, employeeId, {
            job_title: jobTitle || undefined,
            department: value('department') || undefined,
            ...(salary != null ? { annual_salary: salary } : {}),
            ...(hourly != null ? { basic_rate_per_hour: hourly } : {}),
            ...(daily != null ? { daily_rate: daily } : {}),
            pay_basis_type: hourly ? 'HOURLY' : daily ? 'DAILY' : salary ? 'ANNUAL' : undefined,
          })
        }
        const start = parseCsvDate(value('start_date'))
        const leave = parseCsvDate(value('leave_date'))
        if (start || leave) {
          await employeesApi.updateStarterLeaver(companyId, employeeId, {
            ...(start ? { start_date: start } : {}),
            ...(leave ? { leave_date: leave } : {}),
          })
        }
        const recommendedNi = recommendedNiCategoryFromDob(dob) ?? 'A'
        const csvNi = parseCsvNiCategory(value('ni_category'))
        const taxCode = value('tax_code').replace(/\s+/g, '').toUpperCase() || DEFAULT_CSV_TAX_CODE
        const niNumber = value('ni_number').replace(/\s+/g, '').toUpperCase()
        await employeesApi.updateTax(companyId, employeeId, {
          tax_code: taxCode,
          ni_category: csvNi && csvNi === recommendedNi ? csvNi : recommendedNi,
          ...(niNumber && /^(?!BG|GB|KN|NK|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(niNumber)
            ? { ni_number: niNumber }
            : {}),
        })
        imported += 1
      } catch (err) {
        const sessionLost = err instanceof ApiError && err.status === 401
        failed.push({
          row: index + 2,
          name,
          reason: sessionLost
            ? 'Your login session expired. Sign in again, then import the CSV again.'
            : err instanceof Error
              ? err.message
              : 'Could not create this employee',
        })
        if (sessionLost) break
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['employees', companyId] })
    setBusy(false)
    setResults({ imported, failed })
    if (imported && failed.length === 0) onImported(imported)
  }

  return (
    <Card className="flex min-h-[520px] flex-col p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy">Upload CSV</h2>
          <p className="mt-1 text-sm text-muted">
            {file.filename} · {file.rows.length} row{file.rows.length === 1 ? '' : 's'}. Match each database field to a
            CSV column.
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
        <div className="space-y-5">
          {CSV_FIELD_GROUPS.map((group) => (
            <section key={group}>
              <h3 className="mb-2 text-sm font-semibold text-navy">{group}</h3>
              <div className="space-y-2">
                {EMPLOYEE_CSV_FIELDS.filter((field) => field.group === group).map((field) => (
                  <label key={field.id} className="flex items-center justify-between gap-3 text-xs text-navy">
                    <span className="min-w-[150px]">
                      {field.label}
                      {field.required ? <span className="text-brand"> *</span> : null}
                    </span>
                    <select
                      className="h-[35px] min-w-[180px] flex-1 rounded-[8px] border-[0.5px] border-[#d9d9d9] bg-white px-3 text-xs text-navy outline-none"
                      value={mapping[field.id] ?? ''}
                      onChange={(event) =>
                        onMappingChange({ ...mapping, [field.id]: event.target.value })
                      }
                    >
                      <option value="">Select CSV column</option>
                      {file.headers.map((header) => (
                        <option key={`${field.id}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Preview</h3>
          <div className="overflow-auto rounded-[10px] border border-[#eceae6]">
            <table className="min-w-full text-left text-xs text-navy">
              <thead>
                <tr className="border-b border-[#eceae6] bg-[#f8f7f4]">
                  {mappedPreview.map((column) => (
                    <th key={column.label} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-[#f3f1ec] last:border-b-0">
                    {mappedPreview.map((column) => (
                      <td key={`${column.label}-${rowIndex}`} className="whitespace-nowrap px-3 py-2">
                        {column.values[rowIndex] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mappedPreview.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Select columns to see a preview of how records will be saved.</p>
          ) : null}
        </div>
      </div>

      {results ? (
        <div className="mt-4">
          <Alert tone={results.failed.length ? 'warning' : 'success'}>
            Imported {results.imported} employee{results.imported === 1 ? '' : 's'}
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
        <Button type="button" onClick={() => void importRows()} disabled={busy || Boolean(results && results.failed.length === 0)}>
          {busy ? 'Importing…' : 'Import employees'}
        </Button>
      </div>
    </Card>
  )
}

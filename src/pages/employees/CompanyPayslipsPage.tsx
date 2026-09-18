import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { payrollApi, payslipsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Loading,
  PageHeader,
  Select,
} from '../../components/ui'
import { downloadBlobFile, zipBinaryFiles } from './formPdf'
import {
  formatDate,
  formatPayslipPeriod,
  fullName,
  idOf,
  money,
} from '../../lib/format'
import type { PayrollRun, PayrollSchedule } from '../../types'

type PublishedEmployee = {
  employee_id: string
  payroll_record_id: string
  employee_code?: string | null
  first_name?: string | null
  last_name?: string | null
  take_home_pay?: string | number | null
  payslip_id?: string | null
  file_name?: string | null
}

function fileSafe(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Payslip'
}

function frequencyLabel(value?: string | null) {
  if (!value) return '—'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function periodNumberLabel(run?: PayrollRun | null) {
  const frequency = (run?.pay_frequency ?? '').toUpperCase()
  if (frequency.includes('WEEK')) return `Week ${run?.tax_week ?? run?.period_number ?? ''}`.trim()
  return `Month ${run?.tax_month ?? run?.period_number ?? ''}`.trim()
}

function payslipFileName(employeeName: string, run?: PayrollRun | null) {
  return `${fileSafe(`${employeeName} ${periodNumberLabel(run)}`)}.pdf`
}

function zipFolderName(run?: PayrollRun | null) {
  const schedule =
    run?.payroll_schedules?.schedule_name?.trim() ||
    frequencyLabel(run?.pay_frequency) ||
    'Payroll'
  return fileSafe(`${schedule} ${periodNumberLabel(run)}`)
}

function runOptionLabel(run: PayrollRun) {
  const period = formatPayslipPeriod(run.period_start_date, run.period_end_date, run.pay_frequency)
  return `${period} · pay date ${formatDate(run.pay_date)}`
}

export function CompanyPayslipsPage() {
  const { companyId } = useAuth()
  const [scheduleId, setScheduleId] = useState('')
  const [runId, setRunId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const schedulesQuery = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => payrollApi.schedules(companyId!),
    enabled: Boolean(companyId),
  })
  const runsQuery = useQuery({
    queryKey: ['published-payslips', companyId, scheduleId],
    queryFn: () => payslipsApi.publishedRuns(companyId!, scheduleId || undefined),
    enabled: Boolean(companyId && scheduleId),
  })
  const payslipsQuery = useQuery({
    queryKey: ['published-run-payslips', companyId, runId],
    queryFn: () => payslipsApi.publishedForRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })

  const schedules = ((schedulesQuery.data?.data ?? []) as PayrollSchedule[]).filter(
    (schedule) => schedule.is_active !== false,
  )
  const runs = (runsQuery.data?.data ?? []) as PayrollRun[]
  const payload = payslipsQuery.data?.data as
    | { payroll_run?: PayrollRun; employees?: PublishedEmployee[] }
    | undefined
  const run = payload?.payroll_run ?? runs.find((item) => idOf(item) === runId)
  const employees = payload?.employees ?? []

  useEffect(() => {
    if (!scheduleId && schedules[0]) setScheduleId(idOf(schedules[0]))
  }, [scheduleId, schedules])

  useEffect(() => {
    if (!runs.length) {
      setRunId('')
      return
    }
    if (!runs.some((item) => idOf(item) === runId)) {
      setRunId(idOf(runs[0]))
    }
  }, [runs, runId])

  useEffect(() => {
    setSelected([])
  }, [runId])

  const downloadable = useMemo(
    () => employees.filter((item) => item.payslip_id),
    [employees],
  )
  const rowId = (item: PublishedEmployee) => String(item.payroll_record_id ?? '')
  const allSelected =
    downloadable.length > 0 && downloadable.every((item) => selected.includes(rowId(item)))

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function employeeName(item: PublishedEmployee) {
    const name = fullName(item.first_name, item.last_name)
    return name === '—' ? 'Employee' : name
  }

  async function filesFor(items: PublishedEmployee[]) {
    if (!companyId) throw new Error('Select an organisation first')
    const withFiles = items.filter((item) => item.payslip_id)
    if (withFiles.length === 0) throw new Error('No payslip PDFs are available for the selected employees.')
    const used = new Set<string>()
    const files: { name: string; blob: Blob }[] = []
    for (const item of withFiles) {
      const base = payslipFileName(employeeName(item), run)
      let name = base
      let suffix = 2
      while (used.has(name.toLowerCase())) {
        name = base.replace(/\.pdf$/i, ` (${suffix}).pdf`)
        suffix += 1
      }
      used.add(name.toLowerCase())
      const blob = await payslipsApi.fileBlob(companyId, String(item.payslip_id))
      files.push({ name, blob })
    }
    return files
  }

  async function downloadOne(item: PublishedEmployee) {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const [file] = await filesFor([item])
      downloadBlobFile(file.blob, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download payslip')
    } finally {
      setBusy(false)
    }
  }

  async function downloadZip(items: PublishedEmployee[]) {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const files = await filesFor(items)
      const folder = zipFolderName(run)
      const zip = zipBinaryFiles(
        await Promise.all(
          files.map(async (file) => ({
            name: `${folder}/${file.name}`,
            data: new Uint8Array(await file.blob.arrayBuffer()),
          })),
        ),
      )
      downloadBlobFile(zip, `${folder}.zip`)
      setMessage(
        `${files.length} payslip PDF${files.length === 1 ? '' : 's'} downloaded in ${folder}.zip.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download payslips')
    } finally {
      setBusy(false)
    }
  }

  async function viewPdf(item: PublishedEmployee) {
    if (!companyId || !item.payslip_id) return
    setError(null)
    try {
      const blob = await payslipsApi.fileBlob(companyId, String(item.payslip_id))
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open payslip')
    }
  }

  const selectedEmployees = employees.filter((item) => selected.includes(rowId(item)))

  return (
    <div>
      <PageHeader
        title="Payslips"
        subtitle="View and download employee payslips after the bureau has finalised payroll."
      />

      <Card className="mb-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Payment schedule">
            <Select
              variant="outline"
              value={scheduleId}
              onChange={(event) => setScheduleId(event.target.value)}
            >
              {schedules.length === 0 ? <option value="">No schedules</option> : null}
              {schedules.map((schedule) => (
                <option key={idOf(schedule)} value={idOf(schedule)}>
                  {schedule.schedule_name || frequencyLabel(schedule.pay_frequency)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pay period">
            <Select
              variant="outline"
              value={runId}
              onChange={(event) => setRunId(event.target.value)}
              disabled={!scheduleId || runsQuery.isLoading}
            >
              {runs.length === 0 ? <option value="">No finalised payrolls</option> : null}
              {runs.map((item) => (
                <option key={idOf(item)} value={idOf(item)}>
                  {runOptionLabel(item)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {run ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DateStat label="Period start" value={formatDate(run.period_start_date)} />
            <DateStat label="Period end" value={formatDate(run.period_end_date)} />
            <DateStat label="Pay date" value={formatDate(run.pay_date)} />
            <DateStat
              label="Frequency"
              value={`${frequencyLabel(run.pay_frequency)} · ${periodNumberLabel(run)}`}
            />
          </div>
        ) : null}
      </Card>

      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceae6] px-5 py-4">
          <p className="text-sm font-semibold text-navy">
            {employees.length} employee{employees.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy || selectedEmployees.filter((item) => item.payslip_id).length === 0}
              onClick={() => void downloadZip(selectedEmployees)}
            >
              Download selected
            </Button>
            <Button
              disabled={busy || downloadable.length === 0}
              onClick={() => void downloadZip(downloadable)}
            >
              Download all as ZIP
            </Button>
          </div>
        </div>

        {schedulesQuery.isLoading || (scheduleId && runsQuery.isLoading) ? (
          <Loading />
        ) : schedules.length === 0 ? (
          <EmptyState title="No payment schedules" body="A payroll schedule is needed before payslips can appear." />
        ) : runs.length === 0 ? (
          <EmptyState
            title="No finalised payrolls"
            body="Payslips appear here after the bureau finalises this schedule."
          />
        ) : payslipsQuery.isLoading ? (
          <Loading />
        ) : employees.length === 0 ? (
          <EmptyState title="No payslips" body="No finalised employee payslips were found for this period." />
        ) : (
          <div>
            <label className="flex items-center gap-3 border-b border-[#eceae6] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              <input
                type="checkbox"
                className="size-3.5 accent-navy"
                checked={allSelected}
                onChange={(event) =>
                  setSelected(event.target.checked ? downloadable.map((item) => rowId(item)) : [])
                }
              />
              Employee
            </label>
            <div className="divide-y divide-[#eceae6]">
              {employees.map((item) => {
                const id = rowId(item)
                const name = employeeName(item)
                const hasFile = Boolean(item.payslip_id)
                return (
                  <div key={id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <label className="flex min-w-0 flex-1 items-center gap-3 text-sm text-navy">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-navy"
                        disabled={!hasFile}
                        checked={selected.includes(id)}
                        onChange={() => toggle(id)}
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold">{name}</span>
                        <span className="block text-sm text-muted">
                          {item.employee_code || 'No works number'} · Take-home {money(item.take_home_pay)}
                        </span>
                      </span>
                    </label>
                    <div className="flex gap-2">
                      {hasFile ? (
                        <>
                          <Button variant="secondary" disabled={busy} onClick={() => void viewPdf(item)}>
                            View
                          </Button>
                          <Button variant="secondary" disabled={busy} onClick={() => void downloadOne(item)}>
                            Download
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm text-muted">Payslip not available</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function DateStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[#f7f9fc] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
    </div>
  )
}

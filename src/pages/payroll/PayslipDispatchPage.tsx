import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronLeft,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { companiesApi, payrollApi, payslipsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { formatLongDate, fullName, idOf, isEmployeeOnPayrollRun, sortByEmployeeName } from '../../lib/format'
import type { PayrollRecord, PayrollRun } from '../../types'
import { downloadBlobFile, zipBinaryFiles } from '../employees/formPdf'
import { CreateSendMenu, payslipList, toolbarBtn } from './CreateSendMenu'
import { PayrollMoreMenu } from './PayrollMoreMenu'
import { PayrollSchedulesMenu } from './PayrollSchedulesMenu'
import { payrollListPathFromRun } from './payrollNavigation'
import { PayslipCustomisePanel } from './PayslipCustomisePanel'
import {
  DEFAULT_PAYSLIP_DISPLAY_OPTIONS,
  parsePayslipDisplayOptions,
  type PayslipDisplayOptions,
} from './payslipDisplayOptions'

const DEFAULT_BODY = `Dear [First name] [Surname],

Please find attached your payslip for the period ending [period-end-date].

If you have any questions, please contact payroll.

Kind regards,
[employer-name]`

const DEFAULT_SUBJECT = '[employee-name] - [schedule] - ending [period-end-date]'

function scheduleWord(frequency?: string | null) {
  switch (String(frequency ?? '').toUpperCase()) {
    case 'WEEKLY':
      return 'Weekly'
    case 'MONTHLY':
      return 'Monthly'
    case 'FORTNIGHTLY':
      return 'Fortnightly'
    case 'FOUR_WEEKLY':
      return '4-Weekly'
    default:
      return (
        String(frequency ?? '')
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Payroll'
      )
  }
}

function employeeDisplayName(employee: { first?: string | null; last?: string | null }) {
  return [employee.first, employee.last].filter(Boolean).join(' ').trim() || 'Employee'
}

function fillEmail(
  template: string,
  employee: { first?: string | null; last?: string | null },
  periodEnd?: string | null,
  employer?: string,
  schedule?: string,
) {
  const name = employeeDisplayName(employee)
  return template
    .replaceAll('[employee-name]', name)
    .replaceAll('[First name]', employee.first || 'Employee')
    .replaceAll('[Surname]', employee.last || '')
    .replaceAll('[schedule]', schedule || '')
    .replaceAll('[period-end-date]', periodEnd ? formatLongDate(periodEnd) : '')
    .replaceAll('[employer-name]', employer || 'your employer')
}

function fileSafe(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Payslip'
}

function periodNumberLabel(run?: PayrollRun) {
  const frequency = (run?.pay_frequency ?? '').toUpperCase()
  const weekly = frequency.includes('WEEK')
  if (weekly) return `Week ${run?.tax_week ?? run?.period_number ?? ''}`.trim()
  return `Month ${run?.tax_month ?? run?.period_number ?? ''}`.trim()
}

function payslipFileName(employeeName: string, run?: PayrollRun) {
  return `${fileSafe(`${employeeName} ${periodNumberLabel(run)}`)}.pdf`
}

function zipFolderName(run?: PayrollRun) {
  const schedule =
    run?.payroll_schedules?.schedule_name?.trim() ||
    (run?.pay_frequency ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
    'Payroll'
  return fileSafe(`${schedule} ${periodNumberLabel(run)}`)
}

export function PayslipDispatchPage() {
  const { runId = '', mode = 'send' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { companyId, user, companies } = useAuth()
  const isDownload = mode === 'download'
  const preselect = params.get('recordId') ?? ''
  const companyName = companies.find((company) => company.id === companyId)?.name ?? 'your employer'

  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : [])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [replyTo, setReplyTo] = useState(user?.email ?? '')
  const [cc, setCc] = useState('')
  const [securePdf, setSecurePdf] = useState(false)
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [pack, setPack] = useState<'single' | 'zip'>('single')
  const [displayOptions, setDisplayOptions] = useState<PayslipDisplayOptions>(
    DEFAULT_PAYSLIP_DISPLAY_OPTIONS,
  )
  const saveTimer = useRef<number | null>(null)

  const companyQuery = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companiesApi.get(companyId!),
    enabled: Boolean(companyId),
  })

  const runQuery = useQuery({
    queryKey: ['payroll-run', companyId, runId],
    queryFn: () => payrollApi.getRun(companyId!, runId),
    enabled: Boolean(companyId && runId),
  })

  const run = runQuery.data?.data as PayrollRun | undefined
  const records = sortByEmployeeName(
    ((run?.payroll_records ?? []) as PayrollRecord[]).filter(
      (record) =>
        (record.status ?? '').toUpperCase() === 'FINALISED' &&
        isEmployeeOnPayrollRun(record.employees, run),
    ),
  )
  const locked = ['LOCKED', 'COMPLETED'].includes((run?.status ?? '').toUpperCase())

  useEffect(() => {
    if (preselect || records.length === 0) return
    setSelected(records.map((record) => idOf(record)))
  }, [preselect, records.length])

  useEffect(() => {
    if (!companyQuery.data?.data) return
    setDisplayOptions(parsePayslipDisplayOptions(companyQuery.data.data.payslip_display_options))
  }, [companyQuery.dataUpdatedAt])

  async function persistDisplayOptions(next: PayslipDisplayOptions) {
    if (!companyId) return
    await companiesApi.update(companyId, { payslip_display_options: next })
  }

  function changeDisplayOptions(next: PayslipDisplayOptions) {
    setDisplayOptions(next)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void persistDisplayOptions(next).catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not save payslip options')
      })
    }, 400)
  }

  const selectedRecords = useMemo(
    () => records.filter((record) => selected.includes(idOf(record))),
    [records, selected],
  )
  const allSelected = records.length > 0 && selected.length === records.length
  const periodLabel = (run?.pay_frequency ?? '').toUpperCase().includes('MONTH')
    ? 'Month Ending'
    : 'Week Ending'

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function ensurePayslips() {
    if (!companyId) throw new Error('Select a company first')
    if (selected.length === 0) throw new Error('Select at least one employee')
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
      await persistDisplayOptions(displayOptions)
    }
    for (const recordId of selected) {
      await payslipsApi.generateRecord(companyId, runId, recordId)
    }
    const result = await payslipsApi.forRun(companyId, runId)
    return payslipList(result.data).filter((item) =>
      selected.includes(String(item.payroll_record_id)),
    )
  }

  function employeeNameForSlip(slip: Record<string, unknown>) {
    const record = selectedRecords.find(
      (item) => idOf(item) === String(slip.payroll_record_id),
    )
    const name = fullName(record?.employees?.first_name, record?.employees?.last_name)
    return name === '—' ? 'Employee' : name
  }

  async function filesForSelected() {
    const slips = await ensurePayslips()
    if (slips.length === 0) {
      throw new Error('No payslips were generated for the selected employees.')
    }
    const used = new Set<string>()
    const files: { name: string; blob: Blob }[] = []
    for (const slip of slips) {
      const base = payslipFileName(employeeNameForSlip(slip), run)
      let name = base
      let suffix = 2
      while (used.has(name.toLowerCase())) {
        name = base.replace(/\.pdf$/i, ` (${suffix}).pdf`)
        suffix += 1
      }
      used.add(name.toLowerCase())
      const blob = await payslipsApi.fileBlob(companyId!, idOf(slip))
      files.push({ name, blob })
    }
    return files
  }

  async function downloadSelected() {
    setError(null)
    setBusy(true)
    try {
      const files = await filesForSelected()
      if (pack === 'zip') {
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
        return
      }
      for (const [index, file] of files.entries()) {
        downloadBlobFile(file.blob, file.name)
        if (index < files.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 350))
        }
      }
      setMessage(
        `${files.length} payslip PDF${files.length === 1 ? '' : 's'} downloaded.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setBusy(false)
    }
  }

  async function previewFirst() {
    setError(null)
    setBusy(true)
    try {
      const files = await filesForSelected()
      const first = files[0]
      if (!first) throw new Error('No payslip available to preview.')
      downloadBlobFile(first.blob, first.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendEmails() {
    setError(null)
    setBusy(true)
    try {
      if (!companyId) throw new Error('Select a company first')
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
        await persistDisplayOptions(displayOptions)
      }
      const sample = selectedRecords[0]
      const sampleName = employeeDisplayName({
        first: sample?.employees?.first_name,
        last: sample?.employees?.last_name,
      })
      const filledSubject = fillEmail(
        subject,
        { first: sample?.employees?.first_name, last: sample?.employees?.last_name },
        run?.period_end_date,
        companyName,
        scheduleWord(run?.pay_frequency),
      )
      const subjectToSend =
        sampleName && sampleName !== 'Employee' && filledSubject.includes(sampleName)
          ? filledSubject.replaceAll(sampleName, '[employee-name]')
          : subject

      const result = await payslipsApi.send(companyId, runId, {
        record_ids: selected,
        subject: subjectToSend,
        body,
        reply_to: replyTo.trim() || undefined,
        cc: cc.trim() || undefined,
      })
      setMessage(result.message || 'Payslip emails sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send payslips')
    } finally {
      setBusy(false)
    }
  }

  if (runQuery.isLoading) return <Loading />
  if (!run) return <Alert>Payroll run not found</Alert>

  const listPath = payrollListPathFromRun(run)
  const backTo = preselect
    ? `/payroll/runs/${runId}/records/${preselect}`
    : listPath
  const backState = preselect ? { from: listPath } : undefined

  return (
    <div>
      <p className="text-sm font-semibold text-[#607080]">
        Payroll &nbsp;&nbsp;&gt;&nbsp;&nbsp;
        <span className="text-navy">Create/Send</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(backTo, { state: backState })}
            className="flex items-center gap-3 text-[32px] font-semibold leading-none text-navy"
          >
            <ChevronLeft size={25} strokeWidth={2.4} />
            {isDownload ? 'Download Payslips' : 'Send Payslips'}
          </button>
          <p className="mt-2 text-sm font-medium text-muted">
            {periodLabel} {formatLongDate(run.period_end_date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={toolbarBtn} disabled>
            <Check size={16} />
            Finalise
          </button>
          <button type="button" className={toolbarBtn} disabled>
            <RefreshCw size={16} />
            Reopen
          </button>
          <CreateSendMenu companyId={companyId!} runId={runId} disabled />
          <button type="button" className={toolbarBtn} onClick={() => navigate('/payroll/runs')}>
            <SlidersHorizontal size={16} />
            Filter
          </button>
          <PayrollSchedulesMenu />
          <PayrollMoreMenu runId={runId} recordId={preselect || undefined} locked={locked} onUnavailable={setError} />
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mt-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <div className="mt-6 grid min-h-0 gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(280px,360px)]">
        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <div className="border-b border-[#d9d9d9] px-5 py-4">
            <h2 className="text-base font-semibold text-navy">Email Payslip PDFs</h2>
          </div>
          <label className="flex items-center gap-3 border-b border-[#d9d9d9] px-5 py-3 text-sm font-medium text-navy">
            <input
              type="checkbox"
              className="size-3.5 accent-navy"
              checked={allSelected}
              onChange={(event) =>
                setSelected(event.target.checked ? records.map((record) => idOf(record)) : [])
              }
            />
            Select all
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {records.map((record) => {
              const id = idOf(record)
              const name = fullName(record.employees?.first_name, record.employees?.last_name)
              return (
                <label
                  key={id}
                  className="flex h-[39px] items-center gap-3 border-b border-[#eee] px-5 text-sm text-navy hover:bg-cream"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-navy"
                    checked={selected.includes(id)}
                    onChange={() => toggle(id)}
                  />
                  <span className="truncate">{name === '—' ? 'Employee Name' : name}</span>
                </label>
              )
            })}
          </div>
          <p className="border-t border-[#d9d9d9] px-5 py-3 text-xs font-medium text-muted">
            {selected.length} of {records.length} employees selected.
          </p>
        </section>

        <section className="flex min-h-[520px] flex-col rounded-[10px] border border-[#d9d9d9] bg-white p-6">
          {isDownload ? (
            <>
              <h2 className="text-base font-semibold text-navy">Download Payslips</h2>
              <div className="mt-5 space-y-3 text-sm font-medium text-navy">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    className="mt-0.5 size-3.5 accent-navy"
                    checked={pack === 'single'}
                    onChange={() => setPack('single')}
                  />
                  <span>Download a single PDF document with a page or section for each employee.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    className="mt-0.5 size-3.5 accent-navy"
                    checked={pack === 'zip'}
                    onChange={() => setPack('zip')}
                  />
                  <span>Download a ZIP file containing separate employee PDF documents.</span>
                </label>
              </div>
              <div className="mt-auto flex justify-end gap-3 pt-8">
                <Button type="button" variant="ghost" onClick={() => navigate(backTo, { state: backState })}>
                  Cancel
                </Button>
                <Button type="button" variant="secondary" disabled={busy || selected.length === 0} onClick={() => void previewFirst()}>
                  Preview
                </Button>
                <Button type="button" disabled={busy || selected.length === 0} onClick={() => void downloadSelected()}>
                  Download
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-navy">Email Content</h2>
              <label className="mt-5 block">
                <span className="mb-1.5 block text-xs font-medium text-navy">Subject</span>
                <input
                  className="h-[35px] w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] px-3 text-xs text-navy outline-none"
                  value={fillEmail(
                    subject,
                    {
                      first: selectedRecords[0]?.employees?.first_name,
                      last: selectedRecords[0]?.employees?.last_name,
                    },
                    run.period_end_date,
                    companyName,
                    scheduleWord(run.pay_frequency),
                  )}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-medium text-navy">Reply to</span>
                <input
                  className="h-[35px] w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] px-3 text-xs text-navy outline-none"
                  value={replyTo}
                  onChange={(event) => setReplyTo(event.target.value)}
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-medium text-navy">Cc</span>
                <input
                  className="h-[35px] w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] px-3 text-xs text-navy outline-none"
                  value={cc}
                  onChange={(event) => setCc(event.target.value)}
                />
              </label>
              <label className="mt-4 flex items-start gap-3 text-sm font-medium text-navy">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 accent-navy"
                  checked={securePdf}
                  onChange={(event) => setSecurePdf(event.target.checked)}
                />
                Secure PDF attachments using employee passwords (where provided).
              </label>
              <label className="mt-4 block min-h-0 flex-1">
                <span className="mb-1.5 block text-xs font-medium text-navy">Body</span>
                <textarea
                  className="h-[220px] w-full rounded-[6px] border-[0.5px] border-[#d9d9d9] px-3 py-2 text-xs leading-5 text-navy outline-none"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => navigate(backTo, { state: backState })}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || selected.length === 0}
                  onClick={() => {
                    const sample = selectedRecords[0]
                    const sampleEmployee = {
                      first: sample?.employees?.first_name,
                      last: sample?.employees?.last_name,
                    }
                    setSubject(
                      fillEmail(
                        DEFAULT_SUBJECT,
                        sampleEmployee,
                        run.period_end_date,
                        companyName,
                        scheduleWord(run.pay_frequency),
                      ),
                    )
                    setBody(
                      fillEmail(
                        DEFAULT_BODY,
                        sampleEmployee,
                        run.period_end_date,
                        companyName,
                        scheduleWord(run.pay_frequency),
                      ),
                    )
                    void previewFirst()
                  }}
                >
                  Preview
                </Button>
                <Button type="button" disabled={busy || selected.length === 0} onClick={() => void sendEmails()}>
                  Send Email(s)
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
          <div className="border-b border-[#d9d9d9] px-5 py-3">
            <h2 className="text-base font-semibold text-navy">Customise</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <PayslipCustomisePanel options={displayOptions} onChange={changeDisplayOptions} />
          </div>
        </section>
      </div>
    </div>
  )
}

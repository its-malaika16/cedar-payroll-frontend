import { useEffect, useMemo, useState } from 'react'
import { useMatch, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, ChevronLeft, HelpCircle, Square } from 'lucide-react'
import { documentsApi, employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button } from '../../components/ui'
import { BrandIcon } from '../../components/BrandIcon'
import { fullName, idOf } from '../../lib/format'
import type { Employee } from '../../types'
import iconPerson from '../../assets/brand/icon-person.png'
import type { FormPreview } from './formPreview'
import { EMAIL_INSERTS, currentTaxYear, formLabel, isFormType } from './formsOptions'
import {
  downloadBlobFile,
  hasSheetTemplate,
  openSheetPlaceholder,
  sheetPackTitle,
  sheetsFromPreviews,
  writeSheetToWindow,
  zipUtf8Files,
} from './formPdf'

export function EmployeeFormsBulkPage() {
  const { formType = 'p11' } = useParams()
  const navigate = useNavigate()
  const { companyId, user, companies } = useAuth()
  const isDownload = Boolean(useMatch('/employees/forms/:formType/download'))
  const year = currentTaxYear()
  const type = isFormType(formType) ? formType : 'p11'
  const printable = hasSheetTemplate(type)
  const packTitle = printable ? sheetPackTitle(type, year.name) : `${formLabel(type)} ${year.name}`
  const companyName = companies.find((company) => company.id === companyId)?.name ?? ''
  const [selected, setSelected] = useState<string[]>([])
  const [replyTo, setReplyTo] = useState(user?.email ?? '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(`${formLabel(type)} for {first-name} {surname}`)
  const [body, setBody] = useState(
    `{first-name} {surname},\n\nPlease find attached your ${formLabel(type)} for the {tax-year-name} tax year.\n\nRegards, {employer-name}`,
  )
  const [secure, setSecure] = useState(false)
  const [pack, setPack] = useState<'single' | 'zip'>('single')
  const [insertOpen, setInsertOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const employees = (employeesQuery.data?.data ?? []) as Employee[]

  useEffect(() => {
    if (employees.length === 0 || selected.length) return
    setSelected(employees.slice(0, 3).map((item) => idOf(item)))
  }, [employees, selected.length])

  const selectedEmployees = useMemo(
    () => employees.filter((item) => selected.includes(idOf(item))),
    [employees, selected],
  )

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function taxValue(employee: Employee, key: string) {
    const details = employee.employee_tax_details?.[0]
    const value = details?.[key]
    return typeof value === 'string' ? value : ''
  }

  function fill(template: string, employee: Employee) {
    return template
      .replaceAll('{first-name}', employee.first_name || '')
      .replaceAll('{surname}', employee.last_name || '')
      .replaceAll('{title}', employee.title || '')
      .replaceAll('{works-number}', employee.employee_code || '')
      .replaceAll('{nino}', taxValue(employee, 'ni_number'))
      .replaceAll('{employer-name}', companyName)
      .replaceAll('{paye}', '')
      .replaceAll('{tax-year-name}', year.name)
      .replaceAll('{tax-year-end}', `5 April ${year.end}`)
  }

  async function loadPreviews() {
    if (!companyId || selectedEmployees.length === 0) return [] as FormPreview[]
    const items: FormPreview[] = []
    const failed: string[] = []
    for (const employee of selectedEmployees) {
      try {
        const result = await documentsApi.preview(companyId, idOf(employee), type, year.start, year.end)
        items.push(result.data as FormPreview)
      } catch {
        failed.push(fullName(employee.first_name, employee.last_name))
      }
    }
    if (items.length === 0) {
      throw new Error(
        failed.length
          ? `Could not generate ${formLabel(type)} for ${failed.join(', ')}.`
          : 'No employees selected.',
      )
    }
    return items
  }

  async function loadSheetPack() {
    const previews = await loadPreviews()
    return sheetsFromPreviews(type, previews)
  }

  function openMailDrafts() {
    const withEmail = selectedEmployees.filter((employee) => employee.email)
    const first = withEmail[0] ?? selectedEmployees[0]
    if (!first) return
    const mailSubject = encodeURIComponent(fill(subject, first))
    const mailBody = encodeURIComponent(fill(body, first))
    const to = withEmail.map((employee) => employee.email).filter(Boolean).join(',')
    window.location.href = `mailto:${to}?subject=${mailSubject}&body=${mailBody}${cc ? `&cc=${encodeURIComponent(cc)}` : ''}`
  }

  async function sendEmails() {
    setBusy(true)
    setMessage(null)
    let popup: Window | null = null
    try {
      if (printable) {
        popup = openSheetPlaceholder(type, packTitle)
        const sheets = await loadSheetPack()
        writeSheetToWindow(
          popup,
          type,
          sheets.map((sheet) => sheet.body),
          packTitle,
          true,
        )
        openMailDrafts()
        setMessage(
          `Print dialog opened so you can save each ${formLabel(type)} as PDF. Attach those files to the email draft for ${selected.length} employee${selected.length === 1 ? '' : 's'}.`,
        )
        return
      }
      openMailDrafts()
      setMessage(`Opened an email draft for ${selected.length} selected employee${selected.length === 1 ? '' : 's'}.`)
    } catch (error) {
      popup?.close()
      setMessage(error instanceof Error ? error.message : `Could not prepare the ${formLabel(type)} PDFs.`)
    } finally {
      setBusy(false)
    }
  }

  async function buildPackHtml() {
    if (!companyId || selected.length === 0) return ''
    const sections: string[] = []
    for (const employee of selectedEmployees) {
      const name = fullName(employee.first_name, employee.last_name)
      try {
        const result = await documentsApi.preview(companyId, idOf(employee), type, year.start, year.end)
        const payload = JSON.stringify(result.data, null, 2)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
        sections.push(
          `<section style="page-break-after:always;font-family:Montserrat,Arial,sans-serif;padding:24px;color:#17375e">
            <h1>${formLabel(type)} — ${name}</h1>
            <pre style="white-space:pre-wrap;font-size:12px">${payload}</pre>
          </section>`,
        )
      } catch {
        sections.push(
          `<section style="page-break-after:always;font-family:Montserrat,Arial,sans-serif;padding:24px;color:#17375e">
            <h1>${formLabel(type)} — ${name}</h1>
            <p>This form could not be generated for this employee.</p>
          </section>`,
        )
      }
    }
    return `<!doctype html><html><head><title>${formLabel(type)} ${year.name}</title></head><body>${sections.join('')}</body></html>`
  }

  async function previewSelected() {
    setBusy(true)
    setMessage(null)
    let popup: Window | null = null
    try {
      if (printable) {
        popup = openSheetPlaceholder(type, packTitle)
        const sheets = await loadSheetPack()
        writeSheetToWindow(
          popup,
          type,
          sheets.map((sheet) => sheet.body),
          packTitle,
          false,
        )
        return
      }
      popup = window.open('', '_blank')
      const html = await buildPackHtml()
      if (!html) {
        popup?.close()
        return
      }
      if (!popup) {
        throw new Error('Allow pop-ups to preview the selected forms.')
      }
      popup.document.write(html)
      popup.document.close()
    } catch (error) {
      popup?.close()
      setMessage(error instanceof Error ? error.message : 'Could not preview the selected forms.')
    } finally {
      setBusy(false)
    }
  }

  async function downloadSelected() {
    setBusy(true)
    setMessage(null)
    let popup: Window | null = null
    try {
      if (printable) {
        if (pack === 'zip') {
          const sheets = await loadSheetPack()
          const zip = zipUtf8Files(
            sheets.map((sheet) => ({ name: sheet.filename, content: sheet.html })),
          )
          downloadBlobFile(zip, `${formLabel(type)}-${year.name.replaceAll('/', '-')}.zip`)
          setMessage(
            `Downloaded ${sheets.length} ${formLabel(type)} file${sheets.length === 1 ? '' : 's'}. Open each file and choose Print → Save as PDF.`,
          )
          return
        }
        popup = openSheetPlaceholder(type, packTitle)
        const sheets = await loadSheetPack()
        writeSheetToWindow(
          popup,
          type,
          sheets.map((sheet) => sheet.body),
          packTitle,
          true,
        )
        setMessage(
          `Use the print dialog to save a single ${formLabel(type)} PDF with a page for each of the ${sheets.length} selected employee${sheets.length === 1 ? '' : 's'}.`,
        )
        return
      }
      const html = await buildPackHtml()
      if (!html) return
      downloadBlobFile(new Blob([html], { type: 'text/html' }), `${formLabel(type)}-${year.name}.html`)
      setMessage(
        `Downloaded ${formLabel(type)} for ${selected.length} employee${selected.length === 1 ? '' : 's'} as an HTML file you can print to PDF.`,
      )
    } catch (error) {
      popup?.close()
      setMessage(error instanceof Error ? error.message : 'Could not download the selected forms.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[560px] gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,1.2fr)]">
      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
        <div className="flex gap-4 border-b border-[#d9d9d9] px-4 py-3 text-[11px] font-medium text-navy">
          <button type="button" className="flex items-center gap-1" onClick={() => setSelected(employees.map((item) => idOf(item)))}>
            <CheckSquare size={14} /> Select all
          </button>
          <button type="button" className="flex items-center gap-1" onClick={() => setSelected([])}>
            <Square size={14} /> Select None
          </button>
          <span className="flex items-center gap-1 text-[#607080]">
            <HelpCircle size={14} /> Select by...
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {employees.map((employee) => {
            const id = idOf(employee)
            return (
              <label key={id} className="flex items-center gap-3 border-b border-[#eee] px-4 py-2.5 text-sm text-navy">
                <input
                  type="checkbox"
                  className="size-3.5 accent-navy"
                  checked={selected.includes(id)}
                  onChange={() => toggle(id)}
                />
                <BrandIcon src={iconPerson} alt="" className="h-[19px] w-4" tone="light" />
                <span className="truncate">{fullName(employee.first_name, employee.last_name)}</span>
              </label>
            )
          })}
        </div>
        <p className="border-t border-[#d9d9d9] px-4 py-3 text-xs text-[#607080]">
          {selected.length} of {employees.length} employees selected
        </p>
      </section>

      <section className="flex min-h-[520px] flex-col rounded-[10px] border border-[#d9d9d9] bg-white p-5">
        <button
          type="button"
          className="mb-4 flex items-center gap-2 text-base font-semibold text-navy"
          onClick={() => navigate('/employees')}
        >
          <ChevronLeft size={18} />
          {isDownload ? `Download ${formLabel(type)} PDF for Multiple Employees` : `Email ${formLabel(type)} PDF for Multiple Employees`}
        </button>
        {message ? (
          <div className="mb-3">
            <Alert tone={/could not|allow pop/i.test(message) ? 'danger' : 'success'}>{message}</Alert>
          </div>
        ) : null}
        {isDownload ? (
          <>
            <div className="space-y-3 text-sm font-medium text-navy">
              <label className="flex items-start gap-3">
                <input type="radio" className="mt-1 size-3.5 accent-navy" checked={pack === 'single'} onChange={() => setPack('single')} />
                Download a single PDF document with a page or section for each employee
              </label>
              <label className="flex items-start gap-3">
                <input type="radio" className="mt-1 size-3.5 accent-navy" checked={pack === 'zip'} onChange={() => setPack('zip')} />
                Download a ZIP file containing separate employee PDF documents
              </label>
            </div>
            <label className="mt-6 flex items-start gap-3 text-sm text-navy">
              <input type="checkbox" className="mt-1 size-3.5 accent-navy" checked={secure} onChange={(event) => setSecure(event.target.checked)} />
              Secure PDF attachments using employee passwords (where provided)
            </label>
            <div className="mt-auto flex justify-end gap-2 pt-8">
              <Button variant="secondary" onClick={() => navigate('/employees')}>
                Cancel
              </Button>
              <Button variant="secondary" disabled={selected.length === 0 || busy} onClick={() => void previewSelected()}>
                {busy ? 'Working…' : 'Preview'}
              </Button>
              <Button disabled={selected.length === 0 || busy} onClick={() => void downloadSelected()}>
                {busy ? 'Working…' : 'Download'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-navy">
              Reply to
              <input className="mt-1 h-[35px] w-full rounded-[6px] border border-[#d9d9d9] px-3 text-xs" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} />
            </label>
            <label className="mt-3 block text-xs font-medium text-navy">
              Cc
              <input className="mt-1 h-[35px] w-full rounded-[6px] border border-[#d9d9d9] px-3 text-xs" value={cc} onChange={(event) => setCc(event.target.value)} />
            </label>
            <label className="mt-3 block text-xs font-medium text-navy">
              Subject
              <input className="mt-1 h-[35px] w-full rounded-[6px] border border-[#d9d9d9] px-3 text-xs" value={subject} onChange={(event) => setSubject(event.target.value)} />
            </label>
            <div className="relative mt-3 min-h-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-navy">Body</span>
                <div className="relative">
                  <button type="button" className="text-xs font-semibold text-navy" onClick={() => setInsertOpen((value) => !value)}>
                    Insert ▾
                  </button>
                  {insertOpen ? (
                    <div className="absolute right-0 z-20 mt-1 w-[260px] rounded-[8px] border border-[#d9d9d9] bg-white py-1 shadow-sm">
                      {EMAIL_INSERTS.map((group) => (
                        <div key={group.group}>
                          <p className="px-3 py-1 text-[10px] font-semibold text-[#607080]">{group.group}</p>
                          {group.items.map((item) => (
                            <button
                              key={item.token}
                              type="button"
                              className="block w-full px-3 py-1.5 text-left text-xs text-navy hover:bg-[#f0f5fe]"
                              onClick={() => {
                                setBody((current) => `${current}${item.token}`)
                                setInsertOpen(false)
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <textarea
                className="h-[220px] w-full rounded-[6px] border border-[#d9d9d9] px-3 py-2 text-xs leading-5 text-navy outline-none"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <label className="mt-3 flex items-start gap-3 text-sm text-navy">
              <input type="checkbox" className="mt-1 size-3.5 accent-navy" checked={secure} onChange={(event) => setSecure(event.target.checked)} />
              Secure PDF attachments using employee passwords (where provided)
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate('/employees')}>
                Cancel
              </Button>
              <Button variant="secondary" disabled={selected.length === 0 || busy} onClick={() => void previewSelected()}>
                {busy ? 'Working…' : 'Preview'}
              </Button>
              <Button disabled={selected.length === 0 || busy} onClick={() => void sendEmails()}>
                {busy ? 'Working…' : 'Send Email(s)'}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

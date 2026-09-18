import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, Send, X } from 'lucide-react'
import { documentsApi, employeesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading } from '../../components/ui'
import { idOf } from '../../lib/format'
import type { Employee } from '../../types'
import { FormDocument } from './FormDocuments'
import type { FormPreview } from './formPreview'
import { currentTaxYear, formLabel, isFormType } from './formsOptions'
import {
  hasSheetTemplate,
  openSheetPlaceholder,
  sheetTitle,
  sheetsFromPreviews,
  writeSheetToWindow,
} from './formPdf'

const P45_PARTS = [
  { id: '1', label: 'Include Part 1', hint: 'Details of employee leaving work - copy for HMRC' },
  { id: '1A', label: 'Include Part 1A', hint: 'Details of employee leaving work - copy for employee' },
  { id: '2', label: 'Include Part 2', hint: 'Details of employee leaving work - copy for new employer' },
  { id: '3', label: 'Include Part 3', hint: 'New employee details - for completion by new employer' },
]

export function EmployeeFormsPage() {
  const { formType = 'p11', employeeId } = useParams()
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const year = currentTaxYear()
  const [p45Parts, setP45Parts] = useState(['1', '1A', '2', '3'])
  const [p45Ready, setP45Ready] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const employeesQuery = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeesApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const employees = (employeesQuery.data?.data ?? []) as Employee[]

  useEffect(() => {
    if (employeeId || employees.length === 0 || !isFormType(formType)) return
    navigate(`/employees/forms/${formType}/${idOf(employees[0])}`, { replace: true })
  }, [employeeId, employees, formType, navigate])

  useEffect(() => {
    setP45Ready(false)
    setP45Parts(['1', '1A', '2', '3'])
    setNotice(null)
  }, [employeeId, formType])

  const previewQuery = useQuery({
    queryKey: ['form-preview', companyId, employeeId, formType, year.start],
    queryFn: () =>
      documentsApi.preview(companyId!, employeeId!, formType, year.start, year.end),
    enabled: Boolean(companyId && employeeId && isFormType(formType)),
  })

  const data = previewQuery.data?.data as FormPreview | undefined
  const type = isFormType(formType) ? formType : 'p11'
  const ineligible = type === 'p45' && data && data.eligible === false
  const needsParts = type === 'p45' && data?.eligible && !p45Ready

  const printable = hasSheetTemplate(type)

  async function prepareSheetPdf() {
    let popup: Window | null = null
    try {
      if (!data) return
      const title = sheetTitle(type, data)
      popup = openSheetPlaceholder(type, title)
      const [{ body }] = await sheetsFromPreviews(type, [data])
      writeSheetToWindow(popup, type, [body], title, true)
    } catch (error) {
      popup?.close()
      throw error
    }
  }

  async function emailForm() {
    const name = data?.employee?.display_name || 'employee'
    if (printable && data) {
      try {
        await prepareSheetPdf()
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `Could not open the ${formLabel(type)} PDF.`)
        return
      }
    }
    const subject = encodeURIComponent(`${formLabel(type)} for ${name}`)
    const body = encodeURIComponent(
      `${name},\n\nPlease find attached your ${formLabel(type)} for the ${year.name} tax year.\n\nRegards,\n${data?.employer?.name ?? ''}`,
    )
    window.location.href = `mailto:${data?.employee?.email ?? ''}?subject=${subject}&body=${body}`
    setNotice(
      printable
        ? `Print dialog opened so you can save the ${formLabel(type)} as PDF. Attach that file to the email draft before sending.`
        : 'Email draft opened in your mail app. Attach the downloaded form before sending.',
    )
  }

  async function downloadForm() {
    if (printable && data) {
      try {
        await prepareSheetPdf()
        setNotice(`Use the print dialog to save the ${formLabel(type)} as a PDF.`)
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `Could not open the ${formLabel(type)} PDF.`)
      }
      return
    }
    window.print()
  }

  if (!isFormType(formType)) {
    return <Alert>Unknown form</Alert>
  }

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-[8px] border border-[#d9d9d9] text-navy"
          onClick={() => void emailForm()}
          title="Send"
        >
          <Send size={16} />
        </button>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-[8px] border border-[#d9d9d9] text-navy"
          onClick={() => void downloadForm()}
          title="Download"
        >
          <Download size={16} />
        </button>
      </div>
      {notice ? (
        <div className="mb-4 print:hidden">
          <Alert tone={/could not|allow pop/i.test(notice) ? 'danger' : 'success'}>{notice}</Alert>
        </div>
      ) : null}
      {previewQuery.isLoading ? <Loading /> : null}
      {previewQuery.error ? (
        <Alert>{previewQuery.error instanceof Error ? previewQuery.error.message : 'Could not load form'}</Alert>
      ) : null}
      {data && !ineligible && !needsParts ? (
        <FormDocument type={type} data={data} p45Parts={p45Parts} />
      ) : null}

      {ineligible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 print:hidden">
          <div className="w-full max-w-[460px] rounded-[12px] bg-white p-6 shadow-lg">
            <div className="mb-4 flex justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
                i
              </span>
            </div>
            <p className="text-center text-base font-semibold text-navy">{data.message}</p>
            <p className="mt-2 text-center text-sm text-navy">{data.detail}</p>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => navigate('/employees')}>
                OK
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {needsParts ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 print:hidden">
          <div className="w-full max-w-[520px] rounded-[12px] bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#d9d9d9] px-5 py-3">
              <p className="text-lg font-semibold text-navy">P45</p>
              <button type="button" onClick={() => navigate('/employees')}>
                <X className="text-brand" size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="mb-4 text-sm text-navy">Which parts of the P45 would you like to include?</p>
              <div className="space-y-3">
                {P45_PARTS.map((part) => (
                  <label key={part.id} className="flex items-start gap-3 text-sm text-navy">
                    <input
                      type="checkbox"
                      className="mt-1 size-3.5 accent-navy"
                      checked={p45Parts.includes(part.id)}
                      onChange={(event) =>
                        setP45Parts((current) =>
                          event.target.checked
                            ? [...current, part.id]
                            : current.filter((item) => item !== part.id),
                        )
                      }
                    />
                    <span>
                      <span className="font-semibold">{part.label}</span>
                      <span className="block text-xs text-[#607080]">{part.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => navigate('/employees')}>
                  Cancel
                </Button>
                <Button disabled={p45Parts.length === 0} onClick={() => setP45Ready(true)}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

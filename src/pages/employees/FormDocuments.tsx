import { useEffect, useMemo, useState, type ReactNode } from 'react'
import formLogo from '../../assets/brand/logo-forms.png'
import { formatDate } from '../../lib/format'
import type { FormPreview } from './formPreview'
import type { FormType } from './formsOptions'
import {
  hasSheetTemplate,
  sheetBodyHtml,
  sheetDocument,
  sheetLogoDataUrl,
  sheetTitle,
} from './formPdf'

export type { FormPreview } from './formPreview'

export function FormDocument({
  type,
  data,
  p45Parts,
}: {
  type: FormType
  data: FormPreview
  p45Parts?: string[]
}) {
  if (hasSheetTemplate(type)) return <SheetDocument type={type} data={data} p45Parts={p45Parts} />
  return <BenefitsDocument type={type} data={data} />
}

function SheetDocument({
  type,
  data,
  p45Parts,
}: {
  type: FormType
  data: FormPreview
  p45Parts?: string[]
}) {
  const [logoSrc, setLogoSrc] = useState(formLogo)

  useEffect(() => {
    void sheetLogoDataUrl().then(setLogoSrc)
  }, [])

  const title = sheetTitle(type, data)
  const html = useMemo(
    () => sheetDocument(type, [sheetBodyHtml(type, data, logoSrc, { p45Parts })], title),
    [type, data, logoSrc, title, p45Parts],
  )

  return (
    <iframe
      title={title}
      className="w-full rounded-[10px] border border-[#d9d9d9] bg-[#e8ebe9]"
      srcDoc={html}
      style={{ minHeight: type === 'p45' ? 1680 : 1200 }}
      onLoad={(event) => {
        const frame = event.currentTarget
        const height = frame.contentDocument?.documentElement.scrollHeight
        if (height) frame.style.height = `${height + 24}px`
      }}
    />
  )
}

function DocShell({
  badge,
  title,
  children,
}: {
  badge: string
  title: string
  children: ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white p-6 shadow-sm print:shadow-none">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-navy">{title}</h2>
            <span className="rounded bg-navy px-2 py-0.5 text-xs font-semibold text-white">{badge}</span>
          </div>
        </div>
        <img src={formLogo} alt="Cedar Payroll" className="h-12 w-auto object-contain object-right" />
      </div>
      {children}
    </article>
  )
}

function InfoGrid({ data }: { data: FormPreview }) {
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2">
      <div className="rounded-[8px] border border-[#d9d9d9] p-4 text-xs text-navy">
        <p className="mb-2 font-semibold">Employer</p>
        <p>Name: {data.employer?.name || '—'}</p>
        <p>PAYE reference: {data.employer?.paye_reference || '—'}</p>
      </div>
      <div className="rounded-[8px] border border-[#d9d9d9] p-4 text-xs text-navy">
        <p className="mb-2 font-semibold">Employee</p>
        <p>NINO: {data.employee?.ni_number || '—'}</p>
        <p>Date of birth: {formatDate(data.employee?.dob)}</p>
        <p>Works number: {data.employee?.works_number || data.employee?.payroll_id || '—'}</p>
        <p>Gender: {data.employee?.gender || '—'}</p>
        <p>Start date: {formatDate(data.employee?.start_date)}</p>
        <p>Leave date: {formatDate(data.employee?.leave_date)}</p>
        <p>Director: {data.employee?.is_director ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}

function BenefitsDocument({ type, data }: { type: FormType; data: FormPreview }) {
  const label = type === 'p11d' ? 'P11D' : 'PBIK'
  const name = data.employee?.display_name || 'Employee'
  return (
    <DocShell badge={label} title={`${name} Expenses and Benefits ${data.tax_year?.name ?? ''}`}>
      <InfoGrid data={data} />
      {type === 'p11d' ? (
        <p className="rounded-[8px] border border-[#d9d9d9] bg-[#f8f7f4] px-4 py-8 text-center text-sm text-navy">
          {name} does not have any P11D benefits in the {data.tax_year?.name} tax year.
        </p>
      ) : (
        <p className="rounded-[8px] border border-[#d9d9d9] bg-[#f8f7f4] px-4 py-8 text-center text-sm text-navy">
          {name} does not have any payrolled benefits in kind in the {data.tax_year?.name} tax year.
        </p>
      )}
    </DocShell>
  )
}

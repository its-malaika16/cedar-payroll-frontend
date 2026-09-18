import { useEffect, useMemo, useState, type ReactNode } from 'react'
import formLogo from '../../assets/brand/logo-forms.png'
import { formatDate, money } from '../../lib/format'
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
  if (hasSheetTemplate(type)) return <SheetDocument type={type} data={data} />
  if (type === 'p45') return <P45Document data={data} parts={p45Parts ?? ['1', '1A', '2', '3']} />
  return <BenefitsDocument type={type} data={data} />
}

function SheetDocument({ type, data }: { type: FormType; data: FormPreview }) {
  const [logoSrc, setLogoSrc] = useState(formLogo)

  useEffect(() => {
    void sheetLogoDataUrl().then(setLogoSrc)
  }, [])

  const title = sheetTitle(type, data)
  const html = useMemo(
    () => sheetDocument(type, [sheetBodyHtml(type, data, logoSrc)], title),
    [type, data, logoSrc, title],
  )

  return (
    <iframe
      title={title}
      className="w-full rounded-[10px] border border-[#d9d9d9] bg-white"
      srcDoc={html}
      style={{ minHeight: 1200 }}
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

function P45Row({ n, label, value }: { n: number; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#ececec] py-2.5 text-sm">
      <p className="text-navy">
        <span className="mr-2 font-semibold">{n}.</span>
        {label}
      </p>
      <p className="text-right font-medium text-navy">{value || '—'}</p>
    </div>
  )
}

function P45Part({
  title,
  subtitle,
  data,
}: {
  title: string
  subtitle: string
  data: FormPreview
}) {
  const p45 = data.p45 ?? {}
  return (
    <article className="mb-6 overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
      <div className="flex items-center justify-between bg-navy px-5 py-3 text-white">
        <div>
          <p className="text-lg font-semibold">P45</p>
          <p className="text-xs">{title}</p>
        </div>
        <p className="text-xs">{subtitle}</p>
      </div>
      <div className="p-5">
        <P45Row n={1} label="Employer PAYE reference" value={data.employer?.paye_reference || ''} />
        <P45Row n={2} label="Employee's National Insurance number" value={data.employee?.ni_number || ''} />
        <P45Row n={3} label="Title" value={data.employee?.title || ''} />
        <P45Row n={3} label="First or given name(s)" value={data.employee?.first_name || ''} />
        <P45Row n={3} label="Surname or family name" value={data.employee?.last_name || ''} />
        <P45Row
          n={4}
          label="Leaving date"
          value={formatDate(
            typeof p45.leaving_date === 'string'
              ? p45.leaving_date
              : data.employee?.leave_date,
          )}
        />
        <P45Row n={5} label="Student Loan deductions" value={p45.student_loan ? 'Yes' : 'No'} />
        <P45Row n={6} label="Tax code at leaving date" value={String(p45.tax_code ?? '—')} />
        <P45Row n={7} label="Last week number on P11" value={p45.last_week_number != null ? String(p45.last_week_number) : '—'} />
        <P45Row n={7} label="Total pay to date" value={money(p45.total_pay_to_date)} />
        <P45Row n={7} label="Total tax to date" value={money(p45.total_tax_to_date)} />
        <P45Row n={9} label="Works/payroll number" value={data.employee?.payroll_id || data.employee?.works_number || ''} />
        <P45Row n={9} label="Department" value={data.employee?.department || ''} />
        <P45Row n={10} label="Gender" value={data.employee?.gender || ''} />
        <P45Row n={11} label="Date of birth" value={formatDate(data.employee?.dob)} />
        <P45Row n={12} label="Employee's private address" value={data.employee?.address || ''} />
        <P45Row n={13} label="Employer name" value={data.employer?.name || ''} />
        <P45Row n={13} label="Employer address" value={[data.employer?.address, data.employer?.postcode].filter(Boolean).join(', ')} />
        <P45Row n={14} label="Employee is deceased" value={p45.deceased ? 'Yes' : 'No'} />
      </div>
    </article>
  )
}

function P45Document({ data, parts }: { data: FormPreview; parts: string[] }) {
  const copy: Record<string, [string, string]> = {
    '1': ['Details of employee leaving work', 'Part 1 (Copy for HMRC)'],
    '1A': ['Details of employee leaving work', 'Part 1A (Copy for Employee)'],
    '2': ['Details of employee leaving work', 'Part 2 (Copy for New Employer)'],
    '3': ['Details of employee leaving work', 'Part 3 (For completion by new employer)'],
  }
  return (
    <div>
      {parts.map((part) => {
        const labels = copy[part] ?? ['Details of employee leaving work', `Part ${part}`]
        return <P45Part key={part} title={labels[0]} subtitle={labels[1]} data={data} />
      })}
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

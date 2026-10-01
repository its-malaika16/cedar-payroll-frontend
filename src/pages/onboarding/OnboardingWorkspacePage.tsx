import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, FileText, Upload } from 'lucide-react'
import { onboardingApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Field, Input, Loading, PageHeader, Select, onSubmit } from '../../components/ui'
import { joinPaye, splitPaye, EMPLOYER_COUNTRIES } from '../settings/employerSettings'
import type { OnboardingCompany } from '../../types'

function moduleLabel(value: string) {
  if (value === 'HR') return 'HR'
  if (value === 'INVOICE') return 'Invoice'
  if (value === 'GENERAL') return 'General'
  return 'Payroll'
}

type DetailsForm = {
  company_name: string
  trading_name: string
  office_number: string
  address_line_1: string
  address_line_2: string
  address_line_3: string
  address_line_4: string
  postcode: string
  country: string
  sector: string
  paye_office: string
  paye_reference: string
  accounts_office_reference: string
  company_registration_number: string
  pension_provider: string
  pension_employer_id: string
}

function formFrom(company: OnboardingCompany): DetailsForm {
  const paye = splitPaye(company.paye_reference)
  return {
    company_name: company.company_name ?? '',
    trading_name: company.trading_name ?? '',
    office_number: company.office_number ?? '',
    address_line_1: company.address_line_1 ?? '',
    address_line_2: company.address_line_2 ?? '',
    address_line_3: company.address_line_3 ?? '',
    address_line_4: company.address_line_4 ?? '',
    postcode: company.postcode ?? '',
    country: company.country || 'England',
    sector: company.sector ?? '',
    paye_office: paye.office,
    paye_reference: paye.reference,
    accounts_office_reference: company.accounts_office_reference ?? '',
    company_registration_number: company.company_registration_number ?? '',
    pension_provider: company.pension_provider ?? '',
    pension_employer_id: company.pension_employer_id ?? '',
  }
}

export function OnboardingWorkspacePage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<DetailsForm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['onboarding-me'],
    queryFn: () => onboardingApi.mine(),
  })
  const company = query.data?.data as OnboardingCompany | undefined

  useEffect(() => {
    if (company) setForm(formFrom(company))
  }, [company?.id, company?.status, company?.onboarding_review_note])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['onboarding-me'] })

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => onboardingApi.saveDetails(body),
    onSuccess: async () => {
      await refresh()
      await auth.refresh()
    },
  })

  if (!auth.needsOnboarding) return <Navigate to="/" replace />
  if (query.isLoading || !form) return <Loading />
  if (!company) return <Alert>Onboarding was not found for this account.</Alert>

  const locked = company.status === 'PENDING_REVIEW'
  const signedCount = company.contracts.filter((item) => item.signed).length

  function patch(next: Partial<DetailsForm>) {
    setForm((current) => (current ? { ...current, ...next } : current))
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Company onboarding"
        subtitle="Provide your company details, sign the contract(s), then send everything to Cedar Payroll for review."
      />

      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { n: '1', title: 'Company details', done: Boolean(company.address_line_1 && company.postcode) },
          {
            n: '2',
            title: 'Sign contracts',
            done: company.contracts.length > 0 && signedCount === company.contracts.length,
          },
          { n: '3', title: 'Bureau review', done: company.status === 'PENDING_REVIEW' },
        ].map((step) => (
          <li
            key={step.n}
            className={`rounded-[14px] border px-4 py-3 ${
              step.done ? 'border-emerald-200 bg-emerald-50' : 'border-[#e6eaf0] bg-white'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Step {step.n}</p>
            <p className="mt-1 font-semibold text-navy">{step.title}</p>
          </li>
        ))}
      </ol>

      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}
      {company.onboarding_review_note ? (
        <Alert tone="warning" className="mb-4">
          Cedar Payroll asked for changes: {company.onboarding_review_note}
        </Alert>
      ) : null}
      {locked ? (
        <Alert tone="info" className="mb-4">
          Your details and signed contracts are with Cedar Payroll for review. You will be able to use the
          software once they are approved.
        </Alert>
      ) : null}

      <section className="mb-6 rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
        <h2 className="text-lg font-semibold text-navy">Company details</h2>
        <p className="mt-1 mb-5 text-sm text-muted">This is used on payroll, invoices and HMRC submissions.</p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={onSubmit(async () => {
            if (!form.company_name.trim() || !form.address_line_1.trim() || !form.postcode.trim()) {
              throw new Error('Enter the company name, address and postcode')
            }
            await save.mutateAsync({
              company_name: form.company_name.trim(),
              trading_name: form.trading_name.trim() || null,
              office_number: form.office_number.trim() || null,
              address_line_1: form.address_line_1.trim() || null,
              address_line_2: form.address_line_2.trim() || null,
              address_line_3: form.address_line_3.trim() || null,
              address_line_4: form.address_line_4.trim() || null,
              postcode: form.postcode.trim() || null,
              country: form.country.trim() || null,
              sector: form.sector.trim() || null,
              paye_reference: joinPaye(form.paye_office, form.paye_reference) || null,
              accounts_office_reference: form.accounts_office_reference.trim() || null,
              company_registration_number: form.company_registration_number.trim() || null,
              pension_provider: form.pension_provider.trim() || null,
              pension_employer_id: form.pension_employer_id.trim() || null,
            })
            setMessage('Company details saved')
          }, setError, setSaving)}
        >
          <Field label="Company name">
            <Input variant="outline" value={form.company_name} disabled={locked} onChange={(e) => patch({ company_name: e.target.value })} />
          </Field>
          <Field label="Trading name">
            <Input variant="outline" value={form.trading_name} disabled={locked} onChange={(e) => patch({ trading_name: e.target.value })} />
          </Field>
          <Field label="Office number">
            <Input variant="outline" value={form.office_number} disabled={locked} onChange={(e) => patch({ office_number: e.target.value })} />
          </Field>
          <Field label="Sector">
            <Input variant="outline" value={form.sector} disabled={locked} onChange={(e) => patch({ sector: e.target.value })} />
          </Field>
          <Field label="Address line 1">
            <Input variant="outline" value={form.address_line_1} disabled={locked} onChange={(e) => patch({ address_line_1: e.target.value })} />
          </Field>
          <Field label="Address line 2">
            <Input variant="outline" value={form.address_line_2} disabled={locked} onChange={(e) => patch({ address_line_2: e.target.value })} />
          </Field>
          <Field label="Address line 3">
            <Input variant="outline" value={form.address_line_3} disabled={locked} onChange={(e) => patch({ address_line_3: e.target.value })} />
          </Field>
          <Field label="Address line 4">
            <Input variant="outline" value={form.address_line_4} disabled={locked} onChange={(e) => patch({ address_line_4: e.target.value })} />
          </Field>
          <Field label="Postcode">
            <Input variant="outline" value={form.postcode} disabled={locked} onChange={(e) => patch({ postcode: e.target.value })} />
          </Field>
          <Field label="Country">
            <Select variant="outline" value={form.country} disabled={locked} onChange={(e) => patch({ country: e.target.value })}>
              {EMPLOYER_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="PAYE office number">
            <Input variant="outline" value={form.paye_office} disabled={locked} onChange={(e) => patch({ paye_office: e.target.value })} />
          </Field>
          <Field label="PAYE reference">
            <Input variant="outline" value={form.paye_reference} disabled={locked} onChange={(e) => patch({ paye_reference: e.target.value })} />
          </Field>
          <Field label="Accounts office reference">
            <Input variant="outline" value={form.accounts_office_reference} disabled={locked} onChange={(e) => patch({ accounts_office_reference: e.target.value })} />
          </Field>
          <Field label="Company registration number">
            <Input variant="outline" value={form.company_registration_number} disabled={locked} onChange={(e) => patch({ company_registration_number: e.target.value })} />
          </Field>
          <Field label="Pension provider">
            <Input variant="outline" value={form.pension_provider} disabled={locked} onChange={(e) => patch({ pension_provider: e.target.value })} />
          </Field>
          <Field label="Pension employer ID">
            <Input variant="outline" value={form.pension_employer_id} disabled={locked} onChange={(e) => patch({ pension_employer_id: e.target.value })} />
          </Field>
          {locked ? null : (
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save details'}
              </Button>
            </div>
          )}
        </form>
      </section>

      <section className="mb-6 rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
        <h2 className="text-lg font-semibold text-navy">Contracts</h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          Download each contract, sign it, then upload the signed copy. Modules:{' '}
          {company.modules.map(moduleLabel).join(', ') || 'None yet'}.
        </p>
        {company.contracts.length === 0 ? (
          <p className="rounded-[12px] border border-[#e8edf5] bg-[#f7f9fc] px-4 py-3 text-sm text-muted">
            Waiting for Cedar Payroll to upload your contract(s).
          </p>
        ) : (
          <ul className="space-y-3">
            {company.contracts.map((contract) => (
              <li
                key={contract.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#eef1f5] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{contract.title}</p>
                  <p className="text-xs text-muted">
                    {moduleLabel(contract.module)}
                    {contract.signed ? ' · Signed' : ' · Awaiting signature'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() =>
                      onboardingApi.downloadMine(contract.id, 'original', contract.original_file_name)
                    }
                  >
                    <Download size={15} />
                    Download
                  </Button>
                  {contract.signed ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      <Check size={15} /> Signed
                    </span>
                  ) : locked ? null : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] bg-navy px-4 py-2.5 text-sm font-medium text-white">
                      <Upload size={15} />
                      Upload signed
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          if (!file) return
                          setError(null)
                          try {
                            const data = new FormData()
                            data.append('file', file)
                            await onboardingApi.uploadSigned(contract.id, data)
                            await refresh()
                            setMessage(`Signed copy uploaded for ${contract.title}`)
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Could not upload the signed contract')
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {locked ? null : (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={save.isPending}
            onClick={async () => {
              setError(null)
              try {
                await onboardingApi.submit()
                await refresh()
                await auth.refresh()
                setMessage('Submitted for review. Cedar Payroll will be in touch once it is approved.')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not submit onboarding')
              }
            }}
          >
            <FileText size={15} />
            Submit for review
          </Button>
        </div>
      )}
    </div>
  )
}

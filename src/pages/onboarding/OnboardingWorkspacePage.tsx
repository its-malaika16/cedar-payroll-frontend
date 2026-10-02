import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Clock, Download, FileText, Upload, X } from 'lucide-react'
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

type WizardStep = 1 | 2 | 3 | 4

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

function detailsComplete(company: OnboardingCompany) {
  return Boolean(company.company_name?.trim() && company.address_line_1?.trim() && company.postcode?.trim())
}

function contractsComplete(company: OnboardingCompany) {
  return company.contracts.length > 0 && company.contracts.every((item) => item.signed)
}

function isRejected(company: OnboardingCompany) {
  return company.status === 'ONBOARDING' && Boolean(company.onboarding_review_note)
}

function stepStorageKey(companyId: string) {
  return `cedar.onboarding.step.${companyId}`
}

function storedStep(companyId: string): WizardStep | null {
  const value = Number(sessionStorage.getItem(stepStorageKey(companyId)))
  if (value === 1 || value === 2 || value === 3 || value === 4) return value
  return null
}

function persistStep(companyId: string, value: WizardStep) {
  sessionStorage.setItem(stepStorageKey(companyId), String(value))
}

function initialStep(company: OnboardingCompany): WizardStep {
  if (company.status === 'PENDING_REVIEW' || company.status === 'ACTIVE') return 4
  if (isRejected(company)) return 4
  return storedStep(company.id) ?? 1
}

export function OnboardingWorkspacePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<DetailsForm | null>(null)
  const [step, setStep] = useState<WizardStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const sawDecision = useRef(false)

  const query = useQuery({
    queryKey: ['onboarding-me'],
    queryFn: () => onboardingApi.mine(),
    refetchInterval: (current) => {
      const status = (current.state.data?.data as OnboardingCompany | undefined)?.status
      return status === 'PENDING_REVIEW' ? 8000 : false
    },
  })
  const company = query.data?.data as OnboardingCompany | undefined

  useEffect(() => {
    if (company) setForm(formFrom(company))
  }, [company?.id, company?.status, company?.onboarding_review_note])

  useEffect(() => {
    if (!company) return
    if (step == null) {
      const next = initialStep(company)
      setStep(next)
      persistStep(company.id, next)
      if (company.status === 'PENDING_REVIEW' || company.status === 'ACTIVE' || isRejected(company)) {
        sawDecision.current = true
      }
      return
    }
    if (company.status === 'PENDING_REVIEW' || company.status === 'ACTIVE') {
      setStep(4)
      persistStep(company.id, 4)
      sawDecision.current = true
    } else if (!sawDecision.current && isRejected(company)) {
      setStep(4)
      persistStep(company.id, 4)
      sawDecision.current = true
    }
  }, [company, step])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['onboarding-me'] })

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => onboardingApi.saveDetails(body),
    onSuccess: async () => {
      await refresh()
      await auth.refresh()
    },
  })

  if (!auth.needsOnboarding && company?.status !== 'ACTIVE') return <Navigate to="/" replace />
  if (query.isLoading || !form || !company || step == null) return <Loading />

  const locked = company.status === 'PENDING_REVIEW' || company.status === 'ACTIVE'
  const signedCount = company.contracts.filter((item) => item.signed).length
  const detailsDone = detailsComplete(company)
  const contractsDone = contractsComplete(company)
  const submitted = company.status === 'PENDING_REVIEW' || company.status === 'ACTIVE'
  const approved = company.status === 'ACTIVE'
  const rejected = isRejected(company)

  const steps = [
    {
      n: 1 as const,
      title: 'Company details',
      hint: 'Name, address and payroll details',
      done: detailsDone || submitted,
    },
    {
      n: 2 as const,
      title: 'Sign contracts',
      hint: company.contracts.length
        ? `${signedCount} of ${company.contracts.length} signed`
        : 'Download, sign and upload',
      done: contractsDone || submitted,
    },
    {
      n: 3 as const,
      title: 'Submit for review',
      hint: 'Send everything to Cedar Payroll',
      done: submitted,
    },
    {
      n: 4 as const,
      title: approved ? 'Approved' : rejected ? 'Rejected' : submitted ? 'Awaiting review' : 'Decision',
      hint: approved
        ? 'You can use Cedar Payroll'
        : rejected
          ? 'Changes were requested'
          : submitted
            ? 'Cedar Payroll is reviewing'
            : 'Approved or rejected',
      done: approved,
      failed: rejected,
      waiting: submitted && !approved && !rejected,
    },
  ]

  const doneCount = steps.filter((item) => item.done).length
  const percent = approved ? 100 : Math.round((doneCount / steps.length) * 100)
  const nextTitle = steps.find((item) => !item.done && item.n !== step)?.title
  const currentTitle = steps.find((item) => item.n === step)?.title ?? 'Company details'

  function patch(next: Partial<DetailsForm>) {
    setForm((current) => (current ? { ...current, ...next } : current))
  }

  const companyId = company.id

  function goTo(target: WizardStep) {
    setStep(target)
    persistStep(companyId, target)
  }

  function canOpen(target: WizardStep) {
    if (locked) return target === 4
    if (target === 1) return true
    if (target === 2) return detailsDone
    if (target === 3) return contractsDone
    return submitted || rejected
  }

  const progressCopy = approved
    ? 'All steps complete. Your company has been approved.'
    : rejected
      ? 'Onboarding was rejected. Update the details or contracts, then submit again.'
      : submitted
        ? '3 of 4 complete. Waiting for Cedar Payroll to approve or reject.'
        : `${doneCount} of 4 complete · ${currentTitle}.${nextTitle ? ` Next: ${nextTitle}.` : ''}`

  return (
    <div className="pb-10">
      <PageHeader
        title="Company onboarding"
        subtitle="Complete each step in order. Cedar Payroll will then approve or reject your application."
      />

      <section className="mb-6 rounded-[16px] border border-[#e6eaf0] bg-white p-5 shadow-[0_1px_8px_rgba(23,55,94,0.04)] md:p-6">
        <ol className="grid gap-0 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-start">
          {steps.map((item, index) => {
            const current = step === item.n
            const reachable = canOpen(item.n)
            return (
              <li key={item.n} className="contents">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && goTo(item.n)}
                  className={`rounded-[14px] px-2 py-2 text-left transition ${
                    reachable ? 'hover:bg-[#f7f9fc]' : 'cursor-default'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        item.failed
                          ? 'bg-red-50 text-brand'
                          : item.done
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.waiting || current
                              ? 'bg-navy text-white'
                              : 'bg-[#eef1f5] text-muted'
                      }`}
                    >
                      {item.failed ? (
                        <X size={16} />
                      ) : item.done ? (
                        <Check size={16} />
                      ) : item.waiting ? (
                        <Clock size={16} />
                      ) : (
                        item.n
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${current || item.done || item.failed ? 'text-navy' : 'text-muted'}`}>
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>
                    </span>
                  </span>
                </button>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className={`mt-6 hidden h-0.5 w-6 sm:block md:w-10 ${
                      item.done ? 'bg-emerald-400' : 'bg-[#e4e8ee]'
                    }`}
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#e8edf5]">
          <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted">{progressCopy}</p>
      </section>

      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      {step === 1 ? (
        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
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
              goTo(2)
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
                  {saving ? 'Saving…' : 'Save and next'}
                </Button>
              </div>
            )}
          </form>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
          <h2 className="text-lg font-semibold text-navy">Sign contracts</h2>
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
                              const latest = await queryClient.fetchQuery({
                                queryKey: ['onboarding-me'],
                                queryFn: () => onboardingApi.mine(),
                              })
                              const updated = latest.data as OnboardingCompany
                              setMessage(`Signed copy uploaded for ${contract.title}`)
                              if (contractsComplete(updated)) goTo(3)
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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" type="button" onClick={() => goTo(1)}>
              <ArrowLeft size={15} />
              Back to details
            </Button>
            {contractsDone && !locked ? (
              <Button type="button" onClick={() => goTo(3)}>
                Continue
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
          <h2 className="text-lg font-semibold text-navy">Submit for review</h2>
          <p className="mt-1 mb-5 text-sm text-muted">
            Everything is ready. Send it to Cedar Payroll. You will then see whether it is approved or rejected.
          </p>
          <ul className="mb-6 space-y-2 text-sm text-navy">
            <li className="flex items-center gap-2">
              <Check size={16} className="text-emerald-700" />
              Company details saved
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-emerald-700" />
              {signedCount} contract{signedCount === 1 ? '' : 's'} signed
            </li>
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" type="button" onClick={() => goTo(2)}>
              <ArrowLeft size={15} />
              Back to contracts
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setError(null)
                setSubmitting(true)
                try {
                  await onboardingApi.submit()
                  await refresh()
                  await auth.refresh()
                  setMessage('Submitted for review.')
                  goTo(4)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not submit onboarding')
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <FileText size={15} />
              {submitting ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <DecisionPanel
          approved={approved}
          rejected={rejected}
          note={company.onboarding_review_note}
          onContinue={async () => {
            await auth.refresh()
            navigate('/')
          }}
          onUpdateDetails={() => goTo(1)}
          onUpdateContracts={() => goTo(2)}
        />
      ) : null}
    </div>
  )
}

function DecisionPanel({
  approved,
  rejected,
  note,
  onContinue,
  onUpdateDetails,
  onUpdateContracts,
}: {
  approved: boolean
  rejected: boolean
  note?: string | null
  onContinue: () => void
  onUpdateDetails: () => void
  onUpdateContracts: () => void
}) {
  if (approved) {
    return (
      <section className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
            <Check size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-navy">Approved</h2>
            <p className="mt-1 text-sm text-muted">
              Cedar Payroll has approved your onboarding. You can now use the software.
            </p>
            <div className="mt-5">
              <Button type="button" onClick={onContinue}>
                Continue to Cedar Payroll
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (rejected) {
    return (
      <section className="rounded-[16px] border border-red-200 bg-red-50 p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-brand">
            <X size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-navy">Rejected</h2>
            <p className="mt-1 text-sm text-muted">
              Cedar Payroll asked for changes before they can approve the company.
            </p>
            {note ? <p className="mt-3 rounded-[12px] bg-white px-4 py-3 text-sm text-navy">{note}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" onClick={onUpdateDetails}>
                Update company details
              </Button>
              <Button variant="secondary" type="button" onClick={onUpdateContracts}>
                Update contracts
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy">
          <Clock size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-navy">Awaiting review</h2>
          <p className="mt-1 text-sm text-muted">
            Your details and signed contracts are with Cedar Payroll. This page will show Approved or Rejected
            once they have reviewed it.
          </p>
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, FileUp, Trash2 } from 'lucide-react'
import { onboardingApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Field, Input, Loading, PageHeader, Select } from '../../components/ui'
import { fullName } from '../../lib/format'
import type { OnboardingCompany } from '../../types'

function moduleLabel(value: string) {
  if (value === 'HR') return 'HR'
  if (value === 'INVOICE') return 'Invoice'
  if (value === 'GENERAL') return 'General'
  return 'Payroll'
}

function statusCopy(status: string) {
  if (status === 'PENDING_REVIEW') return 'Submitted — waiting for your review'
  if (status === 'ACTIVE') return 'Approved'
  return 'Onboarding in progress'
}

export function CompanyOnboardingReviewPage() {
  const { companyId = '' } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState('')
  const [module, setModule] = useState('GENERAL')
  const [busy, setBusy] = useState(false)

  const query = useQuery({
    queryKey: ['onboarding-company', companyId],
    queryFn: () => onboardingApi.get(companyId),
    enabled: Boolean(companyId && auth.canManageOrganizations),
  })
  const company = query.data?.data as OnboardingCompany | undefined

  if (!auth.canManageOrganizations) return <Navigate to="/" replace />
  if (query.isLoading) return <Loading />
  if (!company) return <Alert>Onboarding record not found.</Alert>

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['onboarding-company', companyId] })
  const canApprove = company.status === 'PENDING_REVIEW'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <PageHeader
        title={company.company_name}
        subtitle={statusCopy(company.status)}
        actions={
          <Link to="/companies" className="text-sm font-semibold text-navy hover:underline">
            Back to organisations
          </Link>
        }
      />

      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {message ? (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
          <h2 className="text-lg font-semibold text-navy">Company details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Name', company.company_name],
              ['Trading name', company.trading_name],
              ['Office number', company.office_number],
              ['Sector', company.sector],
              [
                'Address',
                [company.address_line_1, company.address_line_2, company.address_line_3, company.address_line_4, company.postcode]
                  .filter(Boolean)
                  .join(', '),
              ],
              ['Country', company.country],
              ['PAYE', company.paye_reference],
              ['Accounts office', company.accounts_office_reference],
              ['Company number', company.company_registration_number],
              ['Pension provider', company.pension_provider],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                <dd className="mt-1 text-navy">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-[12px] bg-[#f7f9fc] px-4 py-3 text-sm">
            <p className="font-semibold text-navy">Administrator</p>
            <p className="mt-1 text-navy">
              {fullName(company.owner?.first_name, company.owner?.last_name) || '—'}
            </p>
            <p className="text-muted">{company.owner?.email}</p>
            <p className="mt-1 text-xs text-muted">
              {company.owner?.is_registered ? 'Has created their account' : 'Has not signed up yet'}
            </p>
          </div>
        </section>

        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
          <h2 className="text-lg font-semibold text-navy">Review</h2>
          <p className="mt-1 text-sm text-muted">
            Approve once the details and signed contracts look correct. The company can then use Cedar Payroll.
          </p>
          {canApprove ? (
            <div className="mt-5 space-y-3">
              <Button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    await onboardingApi.approve(company.id)
                    await auth.refresh()
                    setMessage('Company approved')
                    navigate('/companies')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not approve this company')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Approve company
              </Button>
              <Field label="Send back with a note">
                <Input
                  variant="outline"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What needs to change"
                />
              </Field>
              <Button
                variant="secondary"
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    await onboardingApi.returnToCompany(company.id, note)
                    await refresh()
                    setMessage('Sent back to the company')
                    setNote('')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not send this back')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Send back
              </Button>
            </div>
          ) : (
            <p className="mt-5 rounded-[12px] bg-[#f7f9fc] px-4 py-3 text-sm text-muted">
              The company still needs to complete details and sign every contract.
            </p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
        <h2 className="text-lg font-semibold text-navy">Contracts</h2>
        <ul className="mt-4 space-y-3">
          {company.contracts.map((contract) => (
            <li key={contract.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#eef1f5] px-4 py-3">
              <div>
                <p className="font-semibold text-navy">{contract.title}</p>
                <p className="text-xs text-muted">
                  {moduleLabel(contract.module)}
                  {contract.signed ? ' · Signed copy received' : ' · Not signed yet'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() =>
                    onboardingApi.download(company.id, contract.id, 'original', contract.original_file_name)
                  }
                >
                  <Download size={15} />
                  Original
                </Button>
                {contract.signed ? (
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() =>
                      onboardingApi.download(
                        company.id,
                        contract.id,
                        'signed',
                        contract.signed_file_name || 'signed-contract',
                      )
                    }
                  >
                    <Check size={15} />
                    Signed
                  </Button>
                ) : company.status !== 'ACTIVE' ? (
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-[8px] text-brand hover:bg-red-50"
                    onClick={async () => {
                      setError(null)
                      try {
                        await onboardingApi.removeContract(company.id, contract.id)
                        await refresh()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not remove this contract')
                      }
                    }}
                    aria-label="Remove contract"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {company.status !== 'ACTIVE' ? (
          <div className="mt-5 grid gap-3 border-t border-[#eef1f5] pt-5 md:grid-cols-[1fr_160px_auto]">
            <Field label="Add another contract">
              <Input variant="outline" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
            </Field>
            <Field label="Module">
              <Select variant="outline" value={module} onChange={(event) => setModule(event.target.value)}>
                <option value="GENERAL">General</option>
                <option value="PAYROLL">Payroll</option>
                <option value="HR">HR</option>
                <option value="INVOICE">Invoice</option>
              </Select>
            </Field>
            <label className="mt-7 inline-flex cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-navy px-4 py-2.5 text-sm font-medium text-white">
              <FileUp size={15} />
              Upload
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  if (!title.trim()) {
                    setError('Give the contract a title')
                    return
                  }
                  setError(null)
                  try {
                    const data = new FormData()
                    data.append('file', file)
                    data.append('title', title.trim())
                    data.append('module', module)
                    await onboardingApi.uploadContract(company.id, data)
                    setTitle('')
                    await refresh()
                    setMessage('Contract uploaded')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not upload the contract')
                  }
                }}
              />
            </label>
          </div>
        ) : null}
      </section>
    </div>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '../../api'
import { assetUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Field, Input, Loading, Select, onSubmit } from '../../components/ui'
import {
  EMPLOYER_COUNTRIES,
  joinPaye,
  splitPaye,
} from '../settings/employerSettings'
import { HrTitle } from '../hr/HrChrome'
import type { Company } from '../../types'

type CompanyInfoForm = {
  company_name: string
  trading_name: string
  office_number: string
  address_line_1: string
  address_line_2: string
  address_line_3: string
  address_line_4: string
  postcode: string
  country: string
  paye_office: string
  paye_reference: string
  accounts_office_reference: string
  company_registration_number: string
  pension_provider: string
  pension_employer_id: string
}

function str(value: unknown) {
  return value == null ? '' : String(value)
}

function addressLinesFrom(company: Company) {
  const lines = [
    str(company.address_line_1),
    str(company.address_line_2),
    str(company.address_line_3),
    str(company.address_line_4),
  ]
  if (lines.some((line) => line.trim())) return lines

  const fromAddress = str(company.address)
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)

  return [
    fromAddress[0] ?? '',
    fromAddress[1] ?? '',
    fromAddress[2] ?? '',
    fromAddress[3] ?? '',
  ]
}

function formFromCompany(company: Company): CompanyInfoForm {
  const paye = splitPaye(company.paye_reference)
  const [address_line_1, address_line_2, address_line_3, address_line_4] = addressLinesFrom(company)
  return {
    company_name: company.company_name ?? '',
    trading_name: str(company.trading_name),
    office_number: str(company.office_number),
    address_line_1,
    address_line_2,
    address_line_3,
    address_line_4,
    postcode: str(company.postcode).toUpperCase(),
    country: str(company.country) || 'England',
    paye_office: paye.office,
    paye_reference: paye.reference,
    accounts_office_reference: str(company.accounts_office_reference),
    company_registration_number: str(company.company_registration_number),
    pension_provider: str(company.pension_provider),
    pension_employer_id: str(company.pension_employer_id),
  }
}

export function HelpCompanyInfoPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<CompanyInfoForm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const query = useQuery({
    queryKey: ['company', auth.companyId],
    queryFn: () => companiesApi.get(auth.companyId!),
    enabled: Boolean(auth.companyId),
  })
  const company = query.data?.data as Company | undefined

  useEffect(() => {
    if (!company) return
    setForm(formFromCompany(company))
  }, [company?.id, company?.updated_at, company?.logo_path])

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => companiesApi.update(String(company!.id), body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company', auth.companyId] })
      await auth.refresh()
    },
  })

  function patchForm(next: Partial<CompanyInfoForm>) {
    setForm((current) => (current ? { ...current, ...next } : current))
  }

  async function uploadLogo(file: File) {
    if (!company) return
    setError(null)
    setMessage(null)
    setUploading(true)
    try {
      const data = new FormData()
      data.append('file', file)
      await companiesApi.uploadLogo(String(company.id), data)
      await queryClient.invalidateQueries({ queryKey: ['company', auth.companyId] })
      setMessage('Logo uploaded')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload logo')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  if (!auth.isCompanyAdmin) {
    return <Navigate to="/help" replace />
  }

  if (!auth.companyId) {
    return (
      <div>
        <HrTitle title="Company info" />
        <Alert tone="info" className="mt-6">
          Select an organisation to view company details.
        </Alert>
      </div>
    )
  }

  if (query.isLoading) {
    return <Loading />
  }

  if (!company || query.isError) {
    return <Alert>Company not found</Alert>
  }

  if (!form) {
    return <Loading />
  }

  const logoSrc = assetUrl(company.logo_path)
  const employerName = form.company_name.trim() || 'this company'

  return (
    <div className="pb-8">
      <HrTitle title="Company info" />
      <p className="mt-3 mb-6 text-sm text-muted">
        Organisation name, address, logo and payroll identifiers used on payslips.
      </p>

      <form
        className="space-y-5"
        onSubmit={onSubmit(async () => {
          if (!form.company_name.trim()) {
            throw new Error('Enter the company name')
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
            paye_reference: joinPaye(form.paye_office, form.paye_reference) || null,
            accounts_office_reference: form.accounts_office_reference.trim() || null,
            company_registration_number: form.company_registration_number.trim() || null,
            pension_provider: form.pension_provider.trim() || null,
            pension_employer_id: form.pension_employer_id.trim() || null,
          })
          setMessage('Company info saved')
        }, setError, setSaving)}
      >
        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <Section title="Name">
            <Field label="Name">
              <Input
                variant="outline"
                value={form.company_name}
                onChange={(event) => patchForm({ company_name: event.target.value })}
                required
              />
            </Field>
            <Field label="Trading name">
              <Input
                variant="outline"
                value={form.trading_name}
                onChange={(event) => patchForm({ trading_name: event.target.value })}
                placeholder="If applicable"
              />
            </Field>
            <Field label="Office telephone">
              <Input
                variant="outline"
                value={form.office_number}
                onChange={(event) => patchForm({ office_number: event.target.value })}
                placeholder="Used on payslips"
              />
            </Field>
          </Section>

          <Section title="Address">
            <div>
              <span className="mb-2 block text-sm font-medium text-navy">Address</span>
              <div className="space-y-2">
                <Input
                  variant="outline"
                  value={form.address_line_1}
                  onChange={(event) => patchForm({ address_line_1: event.target.value })}
                  placeholder="Address line 1"
                />
                <Input
                  variant="outline"
                  value={form.address_line_2}
                  onChange={(event) => patchForm({ address_line_2: event.target.value })}
                  placeholder="Address line 2"
                />
                <Input
                  variant="outline"
                  value={form.address_line_3}
                  onChange={(event) => patchForm({ address_line_3: event.target.value })}
                  placeholder="Address line 3"
                />
                <Input
                  variant="outline"
                  value={form.address_line_4}
                  onChange={(event) => patchForm({ address_line_4: event.target.value })}
                  placeholder="Address line 4"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Postcode">
                <Input
                  variant="outline"
                  value={form.postcode}
                  onChange={(event) => patchForm({ postcode: event.target.value.toUpperCase() })}
                  placeholder="M1 1AA"
                />
              </Field>
              <Field label="Country">
                <Select
                  variant="outline"
                  value={form.country}
                  onChange={(event) => patchForm({ country: event.target.value })}
                >
                  {EMPLOYER_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Logo image">
            <div className="flex flex-wrap items-start gap-5">
              <div className="flex size-[148px] items-center justify-center overflow-hidden rounded-[12px] border border-[#d9d9d9] bg-[#eef3fb] text-5xl font-semibold text-navy/30">
                {logoSrc ? (
                  <img src={logoSrc} alt={`${employerName} logo`} className="size-full object-contain" />
                ) : (
                  'Aa'
                )}
              </div>
              <div className="min-w-[220px] flex-1">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadLogo(file)
                  }}
                />
                <button
                  type="button"
                  className="text-sm font-semibold text-[#2b6cb0] hover:underline"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Select a logo image'}
                </button>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Recommendation
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Use a PNG with a solid colour or transparent background. The logo appears on
                  payslips.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Payroll identifiers">
            <div>
              <span className="mb-2 block text-sm font-medium text-navy">Employer PAYE reference</span>
              <div className="flex items-center gap-2">
                <Input
                  variant="outline"
                  className="max-w-[110px]"
                  value={form.paye_office}
                  onChange={(event) => patchForm({ paye_office: event.target.value })}
                  placeholder="123"
                />
                <span className="text-muted">/</span>
                <Input
                  variant="outline"
                  value={form.paye_reference}
                  onChange={(event) => patchForm({ paye_reference: event.target.value.toUpperCase() })}
                  placeholder="A12345"
                />
              </div>
            </div>
            <Field label="Accounts office reference">
              <Input
                variant="outline"
                value={form.accounts_office_reference}
                onChange={(event) =>
                  patchForm({ accounts_office_reference: event.target.value.toUpperCase() })
                }
                placeholder="123PA00123456"
              />
            </Field>
            <Field label="Company registration number">
              <Input
                variant="outline"
                value={form.company_registration_number}
                onChange={(event) =>
                  patchForm({ company_registration_number: event.target.value.toUpperCase() })
                }
              />
            </Field>
          </Section>

          <Section title="Workplace pension" className="xl:col-span-2">
            <p className="text-sm text-muted">
              Used when enrolling employees in a qualifying scheme, for example a NEST EMP number.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pension provider">
                <Input
                  variant="outline"
                  value={form.pension_provider}
                  onChange={(event) => patchForm({ pension_provider: event.target.value })}
                  placeholder="NEST"
                />
              </Field>
              <Field label="Employer ID">
                <Input
                  variant="outline"
                  value={form.pension_employer_id}
                  onChange={(event) => patchForm({ pension_employer_id: event.target.value })}
                  placeholder="EMP006282768"
                />
              </Field>
            </div>
          </Section>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save company info'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Section({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[16px] border border-[#d9d9d9]/80 bg-white p-5 md:p-6 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-navy">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

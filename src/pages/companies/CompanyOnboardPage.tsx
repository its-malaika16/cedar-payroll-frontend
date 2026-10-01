import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FileUp, Plus, Trash2 } from 'lucide-react'
import { onboardingApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Field, Input, PageHeader, Select, onSubmit } from '../../components/ui'

const MODULES = [
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'HR', label: 'HR' },
  { value: 'INVOICE', label: 'Invoice' },
] as const

type ContractDraft = {
  key: string
  title: string
  module: string
  file: File | null
}

function newKey() {
  return `contract-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function CompanyOnboardPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [sector, setSector] = useState('')
  const [modules, setModules] = useState<string[]>(['PAYROLL'])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [contracts, setContracts] = useState<ContractDraft[]>([
    { key: newKey(), title: '', module: 'PAYROLL', file: null },
  ])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!auth.canManageOrganizations) return <Navigate to="/" replace />

  function toggleModule(value: string) {
    setModules((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8">
      <PageHeader
        title="Onboard a company"
        subtitle="Create the organisation in onboarding status, assign modules, and upload the contract(s) they need to sign."
        actions={
          <Link to="/companies" className="text-sm font-semibold text-navy hover:underline">
            Back to organisations
          </Link>
        }
      />

      <form
        className="space-y-6"
        onSubmit={onSubmit(async () => {
          if (!companyName.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
            throw new Error('Enter the company name and owner details')
          }
          if (modules.length === 0) {
            throw new Error('Choose at least one module')
          }
          const readyContracts = contracts.filter((item) => item.title.trim() && item.file)
          if (readyContracts.length === 0) {
            throw new Error('Upload at least one contract for the assigned modules')
          }
          const created = await onboardingApi.start({
            company_name: companyName.trim(),
            sector: sector.trim() || undefined,
            modules,
            owner: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email.trim(),
            },
          })
          const companyId = String((created.data as { id: string }).id)
          for (const contract of readyContracts) {
            const data = new FormData()
            data.append('file', contract.file as File)
            data.append('title', contract.title.trim())
            data.append('module', contract.module)
            await onboardingApi.uploadContract(companyId, data)
          }
          await auth.refresh()
          navigate(`/companies/${companyId}/onboarding`)
        }, setError, setSaving)}
      >
        {error ? <Alert>{error}</Alert> : null}

        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
          <h2 className="mb-4 text-lg font-semibold text-navy">Company</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company name">
              <Input variant="outline" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </Field>
            <Field label="Sector">
              <Input variant="outline" value={sector} onChange={(event) => setSector(event.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <p className="mt-5 mb-2 text-sm font-medium text-navy">Modules</p>
          <div className="flex flex-wrap gap-3">
            {MODULES.map((item) => {
              const checked = modules.includes(item.value)
              return (
                <label
                  key={item.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-[12px] border px-4 py-3 text-sm font-semibold ${
                    checked ? 'border-navy bg-[#f0f5fe] text-navy' : 'border-[#e4e8ee] bg-white text-navy'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-navy"
                    checked={checked}
                    onChange={() => toggleModule(item.value)}
                  />
                  {item.label}
                </label>
              )
            })}
          </div>
        </section>

        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
          <h2 className="mb-4 text-lg font-semibold text-navy">Company administrator</h2>
          <p className="mb-4 text-sm text-muted">
            They sign up with this email and are taken to the onboarding workspace.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="First name">
              <Input variant="outline" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </Field>
            <Field label="Last name">
              <Input variant="outline" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </Field>
            <Field label="Email">
              <Input variant="outline" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-[16px] border border-[#e6eaf0] bg-white p-6 shadow-[0_1px_8px_rgba(23,55,94,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy">Contracts</h2>
              <p className="mt-1 text-sm text-muted">Upload one or more contracts according to the modules above.</p>
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() =>
                setContracts((current) => [
                  ...current,
                  { key: newKey(), title: '', module: modules[0] || 'GENERAL', file: null },
                ])
              }
            >
              <Plus size={15} />
              Add contract
            </Button>
          </div>
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div key={contract.key} className="grid gap-3 rounded-[14px] border border-[#eef1f5] p-4 md:grid-cols-[1fr_160px_1fr_auto]">
                <Field label="Title">
                  <Input
                    variant="outline"
                    value={contract.title}
                    placeholder="Payroll service agreement"
                    onChange={(event) =>
                      setContracts((current) =>
                        current.map((item) =>
                          item.key === contract.key ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Module">
                  <Select
                    variant="outline"
                    value={contract.module}
                    onChange={(event) =>
                      setContracts((current) =>
                        current.map((item) =>
                          item.key === contract.key ? { ...item, module: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="GENERAL">General</option>
                    {MODULES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="File">
                  <label className="flex h-[50px] cursor-pointer items-center gap-2 rounded-[15px] border border-[#d9d9d9] bg-white px-4 text-sm text-navy">
                    <FileUp size={16} />
                    <span className="truncate">{contract.file?.name || 'Choose PDF or Word file'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        setContracts((current) =>
                          current.map((item) => (item.key === contract.key ? { ...item, file } : item)),
                        )
                      }}
                    />
                  </label>
                </Field>
                <button
                  type="button"
                  className="mt-7 inline-flex size-10 items-center justify-center rounded-[8px] text-brand hover:bg-red-50"
                  onClick={() => setContracts((current) => current.filter((item) => item.key !== contract.key))}
                  aria-label="Remove contract"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Starting…' : 'Start onboarding'}
          </Button>
        </div>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Field, Input, Loading, PageHeader, onSubmit } from '../components/ui'
import type { Company } from '../types'
import { EmployerSettingsForm } from './settings/EmployerSettingsForm'

export function SettingsPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const canEditEmployer =
    auth.canManageOrganizations ||
    auth.memberships.some(
      (membership) =>
        membership.company_id === auth.companyId &&
        (membership.role_name === 'Company Admin' || membership.role_name === 'COMPANY_ADMIN'),
    )

  const query = useQuery({
    queryKey: ['company', auth.companyId],
    queryFn: () => companiesApi.get(auth.companyId!),
    enabled: Boolean(auth.companyId),
  })
  const company = query.data?.data as Company | undefined

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => companiesApi.update(auth.companyId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company', auth.companyId] }),
  })

  const pensionProvider = form.pension_provider ?? company?.pension_provider ?? ''
  const pensionEmployerId = form.pension_employer_id ?? company?.pension_employer_id ?? ''

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle={
          canEditEmployer
            ? 'Employer details used as defaults for employees, payslips and RTI.'
            : 'Company workspace, pension scheme and account.'
        }
      />

      {canEditEmployer ? (
        <div className="space-y-6">
          {!auth.companyId ? (
            <Alert tone="info">Select an organisation to edit employer settings.</Alert>
          ) : query.isLoading ? (
            <Loading />
          ) : !company ? (
            <Alert>Organisation not found</Alert>
          ) : (
            <EmployerSettingsForm key={String(company.id)} company={company} />
          )}
          <AccountCard
            email={auth.user?.email}
            onLogout={() => {
              auth.logout()
              navigate('/login')
            }}
          />
        </div>
      ) : (
        <div className="max-w-lg space-y-6">
          <AccountCard
            email={auth.user?.email}
            onLogout={() => {
              auth.logout()
              navigate('/login')
            }}
          />
          <div className="rounded-[16px] bg-white p-8">
            <h2 className="text-lg font-semibold text-navy">Workplace pension</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              The employer ID is used when enrolling employees in a qualifying scheme (for example a NEST EMP number).
            </p>
            {!auth.companyId ? (
              <p className="text-sm text-muted">Select an organisation to edit pension settings.</p>
            ) : query.isLoading ? (
              <Loading />
            ) : (
              <form
                className="space-y-4"
                onSubmit={onSubmit(async () => {
                  await save.mutateAsync({
                    pension_provider: pensionProvider || null,
                    pension_employer_id: pensionEmployerId || null,
                  })
                }, setError, setSaving)}
              >
                {error ? <Alert>{error}</Alert> : null}
                <Field label="Pension provider">
                  <Input
                    variant="outline"
                    value={pensionProvider}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, pension_provider: event.target.value }))
                    }
                    placeholder="NEST"
                  />
                </Field>
                <Field label="Employer ID">
                  <Input
                    variant="outline"
                    value={pensionEmployerId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, pension_employer_id: event.target.value }))
                    }
                    placeholder="EMP006282768"
                  />
                </Field>
                <Button type="submit" disabled={saving || !company}>
                  Save pension settings
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AccountCard({ email, onLogout }: { email?: string; onLogout: () => void }) {
  return (
    <div className="rounded-[16px] bg-white p-6">
      <p className="mb-4 text-sm text-muted">{email}</p>
      <Button variant="danger" onClick={onLogout}>
        Log out
      </Button>
    </div>
  )
}

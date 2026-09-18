import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { companiesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Loading, onSubmit } from '../../components/ui'
import {
  OrganizationForm,
  emptyOrganizationForm,
  roleIdByName,
  toOrganizationPayload,
  validateOrganizationForm,
  type OrganizationFormValues,
} from './OrganizationForm'
import type { Role } from '../../types'

export function CompanyFormPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OrganizationFormValues>(emptyOrganizationForm())
  const rolesQuery = useQuery({
    queryKey: ['company-assignable-roles'],
    queryFn: () => companiesApi.assignableRoles(),
    enabled: auth.canManageOrganizations,
  })
  const roles = (rolesQuery.data?.data ?? []) as Role[]

  useEffect(() => {
    if (roles.length === 0) return
    setForm((current) => ({
      ...current,
      owner_role_id: current.owner_role_id || roleIdByName(roles, 'COMPANY_ADMIN'),
    }))
  }, [roles])

  if (!auth.canManageOrganizations) {
    return <Navigate to="/" replace />
  }

  if (rolesQuery.isLoading) return <Loading />
  if (rolesQuery.isError) {
    return <Alert>Could not load company roles. Refresh and try again.</Alert>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OrganizationForm
        title="Create Organisation"
        subtitle="Add a new company and configure modules, users and permissions."
        values={form}
        roles={roles}
        error={error}
        saving={saving}
        disabled={!auth.canManageOrganizations}
        submitLabel="Create Organisation"
        savingLabel="Creating…"
        onChange={setForm}
        onCancel={() => navigate('/companies')}
        onSubmit={onSubmit(async () => {
          const valid = await validateOrganizationForm(form)
          setForm(valid)
          const payload = toOrganizationPayload(valid)
          const created = await companiesApi.create(payload)
          await auth.refresh()
          const createdId = String((created.data as { id: string }).id)
          if (createdId && createdId !== 'undefined') {
            auth.setCompanyId(createdId)
          }
          navigate('/companies')
        }, setError, setSaving)}
      />
    </div>
  )
}

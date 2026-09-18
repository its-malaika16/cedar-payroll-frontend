import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Button, Loading, onSubmit } from '../../components/ui'
import { idOf } from '../../lib/format'
import {
  OrganizationForm,
  emptyOrganizationForm,
  organizationFormFromCompany,
  toOrganizationPayload,
  validateOrganizationForm,
  type OrganizationFormValues,
} from './OrganizationForm'
import type { Company, Role } from '../../types'

export function CompanyDetailPage() {
  const { companyId = '' } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [form, setForm] = useState<OrganizationFormValues>(emptyOrganizationForm())
  const [hydrated, setHydrated] = useState(false)
  const originalMemberIds = useRef<string[]>([])

  const rolesQuery = useQuery({
    queryKey: ['company-assignable-roles'],
    queryFn: () => companiesApi.assignableRoles(),
  })
  const query = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companiesApi.get(companyId),
    enabled: Boolean(companyId),
  })

  const roles = (rolesQuery.data?.data ?? []) as Role[]
  const company = query.data?.data as Company | undefined

  useEffect(() => {
    setHydrated(false)
    originalMemberIds.current = []
  }, [companyId])

  useEffect(() => {
    if (!company || hydrated || rolesQuery.isLoading) return
    const next = organizationFormFromCompany(company, roles)
    setForm(next)
    originalMemberIds.current = next.members.map((member) => member.userId).filter((id): id is string => Boolean(id))
    setHydrated(true)
  }, [company, roles, rolesQuery.isLoading, hydrated])

  if (!auth.canManageOrganizations) {
    return <Navigate to="/" replace />
  }

  if (query.isLoading || rolesQuery.isLoading || !hydrated) {
    return query.isError ? <Alert>Company not found</Alert> : <Loading />
  }

  if (!company) {
    return <Alert>Company not found</Alert>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OrganizationForm
        title="Edit Organisation"
        subtitle="Update company details, modules, and team access."
        values={form}
        roles={roles}
        error={error}
        saving={saving}
        disabled={!auth.canManageOrganizations}
        submitLabel="Save Organisation"
        savingLabel="Saving…"
        onChange={setForm}
        onCancel={() => navigate('/companies')}
        onDelete={
          auth.canManageOrganizations
            ? () => {
                setError(null)
                setConfirmingDelete(true)
              }
            : undefined
        }
        onSubmit={onSubmit(async () => {
          const valid = await validateOrganizationForm(form)
          setForm(valid)
          const payload = toOrganizationPayload(valid)
          await companiesApi.update(companyId, {
            company_name: payload.company_name,
            office_number: payload.office_number ?? '',
            paye_reference: payload.paye_reference ?? '',
            accounts_office_reference: payload.accounts_office_reference ?? '',
            pension_provider: payload.pension_provider ?? '',
            pension_employer_id: payload.pension_employer_id ?? '',
            address: payload.address ?? '',
            postcode: payload.postcode ?? '',
            sector: payload.sector ?? '',
            modules: payload.modules,
            owner: payload.owner,
          })

          const ownerEmail = payload.owner.email.trim().toLowerCase()
          const promotedUserIds = new Set(
            (company.user_roles ?? [])
              .filter((role) => role.users?.email?.trim().toLowerCase() === ownerEmail)
              .map((role) => idOf(role.users))
              .filter(Boolean),
          )
          const remainingMemberIds = new Set(
            valid.members
              .filter((member) => member.email.trim().toLowerCase() !== ownerEmail)
              .map((member) => member.userId)
              .filter((id): id is string => Boolean(id)),
          )

          for (const userId of originalMemberIds.current) {
            if (remainingMemberIds.has(userId) || promotedUserIds.has(userId)) continue
            await companiesApi.removeUser(companyId, userId)
          }

          for (const member of valid.members) {
            const filled =
              member.first_name.trim() || member.last_name.trim() || member.email.trim()
            if (!filled) continue
            if (member.email.trim().toLowerCase() === ownerEmail) continue
            const body = {
              first_name: member.first_name.trim(),
              last_name: member.last_name.trim(),
              email: member.email.trim(),
              role_id: member.role_id,
            }
            if (member.userId) {
              await companiesApi.updateUserRole(companyId, member.userId, body)
            } else {
              await companiesApi.inviteUser(companyId, body)
            }
          }

          await auth.refresh()
          const refreshed = await companiesApi.get(companyId)
          queryClient.setQueryData(['company', companyId], refreshed)
          await queryClient.invalidateQueries({ queryKey: ['companies'] })
          const next = organizationFormFromCompany(refreshed.data as Company, roles)
          setForm(next)
          originalMemberIds.current = next.members
            .map((member) => member.userId)
            .filter((id): id is string => Boolean(id))
        }, setError, setSaving)}
      />
      {confirmingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 px-4"
              role="presentation"
              onClick={() => {
                if (!saving) setConfirmingDelete(false)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-organization-title"
                className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="delete-organization-title" className="text-lg font-semibold text-navy">
                  Delete {company.company_name}?
                </h3>
                <p className="mt-2 text-sm text-muted">
                  This permanently removes the organisation, its employees, and payroll data. This cannot be undone.
                </p>
                {error ? <Alert className="mt-4">{error}</Alert> : null}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={saving}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep organisation
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="h-10 min-w-[105px] text-xs"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true)
                      setError(null)
                      try {
                        await companiesApi.remove(companyId)
                        await queryClient.invalidateQueries({ queryKey: ['companies'] })
                        if (auth.companyId === companyId) {
                          await auth.refresh()
                        }
                        navigate('/companies')
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : 'Could not delete this organisation')
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    {saving ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

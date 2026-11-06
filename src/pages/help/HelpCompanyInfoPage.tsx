import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { companiesApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Alert, Loading } from '../../components/ui'
import { HrTitle } from '../hr/HrChrome'
import type { Company } from '../../types'
import { EmployerSettingsForm } from '../settings/EmployerSettingsForm'

export function HelpCompanyInfoPage() {
  const auth = useAuth()

  const query = useQuery({
    queryKey: ['company', auth.companyId],
    queryFn: () => companiesApi.get(auth.companyId!),
    enabled: Boolean(auth.companyId),
  })
  const company = query.data?.data as Company | undefined

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

  return (
    <div className="pb-8">
      <HrTitle title="Company info" />
      <p className="mt-3 mb-6 text-sm text-muted">
        Organisation name, address, office location, logo and payroll identifiers used on payslips.
      </p>
      <EmployerSettingsForm key={String(company.id)} company={company} />
    </div>
  )
}

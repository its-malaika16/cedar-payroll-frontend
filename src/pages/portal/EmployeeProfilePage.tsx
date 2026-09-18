import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Card, PageHeader } from '../../components/ui'
import { fullName } from '../../lib/format'

export function EmployeeProfilePage() {
  const auth = useAuth()
  const company = auth.companies.find((item) => item.id === auth.companyId)
  const employee = auth.currentEmployee

  return (
    <div>
      <PageHeader title="User profile" subtitle="Your account for the employee portal." />
      <Card className="p-6 md:p-8">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">Name</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">
              {fullName(auth.user?.first_name, auth.user?.last_name)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Email</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">{auth.user?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Role</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">Employee</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Company</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">{company?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Employee number</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">{employee?.employee_id || '—'}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-muted">
          To update your name, phone or address, open{' '}
          <Link to="/portal/information" className="font-semibold text-navy underline">
            Employee information
          </Link>
          . Email is managed by your employer.
        </p>
      </Card>
    </div>
  )
}

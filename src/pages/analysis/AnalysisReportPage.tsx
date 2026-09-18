import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, PageHeader } from '../../components/ui'
import { reportBySlug } from './reportCatalog'

export function AnalysisReportPage() {
  const { reportType } = useParams()
  const report = reportBySlug(reportType)

  if (!report) {
    return <Navigate to="/payroll/reports" replace />
  }

  const Icon = report.icon
  const backTo = '/payroll/reports'
  const backLabel = 'Back to Analysis'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
      <PageHeader
        title={report.name}
        subtitle={report.description}
        actions={
          <Link to={backTo}>
            <Button variant="secondary">
              <ArrowLeft size={16} />
              {backLabel}
            </Button>
          </Link>
        }
      />
      <Card className="flex min-h-[320px] flex-col items-center justify-center px-8 py-16 text-center">
        <Icon size={36} strokeWidth={1.6} className="text-navy" />
        <p className="mt-4 text-lg font-semibold text-navy">{report.name}</p>
        <p className="mt-2 max-w-md text-sm text-muted">
          This report screen is ready for its design. The layout and data will be added next.
        </p>
      </Card>
    </div>
  )
}

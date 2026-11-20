import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { EmployeesFormsMenu } from '../employees/EmployeesFormsMenu'
import { GeneratedFormsPanel } from './GeneratedFormsPanel'
import { HrTitle } from './HrChrome'

export function HrDocumentsPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <HrTitle title="Documents" onBack={() => navigate('/hr')} />
          <p className="mt-2 text-sm font-semibold text-muted">
            Statutory forms generated for employees in this company.
          </p>
        </div>
        <EmployeesFormsMenu />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-white p-6 shadow-[3px_4px_1.95px_rgba(0,0,0,0.09)]">
        <GeneratedFormsPanel
          title="Generated forms"
          subtitle="P11, P45, P60, P11D and PBIK for everyone in this company."
        />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted">
        <FileText size={14} />
        Generate a form from the Forms menu, then view or download it here.
      </p>
    </div>
  )
}

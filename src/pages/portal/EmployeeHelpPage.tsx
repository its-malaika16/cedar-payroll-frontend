import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../components/ui'

const FAQS = [
  {
    q: 'When will I see my payslip?',
    a: 'Payslips appear after your employer finalises payroll and uploads the PDF. You will also receive an email and an in-app notification.',
  },
  {
    q: 'How do I request leave?',
    a: 'Open Leave, choose the leave type and dates, add a reason if needed, then submit. Your company or bureau admin will approve or reject the request.',
  },
  {
    q: 'How do I change a shift?',
    a: 'Open ROTA, find the assigned shift and request a change. Include the new time and a reason. Until it is approved, your published shift still stands.',
  },
  {
    q: 'Where can I check in?',
    a: 'Attendance lets you check in and out from within about 3 km of the workplace. Check-in opens 10 minutes before your shift. After the start time you may be marked late.',
  },
  {
    q: 'Can I change my email address?',
    a: 'No. Your email is used as your login and is held on your employee record. Ask your company or bureau admin if it needs updating.',
  },
]

export function EmployeeHelpPage() {
  return (
    <div>
      <PageHeader
        title="Help"
        subtitle="Answers to common questions, or message your company and bureau admins."
      />
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold text-navy">Chat with an admin</h2>
        <p className="mt-2 text-sm text-muted">
          Message your company admin or bureau admin about pay, rota, leave or documents.
        </p>
        <Link
          to="/portal/help/chat"
          className="mt-4 inline-flex h-10 items-center rounded-[8px] bg-navy px-4 text-sm font-semibold text-white"
        >
          Open chat
        </Link>
      </Card>
      <div className="space-y-3">
        {FAQS.map((item) => (
          <Card key={item.q} className="p-5">
            <h3 className="text-sm font-semibold text-navy">{item.q}</h3>
            <p className="mt-2 text-sm text-muted">{item.a}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

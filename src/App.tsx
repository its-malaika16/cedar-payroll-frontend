import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppLayout } from './components/AppLayout'
import { EmployeeLayout } from './components/EmployeeLayout'
import { Loading } from './components/ui'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { CompaniesPage } from './pages/companies/CompaniesPage'
import { CompanyFormPage } from './pages/companies/CompanyFormPage'
import { CompanyDetailPage } from './pages/companies/CompanyDetailPage'
import { EmployeeWorkspace } from './pages/employees/EmployeeWorkspace'
import { EmployeeCalendarPage } from './pages/employees/EmployeeCalendarPage'
import { EmployeePensionPage } from './pages/employees/EmployeePensionPage'
import { EmployeeBenefitsPage } from './pages/employees/EmployeeBenefitsPage'
import { EmployeeFormsBulkPage } from './pages/employees/EmployeeFormsBulkPage'
import { EmployeeFormsPage } from './pages/employees/EmployeeFormsPage'
import { EmployeesPage } from './pages/employees/EmployeesPage'
import { CompanyPayslipsPage } from './pages/employees/CompanyPayslipsPage'
import { SchedulesPage } from './pages/payroll/SchedulesPage'
import { PayrollRunsPage } from './pages/payroll/PayrollRunsPage'
import { PayrollRunDetailPage } from './pages/payroll/PayrollRunDetailPage'
import { PayrollRecordPage } from './pages/payroll/PayrollRecordPage'
import { PayslipDispatchPage } from './pages/payroll/PayslipDispatchPage'
import { ReopenPayslipsPage } from './pages/payroll/ReopenPayslipsPage'
import { PensionPage } from './pages/payroll/PensionPage'
import { BulkPayslipActionPage } from './pages/payroll/BulkPayslipActionPage'
import { SwitchSchedulePage } from './pages/payroll/SwitchSchedulePage'
import { PayslipsPage } from './pages/payroll/PayslipsPage'
import { PayslipViewPage } from './pages/payroll/PayslipViewPage'
import { RtiPage } from './pages/payroll/RtiPage'
import { DocumentsPage } from './pages/payroll/DocumentsPage'
import { ReportsPage } from './pages/payroll/ReportsPage'
import { AnalysisReportPage } from './pages/analysis/AnalysisReportPage'
import { ReportBuilderPage } from './pages/analysis/ReportBuilderPage'
import { ReportPreviewPage } from './pages/analysis/ReportPreviewPage'
import { InvoicesPage } from './pages/payroll/InvoicesPage'
import { CompanyInvoicesPage } from './pages/invoices/CompanyInvoicesPage'
import { CompanyInvoiceFormPage } from './pages/invoices/CompanyInvoiceFormPage'
import { RequestedInvoicesPage } from './pages/invoices/RequestedInvoicesPage'
import { InvoiceEditorPage } from './pages/payroll/InvoiceEditorPage'
import { InvoiceViewPage } from './pages/payroll/InvoiceViewPage'
import { LeavePage } from './pages/hr/LeavePage'
import { LeaveRequestsPage } from './pages/hr/LeaveRequestsPage'
import { AttendancePage } from './pages/hr/AttendancePage'
import { ShiftsPage } from './pages/hr/ShiftsPage'
import { CompliancePage } from './pages/hr/CompliancePage'
import { FinancialReportPage } from './pages/hr/FinancialReportPage'
import { HrDashboardPage, RequireHr } from './pages/hr/HrDashboardPage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import {
  HelpPage,
  RequireCompanyOfficial,
} from './pages/help/HelpPage'
import { HelpPayrollDuePage } from './pages/help/HelpPayrollDuePage'
import { HelpPayrollSummaryPage } from './pages/help/HelpPayrollSummaryPage'
import { HelpLeavePage } from './pages/help/HelpLeavePage'
import { HelpChatPage } from './pages/help/HelpChatPage'
import { HelpCompanyInfoPage } from './pages/help/HelpCompanyInfoPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { TimesheetsPage } from './pages/hr/timesheets/TimesheetsPage'
import { TimesheetDetailPage } from './pages/hr/timesheets/TimesheetDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { EmployeeDashboardPage } from './pages/portal/EmployeeDashboardPage'
import { EmployeeHelpPage } from './pages/portal/EmployeeHelpPage'
import { EmployeeInformationPage } from './pages/portal/EmployeeInformationPage'
import { EmployeeProfilePage } from './pages/portal/EmployeeProfilePage'
import { PortalAttendancePage } from './pages/portal/EmployeeAttendancePage'
import { PortalLeavePage, EmployeeLeaveRequestsPage } from './pages/portal/EmployeeLeavePage'
import { PortalDocumentsPage, EmployeeDocumentUploadPage } from './pages/portal/EmployeeDocumentsPage'
import {
  PortalPayslipsPage,
  PortalRotaPage,
} from './pages/portal/PortalPages'

function isCompanyAdminPath(pathname: string) {
  if (pathname === '/') return true
  if (pathname.startsWith('/employees')) return true
  if (pathname.startsWith('/hr')) return true
  if (pathname.startsWith('/timesheets')) return true
  if (pathname.startsWith('/notifications')) return true
  if (pathname.startsWith('/help')) return true
  if (pathname.startsWith('/company-info')) return true
  if (pathname.startsWith('/payroll/reports')) return true
  if (pathname === '/payroll/invoices') return true
  if (/^\/payroll\/invoices\/[^/]+$/.test(pathname)) return true
  if (pathname.startsWith('/company-invoices')) return true
  return false
}

function AdminLayout() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading) return <Loading />
  if (!auth.token) return <Navigate to="/login" replace />
  if (auth.isEmployeeOnly) return <Navigate to="/portal" replace />
  if (auth.isCompanyAdmin && !isCompanyAdminPath(location.pathname)) {
    return <Navigate to="/" replace />
  }
  return <AppLayout />
}

function EmployeePortalLayout() {
  const auth = useAuth()
  if (auth.loading) return <Loading />
  if (!auth.token) return <Navigate to="/login" replace />
  if (!auth.canUseEmployeePortal) return <Navigate to="/" replace />
  return <EmployeeLayout />
}

function HomeRedirect() {
  const auth = useAuth()
  if (auth.loading) return <Loading />
  if (!auth.token) return <Navigate to="/login" replace />
  return <Navigate to={auth.homePath} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/requested-invoices" element={<RequestedInvoicesPage />} />
        <Route path="/company-invoices/new" element={<CompanyInvoiceFormPage />} />
        <Route path="/company-invoices/:invoiceId" element={<CompanyInvoiceFormPage />} />
        <Route path="/company-invoices" element={<CompanyInvoicesPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/new" element={<CompanyFormPage />} />
        <Route path="/companies/:companyId" element={<CompanyDetailPage />} />
        <Route
          path="/employees/payslips"
          element={
            <RequireCompanyOfficial>
              <CompanyPayslipsPage />
            </RequireCompanyOfficial>
          }
        />
        <Route path="/employees" element={<EmployeesPage />}>
          <Route path="calendar" element={<EmployeeCalendarPage />} />
          <Route path="calendar/:employeeId" element={<EmployeeCalendarPage />} />
          <Route path="pensions" element={<EmployeePensionPage />} />
          <Route path="pensions/:employeeId" element={<EmployeePensionPage />} />
          <Route path="benefits" element={<EmployeeBenefitsPage />} />
          <Route path="benefits/:employeeId" element={<EmployeeBenefitsPage />} />
          <Route path="forms/:formType/email" element={<EmployeeFormsBulkPage />} />
          <Route path="forms/:formType/download" element={<EmployeeFormsBulkPage />} />
          <Route path="forms/:formType/:employeeId" element={<EmployeeFormsPage />} />
          <Route path="forms/:formType" element={<EmployeeFormsPage />} />
          <Route path="new" element={<EmployeeWorkspace />} />
          <Route path=":employeeId" element={<EmployeeWorkspace />} />
        </Route>
        <Route path="/timesheets" element={<TimesheetsPage />} />
        <Route path="/timesheets/:employeeId" element={<TimesheetDetailPage mode="review" />} />
        <Route path="/timesheets/:employeeId/edit" element={<TimesheetDetailPage mode="edit" />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route
          path="/help/payroll-due"
          element={
            <RequireCompanyOfficial>
              <HelpPayrollDuePage />
            </RequireCompanyOfficial>
          }
        />
        <Route
          path="/help/payroll-summary"
          element={
            <RequireCompanyOfficial>
              <HelpPayrollSummaryPage />
            </RequireCompanyOfficial>
          }
        />
        <Route
          path="/help/leave"
          element={
            <RequireCompanyOfficial>
              <HelpLeavePage />
            </RequireCompanyOfficial>
          }
        />
        <Route
          path="/help/chat"
          element={
            <RequireCompanyOfficial>
              <HelpChatPage />
            </RequireCompanyOfficial>
          }
        />
        <Route
          path="/company-info"
          element={
            <RequireCompanyOfficial>
              <HelpCompanyInfoPage />
            </RequireCompanyOfficial>
          }
        />
        <Route path="/help/company-info" element={<Navigate to="/company-info" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/payroll/schedules" element={<SchedulesPage />} />
        <Route path="/payroll/runs" element={<PayrollRunsPage />} />
        <Route path="/payroll/switch-schedule" element={<SwitchSchedulePage />} />
        <Route path="/payroll/runs/:runId" element={<PayrollRunDetailPage />} />
        <Route path="/payroll/runs/:runId/switch-schedule" element={<SwitchSchedulePage />} />
        <Route path="/payroll/runs/:runId/records/:recordId" element={<PayrollRecordPage />} />
        <Route path="/payroll/runs/:runId/payslips/:mode" element={<PayslipDispatchPage />} />
        <Route path="/payroll/runs/:runId/reopen" element={<ReopenPayslipsPage />} />
        <Route path="/payroll/runs/:runId/pension" element={<PensionPage />} />
        <Route path="/payroll/runs/:runId/bulk/:action" element={<BulkPayslipActionPage />} />
        <Route path="/payroll/payslips/:runId/:recordId" element={<PayslipViewPage />} />
        <Route path="/payroll/payslips" element={<PayslipsPage />} />
        <Route path="/payroll/rti" element={<RtiPage />} />
        <Route path="/payroll/documents" element={<DocumentsPage />} />
        <Route path="/payroll/reports" element={<ReportsPage />} />
        <Route path="/payroll/reports/more" element={<Navigate to="/payroll/reports" replace />} />
        <Route path="/payroll/reports/employee-details" element={<ReportBuilderPage kind="employee-details" />} />
        <Route
          path="/payroll/reports/employee-details/preview"
          element={<ReportPreviewPage kind="employee-details" />}
        />
        <Route path="/payroll/reports/payroll-summary" element={<ReportBuilderPage kind="payroll-summary" />} />
        <Route
          path="/payroll/reports/payroll-summary/preview"
          element={<ReportPreviewPage kind="payroll-summary" />}
        />
        <Route path="/payroll/reports/pensions" element={<ReportBuilderPage kind="pensions" />} />
        <Route path="/payroll/reports/pensions/preview" element={<ReportPreviewPage kind="pensions" />} />
        <Route path="/payroll/reports/ytd-summary" element={<ReportBuilderPage kind="ytd-summary" />} />
        <Route path="/payroll/reports/ytd-summary/preview" element={<ReportPreviewPage kind="ytd-summary" />} />
        <Route path="/payroll/reports/hmrc-payments" element={<ReportBuilderPage kind="hmrc-payments" />} />
        <Route path="/payroll/reports/hmrc-payments/preview" element={<ReportPreviewPage kind="hmrc-payments" />} />
        <Route path="/payroll/reports/p32" element={<ReportBuilderPage kind="p32" />} />
        <Route path="/payroll/reports/p32/preview" element={<ReportPreviewPage kind="p32" />} />
        <Route path="/payroll/reports/notes" element={<ReportBuilderPage kind="notes" />} />
        <Route path="/payroll/reports/notes/preview" element={<ReportPreviewPage kind="notes" />} />
        <Route path="/payroll/reports/additions" element={<ReportBuilderPage kind="additions" />} />
        <Route path="/payroll/reports/additions/preview" element={<ReportPreviewPage kind="additions" />} />
        <Route path="/payroll/reports/deductions" element={<ReportBuilderPage kind="deductions" />} />
        <Route path="/payroll/reports/deductions/preview" element={<ReportPreviewPage kind="deductions" />} />
        <Route path="/payroll/reports/:reportType" element={<AnalysisReportPage />} />
        <Route path="/payroll/invoices/new" element={<InvoiceEditorPage />} />
        <Route path="/payroll/invoices/:invoiceId/edit" element={<InvoiceEditorPage />} />
        <Route path="/payroll/invoices/:invoiceId" element={<InvoiceViewPage />} />
        <Route path="/payroll/invoices" element={<InvoicesPage />} />
        <Route path="/hr" element={<RequireHr><HrDashboardPage /></RequireHr>} />
        <Route path="/hr/leave" element={<RequireHr><LeavePage /></RequireHr>} />
        <Route path="/hr/leave/requests" element={<RequireHr><LeaveRequestsPage /></RequireHr>} />
        <Route path="/hr/leave/:employeeId" element={<RequireHr><LeavePage /></RequireHr>} />
        <Route path="/hr/attendance" element={<RequireHr><AttendancePage /></RequireHr>} />
        <Route path="/hr/shifts" element={<RequireHr><ShiftsPage /></RequireHr>} />
        <Route path="/hr/compliance" element={<RequireHr><CompliancePage /></RequireHr>} />
        <Route path="/hr/financial" element={<RequireHr><FinancialReportPage /></RequireHr>} />
      </Route>
      <Route element={<EmployeePortalLayout />}>
        <Route path="/portal" element={<EmployeeDashboardPage />} />
        <Route path="/portal/information" element={<EmployeeInformationPage />} />
        <Route path="/portal/payslips/:runId/:recordId" element={<PayslipViewPage />} />
        <Route path="/portal/payslips" element={<PortalPayslipsPage />} />
        <Route path="/portal/rota" element={<PortalRotaPage />} />
        <Route path="/portal/leave" element={<PortalLeavePage />} />
        <Route path="/portal/leave/requests" element={<EmployeeLeaveRequestsPage />} />
        <Route path="/portal/attendance" element={<PortalAttendancePage />} />
        <Route path="/portal/documents" element={<PortalDocumentsPage />} />
        <Route path="/portal/documents/upload" element={<EmployeeDocumentUploadPage />} />
        <Route path="/portal/notifications" element={<NotificationsPage />} />
        <Route path="/portal/help" element={<EmployeeHelpPage />} />
        <Route path="/portal/help/chat" element={<HelpChatPage />} />
        <Route path="/portal/profile" element={<EmployeeProfilePage />} />
        <Route path="/portal/messages" element={<Navigate to="/portal/help/chat" replace />} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

import type {
  ApiSuccess,
  AuthPayload,
  CalendarDay,
  CalendarEntitlement,
  CalendarPayImpact,
  Company,
  CompanyUserRole,
  Employee,
  PayrollRecord,
  PayrollRun,
  PayrollSchedule,
  PensionAssessment,
  Role,
  User,
} from '../types'
import { api, del, download, fetchBlob, get, post, patch, put } from './client'

export const authApi = {
  login: (email: string, password: string) =>
    post<AuthPayload>('/auth/login', { email, password }),
  register: (email: string, password: string, confirm_password: string) =>
    post<AuthPayload>('/auth/register', { email, password, confirm_password }),
  profile: () => get<User & AuthPayload>('/auth/profile'),
  access: () => get<AuthPayload>('/auth/me/access'),
}

export const companiesApi = {
  list: () => get<Company[]>('/companies'),
  get: (companyId: string) => get<Company>(`/companies/${companyId}`),
  create: (body: Record<string, unknown>) => post<Company>('/companies', body),
  update: (companyId: string, body: Record<string, unknown>) =>
    patch<Company>(`/companies/${companyId}`, body),
  uploadLogo: (companyId: string, form: FormData) =>
    api<ApiSuccess<Company>>(`/companies/${companyId}/logo`, { method: 'POST', body: form }),
  remove: (companyId: string) => del(`/companies/${companyId}`),
  assignableRoles: () => get<Role[]>('/companies/assignable-roles'),
  users: (companyId: string) =>
    get<CompanyUserRole[]>(`/companies/${companyId}/users`),
  assignUser: (companyId: string, body: { user_id: string; role_id: string }) =>
    post(`/companies/${companyId}/users`, body),
  inviteUser: (
    companyId: string,
    body: { first_name: string; last_name: string; email: string; role_id: string },
  ) => post(`/companies/${companyId}/users/invite`, body),
  updateUserRole: (
    companyId: string,
    userId: string,
    body: { role_id: string; first_name?: string; last_name?: string; email?: string },
  ) => patch(`/companies/${companyId}/users/${userId}/role`, body),
  removeUser: (companyId: string, userId: string) =>
    del(`/companies/${companyId}/users/${userId}`),
}

export const rolesApi = {
  list: () => get<Role[]>('/roles'),
}

export const lookupsApi = {
  validatePostcode: (postcode: string, country?: string) => {
    const params = new URLSearchParams({ postcode })
    if (country) params.set('country', country)
    return get<{ valid: boolean; formatted: string }>(`/lookups/postcodes?${params.toString()}`)
  },
}

export const employeesApi = {
  list: (companyId: string) =>
    get<Employee[]>(`/companies/${companyId}/employees`),
  get: (companyId: string, employeeId: string) =>
    get<Employee>(`/companies/${companyId}/employees/${employeeId}`),
  create: (companyId: string, body: Record<string, unknown>) =>
    post<Employee>(`/companies/${companyId}/employees`, body),
  update: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch<Employee>(`/companies/${companyId}/employees/${employeeId}`, body),
  remove: (companyId: string, employeeId: string) =>
    del(`/companies/${companyId}/employees/${employeeId}`),
  getAddress: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/address`),
  updateAddress: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/employees/${employeeId}/address`, body),
  getBank: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/bank-details`),
  updateBank: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/employees/${employeeId}/bank-details`, body),
  getTax: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/tax-details`),
  updateTax: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/employees/${employeeId}/tax-details`, body),
  getEmployment: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/employment-details`),
  updateEmployment: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/employees/${employeeId}/employment-details`, body),
  switchPaySchedule: (
    companyId: string,
    body: { employee_ids: string[]; to_schedule_id: string },
  ) => post(`/companies/${companyId}/employees/switch-pay-schedule`, body),
  getStarterLeaver: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/starter-leaver-details`),
  updateStarterLeaver: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/employees/${employeeId}/starter-leaver-details`, body),
  getPension: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/pension`),
  updatePension: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/employees/${employeeId}/pension`, body),
  assessPension: (companyId: string, employeeId: string) =>
    get<PensionAssessment>(`/companies/${companyId}/employees/${employeeId}/pension/assessment`),
  enrolPension: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    post(`/companies/${companyId}/employees/${employeeId}/pension/enrol`, body),
  postponePension: (companyId: string, employeeId: string, body?: Record<string, unknown>) =>
    post(`/companies/${companyId}/employees/${employeeId}/pension/postpone`, body ?? {}),
  exemptPension: (companyId: string, employeeId: string) =>
    post(`/companies/${companyId}/employees/${employeeId}/pension/exempt`, {}),
  optOutPension: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    post(`/companies/${companyId}/employees/${employeeId}/pension/opt-out`, body),
  ceasePension: (companyId: string, employeeId: string, body?: Record<string, unknown>) =>
    post(`/companies/${companyId}/employees/${employeeId}/pension/cease`, body ?? {}),
  switchPension: (companyId: string, employeeId: string, body?: Record<string, unknown>) =>
    post(`/companies/${companyId}/employees/${employeeId}/pension/switch`, body ?? {}),
  documents: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/documents`),
  uploadDocument: (companyId: string, employeeId: string, form: FormData) =>
    api(`/companies/${companyId}/employees/${employeeId}/documents`, {
      method: 'POST',
      body: form,
    }),
  deleteDocument: (companyId: string, employeeId: string, documentId: string) =>
    del(`/companies/${companyId}/employees/${employeeId}/documents/${documentId}`),
  me: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/me`),
  updateMyPersonal: (companyId: string, employeeId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/employees/${employeeId}/me/personal`, body),
  latestPayroll: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/me/latest-payroll`),
  myPayslips: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/me/payslips`),
  myP45: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/me/p45`),
  myP60: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/me/p60`),
  myP11: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/me/p11`),
  calendar: (companyId: string, employeeId: string, from: string, to: string) =>
    get<CalendarDay[]>(
      `/companies/${companyId}/employees/${employeeId}/calendar?from=${from}&to=${to}`,
    ),
  companyCalendarLeave: (companyId: string, from: string, to: string) =>
    get<CalendarDay[]>(`/companies/${companyId}/calendar/leave?from=${from}&to=${to}`),
  calendarEntitlement: (companyId: string, employeeId: string, asOf: string) =>
    get<CalendarEntitlement>(
      `/companies/${companyId}/employees/${employeeId}/calendar/entitlement?as_of=${asOf}`,
    ),
  calendarPayImpact: (companyId: string, employeeId: string, from: string, to: string) =>
    get<CalendarPayImpact>(
      `/companies/${companyId}/employees/${employeeId}/calendar/impact?from=${from}&to=${to}`,
    ),
  assignCalendar: (
    companyId: string,
    employeeId: string,
    body: {
      dates: string[]
      day_type: string
      custom_label?: string
      notes?: string
    },
  ) => put(`/companies/${companyId}/employees/${employeeId}/calendar`, body),
  clearCalendar: (companyId: string, employeeId: string, dates: string[]) =>
    api(`/companies/${companyId}/employees/${employeeId}/calendar`, {
      method: 'DELETE',
      body: JSON.stringify({ dates }),
    }),
  updateCalendarNotes: (
    companyId: string,
    employeeId: string,
    dates: string[],
    notes: string,
  ) =>
    patch(`/companies/${companyId}/employees/${employeeId}/calendar/notes`, {
      dates,
      notes,
    }),
}

export const payrollApi = {
  schedules: (companyId: string) =>
    get<PayrollSchedule[]>(`/companies/${companyId}/payroll/schedules`),
  createSchedule: (companyId: string, body: Record<string, unknown>) =>
    post<PayrollSchedule>(`/companies/${companyId}/payroll/schedules`, body),
  updateScheduleStatus: (companyId: string, scheduleId: string, is_active: boolean) =>
    patch(`/companies/${companyId}/payroll/schedules/${scheduleId}/status`, { is_active }),
  deleteSchedule: (companyId: string, scheduleId: string) =>
    del(`/companies/${companyId}/payroll/schedules/${scheduleId}`),
  runs: (companyId: string) =>
    get<PayrollRun[]>(`/companies/${companyId}/payroll`),
  getRun: (companyId: string, runId: string) =>
    get<PayrollRun>(`/companies/${companyId}/payroll/${runId}`),
  createRun: (companyId: string, body: Record<string, unknown>) =>
    post<PayrollRun>(`/companies/${companyId}/payroll`, body),
  deleteRun: (companyId: string, runId: string) =>
    del(`/companies/${companyId}/payroll/${runId}`),
  generateRecords: (companyId: string, runId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/generate-records`),
  getRecord: (companyId: string, runId: string, recordId: string) =>
    get<PayrollRecord>(`/companies/${companyId}/payroll/${runId}/records/${recordId}`),
  updateRecord: (
    companyId: string,
    runId: string,
    recordId: string,
    body: Record<string, unknown>,
  ) =>
    patch<PayrollRecord>(
      `/companies/${companyId}/payroll/${runId}/records/${recordId}`,
      body,
    ),
  copyPayments: (companyId: string, runId: string, recordId: string) =>
    post<PayrollRecord>(
      `/companies/${companyId}/payroll/${runId}/records/${recordId}/copy-payments`,
    ),
  calculateRecord: (companyId: string, runId: string, recordId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/records/${recordId}/calculate`),
  calculateRun: (companyId: string, runId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/calculate`),
  calculateStep: (
    companyId: string,
    runId: string,
    recordId: string,
    step: string,
  ) =>
    post(`/companies/${companyId}/payroll/${runId}/records/${recordId}/${step}`),
  completeRun: (companyId: string, runId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/complete`),
  lockRun: (companyId: string, runId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/lock`),
  finaliseRun: (companyId: string, runId: string, record_ids: string[]) =>
    post(`/companies/${companyId}/payroll/${runId}/finalise`, { record_ids }),
  reopenRun: (companyId: string, runId: string, record_ids?: string[]) =>
    post(`/companies/${companyId}/payroll/${runId}/reopen`, {
      record_ids,
    }),
  finaliseRecord: (companyId: string, runId: string, recordId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/records/${recordId}/finalise`),
  reopenRecord: (companyId: string, runId: string, recordId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/records/${recordId}/reopen`),
}

export const payslipsApi = {
  generateRecord: (companyId: string, runId: string, recordId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/records/${recordId}/generate-payslip`),
  generateRun: (companyId: string, runId: string) =>
    post(`/companies/${companyId}/payroll/${runId}/generate-payslips`),
  forRun: (companyId: string, runId: string) =>
    get(`/companies/${companyId}/payroll/${runId}/payslips`),
  publishedRuns: (companyId: string, scheduleId?: string) =>
    get<PayrollRun[]>(
      `/companies/${companyId}/payroll/published-payslips${
        scheduleId ? `?schedule_id=${encodeURIComponent(scheduleId)}` : ''
      }`,
    ),
  publishedForRun: (companyId: string, runId: string) =>
    get(`/companies/${companyId}/payroll/${runId}/published-payslips`),
  forEmployee: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/payroll/employees/${employeeId}`),
  download: (companyId: string, payslipId: string, filename: string) =>
    download(`/companies/${companyId}/payroll/${payslipId}/download`, filename),
  fileBlob: (companyId: string, payslipId: string) =>
    fetchBlob(`/companies/${companyId}/payroll/${payslipId}/download`),
}

export const rtiApi = {
  list: (companyId: string) => get(`/companies/${companyId}/rti`),
  get: (companyId: string, submissionId: string) =>
    get(`/companies/${companyId}/rti/${submissionId}`),
  generateFps: (companyId: string, runId: string, final_submission_for_year?: boolean) =>
    post(`/companies/${companyId}/rti/fps/${runId}/generate`, {
      final_submission_for_year,
    }),
  generateEps: (companyId: string, body: Record<string, unknown>) =>
    post(`/companies/${companyId}/rti/eps/generate`, body),
  epsTaxPeriods: (companyId: string) =>
    get(`/companies/${companyId}/rti/eps/tax-periods`),
  additionalFpsCandidates: (companyId: string) =>
    get(`/companies/${companyId}/rti/additional-fps/candidates`),
  generateAdditionalFps: (
    companyId: string,
    employees: { employee_id: string; late_reporting_reason?: string }[],
  ) => post(`/companies/${companyId}/rti/additional-fps/generate`, { employees }),
  submit: (
    companyId: string,
    submissionId: string,
    body?: { correlation_id?: string; late_reporting_reason?: string },
  ) => post(`/companies/${companyId}/rti/${submissionId}/submit`, body ?? {}),
  update: (
    companyId: string,
    submissionId: string,
    body: { late_reporting_reason?: string },
  ) => patch(`/companies/${companyId}/rti/${submissionId}`, body),
  remove: (companyId: string, submissionId: string) =>
    del(`/companies/${companyId}/rti/${submissionId}`),
}

export const documentsApi = {
  generateP45: (companyId: string, employeeId: string, payroll_run_id: string) =>
    post(`/companies/${companyId}/payroll-documents/employees/${employeeId}/p45`, {
      payroll_run_id,
    }),
  p45: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/payroll-documents/employees/${employeeId}/p45`),
  generateP60: (
    companyId: string,
    employeeId: string,
    tax_year_start: number,
    tax_year_end: number,
  ) =>
    post(`/companies/${companyId}/payroll-documents/employees/${employeeId}/p60`, {
      tax_year_start,
      tax_year_end,
    }),
  p60: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/payroll-documents/employees/${employeeId}/p60`),
  generateP11: (
    companyId: string,
    employeeId: string,
    tax_year_start: number,
    tax_year_end: number,
  ) =>
    post(`/companies/${companyId}/payroll-documents/employees/${employeeId}/p11`, {
      tax_year_start,
      tax_year_end,
    }),
  p11: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/payroll-documents/employees/${employeeId}/p11`),
  preview: (
    companyId: string,
    employeeId: string,
    formType: string,
    tax_year_start: number,
    tax_year_end: number,
  ) =>
    get(
      `/companies/${companyId}/payroll-documents/employees/${employeeId}/${formType}/preview?tax_year_start=${tax_year_start}&tax_year_end=${tax_year_end}`,
    ),
}

export const reportsApi = {
  payrollRun: (companyId: string, runId: string) =>
    get(`/companies/${companyId}/payroll-reports/${runId}`),
  hrFinancial: (companyId: string, start_date: string, end_date: string) =>
    post(
      `/companies/${companyId}/hr-reports/financial?start_date=${start_date}&end_date=${end_date}`,
    ),
  hrList: (companyId: string) =>
    get(`/companies/${companyId}/hr-reports/financial`),
}

export const invoicesApi = {
  list: (companyId: string) =>
    get(`/companies/${companyId}/payroll-invoices`),
  defaults: (companyId: string) =>
    get(`/companies/${companyId}/payroll-invoices/defaults`),
  get: (companyId: string, invoiceId: string) =>
    get(`/companies/${companyId}/payroll-invoices/${invoiceId}`),
  create: (companyId: string, body: Record<string, unknown>) =>
    post(`/companies/${companyId}/payroll-invoices`, body),
  update: (companyId: string, invoiceId: string, body: Record<string, unknown>) =>
    patch(`/companies/${companyId}/payroll-invoices/${invoiceId}`, body),
  approve: (companyId: string, invoiceId: string) =>
    post(`/companies/${companyId}/payroll-invoices/${invoiceId}/approve`),
  markPaid: (companyId: string, invoiceId: string) =>
    post(`/companies/${companyId}/payroll-invoices/${invoiceId}/paid`),
  fileBlob: (companyId: string, invoiceId: string) =>
    fetchBlob(`/companies/${companyId}/payroll-invoices/${invoiceId}/file`),
  forRun: (companyId: string, runId: string) =>
    get(`/companies/${companyId}/payroll-invoices/${runId}`),
  generate: (companyId: string, runId: string) =>
    post(`/companies/${companyId}/payroll-invoices/from-run/${runId}`),
}

export const hrApi = {
  leaveAll: (companyId: string) => get(`/companies/${companyId}/hr/leave`),
  myLeave: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/hr/employees/${employeeId}/leave`),
  createLeave: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) => post(`/companies/${companyId}/hr/employees/${employeeId}/leave`, body),
  cancelLeave: (companyId: string, employeeId: string, leaveId: string) =>
    del(`/companies/${companyId}/hr/employees/${employeeId}/leave/${leaveId}`),
  reviewLeave: (
    companyId: string,
    leaveId: string,
    body: { status: 'APPROVED' | 'REJECTED'; is_paid?: boolean; rejection_reason?: string },
  ) => patch(`/companies/${companyId}/hr/leave/${leaveId}/review`, body),
  upcomingLeave: (companyId: string) =>
    get(`/companies/${companyId}/hr/leave/upcoming`),
  leaveBalance: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/hr/employees/${employeeId}/leave/balance`),
  addLeave: (companyId: string, body: Record<string, unknown>) =>
    post(`/companies/${companyId}/hr/leave`, body),
  attendanceOverview: (companyId: string, date: string, range: 'day' | 'week') =>
    get(`/companies/${companyId}/hr/attendance/overview?date=${date}&range=${range}`),
  attendance: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/attendance`),
  todayAttendance: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/employees/${employeeId}/attendance/today`),
  checkIn: (
    companyId: string,
    employeeId: string,
    body: { latitude: number; longitude: number },
  ) =>
    post(`/companies/${companyId}/employees/${employeeId}/attendance/check-in`, body),
  checkOut: (
    companyId: string,
    employeeId: string,
    body: { latitude: number; longitude: number },
  ) =>
    post(`/companies/${companyId}/employees/${employeeId}/attendance/check-out`, body),
  shifts: (companyId: string) => get(`/companies/${companyId}/hr/shifts`),
  myShifts: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/hr/employees/${employeeId}/shifts`),
  myShiftChangeRequests: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/hr/employees/${employeeId}/shift-change-requests`),
  requestShiftChange: (
    companyId: string,
    employeeId: string,
    body: {
      shift_id: string
      requested_start: string
      requested_end: string
      reason: string
    },
  ) => post(`/companies/${companyId}/hr/employees/${employeeId}/shift-change-requests`, body),
  createShift: (
    companyId: string,
    employeeId: string | null,
    body: Record<string, unknown>,
  ) =>
    post(`/companies/${companyId}/hr/shifts`, {
      ...body,
      employee_id: employeeId || undefined,
    }),
  updateShift: (
    companyId: string,
    shiftId: string,
    body: Record<string, unknown>,
  ) => patch(`/companies/${companyId}/hr/shifts/${shiftId}`, body),
  deleteShift: (companyId: string, shiftId: string) =>
    del(`/companies/${companyId}/hr/shifts/${shiftId}`),
  publishRota: (companyId: string, from: string, to: string) =>
    post(`/companies/${companyId}/hr/rota/publish`, { from, to }),
  rotaStatus: (companyId: string, from: string, to: string) =>
    get(`/companies/${companyId}/hr/rota/status?from=${from}&to=${to}`),
  compliance: (companyId: string) => get(`/companies/${companyId}/hr/compliance`),
  myCompliance: (companyId: string, employeeId: string) =>
    get(`/companies/${companyId}/hr/employees/${employeeId}/compliance`),
  uploadCompliance: (companyId: string, employeeId: string, form: FormData) =>
    api(`/companies/${companyId}/hr/employees/${employeeId}/compliance`, {
      method: 'POST',
      body: form,
    }),
  complianceTypes: (companyId: string, forEmployee = false) =>
    get(
      `/companies/${companyId}/hr/compliance/types?for=${forEmployee ? 'employee' : 'employer'}`,
    ),
  updateComplianceVisibility: (
    companyId: string,
    documentId: string,
    visible_to_employee: boolean,
  ) =>
    patch(`/companies/${companyId}/hr/compliance/${documentId}/visibility`, {
      visible_to_employee,
    }),
  reviewCompliance: (
    companyId: string,
    documentId: string,
    body: { status: 'APPROVED' | 'REJECTED'; rejection_reason?: string },
  ) => patch(`/companies/${companyId}/hr/compliance/${documentId}/review`, body),
  complianceByEmployee: (companyId: string) =>
    get(`/companies/${companyId}/hr/compliance/employees`),
  financialSummary: (companyId: string) =>
    get(`/companies/${companyId}/hr-reports/financial/summary`),
}

export const timesheetsApi = {
  overview: (companyId: string, from: string, to: string, scheduleId?: string) =>
    get(
      `/companies/${companyId}/hr/timesheets?from=${from}&to=${to}${
        scheduleId ? `&scheduleId=${scheduleId}` : ''
      }`,
    ),
  detail: (companyId: string, employeeId: string, from: string, to: string) =>
    get(
      `/companies/${companyId}/hr/timesheets/employees/${employeeId}?from=${from}&to=${to}`,
    ),
  ensure: (
    companyId: string,
    body: { employee_id: string; period_start: string; period_end: string },
  ) => post(`/companies/${companyId}/hr/timesheets/ensure`, body),
  update: (companyId: string, timesheetId: string, body: { entries: Record<string, unknown>[] }) =>
    patch(`/companies/${companyId}/hr/timesheets/${timesheetId}`, body),
  review: (
    companyId: string,
    timesheetId: string,
    body: { status: 'APPROVED' | 'REJECTED'; rejection_reason?: string },
  ) => post(`/companies/${companyId}/hr/timesheets/${timesheetId}/review`, body),
  sendToPayroll: (companyId: string, timesheetId: string) =>
    post(`/companies/${companyId}/hr/timesheets/${timesheetId}/send-to-payroll`),
  reopen: (companyId: string, timesheetId: string) =>
    post(`/companies/${companyId}/hr/timesheets/${timesheetId}/reopen`),
  bulk: (
    companyId: string,
    body: {
      action: 'approve' | 'send_to_payroll' | 'changes' | 'reopen'
      ids: string[]
    },
  ) => post(`/companies/${companyId}/hr/timesheets/bulk`, body),
}

export const notificationsApi = {
  list: (companyId: string) => get(`/companies/${companyId}/notifications`),
  markRead: (companyId: string, notificationId: string) =>
    patch(`/companies/${companyId}/notifications/${notificationId}/read`, {}),
}

export const helpApi = {
  payrollDue: (companyId: string) =>
    get(`/companies/${companyId}/help/payroll-due`),
  payrollSummary: (companyId: string, scheduleId?: string, date?: string) => {
    const params = new URLSearchParams()
    if (scheduleId) params.set('scheduleId', scheduleId)
    if (date) params.set('date', date)
    const query = params.toString()
    return get(`/companies/${companyId}/help/payroll-summary${query ? `?${query}` : ''}`)
  },
  leave: (companyId: string, from: string, to: string) =>
    get(`/companies/${companyId}/help/leave?from=${from}&to=${to}`),
}

export const chatApi = {
  contacts: (companyId: string) => get(`/companies/${companyId}/chat/contacts`),
  conversations: (companyId: string) =>
    get(`/companies/${companyId}/chat/conversations`),
  createConversation: (companyId: string, user_id: string) =>
    post(`/companies/${companyId}/chat/conversations`, { user_id }),
  messages: (companyId: string, conversationId: string) =>
    get(`/companies/${companyId}/chat/conversations/${conversationId}/messages`),
  sendMessage: (companyId: string, conversationId: string, body: string) =>
    post(`/companies/${companyId}/chat/conversations/${conversationId}/messages`, {
      body,
    }),
}

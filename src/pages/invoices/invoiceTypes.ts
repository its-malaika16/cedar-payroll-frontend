export type CompanyInvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'REASON_REQUESTED'
  | 'REASON_SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'

export type CompanyInvoice = {
  id: string
  company_id: string
  company_name?: string | null
  created_by: string
  title: string
  description?: string | null
  amount: number
  due_date?: string | null
  status: CompanyInvoiceStatus
  bureau_note?: string | null
  company_reason?: string | null
  file_name?: string | null
  file_type?: string | null
  has_file?: boolean
  sent_at?: string | null
  reviewed_at?: string | null
  created_at?: string
}

export type InvoiceDashboard = {
  sent_count: number
  sent_total: number
  paid_count: number
  paid_total: number
  draft_count: number
  pending_count: number
  rejected_count: number
}

export function invoiceStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'SENT':
      return 'Sent'
    case 'REASON_REQUESTED':
      return 'Reason requested'
    case 'REASON_SUBMITTED':
      return 'Reason submitted'
    case 'ACCEPTED':
      return 'Accepted'
    case 'REJECTED':
      return 'Rejected'
    default:
      return status
  }
}

export function invoiceStatusClass(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-[#f0efec] text-muted'
    case 'SENT':
      return 'bg-sky-50 text-sky-800'
    case 'REASON_REQUESTED':
      return 'bg-amber-50 text-amber-800'
    case 'REASON_SUBMITTED':
      return 'bg-violet-50 text-violet-800'
    case 'ACCEPTED':
      return 'bg-emerald-50 text-emerald-800'
    case 'REJECTED':
      return 'bg-red-50 text-brand'
    default:
      return 'bg-[#f0efec] text-muted'
  }
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Card, EmptyState, Loading, PageHeader } from '../components/ui'
import { formatLongDate, idOf } from '../lib/format'

type AppNotification = {
  id: string
  title: string
  body: string
  type: string
  is_read: boolean
  created_at: string
  data?: { invoice_id?: string | null; company_id?: string | null; conversation_id?: string | null }
}

function notificationPath(item: AppNotification, inEmployeePortal: boolean) {
  const invoiceId = item.data?.invoice_id
  if (item.type === 'CHAT_MESSAGE') {
    return inEmployeePortal ? '/portal/help/chat' : '/help/chat'
  }
  if (item.type === 'INVOICE_APPROVED' && invoiceId) {
    return `/payroll/invoices/${invoiceId}`
  }
  if (item.type === 'LEAVE_REQUESTED') return '/hr/leave/requests'
  if (item.type === 'LEAVE_APPROVED' || item.type === 'LEAVE_REJECTED') return '/portal/leave'
  if (item.type === 'COMMUNICATION') return ''
  if (item.type === 'ONBOARDING') {
    return item.data?.company_id ? `/companies/${item.data.company_id}/onboarding` : '/onboarding'
  }
  return ''
}

export function NotificationsPage() {
  const { companyId } = useAuth()
  const navigate = useNavigate()
  const inEmployeePortal = useLocation().pathname.startsWith('/portal')
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['notifications', companyId],
    queryFn: () => notificationsApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const list = (query.data?.data as AppNotification[] | undefined) ?? []

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Leave, rota, invoices and document alerts for your account." />
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
            <EmptyState title="No notifications" body="Leave, rota, invoices and document alerts will appear here." />
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {list.map((item) => {
              const href = notificationPath(item, inEmployeePortal)
              return (
              <button
                key={idOf(item)}
                type="button"
                className={`block w-full px-5 py-4 text-left ${item.is_read ? 'bg-white' : 'bg-[#f8f7f4]'}`}
                onClick={() => {
                  if (!companyId) return
                  const open = () => {
                    if (href) navigate(href)
                  }
                  if (item.is_read) {
                    open()
                    return
                  }
                  void notificationsApi.markRead(companyId, idOf(item)).then(() => {
                    void queryClient.invalidateQueries({ queryKey: ['notifications', companyId] })
                    open()
                  })
                }}
              >
                <p className="text-sm font-semibold text-navy">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
                <p className="mt-1 text-xs text-muted">{formatLongDate(item.created_at)}</p>
              </button>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

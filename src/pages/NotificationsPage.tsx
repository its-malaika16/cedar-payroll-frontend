import { useQuery, useQueryClient } from '@tanstack/react-query'
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
}

export function NotificationsPage() {
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['notifications', companyId],
    queryFn: () => notificationsApi.list(companyId!),
    enabled: Boolean(companyId),
  })
  const list = (query.data?.data as AppNotification[] | undefined) ?? []

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Rota updates, invoices and document expiry alerts for your account." />
      <Card>
        {query.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
            <EmptyState title="No notifications" body="Rota updates, invoices and document expiry alerts will appear here." />
        ) : (
          <div className="divide-y divide-[#eceae6]">
            {list.map((item) => (
              <button
                key={idOf(item)}
                type="button"
                className={`block w-full px-5 py-4 text-left ${item.is_read ? 'bg-white' : 'bg-[#f8f7f4]'}`}
                onClick={() => {
                  if (!companyId || item.is_read) return
                  void notificationsApi.markRead(companyId, idOf(item)).then(() =>
                    queryClient.invalidateQueries({ queryKey: ['notifications', companyId] }),
                  )
                }}
              >
                <p className="text-sm font-semibold text-navy">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
                <p className="mt-1 text-xs text-muted">{formatLongDate(item.created_at)}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

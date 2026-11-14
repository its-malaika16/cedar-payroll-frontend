import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { Plus, Search, Send } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { chatApi } from '../../api'
import { API_URL } from '../../api/client'
import { Card, EmptyState, Input, Loading } from '../../components/ui'
import { fullName } from '../../lib/format'
import { HrTitle } from '../hr/HrChrome'

type ChatChannel = 'BUREAU' | 'COMPANY' | 'COMPANY_BUREAU'

type ChatContact = {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string
  kind: 'COMPANY' | 'BUREAU' | 'EMPLOYEE'
  title: string
  channel?: ChatChannel
}

type ChatMessage = {
  id: string
  conversation_id?: string
  sender_id: string
  body: string
  created_at: string
  sender_name: string
}

type ChatConversation = {
  id: string
  channel?: ChatChannel | null
  other: {
    user_id: string
    first_name: string | null
    last_name: string | null
    email: string
    kind: string
    title?: string
  } | null
  last_message: ChatMessage | null
  unread?: boolean
  updated_at: string
}

const SLA =
  'Drop a message and you will receive a reply within two working days.'

function kindLabel(kind?: string | null, channel?: string | null) {
  if (kind === 'EMPLOYEE') return 'Employee'
  if (kind === 'BUREAU' || channel === 'BUREAU') return 'Bureau admin'
  if (kind === 'COMPANY' || channel === 'COMPANY') return 'Company admin'
  return ''
}

function threadName(item: {
  first_name?: string | null
  last_name?: string | null
  title?: string
  kind?: string
}) {
  if (item.kind === 'BUREAU') return 'Bureau admin'
  if (item.kind === 'COMPANY') return 'Company admin'
  return fullName(item.first_name, item.last_name) || item.title || 'Chat'
}

function initials(first?: string | null, last?: string | null, kind?: string | null) {
  if (kind === 'BUREAU') return 'BA'
  if (kind === 'COMPANY') return 'CA'
  const value = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return value || '?'
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayLabel(value: string) {
  const date = new Date(value)
  const today = new Date()
  const start = (item: Date) => Date.UTC(item.getFullYear(), item.getMonth(), item.getDate())
  const diff = Math.round((start(today) - start(date)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'long' })
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

export function HelpChatPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const companyId = auth.companyId
  const selfId = auth.user?.id ? String(auth.user.id) : ''
  const location = useLocation()
  const inEmployeePortal = location.pathname.startsWith('/portal')
  const backTo = inEmployeePortal ? '/portal/help' : '/help'
  const title = inEmployeePortal ? 'Messages' : 'Direct messages'

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const contactsQuery = useQuery({
    queryKey: ['chat-contacts', companyId],
    queryFn: () => chatApi.contacts(companyId!),
    enabled: Boolean(companyId),
  })
  const conversationsQuery = useQuery({
    queryKey: ['chat-conversations', companyId],
    queryFn: () => chatApi.conversations(companyId!),
    enabled: Boolean(companyId),
  })
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', companyId, selectedId],
    queryFn: () => chatApi.messages(companyId!, selectedId!),
    enabled: Boolean(companyId && selectedId),
    refetchInterval: selectedId ? 8000 : false,
  })

  const contacts = (contactsQuery.data?.data as ChatContact[] | undefined) ?? []
  const conversations = (conversationsQuery.data?.data as ChatConversation[] | undefined) ?? []
  const messages = (messagesQuery.data?.data as ChatMessage[] | undefined) ?? []
  const selected = conversations.find((item) => item.id === selectedId) ?? null

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return contacts.filter((contact) => {
      if (contact.channel) {
        return conversations.every((item) => item.channel !== contact.channel)
      }
      const openUserIds = new Set(
        conversations.map((item) => item.other?.user_id).filter(Boolean),
      )
      if (openUserIds.has(contact.user_id)) return false
      if (!term) return true
      const name = threadName(contact).toLowerCase()
      return (
        name.includes(term) ||
        contact.email.toLowerCase().includes(term) ||
        contact.title.toLowerCase().includes(term)
      )
    })
  }, [contacts, conversations, search])

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter((item) => {
      const name = threadName(item.other ?? {}).toLowerCase()
      return name.includes(term) || (item.other?.email ?? '').toLowerCase().includes(term)
    })
  }, [conversations, search])

  const officialContact = contacts.find((item) => item.channel === 'COMPANY_BUREAU')
  const officialConversation = filteredConversations.find((item) => item.channel === 'COMPANY_BUREAU')
  const employeeConversations = filteredConversations.filter(
    (item) => item.channel !== 'COMPANY_BUREAU' && item.other?.kind === 'EMPLOYEE',
  )
  const employeePicker = useMemo(() => {
    const term = search.trim().toLowerCase()
    const openIds = new Set(conversations.map((item) => item.other?.user_id).filter(Boolean))
    return contacts.filter((contact) => {
      if (contact.kind !== 'EMPLOYEE') return false
      if (openIds.has(contact.user_id)) return false
      if (!term) return true
      const name = threadName(contact).toLowerCase()
      return name.includes(term) || contact.email.toLowerCase().includes(term)
    })
  }, [contacts, conversations, search])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, selectedId])

  useEffect(() => {
    if (!auth.token || !companyId) return

    const socket = io(`${API_URL}/chat`, {
      auth: { token: auth.token },
      query: { companyId },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('message', (payload: { conversation_id?: string; message?: ChatMessage }) => {
      const message = payload?.message
      const conversationId = payload?.conversation_id || message?.conversation_id
      if (!message?.id || !conversationId) return

      queryClient.setQueryData(
        ['chat-messages', companyId, conversationId],
        (current: { data?: ChatMessage[] } | undefined) => {
          const existing = current?.data ?? []
          if (existing.some((item) => item.id === message.id)) return current
          return { ...(current ?? { success: true, message: '' }), data: [...existing, message] }
        },
      )
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations', companyId] })
    })

    socket.on('conversation', (payload: ChatConversation) => {
      if (payload?.id) {
        socket.emit('join', { conversationId: payload.id })
      }
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations', companyId] })
    })

    socket.on('conversation-deleted', (payload: { id?: string }) => {
      if (payload?.id) {
        queryClient.removeQueries({ queryKey: ['chat-messages', companyId, payload.id] })
      }
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations', companyId] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [auth.token, companyId, queryClient])

  useEffect(() => {
    if (selectedId) {
      socketRef.current?.emit('join', { conversationId: selectedId })
    }
  }, [selectedId])

  const openChannel = async (channel: ChatChannel) => {
    if (!companyId) return
    const existing = conversations.find((item) => item.channel === channel)
    if (existing) {
      setSelectedId(existing.id)
      return
    }
    const result = await chatApi.createConversation(companyId, { channel })
    const conversation = result.data as ChatConversation
    await conversationsQuery.refetch()
    setSelectedId(conversation.id)
    socketRef.current?.emit('join', { conversationId: conversation.id })
  }

  const openWithEmployee = async (userId: string) => {
    if (!companyId) return
    const result = await chatApi.createConversation(companyId, { user_id: userId })
    const conversation = result.data as ChatConversation
    await conversationsQuery.refetch()
    setSelectedId(conversation.id)
    socketRef.current?.emit('join', { conversationId: conversation.id })
  }

  const removeChat = async () => {
    if (!companyId || !selectedId || deleting) return
    const confirmed = window.confirm('Delete this chat? Messages will be removed for everyone in this inbox.')
    if (!confirmed) return
    setDeleting(true)
    setComposerError(null)
    try {
      await chatApi.deleteConversation(companyId, selectedId)
      setSelectedId(null)
      setDraft('')
      queryClient.removeQueries({ queryKey: ['chat-messages', companyId, selectedId] })
      await conversationsQuery.refetch()
      await contactsQuery.refetch()
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Could not delete the chat')
    } finally {
      setDeleting(false)
    }
  }

  const send = async () => {
    if (!companyId || !selectedId || !draft.trim() || sending) return
    setSending(true)
    setComposerError(null)
    try {
      await chatApi.sendMessage(companyId, selectedId, draft.trim())
      setDraft('')
      await messagesQuery.refetch()
      await conversationsQuery.refetch()
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Could not send the message')
    } finally {
      setSending(false)
    }
  }

  const selectedKind = selected?.other?.kind || selected?.channel
  const showSla = inEmployeePortal && (selectedKind === 'BUREAU' || selectedKind === 'COMPANY')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HrTitle title={title} onBack={() => navigate(backTo)} />
      <p className="mt-3 mb-4 text-sm text-muted">
        {inEmployeePortal
          ? 'Message your company admin or bureau admin. Replies usually arrive within two working days.'
          : 'Message bureau admins or your employees. They will be notified when you send a message.'}
      </p>
      <Card className="flex min-h-[560px] flex-1 overflow-hidden p-0">
        <aside className="flex w-full max-w-[320px] shrink-0 flex-col border-r border-[#e8edf5] bg-white">
          {!inEmployeePortal ? (
            <div className="p-3">
              <label className="relative block">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <Input
                  className="pl-9"
                  placeholder="Search people"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Inboxes
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? <Loading /> : null}
            {inEmployeePortal ? (
              <>
                {filteredConversations.map((item) => {
                  const active = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                        active ? 'bg-[#eef3fb]' : 'hover:bg-[#f7f9fc]'
                      }`}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                        {initials(item.other?.first_name, item.other?.last_name, item.other?.kind || item.channel)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-navy">
                            {threadName(item.other ?? {})}
                          </span>
                          {item.unread ? (
                            <span className="size-2 shrink-0 rounded-full bg-brand" />
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {item.last_message?.body || kindLabel(item.other?.kind, item.channel)}
                        </span>
                      </span>
                    </button>
                  )
                })}
                {filteredContacts.length > 0 ? (
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Talk to
                  </div>
                ) : null}
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.user_id}
                    type="button"
                    onClick={() =>
                      contact.channel
                        ? void openChannel(contact.channel)
                        : void openWithEmployee(contact.user_id)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f7f9fc]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#c9d4e3] text-xs font-semibold text-navy">
                      {initials(contact.first_name, contact.last_name, contact.channel || contact.kind)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">
                        {threadName(contact)}
                      </span>
                      <span className="block truncate text-xs text-muted">{contact.title}</span>
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <>
                {officialConversation ? (
                  <button
                    type="button"
                    onClick={() => setSelectedId(officialConversation.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                      officialConversation.id === selectedId ? 'bg-[#eef3fb]' : 'hover:bg-[#f7f9fc]'
                    }`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                      {initials(undefined, undefined, officialConversation.other?.kind)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-navy">
                          {threadName(officialConversation.other ?? {})}
                        </span>
                        {officialConversation.unread ? (
                          <span className="size-2 shrink-0 rounded-full bg-brand" />
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {officialConversation.last_message?.body || kindLabel(officialConversation.other?.kind)}
                      </span>
                    </span>
                  </button>
                ) : officialContact ? (
                  <button
                    type="button"
                    onClick={() => void openChannel(officialContact.channel!)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f7f9fc]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#c9d4e3] text-xs font-semibold text-navy">
                      {initials(undefined, undefined, officialContact.kind)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">
                        {threadName(officialContact)}
                      </span>
                      <span className="block truncate text-xs text-muted">{officialContact.title}</span>
                    </span>
                  </button>
                ) : null}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Employees
                  </span>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-full bg-navy text-white"
                    aria-label="Start chat with an employee"
                    onClick={() => setPickerOpen(true)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {employeeConversations.map((item) => {
                  const active = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                        active ? 'bg-[#eef3fb]' : 'hover:bg-[#f7f9fc]'
                      }`}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                        {initials(item.other?.first_name, item.other?.last_name, item.other?.kind)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-navy">
                            {threadName(item.other ?? {})}
                          </span>
                          {item.unread ? (
                            <span className="size-2 shrink-0 rounded-full bg-brand" />
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {item.last_message?.body || 'Employee'}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </>
            )}
            {!conversationsQuery.isLoading &&
            filteredConversations.length === 0 &&
            filteredContacts.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted">No people to message yet.</p>
            ) : null}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-[#ece5dc]">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-[#eadfd3] bg-white px-4 py-2.5">
                <span className="flex size-10 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {initials(selected.other?.first_name, selected.other?.last_name, selected.other?.kind || selected.channel)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{threadName(selected.other ?? {})}</p>
                  <p className="truncate text-xs text-muted">{kindLabel(selected.other?.kind, selected.channel)}</p>
                </div>
                <button
                  type="button"
                  className="h-9 rounded-full border border-navy px-3.5 text-xs font-semibold text-navy hover:bg-cream disabled:opacity-50"
                  disabled={deleting}
                  onClick={() => void removeChat()}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
              {showSla ? (
                <p className="bg-white/70 px-5 py-2 text-center text-[11px] text-navy">{SLA}</p>
              ) : null}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
                {messagesQuery.isLoading ? <Loading /> : null}
                {messages.map((item, index) => {
                  const mine = item.sender_id === selfId
                  const showDate = index === 0 || dayKey(item.created_at) !== dayKey(messages[index - 1].created_at)
                  return (
                    <div key={item.id}>
                      {showDate ? (
                        <div className="mb-3 flex justify-center">
                          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-navy shadow-sm">
                            {dayLabel(item.created_at)}
                          </span>
                        </div>
                      ) : null}
                      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-[18px] px-3.5 py-2 text-sm shadow-sm ${
                          mine ? 'rounded-br-md bg-navy text-white' : 'rounded-bl-md bg-white text-navy'
                        }`}
                      >
                        {!mine ? (
                          <p className="mb-1 text-[11px] font-semibold opacity-70">{item.sender_name}</p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">{item.body}</p>
                        <p className={`mt-1 text-right text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                          {formatClock(item.created_at)}
                        </p>
                      </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              <form
                className="flex items-end gap-2 bg-[#f0f2f5] p-2.5"
                onSubmit={(event) => {
                  event.preventDefault()
                  void send()
                }}
              >
                <textarea
                  className="min-h-[44px] max-h-32 flex-1 resize-none rounded-[22px] border-0 bg-input px-4 py-3 text-sm text-navy outline-none focus:ring-2 focus:ring-navy/20"
                  placeholder="Write a message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void send()
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="flex size-11 items-center justify-center rounded-full bg-navy text-white disabled:bg-[#d9d9d9]"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
              {composerError ? (
                <p className="px-4 pb-3 text-sm text-brand">{composerError}</p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6">
              <EmptyState
                title={inEmployeePortal ? 'Choose who to talk to' : 'Select a conversation'}
                body={
                  inEmployeePortal
                    ? 'Talk to your company admin or bureau admin. They will reply within two working days.'
                    : 'Message bureau admin at the top, or tap + to chat with an employee.'
                }
              />
            </div>
          )}
        </section>
      </Card>
      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="w-full max-w-md rounded-[16px] bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-navy">Select an employee</h3>
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => setPickerOpen(false)}>
                Close
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {employeePicker.length === 0 ? (
                <p className="px-2 py-6 text-sm text-muted">All employees already have a chat, or none are available.</p>
              ) : (
                employeePicker.map((contact) => (
                  <button
                    key={contact.user_id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-[#f7f9fc]"
                    onClick={() => {
                      setPickerOpen(false)
                      void openWithEmployee(contact.user_id)
                    }}
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                      {initials(contact.first_name, contact.last_name)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-navy">{threadName(contact)}</span>
                      <span className="block text-xs text-muted">{contact.email}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

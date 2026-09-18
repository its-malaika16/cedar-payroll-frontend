import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { Search, Send } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { chatApi } from '../../api'
import { API_URL } from '../../api/client'
import { Card, EmptyState, Input, Loading } from '../../components/ui'
import { fullName } from '../../lib/format'
import { HrTitle } from '../hr/HrChrome'

type ChatContact = {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string
  kind: 'COMPANY' | 'BUREAU' | 'EMPLOYEE'
  title: string
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
  other: {
    user_id: string
    first_name: string | null
    last_name: string | null
    email: string
    kind: string
  } | null
  last_message: ChatMessage | null
  unread?: boolean
  updated_at: string
}

function kindLabel(kind?: string | null) {
  if (kind === 'BUREAU') return 'Bureau'
  if (kind === 'EMPLOYEE') return 'Employee'
  if (kind === 'COMPANY') return 'Company'
  return ''
}

function initials(first?: string | null, last?: string | null) {
  const value = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return value || '?'
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
  const [sending, setSending] = useState(false)
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
  })

  const contacts = (contactsQuery.data?.data as ChatContact[] | undefined) ?? []
  const conversations = (conversationsQuery.data?.data as ChatConversation[] | undefined) ?? []
  const messages = (messagesQuery.data?.data as ChatMessage[] | undefined) ?? []
  const selected = conversations.find((item) => item.id === selectedId) ?? null

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase()
    const openUserIds = new Set(
      conversations.map((item) => item.other?.user_id).filter(Boolean),
    )
    return contacts.filter((contact) => {
      if (openUserIds.has(contact.user_id)) return false
      if (!term) return true
      const name = fullName(contact.first_name, contact.last_name).toLowerCase()
      return name.includes(term) || contact.email.toLowerCase().includes(term) || contact.title.toLowerCase().includes(term)
    })
  }, [contacts, conversations, search])

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter((item) => {
      const name = fullName(item.other?.first_name, item.other?.last_name).toLowerCase()
      return name.includes(term) || (item.other?.email ?? '').toLowerCase().includes(term)
    })
  }, [conversations, search])

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

  const openWith = async (userId: string) => {
    if (!companyId) return
    const result = await chatApi.createConversation(companyId, userId)
    const conversation = result.data as ChatConversation
    await conversationsQuery.refetch()
    setSelectedId(conversation.id)
    socketRef.current?.emit('join', { conversationId: conversation.id })
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HrTitle title={title} onBack={() => navigate(backTo)} />
      <p className="mt-3 mb-4 text-sm text-muted">
        {inEmployeePortal
          ? 'Message your company or bureau team.'
          : 'Chat with employees and bureau officials for this company.'}
      </p>
      <Card className="flex min-h-[560px] flex-1 overflow-hidden">
        <aside className="flex w-full max-w-[320px] shrink-0 flex-col border-r border-[#e8edf5]">
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? <Loading /> : null}
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
                    {initials(item.other?.first_name, item.other?.last_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-navy">
                        {fullName(item.other?.first_name, item.other?.last_name)}
                      </span>
                      {item.unread ? (
                        <span className="size-2 shrink-0 rounded-full bg-brand" />
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {item.last_message?.body || kindLabel(item.other?.kind)}
                    </span>
                  </span>
                </button>
              )
            })}
            {filteredContacts.length > 0 ? (
              <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                New chat
              </div>
            ) : null}
            {filteredContacts.map((contact) => (
              <button
                key={contact.user_id}
                type="button"
                onClick={() => void openWith(contact.user_id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f7f9fc]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#c9d4e3] text-xs font-semibold text-navy">
                  {initials(contact.first_name, contact.last_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">
                    {fullName(contact.first_name, contact.last_name)}
                  </span>
                  <span className="block truncate text-xs text-muted">{contact.title}</span>
                </span>
              </button>
            ))}
            {!conversationsQuery.isLoading &&
            filteredConversations.length === 0 &&
            filteredContacts.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted">No people to message yet.</p>
            ) : null}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-[#f8f7f4]">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-[#e8edf5] bg-white px-5 py-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {initials(selected.other?.first_name, selected.other?.last_name)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {fullName(selected.other?.first_name, selected.other?.last_name)}
                  </p>
                  <p className="text-xs text-muted">{kindLabel(selected.other?.kind)}</p>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {messagesQuery.isLoading ? <Loading /> : null}
                {messages.map((item) => {
                  const mine = item.sender_id === selfId
                  return (
                    <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-[16px] px-3.5 py-2 text-sm ${
                          mine ? 'bg-navy text-white' : 'bg-white text-navy'
                        }`}
                      >
                        {!mine ? (
                          <p className="mb-1 text-[11px] font-semibold opacity-70">{item.sender_name}</p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">{item.body}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                          {new Date(item.created_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              <form
                className="flex items-end gap-2 border-t border-[#e8edf5] bg-white p-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void send()
                }}
              >
                <textarea
                  className="min-h-[44px] max-h-32 flex-1 resize-none rounded-[15px] border-0 bg-input px-4 py-3 text-sm text-navy outline-none focus:ring-2 focus:ring-navy/20"
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
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                title="Select a conversation"
                body="Choose someone from the list to start messaging."
              />
            </div>
          )}
        </section>
      </Card>
    </div>
  )
}

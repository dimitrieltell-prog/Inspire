import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const POLL_MS = 4000

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

// An incoming request is a conversation someone else started that isn't
// accepted yet -- it needs this user's decision. Their own pending outgoing
// requests just stay in the regular list.
function isIncomingRequest(c, userId) {
  return !c.accepted && c.requested_by !== userId
}

function ConversationList({ conversations, activeUserId, tab, currentUserId }) {
  if (conversations === null) return <p className="text-sm text-slate-light p-4">Loading…</p>
  const filtered = conversations.filter((c) =>
    tab === 'requests' ? isIncomingRequest(c, currentUserId) : !isIncomingRequest(c, currentUserId)
  )
  if (filtered.length === 0) {
    return (
      <p className="text-sm text-slate-light p-4">
        {tab === 'requests' ? 'No message requests.' : 'No conversations yet — message someone from their profile.'}
      </p>
    )
  }
  return (
    <div className="flex flex-col divide-y divide-line">
      {filtered.map((c) => {
        const pendingOutgoing = !c.accepted && c.requested_by === currentUserId
        return (
          <Link
            key={c.other_user.id}
            to={`/messages/${c.other_user.id}`}
            className={`flex items-center gap-3 p-4 hover:bg-bg/60 transition-colors ${activeUserId === c.other_user.id ? 'bg-bg/60' : ''}`}
          >
            {c.other_user.avatar_url ? (
              <img src={c.other_user.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-indigo text-white flex items-center justify-center font-bold flex-shrink-0">
                {c.other_user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-grow">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate">{c.other_user.display_name}</p>
                <span className="text-[11px] text-slate-light flex-shrink-0">{timeAgo(c.last_message_at)}</span>
              </div>
              <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? 'text-navy font-semibold' : 'text-slate-light'}`}>
                {pendingOutgoing ? 'Request sent — ' : ''}{c.last_message}
              </p>
            </div>
            {c.unread_count > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo flex-shrink-0" />
            )}
          </Link>
        )
      })}
    </div>
  )
}

function Thread({ userId, currentUser, conversation, onRespond }) {
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [responding, setResponding] = useState(false)
  const bottomRef = useRef(null)
  const pollRef = useRef(null)

  const incomingRequest = conversation ? isIncomingRequest(conversation, currentUser.id) : false
  const pendingOutgoing = conversation ? (!conversation.accepted && conversation.requested_by === currentUser.id) : false

  useEffect(() => {
    setProfile(null)
    setMessages(null)
    setError('')
    api.getProfile(userId).then(setProfile).catch((e) => setError(e.message))

    let cancelled = false
    async function load() {
      try {
        const msgs = await api.getMessages(userId)
        if (cancelled) return
        setMessages(msgs)
        await api.markMessagesRead(userId)
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    }
    load()
    pollRef.current = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(pollRef.current) }
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true)
    setError('')
    try {
      const message = await api.sendMessage(userId, text)
      setMessages((m) => [...(m || []), message])
      setBody('')
      onRespond()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function accept() {
    setResponding(true)
    setError('')
    try {
      await api.acceptMessageRequest(userId)
      onRespond()
    } catch (e) {
      setError(e.message)
    } finally {
      setResponding(false)
    }
  }

  async function decline() {
    setResponding(true)
    setError('')
    try {
      await api.declineMessageRequest(userId)
      onRespond(true)
    } catch (e) {
      setError(e.message)
      setResponding(false)
    }
  }

  if (error && !profile) {
    return <p className="text-sm text-rose-ink p-6">{error}</p>
  }

  // Only the actual last message in the thread can carry the "Seen" label --
  // if they've replied since, your last message already implicitly landed.
  const lastMessage = messages && messages[messages.length - 1]
  const showSeen = lastMessage?.sender_id === currentUser.id && !!lastMessage.read_at

  return (
    <div className="flex flex-col h-full">
      {profile && (
        <div className="flex items-center gap-3 p-4 border-b border-line flex-shrink-0">
          <Link to="/messages" aria-label="Back to conversations" className="md:hidden text-slate-light hover:text-navy text-lg leading-none flex-shrink-0">
            ←
          </Link>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-indigo text-white flex items-center justify-center text-sm font-bold">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <Link to={`/users/${userId}`} className="text-sm font-semibold hover:text-indigo transition-colors">
            {profile.display_name}
          </Link>
        </div>
      )}

      <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-2 min-h-0">
        {messages === null ? (
          <p className="text-sm text-slate-light">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-light">Say hi to start the conversation.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUser.id
            return (
              <div key={m.id} className={`max-w-[75%] ${mine ? 'self-end items-end' : 'self-start items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${mine ? 'bg-indigo text-white' : 'bg-bg text-navy'}`}>
                  {m.body}
                </div>
              </div>
            )
          })
        )}
        {showSeen && (
          <p className="text-[11px] text-slate-light self-end pr-1">Seen</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-rose-ink px-4">{error}</p>}

      {incomingRequest ? (
        <div className="p-4 border-t border-line flex-shrink-0">
          <p className="text-xs text-slate-light mb-3">
            {profile?.display_name} isn't someone you follow back yet — accept to start replying, or decline to remove this request.
          </p>
          <div className="flex gap-2">
            <button
              onClick={accept}
              disabled={responding}
              className="bg-indigo text-white rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={decline}
              disabled={responding}
              className="border border-line rounded-full px-5 py-2 text-sm font-semibold hover:border-rose-ink hover:text-rose-ink disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-2 p-3 border-t border-line flex-shrink-0">
          {pendingOutgoing && (
            <p className="text-[11px] text-slate-light px-1">Waiting for {profile?.display_name} to accept your message request.</p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message…"
              maxLength={2000}
              className="flex-grow border border-line rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-indigo"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="bg-indigo text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function Messages() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const { userId } = useParams()
  const [conversations, setConversations] = useState(null)
  const [tab, setTab] = useState('messages')

  useEffect(() => {
    if (!ready) return
    if (!user) { navigate('/login'); return }
  }, [ready, user, navigate])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    function load() {
      api.listConversations().then((c) => { if (!cancelled) setConversations(c) }).catch(() => {})
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [user, userId])

  if (!ready || !user) return null

  const requestCount = (conversations || []).filter((c) => isIncomingRequest(c, user.id)).length
  const activeConversation = conversations?.find((c) => c.other_user.id === userId) || null

  function refreshAfterRespond(declined) {
    api.listConversations().then(setConversations).catch(() => {})
    if (declined) navigate('/messages')
  }

  return (
    <div className="max-w-4xl mx-auto px-7 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-indigo">Messages</span>
      <h1 className="text-3xl font-bold mt-3 mb-8">Messages</h1>

      <div className="bg-white border border-line rounded-xl2 overflow-hidden grid md:grid-cols-[280px_1fr]" style={{ height: '65vh' }}>
        <div className={`flex flex-col border-line ${userId ? 'hidden md:flex md:border-r' : 'border-r'}`}>
          <div className="flex gap-1 p-2 border-b border-line flex-shrink-0">
            <button
              onClick={() => setTab('messages')}
              className={`flex-1 text-sm font-semibold rounded-lg px-3 py-2 transition-colors ${tab === 'messages' ? 'bg-lavender text-indigo' : 'text-slate hover:bg-bg/60'}`}
            >
              Messages
            </button>
            <button
              onClick={() => setTab('requests')}
              className={`relative flex-1 text-sm font-semibold rounded-lg px-3 py-2 transition-colors ${tab === 'requests' ? 'bg-lavender text-indigo' : 'text-slate hover:bg-bg/60'}`}
            >
              Requests{requestCount > 0 ? ` (${requestCount})` : ''}
            </button>
          </div>
          <div className="overflow-y-auto flex-grow">
            <ConversationList conversations={conversations} activeUserId={userId} tab={tab} currentUserId={user.id} />
          </div>
        </div>
        <div className={userId ? 'block' : 'hidden md:flex md:items-center md:justify-center'}>
          {userId ? (
            <Thread userId={userId} currentUser={user} conversation={activeConversation} onRespond={refreshAfterRespond} />
          ) : (
            <p className="text-sm text-slate-light">Select a conversation.</p>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function Aria() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { from: 'aria', text: "Hi, I'm Aria. What's on your mind today?" },
  ])
  const [input, setInput] = useState('')
  const [usage, setUsage] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) return
    api.ariaUsage().then(setUsage).catch(() => {})
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-7 py-24 text-center">
        <p className="text-slate mb-4">Sign in to talk with Aria.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 rounded-full font-semibold bg-indigo text-white">Sign in</button>
      </div>
    )
  }

  const limitReached = usage?.limit_reached

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || limitReached) return
    const userMessage = input
    setInput('')
    setMessages((m) => [...m, { from: 'user', text: userMessage }])
    setSending(true)
    setError('')
    try {
      const res = await api.ariaChat(userMessage)
      setMessages((m) => [...m, { from: 'aria', text: res.reply }])
      setUsage(res)
    } catch (err) {
      if (err.status === 429) {
        setUsage((u) => ({ ...u, limit_reached: true }))
      }
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-7 py-12 flex flex-col h-[calc(100vh-80px)]">
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-1">Aria</h1>
        <p className="text-sm text-slate">A private place to think out loud. Not a replacement for professional care.</p>
        {usage && usage.daily_limit !== null && (
          <div className="mt-4">
            <div className="flex gap-1.5 mb-1.5">
              {Array.from({ length: usage.daily_limit }).map((_, i) => (
                <span key={i} className={`w-5 h-1.5 rounded ${i < usage.messages_used_today ? 'bg-indigo' : 'bg-line'}`} />
              ))}
            </div>
            <p className="text-xs text-slate-light">
              <strong className="text-navy">{usage.messages_used_today} of {usage.daily_limit}</strong> free messages today ·{' '}
              <Link to="/premium" className="text-indigo font-semibold">Upgrade for unlimited</Link>
            </p>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto bg-white border border-line rounded-xl2 p-5 flex flex-col gap-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            m.from === 'user' ? 'bg-indigo text-white self-end' : 'bg-lavender text-navy self-start'
          }`}>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {limitReached && (
        <div className="bg-rose text-rose-ink text-sm rounded-xl p-4 mb-3">
          You've used all your free messages today. <Link to="/premium" className="font-semibold underline">Upgrade to Premium</Link> for unlimited conversations with Aria.
        </div>
      )}
      {error && !limitReached && <p className="text-sm text-rose-ink mb-2">{error}</p>}

      <form onSubmit={send} className="flex gap-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={limitReached || sending}
          placeholder={limitReached ? 'Upgrade to keep talking with Aria' : "What's on your mind?"}
          className="flex-grow border border-line rounded-full px-5 py-3 text-sm focus:outline-none focus:border-indigo disabled:bg-line/40"
        />
        <button disabled={limitReached || sending} className="px-6 py-3 rounded-full font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  )
}

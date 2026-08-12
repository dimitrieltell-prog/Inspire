import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

// A client-side safety net: shown immediately based on what the user typed,
// independent of whatever Aria's own reply says, so a crisis resource always
// appears even if the AI response is delayed, fails, or mishandles it.
const CRISIS_PATTERNS = [
  /\bkill (myself|me)\b/, /\bsuicid(e|al)\b/, /\bend my life\b/, /\bwant(ed)? to die\b/,
  /\bdon'?t want to (be alive|live|exist)\b/, /\bhurt(ing)? myself\b/, /\bself[- ]?harm\b/,
  /\bcutting myself\b/, /\bno reason to live\b/, /\bbetter off dead\b/, /\bcan'?t go on\b/,
  /\boverdose\b/, /\bend it all\b/,
]

function containsCrisisSignal(text) {
  const t = text.toLowerCase()
  return CRISIS_PATTERNS.some((re) => re.test(t))
}

const CRISIS_MESSAGE =
  "It sounds like you might be going through something really heavy right now. Aria is an AI " +
  "and isn't equipped to keep you safe — please reach out to real support right now: in the US, " +
  "call or text 988 (Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or " +
  "contact your local emergency number. You deserve support beyond a chat."

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
    if (containsCrisisSignal(userMessage)) {
      setMessages((m) => [...m, { from: 'crisis', text: CRISIS_MESSAGE }])
    }
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
    // Nothing to subtract on desktop -- the sidebar is a left column now,
    // not a top bar. On mobile, subtract the real top bar + bottom tab bar
    // heights (frontend/src/components/navMetrics.js MOBILE_TOPBAR_H=56 /
    // MOBILE_TABBAR_H=64, keep in sync) plus safe-area insets, using 100dvh
    // instead of 100vh since Capacitor's WKWebView needs the dynamic-viewport
    // unit to avoid overshooting the real visible area.
    <div className="max-w-2xl mx-auto px-7 py-12 flex flex-col h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-screen">
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-1">Aria</h1>
        <p className="text-sm text-slate">A private place to think out loud.</p>
        <div className="bg-rose/50 border border-rose-ink/20 rounded-xl px-4 py-3 mt-3">
          <p className="text-xs text-rose-ink leading-relaxed">
            Aria is an AI companion, not a therapist or medical professional, and can make mistakes.
            If you're in crisis or thinking about harming yourself, please reach out for real help right now —
            in the US, call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline), or contact your local
            emergency number.
          </p>
        </div>
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
        {messages.map((m, i) => m.from === 'crisis' ? (
          <div key={i} className="self-stretch bg-rose border border-rose-ink/30 rounded-xl px-4 py-3 text-sm text-rose-ink leading-relaxed font-medium">
            {m.text}
          </div>
        ) : (
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
          maxLength={2000}
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

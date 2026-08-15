import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { timeLeftLabel } from '../timeLeft'

function SendSheet({ story, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [sentTo, setSentTo] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      api.searchUsers(query).then(setResults).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function send(person) {
    setBusyId(person.id)
    setError('')
    try {
      await api.sendStory(story.id, person.id)
      setSentTo(person.display_name)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="absolute inset-0 bg-black/70 flex items-end sm:items-center justify-center z-20" onClick={onClose}>
      <div className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[70vh] flex flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy">Send story</h3>
          <button onClick={onClose} className="text-slate-light hover:text-navy text-lg leading-none">✕</button>
        </div>
        {sentTo ? (
          <p className="text-sm text-slate py-6 text-center">Sent to <span className="font-semibold">{sentTo}</span>.</p>
        ) : (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="border border-line rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-indigo"
            />
            {error && <p className="text-xs text-rose-ink mb-2">{error}</p>}
            <div className="overflow-y-auto flex-grow">
              {results.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">{p.display_name}{p.username && <span className="text-slate-light ml-1.5">@{p.username}</span>}</span>
                  <button
                    onClick={() => send(p)}
                    disabled={busyId === p.id}
                    className="text-xs font-semibold bg-indigo text-white rounded-full px-3.5 py-1.5 disabled:opacity-50"
                  >
                    {busyId === p.id ? 'Sending…' : 'Send'}
                  </button>
                </div>
              ))}
              {query.trim().length >= 2 && results.length === 0 && (
                <p className="text-xs text-slate-light">No one found.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function StoryViewer({ stories, startIndex = 0, onClose, onViewed }) {
  const { user } = useAuth()
  const [index, setIndex] = useState(startIndex)
  const [items, setItems] = useState(stories)
  const [replyBody, setReplyBody] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [replySent, setReplySent] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [error, setError] = useState('')

  const story = items[index]

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    setReplyBody('')
    setReplySent(false)
    setError('')
    const current = items[index]
    if (current) {
      api.markStoryViewed(current.id).catch(() => {})
      onViewed?.(current.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  if (!story) return null

  function next() {
    if (index < items.length - 1) setIndex((i) => i + 1)
    else onClose()
  }

  function prev() {
    if (index > 0) setIndex((i) => i - 1)
  }

  async function toggleLike() {
    if (!user) { setError('Sign in to like.'); return }
    const next = !story.is_liked
    setItems((arr) => arr.map((s, i) => i === index ? { ...s, is_liked: next, like_count: s.like_count + (next ? 1 : -1) } : s))
    try {
      next ? await api.likeEphemeralStory(story.id) : await api.unlikeEphemeralStory(story.id)
    } catch (e) {
      setItems((arr) => arr.map((s, i) => i === index ? { ...s, is_liked: !next, like_count: s.like_count + (next ? -1 : 1) } : s))
      setError(e.message)
    }
  }

  async function submitReply(e) {
    e.preventDefault()
    if (!user) { setError('Sign in to reply.'); return }
    setReplyBusy(true)
    setError('')
    try {
      await api.replyToStory(story.id, replyBody)
      setReplyBody('')
      setReplySent(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setReplyBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative w-full h-full sm:w-[420px] sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-[#131A33] flex flex-col">
        {/* progress segments */}
        <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-10">
          {items.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div className={`h-full bg-surface transition-all ${i <= index ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>

        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-10">
          <Link to={`/users/${story.author_id}`} className="text-white text-sm font-semibold drop-shadow">{story.author_name}</Link>
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-xs">{timeLeftLabel(story.expires_at)}</span>
            <button onClick={onClose} className="text-white text-xl leading-none">✕</button>
          </div>
        </div>

        {/* tap zones */}
        <button aria-label="Previous" onClick={prev} className="absolute left-0 top-0 h-full w-1/3 z-[5]" />
        <button aria-label="Next" onClick={next} className="absolute right-0 top-0 h-full w-1/3 z-[5]" />

        {/* content */}
        <div className="flex-grow flex items-center justify-center px-6">
          {story.media_url ? (
            story.media_type === 'video'
              ? <video src={story.media_url} autoPlay className="max-h-full max-w-full rounded-lg" />
              : <img src={story.media_url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          ) : (
            <p className="text-white text-2xl font-semibold text-center leading-snug">{story.body}</p>
          )}
        </div>
        {story.media_url && story.body && (
          <p className="text-white text-sm px-5 pb-3 text-center">{story.body}</p>
        )}

        {/* actions */}
        <div className="relative z-10 p-4 flex items-center gap-3 bg-gradient-to-t from-black/50 to-transparent">
          {!replySent ? (
            <form onSubmit={submitReply} className="flex-grow flex items-center gap-2">
              <input
                maxLength={1000}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Reply…"
                className="flex-grow bg-white/10 text-white placeholder-white/50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:bg-white/20"
              />
              <button disabled={replyBusy || !replyBody.trim()} className="text-white text-sm font-semibold disabled:opacity-40">
                Send
              </button>
            </form>
          ) : (
            <span className="flex-grow text-white/70 text-sm">Reply sent.</span>
          )}
          <button onClick={toggleLike} className="text-2xl flex-shrink-0">
            {story.is_liked ? '❤️' : '🤍'}
          </button>
          <button onClick={() => setShowSend(true)} className="text-white text-2xl flex-shrink-0">➤</button>
        </div>
        {error && <p className="relative z-10 text-xs text-rose-200 px-4 pb-2">{error}</p>}

        {showSend && <SendSheet story={story} onClose={() => setShowSend(false)} />}
      </div>
    </div>
  )
}

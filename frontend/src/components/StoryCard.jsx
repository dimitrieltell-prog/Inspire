import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { timeLeftLabel } from '../timeLeft'

const REACTIONS = ["I'm here for you", 'You helped me', 'I understand', 'Stay strong', 'Thank you for sharing']

export default function StoryCard({ story }) {
  const { user } = useAuth()
  const [supportCount, setSupportCount] = useState(story.support_count)
  const [picked, setPicked] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const [reposted, setReposted] = useState(story.is_reposted)
  const [repostCount, setRepostCount] = useState(story.repost_count || 0)

  async function react(reaction) {
    if (!user) { setError('Sign in to send support.'); return }
    try {
      await api.reactToStory(story.id, reaction)
      if (!picked) setSupportCount((c) => c + 1)
      setPicked(reaction)
      setOpen(false)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleRepost() {
    if (!user) { setError('Sign in to repost.'); return }
    const next = !reposted
    setReposted(next)
    setRepostCount((c) => c + (next ? 1 : -1))
    try {
      next ? await api.repostStory(story.id) : await api.unrepostStory(story.id)
    } catch (e) {
      setReposted(!next)
      setRepostCount((c) => c + (next ? -1 : 1))
      setError(e.message)
    }
  }

  return (
    <div className="bg-white border border-line rounded-xl2 p-6 flex flex-col h-full hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(19,26,51,0.18)] transition-all">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {story.media_type && (
          <span className="inline-flex items-center gap-1.5 bg-lavender text-indigo text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit">
            {story.media_type === 'photo' ? '📷 Photo' : '🎥 Video'}
          </span>
        )}
        {story.audience === 'close_circle' && (
          <span className="inline-flex items-center gap-1.5 bg-navy text-white text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit">
            🔒 Close circle
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-indigo">{story.category}</span>
        <span className="text-[11px] text-slate-light font-medium flex-shrink-0">{timeLeftLabel(story.expires_at)}</span>
      </div>
      <h3 className="text-[18.5px] font-bold mb-2.5 leading-snug">
        <Link to={`/stories/${story.id}`} className="hover:text-indigo transition-colors">{story.title}</Link>
      </h3>
      <p className="text-sm text-slate leading-relaxed mb-5 flex-grow">{story.body}</p>

      <div className="relative">
        {open && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-line rounded-xl shadow-lg p-2 flex flex-col gap-1 z-10">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => react(r)}
                className={`text-left text-sm px-3 py-2 rounded-lg hover:bg-lavender transition-colors ${picked === r ? 'bg-indigo text-white hover:bg-indigo' : ''}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <span className="flex items-center gap-1.5 min-w-0">
            {story.author_id ? (
              <Link to={`/users/${story.author_id}`} className="text-xs font-semibold text-slate hover:text-indigo transition-colors truncate">{story.author_name}</Link>
            ) : (
              <span className="text-xs font-semibold text-slate truncate">{story.author_name}</span>
            )}
            {story.author_is_business && (
              <span className="text-[9px] font-bold uppercase tracking-wide border border-line text-slate-light px-1.5 py-0.5 rounded-full flex-shrink-0">
                {story.author_business_category || 'Business'}
              </span>
            )}
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-light">
            <button onClick={() => setOpen((o) => !o)} className="hover:text-indigo transition-colors font-medium">
              {story.counts_hidden ? 'Support' : `${supportCount} support`}
            </button>
            <Link to={`/stories/${story.id}`} className="hover:text-indigo transition-colors">{story.comment_count} replies</Link>
            {story.audience !== 'close_circle' && (
              <button onClick={toggleRepost} className={`transition-colors font-medium ${reposted ? 'text-indigo' : 'hover:text-indigo'}`}>
                ⇄ {repostCount}
              </button>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-rose-ink mt-2">{error}</p>}
      </div>
    </div>
  )
}

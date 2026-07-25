import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const REACTIONS = ["I'm here for you", 'You helped me', 'I understand', 'Stay strong', 'Thank you for sharing']

export default function StoryCard({ story }) {
  const { user } = useAuth()
  const [supportCount, setSupportCount] = useState(story.support_count)
  const [picked, setPicked] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const [saved, setSaved] = useState(story.is_saved)
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

  async function toggleSave() {
    if (!user) { setError('Sign in to save.'); return }
    const next = !saved
    setSaved(next)
    try {
      next ? await api.saveStory(story.id) : await api.unsaveStory(story.id)
    } catch (e) {
      setSaved(!next)
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
    <div className="bg-white border border-line rounded-xl2 overflow-hidden flex flex-col h-full hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(19,26,51,0.18)] transition-all">
      {/* header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className="w-8 h-8 rounded-full bg-indigo text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {story.author_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-grow">
          <div className="flex items-center gap-1.5 min-w-0">
            {story.author_id ? (
              <Link to={`/users/${story.author_id}`} className="text-sm font-semibold text-navy hover:text-indigo transition-colors truncate">{story.author_name}</Link>
            ) : (
              <span className="text-sm font-semibold text-navy truncate">{story.author_name}</span>
            )}
            {story.author_is_business && (
              <span className="text-[9px] font-bold uppercase tracking-wide border border-line text-slate-light px-1.5 py-0.5 rounded-full flex-shrink-0">
                {story.author_business_category || 'Business'}
              </span>
            )}
          </div>
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-indigo">{story.category}</span>
        </div>
      </div>

      {/* media */}
      {story.media_url && (
        <Link to={`/stories/${story.id}`} className="block w-full aspect-[4/5] bg-navy overflow-hidden">
          {story.media_type === 'video' ? (
            <video src={story.media_url} controls className="w-full h-full object-cover" />
          ) : (
            <img src={story.media_url} alt="" className="w-full h-full object-cover" />
          )}
        </Link>
      )}

      {/* text content */}
      <div className="px-4 pt-4 flex flex-col flex-grow">
        <h3 className="text-[17px] font-bold mb-1.5 leading-snug">
          <Link to={`/stories/${story.id}`} className="hover:text-indigo transition-colors">{story.title}</Link>
        </h3>
        <p className="text-sm text-slate leading-relaxed line-clamp-3 flex-grow">{story.body}</p>
      </div>

      {/* action row */}
      <div className="relative px-4 pt-3 pb-4 mt-3">
        {open && (
          <div className="absolute bottom-full mb-2 left-4 right-4 bg-white border border-line rounded-xl shadow-lg p-2 flex flex-col gap-1 z-10">
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
        <div className="flex items-center gap-4 border-t border-line pt-3">
          <button onClick={() => setOpen((o) => !o)} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${picked ? 'text-rose-ink' : 'text-slate-light hover:text-indigo'}`}>
            <span className="text-base leading-none">{picked ? '❤️' : '🤍'}</span>
            {!story.counts_hidden && <span>{supportCount}</span>}
          </button>
          <Link to={`/stories/${story.id}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-light hover:text-indigo transition-colors">
            <span className="text-base leading-none">💬</span>
            <span>{story.comment_count}</span>
          </Link>
          <button onClick={toggleRepost} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${reposted ? 'text-indigo' : 'text-slate-light hover:text-indigo'}`}>
            <span className="text-base leading-none">🔁</span>
            <span>{repostCount}</span>
          </button>
          <button onClick={toggleSave} className={`ml-auto text-base leading-none transition-colors ${saved ? 'text-indigo' : 'text-slate-light hover:text-indigo'}`}>
            🔖
          </button>
        </div>
        {error && <p className="text-xs text-rose-ink mt-2">{error}</p>}
      </div>
    </div>
  )
}

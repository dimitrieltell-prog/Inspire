import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import ReportModal from './ReportModal'
import BookmarkIcon from './BookmarkIcon'
import ReactorsModal from './ReactorsModal'

const REACTIONS = ["That's awesome!", 'Love this!', 'So proud of you', "I'm here for you", 'You helped me', 'I understand', 'Stay strong', 'Thank you for sharing']

export default function StoryCard({ story, repostedBy }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [supportCount, setSupportCount] = useState(story.support_count)
  const [picked, setPicked] = useState(story.my_reaction || null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [reactorsOpen, setReactorsOpen] = useState(false)

  const [saved, setSaved] = useState(story.is_saved)
  const [reposted, setReposted] = useState(story.is_reposted)
  const [repostCount, setRepostCount] = useState(story.repost_count || 0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  function promptSignIn() {
    navigate('/login', { state: { from: location } })
  }

  function openReactions() {
    if (!user) { promptSignIn(); return }
    if (picked) { unreact(); return }
    setOpen((o) => !o)
  }

  async function react(reaction) {
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

  async function unreact() {
    try {
      await api.unreactToStory(story.id)
      setSupportCount((c) => c - 1)
      setPicked(null)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleSave() {
    if (!user) { promptSignIn(); return }
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
    if (!user) { promptSignIn(); return }
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
      {repostedBy && (
        <div className="flex items-center gap-1.5 px-4 pt-3 text-xs font-semibold text-slate-light">
          <span className="text-sm leading-none">🔁</span> Reposted by {repostedBy}
        </div>
      )}
      {/* header */}
      <div className="relative flex items-center gap-2.5 px-4 pt-4 pb-3">
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
        </div>
        {user && story.author_id !== user.id && (
          <div className="flex-shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More options"
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-light hover:text-navy hover:bg-bg transition-colors"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute top-10 right-4 bg-white border border-line rounded-xl shadow-lg py-1.5 z-10 min-w-[120px]">
                <button
                  onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                  className="w-full text-left px-4 py-2 text-sm text-rose-ink hover:bg-bg transition-colors"
                >
                  Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {reportOpen && <ReportModal targetType="story" targetId={story.id} onClose={() => setReportOpen(false)} />}

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
        {story.tags?.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2.5">
            {story.tags.map((t) => (
              <Link
                key={t}
                to={`/stories?tag=${encodeURIComponent(t)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
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
          <div className={`flex items-center gap-1.5 text-sm font-medium ${picked ? 'text-rose-ink' : 'text-slate-light'}`}>
            <button onClick={openReactions} className="hover:text-indigo transition-colors">
              <span className="text-base leading-none">{picked ? '❤️' : '🤍'}</span>
            </button>
            {!story.counts_hidden && (
              <button onClick={() => setReactorsOpen(true)} className="hover:underline hover:text-indigo transition-colors">
                {supportCount}
              </button>
            )}
          </div>
          {reactorsOpen && <ReactorsModal storyId={story.id} onClose={() => setReactorsOpen(false)} />}
          <Link to={`/stories/${story.id}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-light hover:text-indigo transition-colors">
            <span className="text-base leading-none">💬</span>
            <span>{story.comment_count}</span>
          </Link>
          <button onClick={toggleRepost} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${reposted ? 'text-indigo' : 'text-slate-light hover:text-indigo'}`}>
            <span className="text-base leading-none">🔁</span>
            <span>{repostCount}</span>
          </button>
          <button
            onClick={toggleSave}
            aria-label={saved ? 'Unsave' : 'Save'}
            className={`ml-auto transition-colors ${saved ? 'text-indigo' : 'text-slate-light hover:text-indigo'}`}
          >
            <BookmarkIcon filled={saved} className="w-4 h-4" />
          </button>
        </div>
        {error && <p className="text-xs text-rose-ink mt-2">{error}</p>}
      </div>
    </div>
  )
}

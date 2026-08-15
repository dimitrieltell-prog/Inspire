import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import ReportModal from '../components/ReportModal'
import BookmarkIcon from '../components/BookmarkIcon'
import ReactorsModal from '../components/ReactorsModal'
import Comments from '../components/Comments'
import { useStoryInteractions } from '../components/useStoryInteractions'

const REACTIONS = ["That's awesome!", 'Love this!', 'So proud of you', "I'm here for you", 'You helped me', 'I understand', 'Stay strong', 'Thank you for sharing']

export default function StoryDetail() {
  const { storyId } = useParams()
  const { user } = useAuth()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [menuOpen, setMenuOpen] = useState(false)
  const [report, setReport] = useState(null) // { targetType: 'story', targetId } | null

  useEffect(() => {
    setLoading(true)
    api.getStory(storyId)
      .then(setStory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [storyId])

  if (loading) return <p className="text-center text-slate py-16">Loading…</p>
  if (error) return (
    <div className="text-center py-16 px-7">
      <p className="text-rose-ink mb-3">{error}</p>
      {!user && (
        <p className="text-sm text-slate">
          <Link to="/login" className="text-indigo font-semibold">Sign in</Link> if you think you should have access to this.
        </p>
      )}
    </div>
  )
  if (!story) return null

  return <StoryDetailBody story={story} setStory={setStory} user={user} menuOpen={menuOpen} setMenuOpen={setMenuOpen} report={report} setReport={setReport} />
}

function StoryDetailBody({ story, setStory, user, menuOpen, setMenuOpen, report, setReport }) {
  const {
    supportCount, picked, reactOpen, setReactOpen, error: reactError,
    reactorsOpen, setReactorsOpen,
    saved, reposted, repostCount,
    openReactions, react, unreact, toggleSave, toggleRepost,
  } = useStoryInteractions(story)

  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <Link to="/stories" className="text-sm text-indigo font-semibold">← Back to stories</Link>

      <div className="bg-surface border border-line rounded-xl2 overflow-hidden mt-6">
        <div className="relative flex items-center gap-2.5 px-6 pt-6 pb-3">
          {story.author_avatar_url ? (
            <img src={story.author_avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="w-9 h-9 rounded-full bg-indigo text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {story.author_name.charAt(0).toUpperCase()}
            </span>
          )}
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
                <div className="absolute top-11 right-6 bg-surface border border-line rounded-xl shadow-lg py-1.5 z-10 min-w-[120px]">
                  <button
                    onClick={() => { setMenuOpen(false); setReport({ targetType: 'story', targetId: story.id }) }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-ink hover:bg-bg transition-colors"
                  >
                    Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {story.media_url && (
          <div className="w-full bg-navy">
            {story.media_type === 'video' ? (
              <video src={story.media_url} controls className="w-full max-h-[70vh]" />
            ) : (
              <img src={story.media_url} alt="" className="w-full max-h-[70vh] object-contain" />
            )}
          </div>
        )}

        <div className="px-6 pt-5 mb-6">
          <h1 className="text-2xl font-bold mb-3 leading-snug">{story.title}</h1>
          <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">{story.body}</p>
          {story.tags?.length > 0 && (
            <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-3">
              {story.tags.map((t) => (
                <Link key={t} to={`/stories?tag=${encodeURIComponent(t)}`} className="text-sm font-semibold text-indigo hover:underline">
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative px-6 pb-6">
          {reactOpen && (
            <div className="absolute bottom-full mb-2 left-6 right-6 bg-surface border border-line rounded-xl shadow-lg p-2 flex flex-col gap-1 z-10">
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
          <div className="flex items-center gap-5 pt-4 border-t border-line">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${picked ? 'text-rose-ink' : 'text-slate-light'}`}>
              <button onClick={openReactions} className="hover:text-indigo transition-colors">
                <span className="text-lg leading-none">{picked ? '❤️' : '🤍'}</span>
              </button>
              {!story.counts_hidden && (
                <button onClick={() => setReactorsOpen(true)} className="hover:underline hover:text-indigo transition-colors">
                  {supportCount}
                </button>
              )}
            </div>
            {reactorsOpen && <ReactorsModal storyId={story.id} onClose={() => setReactorsOpen(false)} />}
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-light">
              <span className="text-lg leading-none">💬</span>
              <span>{story.comment_count}</span>
            </span>
            <button onClick={toggleRepost} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${reposted ? 'text-indigo' : 'text-slate-light hover:text-indigo'}`}>
              <span className="text-lg leading-none">🔁</span>
              <span>{repostCount}</span>
            </button>
            <button
              onClick={toggleSave}
              aria-label={saved ? 'Unsave' : 'Save'}
              className={`ml-auto transition-colors ${saved ? 'text-indigo' : 'text-slate-light hover:text-indigo'}`}
            >
              <BookmarkIcon filled={saved} className="w-5 h-5" />
            </button>
          </div>
          {reactError && <p className="text-xs text-rose-ink mt-2">{reactError}</p>}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-lg font-bold mb-3">Replies</h2>
        <Comments
          storyId={story.id}
          initialCommentCount={story.comment_count}
          onCountChange={(n) => setStory((s) => ({ ...s, comment_count: n }))}
        />
      </div>

      {report && (
        <ReportModal targetType={report.targetType} targetId={report.targetId} onClose={() => setReport(null)} />
      )}
    </div>
  )
}

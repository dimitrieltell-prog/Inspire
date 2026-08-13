import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReportModal from './ReportModal'
import BookmarkIcon from './BookmarkIcon'
import ReactorsModal from './ReactorsModal'
import { useAuth } from '../AuthContext'
import { useStoryInteractions } from './useStoryInteractions'

const REACTIONS = ["That's awesome!", 'Love this!', 'So proud of you', "I'm here for you", 'You helped me', 'I understand', 'Stay strong', 'Thank you for sharing']

// One full-viewport slide of the Stories scroll-snap feed. Same interaction
// set as StoryCard.jsx's compact grid tile, but stretched to fill the slot
// -- and unlike StoryCard.jsx, media/title are not links: the post is
// already fully shown, so only the comment button navigates (opens the
// panel via onOpenComments) instead of routing to /stories/:id.
export default function FeedStoryCard({ story, onOpenComments }) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const {
    supportCount, picked, reactOpen, setReactOpen, error,
    reactorsOpen, setReactorsOpen,
    saved, reposted, repostCount,
    openReactions, react, toggleSave, toggleRepost,
  } = useStoryInteractions(story)

  return (
    <section className="relative h-full w-full flex-shrink-0 snap-start snap-always bg-white overflow-hidden flex flex-col">
      <div className="relative flex items-center gap-2.5 px-5 pt-5 pb-3 flex-shrink-0">
        <span className="w-9 h-9 rounded-full bg-indigo text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
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
              <div className="absolute top-10 right-5 bg-white border border-line rounded-xl shadow-lg py-1.5 z-10 min-w-[120px]">
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

      {story.media_url ? (
        <div className="flex-grow min-h-0 bg-navy overflow-hidden">
          {story.media_type === 'video' ? (
            <video src={story.media_url} controls className="w-full h-full object-cover" />
          ) : (
            <img src={story.media_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ) : (
        <div className="flex-grow min-h-0 bg-lavender flex items-center justify-center px-8">
          <p className="text-lg font-display font-semibold text-navy text-center leading-snug">{story.title}</p>
        </div>
      )}

      <div className="px-5 pt-4 max-h-[35%] overflow-y-auto flex-shrink-0">
        {story.media_url && <h3 className="text-[17px] font-bold mb-1.5 leading-snug">{story.title}</h3>}
        <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">{story.body}</p>
        {story.tags?.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2.5">
            {story.tags.map((t) => (
              <Link
                key={t}
                to={`/stories?tag=${encodeURIComponent(t)}`}
                className="text-xs font-semibold text-indigo hover:underline"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="relative px-5 pt-3 pb-5 flex-shrink-0">
        {reactOpen && (
          <div className="absolute bottom-full mb-2 left-5 right-5 bg-white border border-line rounded-xl shadow-lg p-2 flex flex-col gap-1 z-10">
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
          <button onClick={onOpenComments} className="flex items-center gap-1.5 text-sm font-medium text-slate-light hover:text-indigo transition-colors">
            <span className="text-base leading-none">💬</span>
            <span>{story.comment_count}</span>
          </button>
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
    </section>
  )
}

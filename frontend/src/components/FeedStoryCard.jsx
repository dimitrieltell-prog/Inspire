import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReportModal from './ReportModal'
import DeleteStoryConfirm from './DeleteStoryConfirm'
import BookmarkIcon from './BookmarkIcon'
import HeartIcon from './HeartIcon'
import CommentIcon from './CommentIcon'
import RepostIcon from './RepostIcon'
import ReactorsModal from './ReactorsModal'
import { useAuth } from '../AuthContext'
import { useStoryInteractions } from './useStoryInteractions'

// One card in the Stories scroll-snap feed -- sized to its content (like
// StoryCard.jsx's grid tile), not stretched to fill the viewport. Matches
// the approved demo mockup: a centered card with a gap above/below, not a
// full-bleed Reels-style slide. Unlike StoryCard.jsx, media/title are not
// links -- the post is already fully shown, so only the comment button
// navigates (opens the panel via onOpenComments) instead of routing to
// /stories/:id.
export default function FeedStoryCard({ story, onOpenComments, onDeleted }) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isOwn = user && story.author_id === user.id
  const canDelete = isOwn || user?.is_founder

  // Long posts are clamped to a few lines so one post can't fill the whole
  // feed. "more" only appears when the text is actually cut off, which we
  // can only know by measuring -- a character count guesses wrong as soon
  // as the card width or font changes.
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (expanded) return
    const el = bodyRef.current
    if (!el) return
    const measure = () => setIsTruncated(el.scrollHeight > el.clientHeight + 1)
    measure()
    // A single measurement on mount isn't enough: how many lines the text
    // wraps to depends on the card's width and the font, and either can
    // still be wrong at this point -- a backgrounded or freshly-restored
    // tab can lay out at zero width (where everything looks truncated),
    // and webfonts land after first paint. Both fire again below, so a
    // wrong first reading corrects itself instead of sticking.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => observer.disconnect()
  }, [story.body, expanded])

  const {
    supportCount, picked, error,
    reactorsOpen, setReactorsOpen,
    saved, reposted, repostCount,
    toggleLike, toggleSave, toggleRepost,
  } = useStoryInteractions(story)

  return (
    <div className="w-full bg-surface border border-line rounded-xl2 overflow-hidden flex flex-col shadow-[0_30px_60px_-30px_rgba(19,26,51,0.25)]">
      <div className="relative flex items-center gap-2.5 px-4 pt-4 pb-3">
        {story.author_avatar_url ? (
          <img src={story.author_avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-indigo text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
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
        {user && (
          <div className="flex-shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More options"
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-light hover:text-navy hover:bg-bg transition-colors"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute top-10 right-4 bg-surface border border-line rounded-xl shadow-lg py-1.5 z-10 min-w-[120px]">
                {!isOwn && (
                  <button
                    onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-ink hover:bg-bg transition-colors"
                  >
                    Report
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-ink hover:bg-bg transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {reportOpen && <ReportModal targetType="story" targetId={story.id} onClose={() => setReportOpen(false)} />}
      {deleteOpen && (
        <DeleteStoryConfirm
          storyId={story.id}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => { setDeleteOpen(false); onDeleted?.(story.id) }}
        />
      )}

      {story.media_url && (
        <div className="w-full aspect-square bg-[#131A33] overflow-hidden">
          {story.media_type === 'video' ? (
            <video src={story.media_url} controls className="w-full h-full object-cover" />
          ) : (
            <img src={story.media_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      <div className="px-4 pt-4 flex flex-col gap-1.5">
        {story.body?.trim() && (
          <div>
            <p
              ref={bodyRef}
              className={`text-sm text-slate leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-3'}`}
            >
              {story.body}
            </p>
            {(isTruncated || expanded) && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-semibold text-slate-light hover:text-indigo transition-colors mt-1"
              >
                {expanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}
        {story.tags?.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
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

      <div className="relative px-4 pt-3 pb-4 mt-2">
        <div className="flex items-center gap-4 border-t border-line pt-3">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${picked ? 'text-rose-ink' : 'text-slate-light'}`}>
            <button onClick={toggleLike} aria-label={picked ? 'Remove like' : 'Like'} className="hover:text-indigo transition-colors">
              <HeartIcon filled={!!picked} />
            </button>
            {!story.counts_hidden && (
              <button onClick={() => setReactorsOpen(true)} className="hover:underline hover:text-indigo transition-colors">
                {supportCount}
              </button>
            )}
          </div>
          {reactorsOpen && <ReactorsModal storyId={story.id} onClose={() => setReactorsOpen(false)} />}
          <button onClick={onOpenComments} aria-label="Comments" className="flex items-center gap-1.5 text-sm font-medium text-slate-light hover:text-indigo transition-colors">
            <CommentIcon />
            <span>{story.comment_count}</span>
          </button>
          <button onClick={toggleRepost} aria-label={reposted ? 'Undo repost' : 'Repost'} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${reposted ? 'text-indigo' : 'text-slate-light hover:text-indigo'}`}>
            <RepostIcon />
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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import ReportModal from './ReportModal'
import DeleteStoryConfirm from './DeleteStoryConfirm'
import HeartIcon from './HeartIcon'
import CommentIcon from './CommentIcon'
import RepostIcon from './RepostIcon'

// A single square tile in the profile grids (Profile.jsx and
// UserProfile.jsx -- the only two places this renders).
//
// This used to be a full post card: header, media, text, and its own
// like/comment/repost/save row. In a grid that made every tile a
// different height, and CSS grid stretches each tile to its row's tallest
// one -- so a one-line text post sitting next to a photo post grew a few
// hundred pixels of empty space, and no two rows lined up.
//
// Now every tile is the same square. A photo fills it; a text post shows
// its words in the same footprint. Interactions moved to the post itself,
// which is what tapping a tile does -- the one exception is the ⋯ menu,
// kept so posts can still be deleted straight from the grid rather than
// opening each one.
export default function StoryCard({ story, repostedBy }) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const isOwn = user && story.author_id === user.id
  const canDelete = isOwn || user?.is_founder
  const isVideo = story.media_type === 'video'

  // Self-contained: once gone, the tile just stops rendering rather than
  // threading a callback through every grid this appears in.
  if (deleted) return null

  return (
    <div className="relative group">
      <Link
        to={`/stories/${story.id}`}
        className="block aspect-square rounded-xl overflow-hidden border border-line bg-surface"
      >
        {story.media_url ? (
          isVideo ? (
            <video src={story.media_url} muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={story.media_url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          /* Bottom padding reserves the corner the ⋯ button sits in (always
             visible on touch), and the line count steps down with the tile:
             at 2-up on a phone a tile is ~155px, where 5 lines of 14px text
             is taller than the space left over and printed straight through
             the button. */
          <div className="w-full h-full p-4 pb-10 flex items-center justify-center">
            <p className="text-xs sm:text-sm text-slate leading-relaxed text-center line-clamp-4 sm:line-clamp-5 whitespace-pre-wrap">
              {story.body}
            </p>
          </div>
        )}

        {/* Counts on hover, the way a photo grid usually surfaces them --
            hidden entirely when the author has turned counts off. */}
        {!story.counts_hidden && (
          <div className="absolute inset-0 bg-[#131A33]/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              <HeartIcon filled className="w-4 h-4" />
              {story.support_count}
            </span>
            <span className="flex items-center gap-1.5">
              <CommentIcon className="w-4 h-4" />
              {story.comment_count}
            </span>
          </div>
        )}
      </Link>

      {/* Corner markers, so a tile reads correctly at a glance without
          opening it. */}
      {isVideo && (
        <span className="absolute top-2 right-2 pointer-events-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-xs">▶</span>
      )}
      {repostedBy && (
        <span className="absolute top-2 left-2 pointer-events-none flex items-center gap-1 rounded-full bg-[#131A33]/70 text-white text-[10px] font-semibold px-2 py-0.5">
          <RepostIcon className="w-3 h-3" /> Repost
        </span>
      )}

      {user && (
        <div className="absolute bottom-2 right-2">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-[#131A33]/70 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 max-md:opacity-100 transition-opacity"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute bottom-9 right-0 bg-surface border border-line rounded-xl shadow-lg py-1.5 z-10 min-w-[120px]">
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

      {reportOpen && <ReportModal targetType="story" targetId={story.id} onClose={() => setReportOpen(false)} />}
      {deleteOpen && (
        <DeleteStoryConfirm
          storyId={story.id}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => setDeleted(true)}
        />
      )}
    </div>
  )
}

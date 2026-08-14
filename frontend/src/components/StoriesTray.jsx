import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import StoryViewer from './StoryViewer'
import StoryComposer from './StoryComposer'

// Horizontal row of ephemeral-Story avatar bubbles above the feed --
// gradient ring = unseen, gray ring = already watched. Fetches the tray
// once (pre-computed per-author seen state from the backend) rather than
// reusing Avatar.jsx's self-fetching pattern, which would be an N+1
// waterfall for a tray of N followed authors.
export default function StoriesTray() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [openAuthorId, setOpenAuthorId] = useState(null)
  const [showComposer, setShowComposer] = useState(false)

  useEffect(() => {
    api.getStoryTray().then(setEntries).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  if (!loaded || !user) return null

  const ownEntry = entries.find((e) => e.is_self)
  const others = entries.filter((e) => !e.is_self)
  const openEntry = entries.find((e) => e.author_id === openAuthorId)

  function markSeenLocally(authorId) {
    setEntries((arr) => arr.map((e) => (e.author_id === authorId ? { ...e, has_unseen: false } : e)))
  }

  function onOwnBubbleClick() {
    if (ownEntry) setOpenAuthorId(user.id)
    else setShowComposer(true)
  }

  function onCreated(story) {
    setShowComposer(false)
    setEntries((arr) => {
      const withoutSelf = arr.filter((e) => !e.is_self)
      return [
        { author_id: user.id, author_name: user.display_name, author_avatar_url: user.avatar_url, is_self: true, has_unseen: false, stories: [story] },
        ...withoutSelf,
      ]
    })
  }

  // md:px-[max(2rem,calc(50%-340px))] sits left of where the feed's own
  // max-w-[480px] centered card starts (which would be calc(50%-240px) --
  // half of 480px) -- while the row can still scroll right past that point.
  return (
    <div className="flex gap-3.5 px-4 py-2.5 md:px-[max(2rem,calc(50%-340px))] md:py-3.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line bg-white flex-shrink-0">
      <StoryBubble
        name="Your story"
        avatarUrl={user.avatar_url}
        displayInitial={user.display_name}
        seen
        isOwn
        onClick={onOwnBubbleClick}
      />
      {others.map((e) => (
        <StoryBubble
          key={e.author_id}
          name={e.author_name}
          avatarUrl={e.author_avatar_url}
          displayInitial={e.author_name}
          seen={!e.has_unseen}
          onClick={() => setOpenAuthorId(e.author_id)}
        />
      ))}

      {openEntry && (
        <StoryViewer
          stories={openEntry.stories}
          onClose={() => setOpenAuthorId(null)}
          onViewed={() => { if (!openEntry.is_self) markSeenLocally(openEntry.author_id) }}
        />
      )}
      {showComposer && <StoryComposer onClose={() => setShowComposer(false)} onCreated={onCreated} />}
    </div>
  )
}

function StoryBubble({ name, avatarUrl, displayInitial, seen, isOwn, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14">
      <div className={`relative w-[52px] h-[52px] max-md:w-[44px] max-md:h-[44px] rounded-full p-[2.5px] ${seen ? 'bg-line' : 'bg-gradient-to-tr from-indigo to-rose-ink'}`}>
        <div className="w-full h-full rounded-full bg-white p-0.5 box-border">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-indigo text-white flex items-center justify-center font-bold text-[15px]">
              {displayInitial?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {isOwn && (
          <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-indigo text-white flex items-center justify-center text-xs font-extrabold border-2 border-white">+</span>
        )}
      </div>
      <span className="text-[10.5px] font-semibold text-slate max-w-14 overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
    </button>
  )
}

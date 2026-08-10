import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const POLL_MS = 15000

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const ICONS = {
  follow: '👤',
  follow_request: '👤',
  like: '❤️',
  repost: '🔁',
  comment: '💬',
  story_like: '❤️',
  story_reply: '💬',
  message: '✉️',
}

function copyFor(n) {
  switch (n.type) {
    case 'follow': return `${n.actor_name} started following you.`
    case 'follow_request': return `${n.actor_name} requested to follow you.`
    case 'like': return `${n.actor_name} reacted to your story${n.preview ? ` "${n.preview}"` : ''}.`
    case 'repost': return `${n.actor_name} reposted your story${n.preview ? ` "${n.preview}"` : ''}.`
    case 'comment': return `${n.actor_name} commented${n.preview ? `: "${n.preview}"` : ' on your story.'}`
    case 'story_like': return `${n.actor_name} liked your story.`
    case 'story_reply': return `${n.actor_name} replied${n.preview ? `: "${n.preview}"` : ' to your story.'}`
    case 'message': return `${n.actor_name} sent you a message.`
    default: return `${n.actor_name} did something.`
  }
}

function linkFor(n) {
  switch (n.type) {
    case 'follow':
    case 'follow_request':
      return `/users/${n.actor_id}`
    case 'like':
    case 'repost':
    case 'comment':
      return `/stories/${n.target_id}`
    case 'story_like':
    case 'story_reply':
      // Ephemeral Stories only have a viewer reachable by tapping an
      // avatar's story ring -- there's no standalone route for one, so
      // send the recipient to their own profile to open it from there.
      return '/profile'
    case 'message':
      return `/messages/${n.target_id}`
    default:
      return '/'
  }
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState(null)
  const navigate = useNavigate()
  const rootRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    function load() {
      api.getUnreadNotificationCount().then((r) => { if (!cancelled) setUnread(r.count) }).catch(() => {})
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next) {
      api.getNotifications().then(setItems).catch(() => setItems([]))
      if (unread > 0) {
        api.markNotificationsRead().then(() => setUnread(0)).catch(() => {})
      }
    }
  }

  function onSelect(n) {
    setOpen(false)
    navigate(linkFor(n))
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full border border-line bg-white hover:border-indigo transition-colors flex items-center justify-center text-sm flex-shrink-0"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-ink text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] max-h-[70vh] overflow-y-auto bg-white border border-line rounded-xl2 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-line font-bold text-sm">Notifications</div>
          {!items ? (
            <p className="text-sm text-slate-light px-4 py-6">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-light px-4 py-6">Nothing yet.</p>
          ) : (
            <div className="flex flex-col">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onSelect(n)}
                  className={`text-left px-4 py-3 flex items-start gap-3 border-b border-line last:border-b-0 hover:bg-lavender/30 transition-colors ${!n.read ? 'bg-lavender/20' : ''}`}
                >
                  <span className="text-lg flex-shrink-0">{ICONS[n.type] || '🔔'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-navy">{copyFor(n)}</span>
                    <span className="block text-[11px] text-slate-light mt-0.5">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo flex-shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

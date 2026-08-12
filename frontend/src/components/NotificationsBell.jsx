import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import BellIcon from './BellIcon'

const POLL_MS = 15000
const TOAST_MS = 2000

const SUMMARY_ICONS = [
  ['comments', '💬'],
  ['likes', '❤️'],
  ['follows', '👤'],
  ['reposts', '🔁'],
]

function capped(n) {
  return n > 99 ? '99+' : n
}

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
  story_send: '📤',
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
    case 'story_send': return `${n.actor_name} sent you a story.`
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
      // Ephemeral Stories only have a viewer reachable by tapping an
      // avatar's story ring -- there's no standalone route for one, so
      // send the recipient to their own profile to open it from there.
      return '/profile'
    case 'story_send':
      return '/story-inbox'
    case 'story_reply':
      // Replies to a Story are delivered as a real DM now, not a public
      // reply -- target_id is the replier's own id, same as "message".
    case 'message':
      return `/messages/${n.target_id}`
    default:
      return '/'
  }
}

export default function NotificationsBell({ anchor = 'right' }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState(null)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const prevUnreadRef = useRef(null)
  const toastTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    function load() {
      api.getUnreadNotificationCount().then((r) => {
        if (cancelled) return
        const count = r.count
        const prev = prevUnreadRef.current
        setUnread(count)
        // A rising count means there's something genuinely new to flag --
        // pop the breakdown toast, then let it fade so the bell settles
        // back to just its normal badge.
        if (count > 0 && (prev === null || count > prev)) {
          api.getUnreadNotificationSummary().then((summary) => {
            if (cancelled) return
            if (summary.comments + summary.likes + summary.follows + summary.reposts === 0) return
            setToast(summary)
            clearTimeout(toastTimerRef.current)
            toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS)
          }).catch(() => {})
        }
        prevUnreadRef.current = count
      }).catch(() => {})
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id); clearTimeout(toastTimerRef.current) }
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
      setToast(null)
      clearTimeout(toastTimerRef.current)
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

  // "left" is for the desktop sidebar (76px wide) -- right-0 would render
  // the panel almost entirely off the left edge of the viewport there, so
  // it opens rightward from the icon instead. "right" (default) keeps the
  // original behavior for the mobile top bar, near the right edge.
  const panelPosition = anchor === 'left' ? 'absolute left-full ml-2 top-0' : 'absolute right-0 mt-2'
  const toastPosition = anchor === 'left' ? 'absolute left-full ml-2 top-0' : 'absolute right-0 top-11'

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full border border-line bg-white hover:border-indigo transition-colors flex items-center justify-center text-sm flex-shrink-0"
      >
        <BellIcon className="w-[18px] h-[18px] text-slate" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-ink text-white text-[9px] font-bold flex items-center justify-center">
            {capped(unread)}
          </span>
        )}
      </button>

      {toast && !open && (
        <div className={`${toastPosition} z-40 flex items-center gap-2.5 bg-navy text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg whitespace-nowrap`}>
          {SUMMARY_ICONS.filter(([key]) => toast[key] > 0).map(([key, icon]) => (
            <span key={key} className="flex items-center gap-1">
              <span>{icon}</span>
              <span>{capped(toast[key])}</span>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className={`${panelPosition} w-80 max-w-[90vw] max-h-[70vh] overflow-y-auto bg-white border border-line rounded-xl2 shadow-lg z-50`}>
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

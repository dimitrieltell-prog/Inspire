import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import FounderStoryModal from './FounderStoryModal'
import CrownIcon from './CrownIcon'
import VerifiedBadge from './VerifiedBadge'

// React Router v7 wraps navigation updates in React.startTransition, which is
// lower priority than the synchronous user=null update logout() triggers. On
// a RequireAuth-protected page, that lets RequireAuth's own redirect to
// /login win the race before a router navigate('/') call commits. This app
// uses classic <BrowserRouter> (not a Data Router), where navigate's
// { flushSync: true } option has no effect -- so a hard navigation is used
// instead: it bypasses React Router's transition entirely, and by the time
// the fresh page loads, logout() has already cleared the token.
function signOut(logout) {
  logout()
  window.location.href = '/'
}

// Avatar-triggered dropdown for My Story / Premium / Settings / Sign out --
// self-contained the same way NotificationsBell is (own open state, own
// click-outside handler). Deliberately does NOT reuse components/Avatar.jsx,
// which has its own story-viewer/story-composer click behavior that belongs
// to the ephemeral-Stories tray (a later phase), not this menu.
//
// Only ever mounted when a user is signed in -- DesktopSidebar and
// MobileTopBar each render their own logged-out fallback UI instead of
// mounting this component, since the two fallbacks differ (see those files).
//
// anchor="sidebar": avatar sits bottom-left of a vertical rail, panel opens
// rightward. anchor="topbar" (default): avatar sits top-right of a mobile
// bar, panel opens downward, right-aligned.
export default function ProfileMenu({ anchor = 'topbar' }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [viewingStory, setViewingStory] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!user) return null

  const panelPosition = anchor === 'sidebar' ? 'absolute left-full ml-2 bottom-0' : 'absolute right-0 top-full mt-2'

  return (
    <div className="relative" ref={rootRef}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Profile menu" className="relative block flex-shrink-0">
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          : <div className="w-9 h-9 rounded-full bg-indigo text-white flex items-center justify-center text-sm font-bold">
              {user.display_name?.charAt(0).toUpperCase()}
            </div>}
        {user.is_founder && <CrownIcon className="absolute -bottom-1 -right-1 w-4 h-4 text-navy bg-white rounded-full p-0.5" />}
        {!user.is_founder && user.is_premium && <VerifiedBadge className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full" />}
      </button>

      {open && (
        <div className={`${panelPosition} w-56 bg-white border border-line rounded-xl2 shadow-lg z-50 py-1.5`}>
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-1.5 flex-wrap px-4 py-2.5 border-b border-line hover:bg-bg transition-colors">
            <span className="text-navy font-semibold text-sm">{user.display_name}</span>
            {user.is_founder && <CrownIcon className="w-3.5 h-3.5 text-navy flex-shrink-0" />}
            {user.is_premium && <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0" />}
          </Link>
          {(user.is_founder || user.is_premium) && (
            <button
              onClick={() => { setOpen(false); setViewingStory(true) }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate hover:bg-bg hover:text-navy transition-colors"
            >
              My Story
            </button>
          )}
          <Link to="/premium" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate hover:bg-bg hover:text-navy transition-colors">
            Premium
          </Link>
          <Link to="/settings" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate hover:bg-bg hover:text-navy transition-colors">
            Settings
          </Link>
          <button
            onClick={() => {
              setOpen(false)
              if (window.confirm('Sign out of Inspire?')) signOut(logout)
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate hover:bg-bg hover:text-navy transition-colors border-t border-line mt-1"
          >
            Sign out
          </button>
        </div>
      )}

      {viewingStory && <FounderStoryModal onClose={() => setViewingStory(false)} />}
    </div>
  )
}

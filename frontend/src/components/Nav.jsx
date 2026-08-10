import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import SearchOverlay from './SearchOverlay'
import FounderStoryModal from './FounderStoryModal'
import NotificationsBell from './NotificationsBell'

const UNREAD_POLL_MS = 15000

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

export default function Nav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const hideSearch = ['/', '/login', '/register'].includes(location.pathname)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadDms, setUnreadDms] = useState(0)
  const [viewingStory, setViewingStory] = useState(false)

  useEffect(() => {
    if (!user) { setUnreadDms(0); return }
    let cancelled = false
    function load() {
      api.getUnreadDmCount().then((r) => { if (!cancelled) setUnreadDms(r.count) }).catch(() => {})
    }
    load()
    const id = setInterval(load, UNREAD_POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [user])

  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-7 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 font-display font-bold text-2xl">
            <img src="/logo.svg" alt="" className="w-[42px] h-[42px]" />
            Inspire
          </Link>
          <Link to="/premium" className="hidden md:inline text-sm font-medium text-slate hover:text-navy transition-colors">Premium</Link>
          {(user?.is_founder || user?.is_premium) && (
            <button
              onClick={() => setViewingStory(true)}
              className="hidden md:inline text-sm font-medium text-slate hover:text-navy transition-colors"
            >
              My Story
            </button>
          )}
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate">
          <Link to="/stories" className="hover:text-navy transition-colors">Stories</Link>
          <Link to="/aria" className="hover:text-navy transition-colors">Aria</Link>
          {user && (
            <Link to="/messages" className="relative hover:text-navy transition-colors">
              Messages
              {unreadDms > 0 && (
                <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-rose-ink text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadDms > 9 ? '9+' : unreadDms}
                </span>
              )}
            </Link>
          )}
          {user && <Link to="/settings" className="hover:text-navy transition-colors">Settings</Link>}
        </nav>
        <div className="flex-1 flex items-center justify-end gap-3">
          {!hideSearch && (
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search Inspire"
              className="w-9 h-9 rounded-full border border-line bg-white hover:border-indigo transition-colors flex items-center justify-center text-sm flex-shrink-0"
            >
              🔍
            </button>
          )}
          {user && <NotificationsBell />}
          {user ? (
            <>
              <Link to="/profile" className="text-sm text-slate hidden sm:inline-flex items-center gap-1.5 hover:text-navy transition-colors">
                {user.display_name}
                {user.is_founder && (
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-navy text-white px-2 py-0.5 rounded-full">Founder</span>
                )}
                {user.is_premium && (
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-lavender text-indigo px-2 py-0.5 rounded-full">Premium</span>
                )}
              </Link>
              <button
                onClick={() => {
                  if (window.confirm('Sign out of Inspire?')) {
                    signOut(logout)
                  }
                }}
                className="px-5 py-2.5 rounded-full text-sm font-semibold border border-line bg-white hover:border-indigo transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors whitespace-nowrap flex-shrink-0">
              Sign in
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            className="md:hidden w-9 h-9 rounded-full border border-line bg-white hover:border-indigo transition-colors flex items-center justify-center text-base flex-shrink-0"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-line bg-white px-7 py-4 flex flex-col gap-3 text-sm font-medium text-slate">
          {user && (
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 flex-wrap pb-3 border-b border-line hover:text-navy transition-colors"
            >
              <span className="text-navy font-semibold">{user.display_name}</span>
              {user.is_founder && (
                <span className="text-[11px] font-bold uppercase tracking-wide bg-navy text-white px-2 py-0.5 rounded-full">Founder</span>
              )}
              {user.is_premium && (
                <span className="text-[11px] font-bold uppercase tracking-wide bg-lavender text-indigo px-2 py-0.5 rounded-full">Premium</span>
              )}
            </Link>
          )}
          <Link to="/premium" onClick={() => setMenuOpen(false)} className="hover:text-navy transition-colors">Premium</Link>
          {(user?.is_founder || user?.is_premium) && (
            <button
              onClick={() => { setMenuOpen(false); setViewingStory(true) }}
              className="text-left hover:text-navy transition-colors"
            >
              My Story
            </button>
          )}
          <Link to="/stories" onClick={() => setMenuOpen(false)} className="hover:text-navy transition-colors">Stories</Link>
          <Link to="/aria" onClick={() => setMenuOpen(false)} className="hover:text-navy transition-colors">Aria</Link>
          {user && (
            <Link to="/messages" onClick={() => setMenuOpen(false)} className="hover:text-navy transition-colors">
              Messages{unreadDms > 0 ? ` (${unreadDms > 9 ? '9+' : unreadDms})` : ''}
            </Link>
          )}
          {user && <Link to="/settings" onClick={() => setMenuOpen(false)} className="hover:text-navy transition-colors">Settings</Link>}
          {user && (
            <button
              onClick={() => { setMenuOpen(false); signOut(logout) }}
              className="text-left pt-3 mt-1 border-t border-line hover:text-navy transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {viewingStory && <FounderStoryModal onClose={() => setViewingStory(false)} />}
    </header>
  )
}

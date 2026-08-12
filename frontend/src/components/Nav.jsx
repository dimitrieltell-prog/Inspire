import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import SearchOverlay from './SearchOverlay'
import DesktopSidebar from './DesktopSidebar'
import MobileTopBar from './MobileTopBar'
import MobileTabBar from './MobileTabBar'
import { useIsDesktop } from './useIsDesktop'

const UNREAD_POLL_MS = 15000

// Composition root: owns the state shared across breakpoints (user,
// unread DMs, search-overlay visibility) and mounts exactly one of
// DesktopSidebar or MobileTopBar+MobileTabBar via useIsDesktop -- never
// both at once, so components like NotificationsBell that live inside
// them never end up mounted twice and double-polling.
export default function Nav() {
  const { user } = useAuth()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const hideSearch = ['/', '/login', '/register'].includes(location.pathname)
  const [searchOpen, setSearchOpen] = useState(false)
  const [unreadDms, setUnreadDms] = useState(0)

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
    <>
      {isDesktop ? (
        <DesktopSidebar user={user} unreadDms={unreadDms} hideSearch={hideSearch} onSearchClick={() => setSearchOpen(true)} />
      ) : (
        <>
          <MobileTopBar user={user} />
          <MobileTabBar hideSearch={hideSearch} onSearchClick={() => setSearchOpen(true)} unreadDms={unreadDms} />
        </>
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}

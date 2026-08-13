import { Link, NavLink } from 'react-router-dom'
import HomeIcon from './HomeIcon'
import SearchIcon from './SearchIcon'
import AriaIcon from './AriaIcon'
import MessagesIcon from './MessagesIcon'
import PlusIcon from './PlusIcon'
import NotificationsBell from './NotificationsBell'
import ProfileMenu from './ProfileMenu'

const iconBase = 'w-11 h-11 rounded-xl flex items-center justify-center text-slate transition-colors hover:bg-line relative'
const iconActive = 'bg-lavender text-indigo'

export default function DesktopSidebar({ user, unreadDms, hideSearch, onSearchClick }) {
  return (
    <aside className="hidden md:flex md:h-screen md:w-[76px] md:flex-shrink-0 md:flex-col md:items-center bg-bg border-r border-line py-4">
      <Link to="/" className="mb-4 flex-shrink-0">
        <img src="/logo.svg" alt="" className="w-9 h-9" />
      </Link>

      {/* Vertically centers the nav icons in the space between the logo and
          the avatar, instead of clustering them at the top and leaving one
          large empty gap above the avatar on tall screens. */}
      <div className="flex flex-col items-center gap-1.5 flex-grow justify-center">
        <NavLink to="/stories" className={({ isActive }) => `${iconBase} ${isActive ? iconActive : ''}`} aria-label="Stories">
          <HomeIcon className="w-5 h-5" />
        </NavLink>

        {!hideSearch && (
          <button onClick={onSearchClick} aria-label="Search Inspire" className={iconBase}>
            <SearchIcon className="w-5 h-5" />
          </button>
        )}

        <NavLink to="/aria" className={({ isActive }) => `${iconBase} ${isActive ? iconActive : ''}`} aria-label="Aria">
          <AriaIcon className="w-5 h-5" />
        </NavLink>

        {user && (
          <NavLink to="/messages" className={({ isActive }) => `${iconBase} ${isActive ? iconActive : ''}`} aria-label="Messages">
            <MessagesIcon className="w-5 h-5" />
            {unreadDms > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-ink text-white text-[9px] font-bold flex items-center justify-center">
                {unreadDms > 9 ? '9+' : unreadDms}
              </span>
            )}
          </NavLink>
        )}

        {user && <NotificationsBell anchor="left" />}

        <NavLink to="/stories/new" aria-label="Share your story" className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo text-white hover:bg-indigo-deep transition-colors">
          <PlusIcon className="w-5 h-5" />
        </NavLink>
      </div>

      {user ? (
        <ProfileMenu anchor="sidebar" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Link to="/premium" className="text-[11px] font-medium text-slate hover:text-navy transition-colors">Premium</Link>
          <Link to="/login" className="px-3 py-2 rounded-full text-xs font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors whitespace-nowrap">
            Sign in
          </Link>
        </div>
      )}
    </aside>
  )
}

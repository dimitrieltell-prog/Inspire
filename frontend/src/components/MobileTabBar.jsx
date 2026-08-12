import { NavLink } from 'react-router-dom'
import HomeIcon from './HomeIcon'
import SearchIcon from './SearchIcon'
import PlusIcon from './PlusIcon'
import MessagesIcon from './MessagesIcon'
import ProfileIcon from './ProfileIcon'
import { MOBILE_TABBAR_H } from './navMetrics'

const tabClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isActive ? 'text-indigo' : 'text-slate-light'}`

export default function MobileTabBar({ hideSearch, onSearchClick, unreadDms }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line flex items-center justify-around pb-[env(safe-area-inset-bottom)]"
      style={{ height: `calc(${MOBILE_TABBAR_H}px + env(safe-area-inset-bottom))` }}
    >
      <NavLink to="/stories" className={tabClass} aria-label="Home">
        <HomeIcon className="w-5 h-5" />
        Home
      </NavLink>

      <button
        onClick={onSearchClick}
        disabled={hideSearch}
        aria-label="Search"
        className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-light transition-colors ${hideSearch ? 'opacity-40' : ''}`}
      >
        <SearchIcon className="w-5 h-5" />
        Search
      </button>

      <NavLink to="/stories/new" aria-label="Share your story" className="-mt-6">
        <span className="w-12 h-12 rounded-2xl bg-indigo text-white flex items-center justify-center shadow-lg shadow-indigo/40">
          <PlusIcon className="w-5 h-5" />
        </span>
      </NavLink>

      <NavLink to="/messages" className={tabClass} aria-label="Messages">
        <span className="relative">
          <MessagesIcon className="w-5 h-5" />
          {unreadDms > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-1 rounded-full bg-rose-ink text-white text-[8px] font-bold flex items-center justify-center">
              {unreadDms > 9 ? '9+' : unreadDms}
            </span>
          )}
        </span>
        Messages
      </NavLink>

      <NavLink to="/profile" className={tabClass} aria-label="Profile">
        <ProfileIcon className="w-5 h-5" />
        Profile
      </NavLink>
    </nav>
  )
}

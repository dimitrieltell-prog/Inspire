import { Link } from 'react-router-dom'
import AriaIcon from './AriaIcon'
import NotificationsBell from './NotificationsBell'
import ProfileMenu from './ProfileMenu'
import { MOBILE_TOPBAR_H } from './navMetrics'

export default function MobileTopBar({ user }) {
  return (
    <header
      className="md:hidden sticky top-0 z-40 bg-bg/85 backdrop-blur border-b border-line pt-[env(safe-area-inset-top)] flex-shrink-0"
      style={{ height: `calc(${MOBILE_TOPBAR_H}px + env(safe-area-inset-top))` }}
    >
      <div className="h-14 px-5 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg flex-shrink-0">
          <img src="/logo.svg" alt="" className="w-8 h-8" />
          Inspire
        </Link>

        {user ? (
          <div className="flex items-center gap-2.5">
            <Link to="/aria" aria-label="Aria" className="w-9 h-9 rounded-full border border-line bg-white hover:border-indigo transition-colors flex items-center justify-center text-slate flex-shrink-0">
              <AriaIcon className="w-[18px] h-[18px]" />
            </Link>
            <NotificationsBell anchor="right" />
            <ProfileMenu anchor="topbar" />
          </div>
        ) : (
          <Link to="/login" className="px-4 py-2 rounded-full text-sm font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors whitespace-nowrap flex-shrink-0">
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}

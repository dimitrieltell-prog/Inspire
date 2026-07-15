import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-7 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-lg">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-indigo text-white flex items-center justify-center text-sm font-bold">i</span>
          Inspire
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate">
          <Link to="/stories" className="hover:text-navy transition-colors">Stories</Link>
          <Link to="/aria" className="hover:text-navy transition-colors">Aria</Link>
          <Link to="/premium" className="hover:text-navy transition-colors">Premium</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate hidden sm:inline">
                {user.display_name} {user.is_premium && <span className="text-indigo font-semibold">· Premium</span>}
              </span>
              <button
                onClick={() => { logout(); navigate('/') }}
                className="px-5 py-2.5 rounded-full text-sm font-semibold border border-line bg-white hover:border-indigo transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import CrownIcon from './CrownIcon'
import VerifiedBadge from './VerifiedBadge'

// Right-column widget on the Stories feed -- the viewer's own profile card
// plus a short list of accounts to follow. No "followed by X" mutual-
// connection text (Inspire's user base is still small enough that it would
// mostly be empty), and no "See all" link (no dedicated suggestions page
// exists to send people to).
export default function SuggestedAccounts() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    api.getSuggestedUsers().then(setSuggestions).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  async function follow(person) {
    setBusyId(person.id)
    try {
      await api.followUser(person.id)
      setSuggestions((arr) => arr.filter((p) => p.id !== person.id))
    } catch (_) {
      // Leave them in the list -- a stale suggestion is better than
      // silently pretending the follow succeeded when it didn't.
    } finally {
      setBusyId(null)
    }
  }

  if (!user) return null

  return (
    <div className="w-full max-w-[320px] flex flex-col gap-5">
      <Link to="/profile" className="flex items-center gap-3">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-indigo text-white flex items-center justify-center font-bold">
            {user.display_name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-navy truncate">{user.display_name}</span>
            {user.is_founder && <CrownIcon className="w-3.5 h-3.5 text-navy flex-shrink-0" />}
            {user.is_premium && <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0" />}
          </div>
          {user.username && <span className="text-xs text-slate-light truncate block">@{user.username}</span>}
        </div>
      </Link>

      {loaded && suggestions.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-light mb-3">Suggested for you</h2>
          <div className="flex flex-col gap-3.5">
            {suggestions.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Link to={`/users/${p.id}`} className="flex items-center gap-3 min-w-0 flex-grow">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-lavender text-indigo flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm font-semibold text-navy truncate">{p.display_name}</span>
                      {p.is_founder && <CrownIcon className="w-3 h-3 text-navy flex-shrink-0" />}
                      {p.is_premium && <VerifiedBadge className="w-3 h-3 flex-shrink-0" />}
                    </div>
                    {p.username && <span className="text-xs text-slate-light truncate block">@{p.username}</span>}
                  </div>
                </Link>
                <button
                  onClick={() => follow(p)}
                  disabled={busyId === p.id}
                  className="text-xs font-semibold text-indigo hover:text-indigo-deep transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {busyId === p.id ? '…' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import CrownIcon from './CrownIcon'
import VerifiedBadge from './VerifiedBadge'
import FirstCircleIcon from './FirstCircleIcon'

const PAGE_SIZE = 5

function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Right-column widget on the Stories feed -- the viewer's own profile card
// plus a short list of accounts to follow. No "followed by X" mutual-
// connection text (Inspire's user base is still small enough that it would
// mostly be empty), and no "See all" link (no dedicated suggestions page
// exists to send people to). Fetches a larger pool once, then reveals 5 at
// a time ("Show more") or reshuffles that same pool ("Refresh") without a
// new network request for either action.
export default function SuggestedAccounts() {
  const { user } = useAuth()
  const [pool, setPool] = useState([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    api.getSuggestedUsers().then(setPool).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  async function follow(person) {
    setBusyId(person.id)
    try {
      await api.followUser(person.id)
      setPool((arr) => arr.filter((p) => p.id !== person.id))
    } catch (_) {
      // Leave them in the list -- a stale suggestion is better than
      // silently pretending the follow succeeded when it didn't.
    } finally {
      setBusyId(null)
    }
  }

  function refresh() {
    setPool((arr) => shuffle(arr))
    setVisibleCount(PAGE_SIZE)
  }

  if (!user) return null

  const visible = pool.slice(0, visibleCount)

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
            {user.first_circle_number && <FirstCircleIcon size={14} />}
            {user.is_premium && <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0" />}
          </div>
          {user.username && <span className="text-xs text-slate-light truncate block">@{user.username}</span>}
        </div>
      </Link>

      {loaded && pool.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-light">Suggested for you</h2>
            {pool.length > PAGE_SIZE && (
              <button onClick={refresh} className="text-xs font-semibold text-slate hover:text-indigo transition-colors">
                Refresh
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3.5">
            {visible.map((p) => (
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
                      {p.first_circle_number && <FirstCircleIcon size={12} />}
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
          {visibleCount < pool.length ? (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="text-xs font-semibold text-slate hover:text-indigo transition-colors mt-3.5"
            >
              Show more
            </button>
          ) : pool.length > PAGE_SIZE && (
            <button
              onClick={() => setVisibleCount(PAGE_SIZE)}
              className="text-xs font-semibold text-slate hover:text-indigo transition-colors mt-3.5"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}

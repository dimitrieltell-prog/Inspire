import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import FirstCircleIcon from './FirstCircleIcon'
import FirstCircleJoined from './FirstCircleJoined'

// The First Circle card at the top of the feed: what's left to do, how many
// places are still going, and -- for the one render where someone crosses
// the line -- the celebration.
//
// It disappears in three cases: once you're in (your badge is on your
// profile, the card has nothing left to say), once the circle is closed to
// you, and if the request fails. A promotional card is the last thing that
// should turn a flaky network into a broken feed.
export default function FirstCircleCard({ onVisibilityChange } = {}) {
  const { user, refreshUser } = useAuth()
  const [state, setState] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api.getFirstCircle()
      .then((s) => {
        if (cancelled) return
        setState(s)
        if (s.number) {
          // Their place also turns Premium on, so the cached user object
          // the rest of the app reads from is now a year out of date.
          refreshUser?.()
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function closeCelebration() {
    setDismissed(true)
    // Fire and forget: this only decides whether to show a card again, so
    // it's not worth making anyone wait on it or showing them an error.
    api.markFirstCircleSeen().catch(() => {})
  }

  // Tell the feed whether this occupies a slot, so an empty card doesn't
  // leave a gap or take a place in the dot indicator.
  const celebrating = !!state && state.show_celebration && !dismissed
  const visible = !!state && (celebrating || (state.eligible && !state.number && !state.closed))
  useEffect(() => {
    onVisibilityChange?.(visible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!state) return null
  if (celebrating) return <FirstCircleJoined state={state} onClose={closeCelebration} />
  if (state.number || state.closed || !state.eligible) return null

  const done = state.steps.filter((s) => s.done).length
  const nearlyGone = state.places_left <= 10

  return (
    <div className="bg-surface border border-bronze-line rounded-xl2 overflow-hidden mb-10">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <FirstCircleIcon size={22} />
        <h2 className="text-[15px] font-bold">
          {nearlyGone ? 'The First Circle is almost full' : 'The First Circle is open'}
        </h2>
        <span className="ml-auto text-xs font-bold text-bronze whitespace-nowrap">
          {state.places_left} {state.places_left === 1 ? 'place' : 'places'} left
        </span>
      </div>

      <p className="px-5 pb-4 text-sm text-slate">
        The first {state.circle_size} people to finish these five things keep the badge for good —
        plus a year of Premium on us.
      </p>

      <div className="flex items-center gap-3 px-5 pb-4">
        <span className="text-[11px] text-slate-light tabular-nums whitespace-nowrap">
          {done} of {state.steps.length}
        </span>
        <div className="flex-1 h-[5px] bg-line rounded-full overflow-hidden">
          <div
            className="h-full bg-bronze rounded-full transition-[width] duration-500"
            style={{ width: `${(done / state.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {state.steps.map((s) => (
        <div key={s.key} className="flex items-start gap-3 px-5 py-3 border-t border-line">
          <span
            className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${
              s.done ? 'bg-sage border-sage-ink text-sage-ink' : 'border-line text-transparent'
            }`}
          >
            ✓
          </span>
          <span className="min-w-0 flex-grow">
            <span className={`block text-sm font-semibold ${s.done ? 'text-slate-light line-through' : ''}`}>
              {s.title}
            </span>
            {!s.done && (
              <span className="block text-xs text-slate mt-0.5">
                {/* A bare subtitle until they've started, then how far along
                    they are -- "2 of 5" is only encouraging once it's true.
                    Separated with a middle dot, not a dash: some subtitles
                    contain a dash of their own and two in one line reads
                    as a mistake. */}
                {s.have > 0 && s.need > 1 ? `${s.have} of ${s.need} · ${s.subtitle}` : s.subtitle}
              </span>
            )}
          </span>
          {!s.done && s.cta_url && (
            <Link to={s.cta_url} className="text-xs font-semibold text-indigo whitespace-nowrap self-center">
              Go
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}

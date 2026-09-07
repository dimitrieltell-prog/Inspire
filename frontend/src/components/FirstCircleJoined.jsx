import { Link } from 'react-router-dom'
import FirstCircleIcon from './FirstCircleIcon'

function monthYear(seconds) {
  if (!seconds) return ''
  return new Date(seconds * 1000).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// The one moment worth making a fuss of. Shown in place of the progress
// card on the single response where the place was awarded -- the server
// sends `just_joined` exactly once, so this can't reappear on every reload
// and turn an achievement into a nag.
export default function FirstCircleJoined({ state, onClose }) {
  return (
    <div className="bg-surface border border-bronze-line rounded-xl2 mb-10 px-6 py-9 text-center">
      <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bronze-bg border border-bronze-line mb-4">
        <FirstCircleIcon size={44} />
      </span>

      <h2 className="text-2xl font-bold">You're in.</h2>

      <span className="inline-block mt-3 text-[13px] font-bold text-bronze bg-bronze-bg border border-bronze-line rounded-full px-3.5 py-1 tabular-nums">
        First Circle · #{state.number}
      </span>

      <p className="text-sm text-slate mt-4 max-w-[38ch] mx-auto">
        The badge is yours permanently — it stays on your profile no matter what. Premium is on us
        {state.premium_until ? ` until ${monthYear(state.premium_until)}` : ' for the next year'}.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          to="/profile"
          className="bg-indigo text-white text-sm font-semibold px-7 py-2.5 rounded-full hover:bg-indigo-deep transition-colors"
        >
          See your profile
        </Link>
        <button type="button" onClick={onClose} className="text-xs text-slate-light hover:text-navy transition-colors">
          Back to the feed
        </button>
      </div>
    </div>
  )
}

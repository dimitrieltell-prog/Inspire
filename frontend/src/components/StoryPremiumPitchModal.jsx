import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function StoryPremiumPitchModal() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const [closing, setClosing] = useState(false)

  async function dismiss(goToPremium) {
    if (closing) return
    setClosing(true)
    try {
      await api.markStoryPremiumPitchSeen()
    } catch (_) {
      // Same fallback as the other one-time popups -- if the save fails
      // it'll just show again next time, rather than trapping the user here.
    } finally {
      await refreshUser().catch(() => {})
      if (goToPremium) navigate('/premium')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl2 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-light">Want to read it again someday?</h2>
          <button
            onClick={() => dismiss(false)}
            disabled={closing}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate hover:text-navy hover:bg-bg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-navy">
            That story only shows once for free accounts. If you go Premium, you'll get your own
            <span className="font-semibold"> My Story</span> tab — the same one Dimitri has — so you can reopen and reread it whenever you want.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => dismiss(true)}
              disabled={closing}
              className="flex-grow px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors disabled:opacity-50"
            >
              Go Premium
            </button>
            <button
              onClick={() => dismiss(false)}
              disabled={closing}
              className="px-5 py-2.5 rounded-full text-sm font-semibold border border-line hover:border-indigo transition-colors disabled:opacity-50"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

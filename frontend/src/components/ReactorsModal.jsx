import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

export default function ReactorsModal({ storyId, onClose }) {
  const [reactors, setReactors] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getStoryReactors(storyId).then(setReactors).catch((e) => setError(e.message))
  }, [storyId])

  // Portaled to document.body -- see ReportModal.jsx for why (avoids being
  // mispositioned relative to a transformed ancestor like CommentsPanel).
  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#131A33]/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-t-2xl sm:rounded-xl2 w-full sm:max-w-sm p-6 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Who reacted</h2>
          <button onClick={onClose} className="text-slate-light hover:text-navy text-lg leading-none">✕</button>
        </div>
        {error ? (
          <p className="text-sm text-rose-ink">{error}</p>
        ) : !reactors ? (
          <p className="text-sm text-slate-light">Loading…</p>
        ) : reactors.length === 0 ? (
          <p className="text-sm text-slate-light">No one yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reactors.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-navy">
                  {r.display_name}
                  {r.username && <span className="text-slate-light font-normal ml-1.5">@{r.username}</span>}
                </span>
                <span className="text-slate-light text-xs flex-shrink-0">{r.reaction}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

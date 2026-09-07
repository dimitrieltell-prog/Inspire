import { useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

const REASONS = [
  'Spam',
  'Harassment or bullying',
  'Hate speech',
  'Self-harm or suicide content',
  'Illegal content',
  'Nudity or sexual content',
  'Something else',
]

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!reason) return
    setSubmitting(true)
    setError('')
    try {
      await api.reportContent(targetType, targetId, reason, note.trim() || undefined)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Portaled to document.body -- otherwise, if this is opened from inside a
  // transformed ancestor (e.g. CommentsPanel's slide-up/slide-in sheet), a
  // plain `fixed` div would position itself relative to that ancestor's
  // containing block instead of the real viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#131A33]/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-t-2xl sm:rounded-xl2 w-full sm:max-w-sm p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-semibold mb-1">Thanks for letting us know.</p>
            <p className="text-xs text-slate-light mb-5">We'll review this report.</p>
            <button onClick={onClose} className="w-full bg-indigo text-white rounded-full py-2.5 text-sm font-semibold hover:bg-indigo-deep transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-lg font-bold mb-1">Report {targetType === 'user' ? 'this account' : targetType === 'comment' ? 'this comment' : 'this story'}</h2>
            <p className="text-xs text-slate-light mb-4">This is sent privately to the Inspire team for review.</p>

            <div className="flex flex-col gap-1.5 mb-4">
              {REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left text-sm px-3.5 py-2.5 rounded-lg border transition-colors ${
                    reason === r ? 'border-indigo bg-lavender text-indigo font-semibold' : 'border-line hover:border-indigo/50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              maxLength={500}
              placeholder="Anything else we should know? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo resize-none mb-4"
              rows={2}
            />

            {error && <p className="text-sm text-rose-ink mb-3">{error}</p>}

            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className="flex-1 border border-line rounded-full py-2.5 text-sm font-semibold hover:border-indigo transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || submitting}
                className="flex-1 bg-rose-ink text-white rounded-full py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

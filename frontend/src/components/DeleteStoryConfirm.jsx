import { useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

// Confirm-then-delete for a post -- mirrors ReportModal's portal/sizing so
// it looks consistent wherever it's opened from (feed card, story detail,
// a founder viewing someone else's post to clean it up).
export default function DeleteStoryConfirm({ storyId, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function confirmDelete() {
    setDeleting(true)
    setError('')
    try {
      await api.deleteStory(storyId)
      onDeleted?.()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-navy/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-t-2xl sm:rounded-xl2 w-full sm:max-w-sm p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-1">Delete this post?</h2>
        <p className="text-xs text-slate-light mb-5">This can't be undone -- comments, reactions, and saves on it will be removed too.</p>

        {error && <p className="text-sm text-rose-ink mb-3">{error}</p>}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 border border-line rounded-full py-2.5 text-sm font-semibold hover:border-indigo transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 bg-rose-ink text-white rounded-full py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

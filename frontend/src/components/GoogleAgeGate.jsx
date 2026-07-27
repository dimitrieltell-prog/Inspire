import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const TODAY = new Date().toISOString().slice(0, 10)

export default function GoogleAgeGate({ credential, onClose, onSuccess }) {
  const { finishGoogleSignup } = useAuth()
  const [dob, setDob] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await finishGoogleSignup(credential, dob, accepted)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl2 w-full sm:max-w-sm p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <h2 className="text-lg font-bold mb-1">One last step</h2>
          <p className="text-xs text-slate-light mb-5">
            We need your date of birth and agreement to our terms to finish creating your account.
          </p>

          <label className="block text-xs font-semibold text-slate mb-1.5">Date of birth</label>
          <input
            type="date"
            required
            value={dob}
            max={TODAY}
            onChange={(e) => setDob(e.target.value)}
            className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo mb-4"
          />

          <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
            />
            <span className="text-sm text-slate">
              I agree to Inspire's{' '}
              <Link to="/terms" target="_blank" className="text-indigo font-semibold hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" target="_blank" className="text-indigo font-semibold hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          {error && <p className="text-sm text-rose-ink mb-3">{error}</p>}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-line rounded-full py-2.5 text-sm font-semibold hover:border-indigo transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!dob || !accepted || submitting}
              className="flex-1 bg-indigo text-white rounded-full py-2.5 text-sm font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

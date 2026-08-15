import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const TODAY = new Date().toISOString().slice(0, 10)

export default function GoogleAgeGate({ credential, onClose, onSuccess }) {
  const { finishGoogleSignup } = useAuth()
  const [username, setUsername] = useState('')
  const [dob, setDob] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [usernameStatus, setUsernameStatus] = useState(null) // { available, reason } | null
  const [checkingUsername, setCheckingUsername] = useState(false)

  useEffect(() => {
    const trimmed = username.trim()
    if (trimmed.length < 3) { setUsernameStatus(null); return }
    setCheckingUsername(true)
    const t = setTimeout(() => {
      api.usernameAvailable(trimmed)
        .then(setUsernameStatus)
        .catch(() => setUsernameStatus(null))
        .finally(() => setCheckingUsername(false))
    }, 350)
    return () => clearTimeout(t)
  }, [username])

  const usernameValid = username.trim().length >= 3 && usernameStatus?.available

  async function submit(e) {
    e.preventDefault()
    if (!usernameValid) {
      setError(usernameStatus?.reason || 'Please choose an available username.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await finishGoogleSignup(credential, username.trim(), dob, accepted)
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
        className="bg-surface rounded-t-2xl sm:rounded-xl2 w-full sm:max-w-sm p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <h2 className="text-lg font-bold mb-1">One last step</h2>
          <p className="text-xs text-slate-light mb-5">
            Choose a username and confirm your date of birth and agreement to our terms to finish creating your account.
          </p>

          <label className="block text-xs font-semibold text-slate mb-1.5">Username</label>
          <div className="relative mb-1.5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-light">@</span>
            <input
              required
              maxLength={30}
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30))}
              className="w-full border border-line rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-indigo"
            />
          </div>
          <p className="text-xs mb-4">
            {username.trim().length > 0 && username.trim().length < 3 ? (
              <span className="text-slate-light">At least 3 characters.</span>
            ) : checkingUsername ? (
              <span className="text-slate-light">Checking…</span>
            ) : usernameStatus?.available ? (
              <span className="text-sage-ink">✓ Available</span>
            ) : usernameStatus && !usernameStatus.available ? (
              <span className="text-rose-ink">{usernameStatus.reason}</span>
            ) : (
              <span className="text-slate-light">This is how people find and @mention you — has to be unique.</span>
            )}
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
              disabled={!usernameValid || !dob || !accepted || submitting}
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

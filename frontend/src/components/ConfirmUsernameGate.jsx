import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function ConfirmUsernameGate() {
  const { user, updateProfile } = useAuth()
  const original = user.username || ''
  const [username, setUsername] = useState(original)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [usernameStatus, setUsernameStatus] = useState(null) // { available, reason } | null
  const [checkingUsername, setCheckingUsername] = useState(false)

  const unchanged = username.trim() === original

  useEffect(() => {
    const trimmed = username.trim()
    if (unchanged || trimmed.length < 3) { setUsernameStatus(null); return }
    setCheckingUsername(true)
    const t = setTimeout(() => {
      api.usernameAvailable(trimmed)
        .then(setUsernameStatus)
        .catch(() => setUsernameStatus(null))
        .finally(() => setCheckingUsername(false))
    }, 350)
    return () => clearTimeout(t)
  }, [username, unchanged])

  const usernameValid = username.trim().length >= 3 && (unchanged || usernameStatus?.available)

  async function submit(e) {
    e.preventDefault()
    if (!usernameValid) {
      setError(usernameStatus?.reason || 'Please choose an available username.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await updateProfile({ username: username.trim() })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface rounded-t-2xl sm:rounded-xl2 w-full sm:max-w-sm p-6 max-h-[85vh] overflow-y-auto">
        <form onSubmit={submit}>
          <h2 className="text-lg font-bold mb-1">Confirm your username</h2>
          <p className="text-xs text-slate-light mb-5">
            Every Inspire account now has a username people can use to find and @mention you. Keep the one below, or pick a new one.
          </p>

          <label className="block text-xs font-semibold text-slate mb-1.5">Username</label>
          <div className="relative mb-1.5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-light">@</span>
            <input
              autoFocus
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
            ) : unchanged ? (
              <span className="text-slate-light">This is your current username — confirm it or change it.</span>
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

          {error && <p className="text-sm text-rose-ink mb-3">{error}</p>}

          <button
            type="submit"
            disabled={!usernameValid || submitting}
            className="w-full bg-indigo text-white rounded-full py-2.5 text-sm font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving…' : unchanged ? 'Keep this username' : 'Save username'}
          </button>
        </form>
      </div>
    </div>
  )
}

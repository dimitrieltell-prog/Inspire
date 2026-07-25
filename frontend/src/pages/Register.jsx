import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/stories'
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  async function onSubmit(e) {
    e.preventDefault()
    if (username.trim() && usernameStatus && !usernameStatus.available) {
      setError(usernameStatus.reason || 'Please choose a different username.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await register(email, password, displayName, username.trim())
      navigate(redirectTo)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function onGoogleCredential(credential) {
    setError('')
    try {
      await loginWithGoogle(credential)
      navigate(redirectTo)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-7 py-20">
      <h1 className="text-2xl font-bold mb-2">Join Inspire</h1>
      <p className="text-sm text-slate mb-8">A quieter kind of social — no highlight reels required.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <input required maxLength={35} placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />
          <p className="text-xs text-slate-light mt-1.5 px-1">Shown on your posts — doesn't need to be unique.</p>
        </div>

        <div>
          <div className="relative">
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
          <p className="text-xs mt-1.5 px-1">
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
        </div>

        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />
        <input type="password" required minLength={8} placeholder="Password (min. 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />
        {error && <p className="text-sm text-rose-ink">{error}</p>}
        <button disabled={loading} className="bg-indigo text-white rounded-full py-3 font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-60">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-slate uppercase tracking-wide">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>
      <GoogleSignInButton onCredential={onGoogleCredential} onError={(err) => setError(err.message)} />
      <p className="text-sm text-slate mt-6">
        Already have an account? <Link to="/login" className="text-indigo font-semibold">Sign in</Link>
      </p>
    </div>
  )
}

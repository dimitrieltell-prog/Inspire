import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(email, password, displayName)
      navigate('/stories')
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
      navigate('/stories')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-7 py-20">
      <h1 className="text-2xl font-bold mb-2">Join Inspire</h1>
      <p className="text-sm text-slate mb-8">A quieter kind of social — no highlight reels required.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input required placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />
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

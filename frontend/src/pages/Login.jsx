import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/stories')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-7 py-20">
      <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
      <p className="text-sm text-slate mb-8">Sign in to share, react, and talk with Aria.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />
        {error && <p className="text-sm text-rose-ink">{error}</p>}
        <button disabled={loading} className="bg-indigo text-white rounded-full py-3 font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-slate mt-6">
        New here? <Link to="/register" className="text-indigo font-semibold">Create an account</Link>
      </p>
    </div>
  )
}

import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { api } from '../api'

const PERKS = [
  'Unlimited messages with Aria (free plan: 5/day)',
  '1:1 video and voice calls',
  "See who's viewed your profile",
  'Advanced message privacy controls',
  'More ways to customize your space',
]

export default function Premium() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'success') {
      refreshUser().catch(() => {})
      setNotice("Payment received — welcome to Premium!")
      setSearchParams({}, { replace: true })
    } else if (checkout === 'canceled') {
      setNotice('Checkout canceled — no charge was made.')
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function upgrade() {
    if (!user) { navigate('/login'); return }
    setLoading(true)
    setError('')
    try {
      const { checkout_url } = await api.createCheckoutSession()
      window.location.href = checkout_url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-7 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-indigo">Premium</span>
      <h1 className="text-3xl font-bold mt-3 mb-8">Go deeper with Premium</h1>

      {notice && <p className="text-sm text-indigo-deep bg-indigo/10 rounded-xl px-4 py-3 mb-6">{notice}</p>}

      <div className="bg-gradient-to-br from-indigo to-indigo-deep text-white rounded-xl2 p-8">
        <div className="flex items-baseline gap-1.5 mb-6">
          <span className="text-4xl font-extrabold font-display">$4.99</span>
          <span className="text-sm text-white/65">/ month</span>
        </div>
        <ul className="flex flex-col gap-2.5 mb-7">
          {PERKS.map((p) => (
            <li key={p} className="text-sm flex gap-2.5 items-start text-white/90">
              <span className="font-bold flex-shrink-0">✓</span>{p}
            </li>
          ))}
        </ul>

        {user?.is_premium ? (
          <div className="bg-white/15 rounded-full py-3 text-center font-semibold text-sm">You're already Premium ✨</div>
        ) : (
          <button
            onClick={upgrade}
            disabled={loading}
            className="w-full bg-white text-indigo-deep rounded-full py-3 font-semibold hover:shadow-lg transition-shadow disabled:opacity-60"
          >
            {loading ? 'Redirecting to checkout…' : 'Upgrade to Premium'}
          </button>
        )}
        {error && <p className="text-xs text-rose-100 mt-3">{error}</p>}
        <p className="text-xs text-white/55 mt-5">
          Reading, sharing, and support stay free for everyone — always.
        </p>
      </div>

      <p className="text-xs text-slate-light mt-6 text-center">
        Secure checkout powered by Stripe. Cancel anytime.
      </p>
    </div>
  )
}

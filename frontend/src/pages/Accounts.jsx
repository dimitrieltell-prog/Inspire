import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Accounts() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    if (!user?.is_founder) {
      navigate('/')
      return
    }
    api.listAccounts()
      .then((data) => setAccounts(data.users || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [ready, user, navigate])

  if (!ready || !user?.is_founder) return null

  return (
    <div className="max-w-4xl mx-auto px-7 py-16">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-indigo">Founder</span>
          <h1 className="text-2xl font-bold mt-2">Accounts</h1>
        </div>
        {!loading && <span className="text-sm text-slate">{accounts.length} total</span>}
      </div>

      {loading && <p className="text-slate">Loading…</p>}
      {error && <p className="text-rose-ink">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto border border-line rounded-xl2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-light border-b border-line">
                <th className="font-semibold px-4 py-3">Name</th>
                <th className="font-semibold px-4 py-3">Email</th>
                <th className="font-semibold px-4 py-3">Plan</th>
                <th className="font-semibold px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {a.display_name}
                    {a.is_founder && <span className="ml-2 text-[10px] font-bold uppercase bg-navy text-white px-1.5 py-0.5 rounded-full">Founder</span>}
                  </td>
                  <td className="px-4 py-3 text-slate">{a.email}</td>
                  <td className="px-4 py-3 text-slate">{a.is_premium ? 'Premium' : 'Free'}</td>
                  <td className="px-4 py-3 text-slate">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Profile() {
  const { user, ready, updateName } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)

  const [listMode, setListMode] = useState(null) // 'followers' | 'following' | null
  const [listUsers, setListUsers] = useState([])

  // Founder-only accounts section
  const [accounts, setAccounts] = useState(null)

  useEffect(() => {
    if (!ready) return
    if (!user) { navigate('/login'); return }
    api.getProfile(user.id)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    if (user.is_founder) {
      api.listAccounts().then((d) => setAccounts(d.users || [])).catch(() => {})
    }
  }, [ready, user, navigate])

  async function saveName(e) {
    e.preventDefault()
    setSaving(true)
    setNameError('')
    try {
      const updated = await updateName(nameDraft)
      setProfile((p) => ({ ...p, display_name: updated.display_name }))
      setEditing(false)
    } catch (err) {
      setNameError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function openList(mode) {
    if (listMode === mode) { setListMode(null); return }
    setListMode(mode)
    setListUsers([])
    const data = mode === 'followers' ? await api.listFollowers(user.id) : await api.listFollowing(user.id)
    setListUsers(data)
  }

  if (!ready || loading) return <p className="text-center text-slate py-16">Loading…</p>
  if (error) return <p className="text-center text-rose-ink py-16">{error}</p>
  if (!profile) return null

  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      {/* Header card */}
      <div className="bg-white border border-line rounded-xl2 p-7">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-grow min-w-0">
            {editing ? (
              <form onSubmit={saveName} className="flex flex-col gap-2">
                <input
                  autoFocus
                  maxLength={40}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="border border-line rounded-xl px-3 py-2 text-lg font-bold focus:outline-none focus:border-indigo"
                />
                {nameError && <p className="text-xs text-rose-ink">{nameError}</p>}
                <div className="flex gap-2">
                  <button disabled={saving} className="bg-indigo text-white rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate px-3 py-1.5">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                {profile.is_founder && (
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-navy text-white px-2 py-0.5 rounded-full">Founder</span>
                )}
                {profile.is_premium && (
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-lavender text-indigo px-2 py-0.5 rounded-full">Premium</span>
                )}
                <button
                  onClick={() => { setNameDraft(profile.display_name); setEditing(true) }}
                  className="text-xs text-indigo font-semibold ml-1 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-sm text-slate-light mt-1">Joined {formatDate(profile.created_at)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mt-6">
          <button onClick={() => openList('followers')} className={`flex-1 rounded-xl border px-4 py-3 text-center transition-colors ${listMode === 'followers' ? 'border-indigo bg-lavender' : 'border-line hover:border-indigo'}`}>
            <div className="text-xl font-bold">{profile.follower_count}</div>
            <div className="text-xs text-slate">Followers</div>
          </button>
          <button onClick={() => openList('following')} className={`flex-1 rounded-xl border px-4 py-3 text-center transition-colors ${listMode === 'following' ? 'border-indigo bg-lavender' : 'border-line hover:border-indigo'}`}>
            <div className="text-xl font-bold">{profile.following_count}</div>
            <div className="text-xs text-slate">Following</div>
          </button>
          <div className="flex-1 rounded-xl border border-line px-4 py-3 text-center">
            <div className="text-xl font-bold">{profile.story_count}</div>
            <div className="text-xs text-slate">Stories</div>
          </div>
        </div>

        {/* Follower/following list */}
        {listMode && (
          <div className="mt-4 border-t border-line pt-4">
            {listUsers.length === 0 ? (
              <p className="text-sm text-slate-light">No {listMode} yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {listUsers.map((u) => (
                  <Link key={u.id} to={`/users/${u.id}`} className="flex items-center gap-2 text-sm hover:text-indigo">
                    <span className="w-7 h-7 rounded-lg bg-lavender text-indigo flex items-center justify-center text-xs font-bold">
                      {u.display_name.charAt(0).toUpperCase()}
                    </span>
                    {u.display_name}
                    {u.is_founder && <span className="text-[9px] font-bold uppercase bg-navy text-white px-1.5 py-0.5 rounded-full">Founder</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium status */}
      <div className="bg-white border border-line rounded-xl2 p-6 mt-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-light mb-2">Membership</h2>
        {profile.is_premium ? (
          <p className="text-sm">
            You're on <span className="font-semibold text-indigo">Premium</span>
            {profile.is_founder && ' (included with your Founder status)'} — unlimited Aria, and more. ✨
          </p>
        ) : (
          <p className="text-sm text-slate">
            You're on the free plan. <Link to="/premium" className="text-indigo font-semibold">Go Premium →</Link>
          </p>
        )}
      </div>

      {/* Founder-only: all accounts */}
      {user.is_founder && (
        <div className="bg-white border border-line rounded-xl2 p-6 mt-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-light">All accounts (founder only)</h2>
            {accounts && <span className="text-xs text-slate">{accounts.length} total</span>}
          </div>
          {!accounts ? (
            <p className="text-sm text-slate-light">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-light border-b border-line">
                    <th className="font-semibold py-2 pr-4">Name</th>
                    <th className="font-semibold py-2 pr-4">Email</th>
                    <th className="font-semibold py-2 pr-4">Plan</th>
                    <th className="font-semibold py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-4 font-medium">{a.display_name}</td>
                      <td className="py-2 pr-4 text-slate">{a.email}</td>
                      <td className="py-2 pr-4 text-slate">{a.is_premium ? 'Premium' : 'Free'}</td>
                      <td className="py-2 text-slate">{formatDate(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

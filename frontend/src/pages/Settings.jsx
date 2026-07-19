import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${checked ? 'bg-indigo' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function PersonRow({ person, actionLabel, onAction, busy }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
      <Link to={`/users/${person.id}`} className="flex items-center gap-2.5 text-sm hover:text-indigo min-w-0">
        <span className="w-8 h-8 rounded-lg bg-lavender text-indigo flex items-center justify-center text-xs font-bold flex-shrink-0">
          {person.display_name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate">
          {person.display_name}
          {person.username && <span className="text-slate-light ml-1.5">@{person.username}</span>}
        </span>
      </Link>
      <button
        onClick={onAction}
        disabled={busy}
        className="text-xs font-semibold text-indigo hover:underline disabled:opacity-50 flex-shrink-0 ml-3"
      >
        {actionLabel}
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, ready, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [activity, setActivity] = useState(null)
  const [showActivity, setShowActivity] = useState(false)

  const [circle, setCircle] = useState(null)
  const [following, setFollowing] = useState([])
  const [showCircle, setShowCircle] = useState(false)

  const [blocked, setBlocked] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!ready) return
    if (!user) { navigate('/login'); return }
    api.getMyBlocked().then(setBlocked).catch(() => setBlocked([]))
  }, [ready, user, navigate])

  async function toggle(field) {
    setSaving(true)
    setError('')
    try {
      await updateProfile({ [field]: !user[field] })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function openActivity() {
    setShowActivity((s) => !s)
    if (!activity) {
      api.getMyActivity().then(setActivity).catch(() => setActivity([]))
    }
  }

  async function openCircle() {
    setShowCircle((s) => !s)
    if (!circle) {
      api.getMyCloseCircle().then(setCircle).catch(() => setCircle([]))
      api.listFollowing(user.id).then(setFollowing).catch(() => {})
    }
  }

  async function removeFromCircle(id) {
    setBusyId(id)
    try {
      await api.removeFromCloseCircle(id)
      setCircle((c) => c.filter((p) => p.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  async function addToCircle(person) {
    setBusyId(person.id)
    try {
      await api.addToCloseCircle(person.id)
      setCircle((c) => [...c, person])
    } finally {
      setBusyId(null)
    }
  }

  async function unblock(id) {
    setBusyId(id)
    try {
      await api.unblockUser(id)
      setBlocked((b) => b.filter((p) => p.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  if (!ready || !user) return null

  const circleIds = new Set((circle || []).map((p) => p.id))
  const addable = following.filter((p) => !circleIds.has(p.id))

  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-indigo">Settings</span>
      <h1 className="text-3xl font-bold mt-3 mb-8">Your account</h1>

      {error && <p className="text-sm text-rose-ink mb-4">{error}</p>}

      {/* Account toggles */}
      <div className="bg-white border border-line rounded-xl2 divide-y divide-line">
        <div className="flex items-center justify-between p-5">
          <div className="pr-4">
            <h2 className="text-sm font-semibold">Private account</h2>
            <p className="text-xs text-slate mt-0.5">Only your followers can see your posts, reposts, bio, and who you follow.</p>
          </div>
          <Toggle checked={user.is_private} onChange={() => toggle('is_private')} disabled={saving} />
        </div>
        <div className="flex items-center justify-between p-5">
          <div className="pr-4">
            <h2 className="text-sm font-semibold">Business account</h2>
            <p className="text-xs text-slate mt-0.5">Shows a Business label on your profile.</p>
          </div>
          <Toggle checked={user.is_business} onChange={() => toggle('is_business')} disabled={saving} />
        </div>
      </div>

      {/* Activity center */}
      <div className="bg-white border border-line rounded-xl2 mt-5">
        <button onClick={openActivity} className="w-full flex items-center justify-between p-5 text-left">
          <div>
            <h2 className="text-sm font-semibold">Activity center</h2>
            <p className="text-xs text-slate mt-0.5">Support you've sent and replies you've left.</p>
          </div>
          <span className="text-slate-light text-sm">{showActivity ? '▴' : '▾'}</span>
        </button>
        {showActivity && (
          <div className="px-5 pb-5">
            {!activity ? (
              <p className="text-sm text-slate-light">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-slate-light">No activity yet.</p>
            ) : (
              <div className="flex flex-col">
                {activity.map((a, i) => (
                  <Link key={i} to={`/stories/${a.story_id}`} className="py-2.5 border-b border-line last:border-0 text-sm hover:text-indigo">
                    {a.type === 'support' ? (
                      <>You sent <span className="font-semibold">"{a.detail}"</span> on <span className="font-semibold">{a.story_title}</span></>
                    ) : (
                      <>You replied <span className="font-semibold">"{a.detail.length > 60 ? a.detail.slice(0, 60) + '…' : a.detail}"</span> on <span className="font-semibold">{a.story_title}</span></>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close circle */}
      <div className="bg-white border border-line rounded-xl2 mt-5">
        <button onClick={openCircle} className="w-full flex items-center justify-between p-5 text-left">
          <div>
            <h2 className="text-sm font-semibold">Close circle</h2>
            <p className="text-xs text-slate mt-0.5">Your inner circle of people, picked from who you follow.</p>
          </div>
          <span className="text-slate-light text-sm">{showCircle ? '▴' : '▾'}</span>
        </button>
        {showCircle && (
          <div className="px-5 pb-5">
            {!circle ? (
              <p className="text-sm text-slate-light">Loading…</p>
            ) : (
              <>
                {circle.length === 0 && <p className="text-sm text-slate-light mb-2">No one in your close circle yet.</p>}
                {circle.map((p) => (
                  <PersonRow key={p.id} person={p} actionLabel="Remove" busy={busyId === p.id} onAction={() => removeFromCircle(p.id)} />
                ))}
                {addable.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-slate-light uppercase tracking-wide mt-4 mb-1">Add from people you follow</p>
                    {addable.map((p) => (
                      <PersonRow key={p.id} person={p} actionLabel="Add" busy={busyId === p.id} onAction={() => addToCircle(p)} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Blocked people */}
      <div className="bg-white border border-line rounded-xl2 mt-5 p-5">
        <h2 className="text-sm font-semibold">Blocked people</h2>
        <p className="text-xs text-slate mt-0.5 mb-2">
          Blocked people can't follow you, and you won't see each other's posts or replies. Block someone from their profile.
        </p>
        {!blocked ? (
          <p className="text-sm text-slate-light">Loading…</p>
        ) : blocked.length === 0 ? (
          <p className="text-sm text-slate-light">You haven't blocked anyone.</p>
        ) : (
          blocked.map((p) => (
            <PersonRow key={p.id} person={p} actionLabel="Unblock" busy={busyId === p.id} onAction={() => unblock(p.id)} />
          ))
        )}
      </div>
    </div>
  )
}

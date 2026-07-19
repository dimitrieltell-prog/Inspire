import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const BUSINESS_CATEGORIES = ['Creator', 'Brand', 'Local business', 'Community', 'Media', 'Nonprofit']
const AUDIENCES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'followers', label: 'People who follow you' },
  { value: 'close_circle', label: 'Close circle only' },
  { value: 'no_one', label: 'No one' },
]

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

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-light mb-2 px-1">{title}</h2>
      <div className="bg-white border border-line rounded-xl2 divide-y divide-line overflow-hidden">{children}</div>
    </div>
  )
}

function Row({ title, subtitle, right, onClick, expandable, expanded }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`w-full flex items-center justify-between gap-4 p-4 text-left ${onClick ? 'hover:bg-bg/60 transition-colors' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
      </div>
      {right ?? (expandable && <span className="text-slate-light text-sm flex-shrink-0">{expanded ? '▴' : '▾'}</span>)}
    </Tag>
  )
}

function PersonRow({ person, actionLabel, onAction, busy, danger }) {
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
        className={`text-xs font-semibold disabled:opacity-50 flex-shrink-0 ml-3 hover:underline ${danger ? 'text-rose-ink' : 'text-indigo'}`}
      >
        {actionLabel}
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, ready, updateProfile, logout } = useAuth()
  const navigate = useNavigate()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Business
  const [bizOpen, setBizOpen] = useState(false)
  const [bizDraft, setBizDraft] = useState(null)
  const [insights, setInsights] = useState(null)
  const [showInsights, setShowInsights] = useState(false)

  // Privacy
  const [audienceOpen, setAudienceOpen] = useState(false)

  // Close circle
  const [circle, setCircle] = useState(null)
  const [showCircle, setShowCircle] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const searchTimer = useRef(null)

  // Activity + blocked
  const [activity, setActivity] = useState(null)
  const [showActivity, setShowActivity] = useState(false)
  const [blocked, setBlocked] = useState(null)
  const [showBlocked, setShowBlocked] = useState(false)

  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!ready) return
    if (!user) { navigate('/login'); return }
  }, [ready, user, navigate])

  useEffect(() => {
    if (!query || query.trim().length < 2) { setResults([]); return }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      api.searchUsers(query).then(setResults).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(searchTimer.current)
  }, [query])

  if (!ready || !user) return null

  async function patch(fields) {
    setSaving(true)
    setError('')
    try {
      await updateProfile(fields)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function openBiz() {
    setBizOpen((o) => !o)
    if (!bizDraft) {
      setBizDraft({
        business_category: user.business_category || '',
        contact_email: user.contact_email || '',
        contact_website: user.contact_website || '',
      })
    }
  }

  async function saveBiz() {
    await patch(bizDraft)
  }

  async function openInsights() {
    setShowInsights((s) => !s)
    if (!insights) {
      api.getMyInsights().then(setInsights).catch((e) => setError(e.message))
    }
  }

  async function openCircle() {
    setShowCircle((s) => !s)
    if (!circle) {
      api.getMyCloseCircle().then(setCircle).catch(() => setCircle([]))
    }
  }

  async function openActivity() {
    setShowActivity((s) => !s)
    if (!activity) {
      api.getMyActivity().then(setActivity).catch(() => setActivity([]))
    }
  }

  async function openBlocked() {
    setShowBlocked((s) => !s)
    if (!blocked) {
      api.getMyBlocked().then(setBlocked).catch(() => setBlocked([]))
    }
  }

  async function addToCircle(person) {
    setBusyId(person.id)
    try {
      await api.addToCloseCircle(person.id)
      setCircle((c) => [...(c || []), person])
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
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

  async function unblock(id) {
    setBusyId(id)
    try {
      await api.unblockUser(id)
      setBlocked((b) => b.filter((p) => p.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  const circleIds = new Set((circle || []).map((p) => p.id))
  const searchAddable = results.filter((p) => p.id !== user.id && !circleIds.has(p.id))
  const audienceLabel = AUDIENCES.find((a) => a.value === (user.comment_audience || 'everyone'))?.label

  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-indigo">Settings</span>
      <h1 className="text-3xl font-bold mt-3 mb-8">Settings</h1>

      {error && <p className="text-sm text-rose-ink mb-4">{error}</p>}

      {/* ============ YOUR ACCOUNT ============ */}
      <Section title="Your account">
        <Row
          title="Edit profile"
          subtitle="Name, username, bio, pronouns, links, schools."
          onClick={() => navigate('/profile')}
          right={<span className="text-slate-light">›</span>}
        />
        <Row
          title="Business account"
          subtitle="Unlock insights on how your stories perform, a category label and contact options on your profile, and a business chip on your posts across Inspire."
          right={<Toggle checked={user.is_business} onChange={() => patch({ is_business: !user.is_business })} disabled={saving} />}
        />
        {user.is_business && (
          <>
            <Row title="Business details" subtitle="Category, contact email, website." onClick={openBiz} expandable expanded={bizOpen} />
            {bizOpen && bizDraft && (
              <div className="p-4 flex flex-col gap-3 bg-bg/40">
                <div>
                  <label className="text-xs font-semibold text-slate-light block mb-1">Category</label>
                  <select
                    value={bizDraft.business_category}
                    onChange={(e) => setBizDraft((d) => ({ ...d, business_category: e.target.value }))}
                    className="w-full border border-line rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo"
                  >
                    <option value="">Choose a category…</option>
                    {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-light block mb-1">Contact email (shown on your profile)</label>
                  <input
                    value={bizDraft.contact_email}
                    onChange={(e) => setBizDraft((d) => ({ ...d, contact_email: e.target.value }))}
                    placeholder="hello@yourbusiness.com"
                    className="w-full border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-light block mb-1">Website</label>
                  <input
                    value={bizDraft.contact_website}
                    onChange={(e) => setBizDraft((d) => ({ ...d, contact_website: e.target.value }))}
                    placeholder="https://…"
                    className="w-full border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo"
                  />
                </div>
                <button onClick={saveBiz} disabled={saving} className="self-start bg-indigo text-white rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
            <Row title="Insights" subtitle="How your stories are performing." onClick={openInsights} expandable expanded={showInsights} />
            {showInsights && (
              <div className="p-4 bg-bg/40">
                {!insights ? (
                  <p className="text-sm text-slate-light">Loading…</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Followers', insights.followers],
                      ['Stories', insights.stories],
                      ['Support received', insights.supports_received],
                      ['Replies received', insights.replies_received],
                      ['Reposts', insights.reposts_received],
                      ['Saves', insights.saves_received],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-white border border-line rounded-xl px-3 py-3 text-center">
                        <div className="text-xl font-bold">{value}</div>
                        <div className="text-[11px] text-slate mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Section>

      {/* ============ PRIVACY ============ */}
      <Section title="Privacy">
        <Row
          title="Private account"
          subtitle="When your account is private, people can only see your name, username, and bio — the simple stuff. Your posts, reposts, pronouns, links, schools, and who you follow are only visible to your followers."
          right={<Toggle checked={user.is_private} onChange={() => patch({ is_private: !user.is_private })} disabled={saving} />}
        />
        <Row
          title="Who can reply to your stories"
          subtitle={audienceLabel}
          onClick={() => setAudienceOpen((o) => !o)}
          expandable
          expanded={audienceOpen}
        />
        {audienceOpen && (
          <div className="p-4 bg-bg/40 flex flex-col gap-1">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                onClick={() => patch({ comment_audience: a.value })}
                disabled={saving}
                className={`text-left text-sm px-3 py-2.5 rounded-lg transition-colors ${
                  (user.comment_audience || 'everyone') === a.value ? 'bg-indigo text-white font-semibold' : 'hover:bg-lavender'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        <Row
          title="Hide support counts"
          subtitle="Others won't see how much support your stories get. You still will."
          right={<Toggle checked={user.hide_support_counts} onChange={() => patch({ hide_support_counts: !user.hide_support_counts })} disabled={saving} />}
        />
      </Section>

      {/* ============ CONNECTIONS ============ */}
      <Section title="Connections">
        <Row
          title="Close circle"
          subtitle="Your inner circle. Add anyone — use it to limit who can reply to your stories."
          onClick={openCircle}
          expandable
          expanded={showCircle}
        />
        {showCircle && (
          <div className="p-4 bg-bg/40">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people by name or username…"
              className="w-full border border-line rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-indigo"
            />
            {searchAddable.length > 0 && (
              <div className="mb-3">
                {searchAddable.map((p) => (
                  <PersonRow key={p.id} person={p} actionLabel="Add" busy={busyId === p.id} onAction={() => addToCircle(p)} />
                ))}
              </div>
            )}
            {query.trim().length >= 2 && searchAddable.length === 0 && (
              <p className="text-sm text-slate-light mb-3">No one new found for "{query}".</p>
            )}
            <p className="text-xs font-semibold text-slate-light uppercase tracking-wide mb-1">In your circle</p>
            {!circle ? (
              <p className="text-sm text-slate-light">Loading…</p>
            ) : circle.length === 0 ? (
              <p className="text-sm text-slate-light">No one yet — search above to add people.</p>
            ) : (
              circle.map((p) => (
                <PersonRow key={p.id} person={p} actionLabel="Remove" busy={busyId === p.id} onAction={() => removeFromCircle(p.id)} />
              ))
            )}
          </div>
        )}
        <Row
          title="Blocked people"
          subtitle="They can't follow you, and you won't see each other's posts or replies. Block someone from their profile."
          onClick={openBlocked}
          expandable
          expanded={showBlocked}
        />
        {showBlocked && (
          <div className="p-4 bg-bg/40">
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
        )}
      </Section>

      {/* ============ YOUR ACTIVITY ============ */}
      <Section title="Your activity">
        <Row
          title="Activity center"
          subtitle="Support you've sent and replies you've left."
          onClick={openActivity}
          expandable
          expanded={showActivity}
        />
        {showActivity && (
          <div className="p-4 bg-bg/40">
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
        <Row
          title="Saved stories"
          subtitle="Everything you've bookmarked, on your profile."
          onClick={() => navigate('/profile')}
          right={<span className="text-slate-light">›</span>}
        />
      </Section>

      {/* ============ ACCOUNT ACTIONS ============ */}
      <Section title="Login">
        <Row
          title="Sign out"
          onClick={() => { logout(); navigate('/') }}
          right={<span className="text-rose-ink text-sm font-semibold">Sign out</span>}
        />
      </Section>
    </div>
  )
}

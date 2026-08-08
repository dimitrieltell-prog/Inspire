import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import StoryCard from '../components/StoryCard'
import Avatar from '../components/Avatar'
import AvatarCropModal from '../components/AvatarCropModal'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10MB

async function uploadAvatarToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Image uploads are not configured yet.')
  }
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed. Please try a different image.')
  return data.secure_url
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.round((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatLastSession(a) {
  if (!a.current_session_start) return '—'
  const online = formatActive(a.last_active).online
  const end = online ? Date.now() / 1000 : a.last_active
  const duration = formatDuration(end - a.current_session_start)
  return online ? `${duration} so far` : duration
}

function formatActive(ts) {
  if (!ts) return { label: 'Never', online: false }
  const diffSec = Date.now() / 1000 - ts
  if (diffSec < 180) return { label: 'Online now', online: true }
  if (diffSec < 3600) return { label: `Active ${Math.floor(diffSec / 60)}m ago`, online: false }
  if (diffSec < 86400) return { label: `Active ${Math.floor(diffSec / 3600)}h ago`, online: false }
  return { label: `Active ${Math.floor(diffSec / 86400)}d ago`, online: false }
}

const emptyDraft = { display_name: '', username: '', bio: '', pronouns: '', links: [], schools: [] }

export default function Profile() {
  const { user, ready, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const [listMode, setListMode] = useState(null) // 'followers' | 'following' | null
  const [listUsers, setListUsers] = useState([])

  const avatarInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [cropImageSrc, setCropImageSrc] = useState(null)

  // Founder-only accounts section
  const [accounts, setAccounts] = useState(null)
  const [accountsError, setAccountsError] = useState('')
  const [hiddenTestCount, setHiddenTestCount] = useState(0)
  const [showTestAccounts, setShowTestAccounts] = useState(false)
  const [accountBusyId, setAccountBusyId] = useState(null)
  const [accountFilter, setAccountFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [piiHidden, setPiiHidden] = useState(false)
  const [contactField, setContactField] = useState('email') // 'email' | 'username'

  // Posts / Reposts / Saved / Anonymous tabs
  const [tab, setTab] = useState('posts')
  const [tabStories, setTabStories] = useState([])
  const [tabLoading, setTabLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    if (!user) { navigate('/login'); return }
    api.getProfile(user.id)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [ready, user, navigate])

  useEffect(() => {
    if (!user?.is_founder) return
    setAccountsError('')
    api.listAccounts(showTestAccounts)
      .then((d) => { setAccounts(d.users || []); setHiddenTestCount(d.hidden_test_count || 0) })
      .catch((e) => {
        setAccountsError(
          e.status === 401
            ? 'Your session expired — sign out and back in to see this.'
            : e.message || 'Could not load accounts.'
        )
      })
  }, [user, showTestAccounts])

  async function toggleTestFlag(account) {
    setAccountBusyId(account.id)
    try {
      if (account.is_test_account) {
        await api.unmarkTestAccount(account.id)
      } else {
        await api.markTestAccount(account.id)
      }
      const d = await api.listAccounts(showTestAccounts)
      setAccounts(d.users || [])
      setHiddenTestCount(d.hidden_test_count || 0)
    } finally {
      setAccountBusyId(null)
    }
  }

  const filteredAccounts = (accounts || []).filter((a) => {
    const q = accountFilter.trim().toLowerCase()
    if (!q) return true
    return a.display_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.username || '').toLowerCase().includes(q)
  })
  const selectableFiltered = filteredAccounts.filter((a) => !a.is_founder)
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every((a) => selectedIds.has(a.id))

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        selectableFiltered.forEach((a) => next.delete(a.id))
      } else {
        selectableFiltered.forEach((a) => next.add(a.id))
      }
      return next
    })
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkMarkSelected() {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    try {
      await api.bulkMarkTestAccounts([...selectedIds])
      setSelectedIds(new Set())
      const d = await api.listAccounts(showTestAccounts)
      setAccounts(d.users || [])
      setHiddenTestCount(d.hidden_test_count || 0)
    } finally {
      setBulkBusy(false)
    }
  }

  useEffect(() => {
    if (!user) return
    setTabLoading(true)
    const load = tab === 'posts' ? api.getUserStories(user.id)
      : tab === 'reposts' ? api.getUserReposts(user.id)
      : tab === 'saved' ? api.getSavedStories(user.id)
      : api.getAnonymousStories(user.id)
    load.then(setTabStories).catch(() => setTabStories([])).finally(() => setTabLoading(false))
  }, [tab, user])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.')
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('That image is too large — please choose one under 10MB.')
      return
    }
    setAvatarError('')
    setCropImageSrc(URL.createObjectURL(file))
  }

  async function handleCropConfirm(blob) {
    URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
    setAvatarUploading(true)
    try {
      const url = await uploadAvatarToCloudinary(blob)
      const updated = await updateProfile({ avatar_url: url })
      setProfile((p) => ({ ...p, avatar_url: updated.avatar_url }))
    } catch (err) {
      setAvatarError(err.message)
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleCropCancel() {
    URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
  }

  function startEditing() {
    setDraft({
      display_name: profile.display_name,
      username: profile.username || '',
      bio: profile.bio || '',
      pronouns: profile.pronouns || '',
      links: profile.links?.length ? [...profile.links] : [''],
      schools: profile.schools?.length ? [...profile.schools] : [''],
    })
    setSaveError('')
    setEditing(true)
  }

  function updateListField(field, index, value) {
    setDraft((d) => ({ ...d, [field]: d[field].map((v, i) => (i === index ? value : v)) }))
  }
  function addListField(field) {
    setDraft((d) => ({ ...d, [field]: [...d[field], ''] }))
  }
  function removeListField(field, index) {
    setDraft((d) => ({ ...d, [field]: d[field].filter((_, i) => i !== index) }))
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateProfile({
        display_name: draft.display_name,
        username: draft.username,
        bio: draft.bio,
        pronouns: draft.pronouns,
        links: draft.links.filter((l) => l.trim()),
        schools: draft.schools.filter((s) => s.trim()),
      })
      setProfile((p) => ({
        ...p,
        display_name: updated.display_name,
        username: updated.username,
        bio: draft.bio,
        pronouns: draft.pronouns,
        links: draft.links.filter((l) => l.trim()),
        schools: draft.schools.filter((s) => s.trim()),
      }))
      setEditing(false)
    } catch (err) {
      setSaveError(err.message)
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
        {editing ? (
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-light block mb-1">Display name</label>
              <input
                autoFocus
                maxLength={35}
                value={draft.display_name}
                onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
                className="w-full border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-light block mb-1">Username</label>
              <div className="flex items-center border border-line rounded-xl px-3 focus-within:border-indigo">
                <span className="text-slate-light text-sm">@</span>
                <input
                  maxLength={30}
                  value={draft.username}
                  onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value.toLowerCase() }))}
                  className="w-full px-1.5 py-2 text-sm focus:outline-none"
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-light block mb-1">Pronouns</label>
              <input
                maxLength={40}
                value={draft.pronouns}
                onChange={(e) => setDraft((d) => ({ ...d, pronouns: e.target.value }))}
                placeholder="e.g. she/her"
                className="w-full border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-light block mb-1">Bio</label>
              <textarea
                maxLength={300}
                rows={3}
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                placeholder="A little about you…"
                className="w-full border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-light block mb-1">Links</label>
              <div className="flex flex-col gap-2">
                {draft.links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={l}
                      onChange={(e) => updateListField('links', i, e.target.value)}
                      placeholder="https://…"
                      className="flex-grow border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo"
                    />
                    <button type="button" onClick={() => removeListField('links', i)} className="text-slate-light hover:text-rose-ink px-2">✕</button>
                  </div>
                ))}
                {draft.links.length < 5 && (
                  <button type="button" onClick={() => addListField('links')} className="text-xs text-indigo font-semibold self-start hover:underline">
                    + Add link
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-light block mb-1">Schools</label>
              <div className="flex flex-col gap-2">
                {draft.schools.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={s}
                      onChange={(e) => updateListField('schools', i, e.target.value)}
                      placeholder="School name"
                      className="flex-grow border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo"
                    />
                    <button type="button" onClick={() => removeListField('schools', i)} className="text-slate-light hover:text-rose-ink px-2">✕</button>
                  </div>
                ))}
                {draft.schools.length < 5 && (
                  <button type="button" onClick={() => addListField('schools')} className="text-xs text-indigo font-semibold self-start hover:underline">
                    + Add school
                  </button>
                )}
              </div>
            </div>
            {saveError && <p className="text-sm text-rose-ink">{saveError}</p>}
            <div className="flex gap-2">
              <button disabled={saving} className="bg-indigo text-white rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate px-3 py-2">Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Avatar
                  userId={profile.id}
                  displayName={profile.display_name}
                  avatarUrl={profile.avatar_url}
                  onChangePhoto={() => avatarInputRef.current?.click()}
                  isSelf
                />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                {avatarUploading && <p className="text-xs text-slate-light mt-1">Uploading…</p>}
                {avatarError && <p className="text-xs text-rose-ink mt-1 max-w-[80px]">{avatarError}</p>}
                {cropImageSrc && (
                  <AvatarCropModal
                    imageSrc={cropImageSrc}
                    onCancel={handleCropCancel}
                    onConfirm={handleCropConfirm}
                  />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                  {profile.is_founder && (
                    <span className="text-[11px] font-bold uppercase tracking-wide bg-navy text-white px-2 py-0.5 rounded-full">Founder</span>
                  )}
                  {profile.is_premium && (
                    <span className="text-[11px] font-bold uppercase tracking-wide bg-lavender text-indigo px-2 py-0.5 rounded-full">Premium</span>
                  )}
                  <button onClick={startEditing} className="text-xs text-indigo font-semibold ml-1 hover:underline">
                    Edit
                  </button>
                </div>
                <p className="text-sm text-slate-light mt-0.5">
                  {profile.username && `@${profile.username}`}
                  {profile.pronouns && ` · ${profile.pronouns}`}
                </p>
                {profile.bio && <p className="text-sm mt-2 whitespace-pre-wrap">{profile.bio}</p>}
                {(profile.links?.length > 0) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {profile.links.map((l) => (
                      <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo font-medium hover:underline">
                        🔗 {l.replace(/^https?:\/\//, '')}
                      </a>
                    ))}
                  </div>
                )}
                {(profile.schools?.length > 0) && (
                  <p className="text-sm text-slate mt-2">🎓 {profile.schools.join(' · ')}</p>
                )}
                <p className="text-sm text-slate-light mt-2">Joined {formatDate(profile.created_at)}</p>
              </div>
            </div>
          </>
        )}

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

      {/* Posts / Reposts / Saved / Anonymous */}
      <div className="mt-6">
        <div className="flex gap-2 border-b border-line mb-5">
          {['posts', 'reposts', 'saved', 'anonymous'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-indigo text-indigo' : 'border-transparent text-slate hover:text-navy'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'anonymous' && (
          <p className="text-xs text-slate-light mb-4">Only you can see this tab — your anonymous posts stay anonymous to everyone else.</p>
        )}

        {tabLoading ? (
          <p className="text-center text-slate py-8">Loading…</p>
        ) : tabStories.length === 0 ? (
          <p className="text-center text-slate-light py-8">
            {tab === 'posts' && "You haven't posted anything yet."}
            {tab === 'reposts' && "You haven't reposted anything yet."}
            {tab === 'saved' && "You haven't saved anything yet."}
            {tab === 'anonymous' && "You haven't posted anonymously yet."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {tabStories.map((s) => <StoryCard key={s.id} story={s} />)}
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
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-light">Activity Center (founder only)</h2>
            <div className="flex items-center gap-3">
              {accounts && <span className="text-xs text-slate">{accounts.length} shown</span>}
              <button
                onClick={() => setContactField((f) => (f === 'email' ? 'username' : 'email'))}
                className="text-xs font-semibold text-slate hover:text-indigo flex items-center gap-1"
              >
                {contactField === 'email' ? '🔄 Show usernames' : '🔄 Show emails'}
              </button>
              <button
                onClick={() => setPiiHidden((h) => !h)}
                className="text-xs font-semibold text-slate hover:text-indigo flex items-center gap-1"
              >
                {piiHidden ? '👁 Show names & emails' : '🙈 Hide names & emails'}
              </button>
            </div>
          </div>
          {(hiddenTestCount > 0 || showTestAccounts) && (
            <button
              onClick={() => setShowTestAccounts((s) => !s)}
              className="text-xs text-indigo font-semibold hover:underline mb-3"
            >
              {showTestAccounts ? 'Hide test accounts' : `${hiddenTestCount} test account${hiddenTestCount === 1 ? '' : 's'} hidden — show`}
            </button>
          )}
          {accountsError ? (
            <p className="text-sm text-rose-ink mt-3">{accountsError}</p>
          ) : !accounts ? (
            <p className="text-sm text-slate-light mt-3">Loading…</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mt-3 mb-3">
                <input
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  placeholder="Filter by name or email (e.g. example.com, Deploy Check)…"
                  className="flex-grow border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo"
                />
                {selectedIds.size > 0 && (
                  <button
                    onClick={bulkMarkSelected}
                    disabled={bulkBusy}
                    className="flex-shrink-0 text-xs font-semibold bg-indigo text-white rounded-full px-4 py-2 disabled:opacity-50"
                  >
                    {bulkBusy ? 'Marking…' : `Mark ${selectedIds.size} as test`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-light border-b border-line">
                      <th className="font-semibold py-2 pr-2 w-6">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="w-4 h-4 accent-indigo"
                        />
                      </th>
                      <th className="font-semibold py-2 pr-4">Name</th>
                      <th className="font-semibold py-2 pr-4">{contactField === 'email' ? 'Email' : 'Username'}</th>
                      <th className="font-semibold py-2 pr-4">Plan</th>
                      <th className="font-semibold py-2 pr-4">Active</th>
                      <th className="font-semibold py-2 pr-4">Last session</th>
                      <th className="font-semibold py-2 pr-4">Joined</th>
                      <th className="font-semibold py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((a) => (
                      <tr key={a.id} className="border-b border-line last:border-0">
                        <td className="py-2 pr-2">
                          {!a.is_founder && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(a.id)}
                              onChange={() => toggleSelectOne(a.id)}
                              className="w-4 h-4 accent-indigo"
                            />
                          )}
                        </td>
                        <td className={`py-2 pr-4 font-medium ${piiHidden ? 'blur-sm select-none' : ''}`}>
                          <Link to={`/users/${a.id}`} className="hover:text-indigo hover:underline">
                            {a.display_name}
                          </Link>
                          {a.is_test_account && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase bg-rose text-rose-ink px-1.5 py-0.5 rounded-full">Test</span>
                          )}
                        </td>
                        <td className={`py-2 pr-4 text-slate ${piiHidden ? 'blur-sm select-none' : ''}`}>
                          {contactField === 'email' ? a.email : (a.username ? `@${a.username}` : '—')}
                        </td>
                        <td className="py-2 pr-4 text-slate">{a.is_premium ? 'Premium' : 'Free'}</td>
                        <td className={`py-2 pr-4 ${formatActive(a.last_active).online ? 'text-green-600 font-semibold' : 'text-slate'}`}>
                          {formatActive(a.last_active).label}
                        </td>
                        <td className="py-2 pr-4 text-slate">{formatLastSession(a)}</td>
                        <td className="py-2 pr-4 text-slate">{formatDateTime(a.created_at)}</td>
                        <td className="py-2">
                          {!a.is_founder && (
                            <button
                              onClick={() => toggleTestFlag(a)}
                              disabled={accountBusyId === a.id}
                              className="text-xs text-slate-light hover:text-indigo font-semibold disabled:opacity-50"
                            >
                              {a.is_test_account ? 'Unmark' : 'Mark as test'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAccounts.length === 0 && (
                  <p className="text-sm text-slate-light text-center py-6">No accounts match "{accountFilter}".</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

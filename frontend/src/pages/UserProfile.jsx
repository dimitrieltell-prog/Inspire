import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import StoryCard from '../components/StoryCard'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function UserProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [tab, setTab] = useState('posts')
  const [tabStories, setTabStories] = useState([])
  const [tabLoading, setTabLoading] = useState(true)

  useEffect(() => {
    // Viewing your own profile? Send to the editable one.
    if (user && user.id === userId) { navigate('/profile'); return }
    setLoading(true)
    api.getProfile(userId)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId, user, navigate])

  useEffect(() => {
    setTabLoading(true)
    const load = tab === 'posts' ? api.getUserStories(userId) : api.getUserReposts(userId)
    load.then(setTabStories).catch(() => setTabStories([])).finally(() => setTabLoading(false))
  }, [tab, userId])

  async function toggleFollow() {
    if (!user) { navigate('/login'); return }
    setBusy(true)
    try {
      if (profile.is_following) {
        await api.unfollowUser(userId)
        setProfile((p) => ({ ...p, is_following: false, follower_count: p.follower_count - 1 }))
      } else {
        await api.followUser(userId)
        setProfile((p) => ({ ...p, is_following: true, follower_count: p.follower_count + 1 }))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleBlock() {
    if (!user) { navigate('/login'); return }
    setBusy(true)
    try {
      if (profile.is_blocked) {
        await api.unblockUser(userId)
        setProfile((p) => ({ ...p, is_blocked: false }))
      } else {
        await api.blockUser(userId)
        setProfile((p) => ({ ...p, is_blocked: true, is_following: false }))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-center text-slate py-16">Loading…</p>
  if (error) return <p className="text-center text-rose-ink py-16">{error}</p>
  if (!profile) return null

  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <Link to="/stories" className="text-sm text-indigo font-semibold">← Back to stories</Link>

      <div className="bg-white border border-line rounded-xl2 p-7 mt-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile.display_name.charAt(0).toUpperCase()}
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
              {profile.is_business && (
                <span className="text-[11px] font-bold uppercase tracking-wide border border-line text-slate px-2 py-0.5 rounded-full">Business</span>
              )}
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
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {!profile.is_blocked && (
              <button
                onClick={toggleFollow}
                disabled={busy}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  profile.is_following
                    ? 'border border-line bg-white hover:border-indigo'
                    : 'bg-indigo text-white hover:bg-indigo-deep'
                }`}
              >
                {profile.is_following ? 'Following' : 'Follow'}
              </button>
            )}
            <button
              onClick={toggleBlock}
              disabled={busy}
              className={`text-xs font-semibold transition-colors disabled:opacity-60 ${
                profile.is_blocked ? 'text-indigo hover:underline' : 'text-slate-light hover:text-rose-ink'
              }`}
            >
              {profile.is_blocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <div className="flex-1 rounded-xl border border-line px-4 py-3 text-center">
            <div className="text-xl font-bold">{profile.follower_count}</div>
            <div className="text-xs text-slate">Followers</div>
          </div>
          <div className="flex-1 rounded-xl border border-line px-4 py-3 text-center">
            <div className="text-xl font-bold">{profile.following_count}</div>
            <div className="text-xs text-slate">Following</div>
          </div>
          <div className="flex-1 rounded-xl border border-line px-4 py-3 text-center">
            <div className="text-xl font-bold">{profile.story_count}</div>
            <div className="text-xs text-slate">Stories</div>
          </div>
        </div>
      </div>

      {/* Private account gate */}
      {!profile.can_view && (
        <div className="bg-white border border-line rounded-xl2 p-8 mt-6 text-center">
          <p className="text-sm font-semibold">This account is private</p>
          <p className="text-xs text-slate mt-1">Follow {profile.display_name} to see their posts and activity.</p>
        </div>
      )}

      {/* Posts / Reposts */}
      {profile.can_view && (
      <div className="mt-6">
        <div className="flex gap-2 border-b border-line mb-5">
          {['posts', 'reposts'].map((t) => (
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

        {tabLoading ? (
          <p className="text-center text-slate py-8">Loading…</p>
        ) : tabStories.length === 0 ? (
          <p className="text-center text-slate-light py-8">
            {tab === 'posts' ? `${profile.display_name} hasn't posted anything yet.` : `${profile.display_name} hasn't reposted anything yet.`}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {tabStories.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
        )}
      </div>
      )}
    </div>
  )
}

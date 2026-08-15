import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import StoryCard from '../components/StoryCard'
import Avatar from '../components/Avatar'
import ReportModal from '../components/ReportModal'
import CrownIcon from '../components/CrownIcon'
import VerifiedBadge from '../components/VerifiedBadge'

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
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    // Viewing your own profile? Send to the editable one.
    if (user && user.id === userId) { navigate('/profile'); return }
    setLoading(true)
    api.getProfile(userId)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId, user, navigate])

  const visibleTabs = profile
    ? [
        ...(profile.can_view_posts ? ['posts'] : []),
        'reposts',
        ...(profile.can_view_saves ? ['saved'] : []),
      ]
    : []

  useEffect(() => {
    // If the current tab isn't actually visible for this profile (e.g. the
    // default 'posts' is followers-only and we're not one), fall back to
    // the first tab that is.
    if (profile && visibleTabs.length && !visibleTabs.includes(tab)) {
      setTab(visibleTabs[0])
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile || !visibleTabs.includes(tab)) return
    setTabLoading(true)
    const load = tab === 'posts' ? api.getUserStories(userId)
      : tab === 'saved' ? api.getSavedStories(userId)
      : api.getUserReposts(userId)
    load.then(setTabStories).catch(() => setTabStories([])).finally(() => setTabLoading(false))
  }, [tab, userId, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleFollow() {
    if (!user) { navigate('/login'); return }
    setBusy(true)
    try {
      if (profile.is_following) {
        await api.unfollowUser(userId)
        setProfile((p) => ({ ...p, is_following: false, follower_count: p.follower_count - 1 }))
      } else if (profile.has_requested) {
        await api.unfollowUser(userId) // cancels the pending request
        setProfile((p) => ({ ...p, has_requested: false }))
      } else if (profile.is_private) {
        await api.followUser(userId) // private accounts get a request
        setProfile((p) => ({ ...p, has_requested: true }))
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

  async function toggleMute() {
    if (!user) { navigate('/login'); return }
    setBusy(true)
    try {
      if (profile.is_muted) {
        await api.unmuteUser(userId)
        setProfile((p) => ({ ...p, is_muted: false }))
      } else {
        await api.muteUser(userId)
        setProfile((p) => ({ ...p, is_muted: true }))
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

      <div className="bg-surface border border-line rounded-xl2 p-7 mt-6">
        <div className="flex items-start gap-4">
          <Avatar userId={profile.id} displayName={profile.display_name} avatarUrl={profile.avatar_url} />
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              {profile.is_founder && <CrownIcon className="w-[18px] h-[18px] text-navy flex-shrink-0" />}
              {profile.is_premium && <VerifiedBadge className="w-[18px] h-[18px] flex-shrink-0" />}
              {profile.is_business && (
                <span className="text-[11px] font-bold uppercase tracking-wide border border-line text-slate px-2 py-0.5 rounded-full">
                  {profile.business_category || 'Business'}
                </span>
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
            {profile.is_business && (profile.contact_email || profile.contact_website) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.contact_email && (
                  <a href={`mailto:${profile.contact_email}`} className="text-xs font-semibold border border-line rounded-full px-3.5 py-1.5 hover:border-indigo transition-colors">
                    ✉️ Email
                  </a>
                )}
                {profile.contact_website && (
                  <a href={profile.contact_website} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold border border-line rounded-full px-3.5 py-1.5 hover:border-indigo transition-colors">
                    🌐 Website
                  </a>
                )}
              </div>
            )}
            <p className="text-sm text-slate-light mt-2">Joined {formatDate(profile.created_at)}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex gap-2">
              {!profile.is_blocked && (
                <button
                  onClick={toggleFollow}
                  disabled={busy}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    profile.is_following || profile.has_requested
                      ? 'border border-line bg-surface hover:border-indigo'
                      : 'bg-indigo text-white hover:bg-indigo-deep'
                  }`}
                >
                  {profile.is_following ? 'Following' : profile.has_requested ? 'Requested' : 'Follow'}
                </button>
              )}
              {profile.can_message && (
                <button
                  onClick={() => navigate(`/messages/${profile.id}`)}
                  className="rounded-full px-5 py-2 text-sm font-semibold border border-line bg-surface hover:border-indigo transition-colors"
                >
                  Message
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {!profile.is_blocked && (
                <button
                  onClick={toggleMute}
                  disabled={busy}
                  className={`text-xs font-semibold transition-colors disabled:opacity-60 ${
                    profile.is_muted ? 'text-indigo hover:underline' : 'text-slate-light hover:text-navy'
                  }`}
                >
                  {profile.is_muted ? 'Unmute' : 'Mute'}
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
              {user && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-xs font-semibold text-slate-light hover:text-rose-ink transition-colors"
                >
                  Report
                </button>
              )}
            </div>
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
        <div className="bg-surface border border-line rounded-xl2 p-8 mt-6 text-center">
          <p className="text-sm font-semibold">This account is private</p>
          <p className="text-xs text-slate mt-1">Follow {profile.display_name} to see their posts and activity.</p>
        </div>
      )}

      {/* Posts / Reposts / Saved */}
      {profile.can_view && (
      <div className="mt-6">
        {!profile.can_view_posts && (
          <p className="text-xs text-slate-light mb-3">{profile.display_name}'s posts are visible to followers only.</p>
        )}
        <div className="flex gap-2 border-b border-line mb-5">
          {visibleTabs.map((t) => (
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
            {tab === 'posts' && `${profile.display_name} hasn't posted anything yet.`}
            {tab === 'reposts' && `${profile.display_name} hasn't reposted anything yet.`}
            {tab === 'saved' && `${profile.display_name} hasn't saved anything yet.`}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {tabStories.map((s) => <StoryCard key={s.id} story={s} repostedBy={tab === 'reposts' ? profile.display_name : undefined} />)}
          </div>
        )}
      </div>
      )}

      {reportOpen && <ReportModal targetType="user" targetId={profile.id} onClose={() => setReportOpen(false)} />}
    </div>
  )
}

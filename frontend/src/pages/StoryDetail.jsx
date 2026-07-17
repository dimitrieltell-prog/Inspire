import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const REACTIONS = ["I'm here for you", 'You helped me', 'I understand', 'Stay strong', 'Thank you for sharing']

export default function StoryDetail() {
  const { storyId } = useParams()
  const { user } = useAuth()
  const [story, setStory] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [picked, setPicked] = useState(null)
  const [reactOpen, setReactOpen] = useState(false)
  const [reactError, setReactError] = useState('')

  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getStory(storyId), api.listComments(storyId)])
      .then(([s, c]) => {
        setStory(s)
        setComments(c)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [storyId])

  async function react(reaction) {
    if (!user) { setReactError('Sign in to send support.'); return }
    try {
      await api.reactToStory(story.id, reaction)
      if (!picked) setStory((s) => ({ ...s, support_count: s.support_count + 1 }))
      setPicked(reaction)
      setReactOpen(false)
      setReactError('')
    } catch (e) {
      setReactError(e.message)
    }
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!user) { setCommentError('Sign in to leave a reply.'); return }
    setPosting(true)
    setCommentError('')
    try {
      const comment = await api.createComment(storyId, commentBody)
      setComments((c) => [...c, comment])
      setStory((s) => ({ ...s, comment_count: s.comment_count + 1 }))
      setCommentBody('')
    } catch (e) {
      setCommentError(e.message)
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <p className="text-center text-slate py-16">Loading…</p>
  if (error) return <p className="text-center text-rose-ink py-16">{error}</p>
  if (!story) return null

  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <Link to="/stories" className="text-sm text-indigo font-semibold">← Back to stories</Link>

      <div className="bg-white border border-line rounded-xl2 p-6 mt-6">
        {story.media_type && (
          <span className="inline-flex items-center gap-1.5 bg-lavender text-indigo text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3 w-fit">
            {story.media_type === 'photo' ? '📷 Photo' : '🎥 Video'}
          </span>
        )}
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-indigo mb-3 block">{story.category}</span>
        <h1 className="text-2xl font-bold mb-3 leading-snug">{story.title}</h1>
        <p className="text-sm text-slate leading-relaxed mb-6 whitespace-pre-wrap">{story.body}</p>

        <div className="relative">
          {reactOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-line rounded-xl shadow-lg p-2 flex flex-col gap-1 z-10">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => react(r)}
                  className={`text-left text-sm px-3 py-2 rounded-lg hover:bg-lavender transition-colors ${picked === r ? 'bg-indigo text-white hover:bg-indigo' : ''}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-line">
            <span className="text-xs font-semibold text-slate">{story.author_name}</span>
            <div className="flex items-center gap-3 text-xs text-slate-light">
              <button onClick={() => setReactOpen((o) => !o)} className="hover:text-indigo transition-colors font-medium">
                {story.support_count} support
              </button>
              <span>{story.comment_count} replies</span>
            </div>
          </div>
          {reactError && <p className="text-xs text-rose-ink mt-2">{reactError}</p>}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-lg font-bold mb-3">Replies</h2>

        {user ? (
          <form onSubmit={submitComment} className="flex flex-col gap-3 mb-6">
            <textarea
              required
              maxLength={1000}
              placeholder="Share a supportive reply…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo resize-none"
              rows={3}
            />
            {commentError && <p className="text-sm text-rose-ink">{commentError}</p>}
            <button
              disabled={posting}
              className="self-start bg-indigo text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-60"
            >
              {posting ? 'Posting…' : 'Post reply'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate mb-6">
            <Link to="/login" className="text-indigo font-semibold">Sign in</Link> to leave a reply.
          </p>
        )}

        {comments.length === 0 && <p className="text-sm text-slate-light">No replies yet — be the first.</p>}

        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <div key={c.id} className="border-b border-line pb-4">
              <span className="text-xs font-semibold text-slate">{c.author_name}</span>
              <p className="text-sm text-slate leading-relaxed mt-1 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
